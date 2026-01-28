import { Context, Next } from 'hono';
import { Bindings, User } from '../types';
import { verifyToken } from '../utils/auth';

/**
 * Authentication middleware - verify JWT token
 */
export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '인증이 필요합니다.' }, 401);
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return c.json({ error: '유효하지 않은 토큰입니다.' }, 401);
  }
  
  // Verify user exists in database
  const user = await c.env.DB.prepare(
    'SELECT id, email, name FROM users WHERE id = ?'
  ).bind(decoded.userId).first<User>();
  
  if (!user) {
    return c.json({ error: '사용자를 찾을 수 없습니다.' }, 401);
  }
  
  // Store user info in context
  c.set('user', user);
  
  await next();
}

/**
 * Subscription middleware - check if user has active subscription
 */
export async function subscriptionMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = c.get('user') as User;
  
  if (!user) {
    return c.json({ error: '인증이 필요합니다.' }, 401);
  }
  
  // Check active subscription
  const subscription = await c.env.DB.prepare(
    'SELECT * FROM subscriptions WHERE user_id = ? AND is_active = 1 AND end_date > datetime("now") ORDER BY end_date DESC LIMIT 1'
  ).bind(user.id).first();
  
  if (!subscription) {
    return c.json({ error: '유효한 이용권이 없습니다. 이용권을 구매해주세요.' }, 403);
  }
  
  c.set('subscription', subscription);
  
  await next();
}
