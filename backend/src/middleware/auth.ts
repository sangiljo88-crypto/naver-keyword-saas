import { Context, Next } from 'hono';
import { Bindings, User, ContextVariables } from '../types';
import { STATUS_CODES, ERROR_MESSAGES } from '../constants';
import { verifyToken } from '../utils/auth';
import { checkSubscription } from '../services/subscription';
import { checkUsageLimit } from '../services/usage';

/**
 * Enhanced Authentication Middleware
 * JWT 토큰 검증 및 사용자 정보 로드
 */
export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: ContextVariables }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { 
        error: ERROR_MESSAGES.AUTH_REQUIRED,
        code: 'AUTH_REQUIRED'
      },
      STATUS_CODES.UNAUTHORIZED
    );
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return c.json(
      { 
        error: ERROR_MESSAGES.INVALID_TOKEN,
        code: 'INVALID_TOKEN'
      },
      STATUS_CODES.UNAUTHORIZED
    );
  }
  
  // Verify user exists in database
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, created_at FROM users WHERE id = ?'
  ).bind(decoded.userId).first<User>();
  
  if (!user) {
    return c.json(
      { 
        error: ERROR_MESSAGES.USER_NOT_FOUND,
        code: 'USER_NOT_FOUND'
      },
      STATUS_CODES.UNAUTHORIZED
    );
  }
  
  // Store user info in context
  c.set('user', user);
  
  await next();
}

/**
 * Enhanced Subscription Middleware
 * 구독 상태 검증 (만료/미구매 분기 처리)
 */
export async function subscriptionMiddleware(
  c: Context<{ Bindings: Bindings; Variables: ContextVariables }>,
  next: Next
) {
  const user = c.get('user');
  
  if (!user) {
    return c.json(
      { 
        error: ERROR_MESSAGES.AUTH_REQUIRED,
        code: 'AUTH_REQUIRED'
      },
      STATUS_CODES.UNAUTHORIZED
    );
  }
  
  // Check subscription status
  const subscriptionCheck = await checkSubscription(c.env.DB, user.id);
  
  if (!subscriptionCheck.hasActive) {
    const statusCode = subscriptionCheck.status === 'expired' 
      ? STATUS_CODES.FORBIDDEN 
      : STATUS_CODES.FORBIDDEN;
    
    return c.json(
      {
        error: subscriptionCheck.message,
        code: subscriptionCheck.status === 'expired' ? 'SUBSCRIPTION_EXPIRED' : 'NO_SUBSCRIPTION',
        status: subscriptionCheck.status,
        subscription: subscriptionCheck.subscription ? {
          planType: subscriptionCheck.subscription.plan_type,
          endDate: subscriptionCheck.subscription.end_date
        } : null
      },
      statusCode
    );
  }
  
  // Store subscription info in context
  c.set('subscription', subscriptionCheck.subscription);
  
  await next();
}

/**
 * Usage Limit Middleware
 * 사용량 제한 검증 (초과 시 차단)
 */
export async function usageLimitMiddleware(
  c: Context<{ Bindings: Bindings; Variables: ContextVariables }>,
  next: Next
) {
  const user = c.get('user');
  
  if (!user) {
    return c.json(
      { 
        error: ERROR_MESSAGES.AUTH_REQUIRED,
        code: 'AUTH_REQUIRED'
      },
      STATUS_CODES.UNAUTHORIZED
    );
  }
  
  // Get requested keyword count from request body
  let requestedCount = 1;
  try {
    const body = await c.req.json();
    if (body.keywords && Array.isArray(body.keywords)) {
      requestedCount = body.keywords.length;
    }
  } catch {
    // If body parsing fails, use default count
  }
  
  // Check usage limit
  const usageCheck = await checkUsageLimit(c.env.DB, user.id, requestedCount);
  
  if (!usageCheck.allowed) {
    return c.json(
      {
        error: ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED,
        code: 'USAGE_LIMIT_EXCEEDED',
        usage: {
          current: usageCheck.current,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          requested: requestedCount
        },
        message: usageCheck.message
      },
      STATUS_CODES.TOO_MANY_REQUESTS
    );
  }
  
  // Store usage info in context
  c.set('usage', {
    current: usageCheck.current,
    limit: usageCheck.limit
  });
  
  await next();
}

/**
 * Combined Middleware: Auth + Subscription + Usage
 * 인증 + 구독 + 사용량 검증을 한번에 처리
 */
export async function protectedRouteMiddleware(
  c: Context<{ Bindings: Bindings; Variables: ContextVariables }>,
  next: Next
) {
  // 1. Auth check
  await authMiddleware(c, async () => {
    // 2. Subscription check
    await subscriptionMiddleware(c, async () => {
      // 3. Usage limit check
      await usageLimitMiddleware(c, next);
    });
  });
}
