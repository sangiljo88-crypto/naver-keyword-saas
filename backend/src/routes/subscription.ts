import { Hono } from 'hono';
import { Bindings, User, Subscription, PlanType, SubscriptionRequest } from '../types';
import { PLAN_PRICES } from '../constants';
import { authMiddleware } from '../middleware/auth';
import { calculateEndDate, formatDateForDB } from '../utils/auth';

const subscription = new Hono<{ Bindings: Bindings }>();

// Apply auth middleware to all routes
subscription.use('/*', authMiddleware);

/**
 * GET /api/subscription/current
 * Get current active subscription
 */
subscription.get('/current', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    
    const sub = await c.env.DB.prepare(
      `SELECT * FROM subscriptions 
       WHERE user_id = ? AND is_active = 1 AND end_date > datetime("now") 
       ORDER BY end_date DESC LIMIT 1`
    ).bind(currentUser.id).first<Subscription>();
    
    if (!sub) {
      return c.json({ hasActiveSubscription: false });
    }
    
    return c.json({
      hasActiveSubscription: true,
      subscription: {
        id: sub.id,
        planType: sub.plan_type,
        price: sub.price,
        startDate: sub.start_date,
        endDate: sub.end_date,
        daysRemaining: Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    return c.json({ error: '구독 정보 조회 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * GET /api/subscription/history
 * Get subscription history
 */
subscription.get('/history', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM subscriptions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`
    ).bind(currentUser.id).all<Subscription>();
    
    return c.json({
      subscriptions: results.map(sub => ({
        id: sub.id,
        planType: sub.plan_type,
        price: sub.price,
        startDate: sub.start_date,
        endDate: sub.end_date,
        isActive: sub.is_active === 1,
        createdAt: sub.created_at
      }))
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    return c.json({ error: '구독 이력 조회 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * GET /api/subscription/plans
 * Get available subscription plans
 */
subscription.get('/plans', (c) => {
  return c.json({
    plans: [
      {
        type: 'monthly',
        name: '1개월 이용권',
        price: PLAN_PRICES.monthly,
        duration: 30,
        description: '30일간 모든 기능 이용'
      },
      {
        type: 'semi-annual',
        name: '6개월 이용권',
        price: PLAN_PRICES['semi-annual'],
        duration: 180,
        description: '180일간 모든 기능 이용',
        discount: Math.round((1 - PLAN_PRICES['semi-annual'] / (PLAN_PRICES.monthly * 6)) * 100)
      },
      {
        type: 'annual',
        name: '12개월 이용권',
        price: PLAN_PRICES.annual,
        duration: 365,
        description: '365일간 모든 기능 이용',
        discount: Math.round((1 - PLAN_PRICES.annual / (PLAN_PRICES.monthly * 12)) * 100)
      }
    ]
  });
});

/**
 * POST /api/subscription/purchase
 * Purchase a subscription
 * NOTE: This is a simplified version without actual payment processing
 */
subscription.post('/purchase', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    const body = await c.req.json<SubscriptionRequest>();
    const { planType } = body;
    
    if (!planType || !['monthly', 'semi-annual', 'annual'].includes(planType)) {
      return c.json({ error: '유효한 요금제를 선택해주세요.' }, 400);
    }
    
    const price = PLAN_PRICES[planType as PlanType];
    const startDate = new Date();
    const endDate = calculateEndDate(planType as PlanType);
    
    // Check if user has active subscription
    const activeSub = await c.env.DB.prepare(
      `SELECT id FROM subscriptions 
       WHERE user_id = ? AND is_active = 1 AND end_date > datetime("now")
       LIMIT 1`
    ).bind(currentUser.id).first();
    
    // Insert new subscription
    const result = await c.env.DB.prepare(
      `INSERT INTO subscriptions 
       (user_id, plan_type, price, start_date, end_date, is_active) 
       VALUES (?, ?, ?, ?, ?, 1)`
    ).bind(
      currentUser.id,
      planType,
      price,
      formatDateForDB(startDate),
      formatDateForDB(endDate)
    ).run();
    
    if (!result.success) {
      return c.json({ error: '이용권 구매에 실패했습니다.' }, 500);
    }
    
    // If user had an active subscription, deactivate it
    if (activeSub) {
      await c.env.DB.prepare(
        'UPDATE subscriptions SET is_active = 0 WHERE id = ?'
      ).bind(activeSub.id).run();
    }
    
    return c.json({
      message: '이용권이 성공적으로 구매되었습니다.',
      subscription: {
        planType,
        price,
        startDate: formatDateForDB(startDate),
        endDate: formatDateForDB(endDate)
      }
    }, 201);
  } catch (error) {
    console.error('Purchase subscription error:', error);
    return c.json({ error: '이용권 구매 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel active subscription
 */
subscription.post('/cancel', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    
    const result = await c.env.DB.prepare(
      `UPDATE subscriptions 
       SET is_active = 0 
       WHERE user_id = ? AND is_active = 1 AND end_date > datetime("now")`
    ).bind(currentUser.id).run();
    
    if (!result.success || result.meta.changes === 0) {
      return c.json({ error: '취소할 이용권이 없습니다.' }, 404);
    }
    
    return c.json({ message: '이용권이 성공적으로 취소되었습니다.' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return c.json({ error: '이용권 취소 중 오류가 발생했습니다.' }, 500);
  }
});

export default subscription;
