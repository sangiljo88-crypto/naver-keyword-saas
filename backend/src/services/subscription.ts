import { Bindings, Subscription, SubscriptionCheckResult, User } from '../types';

/**
 * Subscription Service
 * 구독 상태 체크 및 관리 서비스
 */

/**
 * Check if user has active subscription
 * 유효한 구독 여부 체크
 * 
 * @param db - D1 Database instance
 * @param userId - User ID
 * @returns SubscriptionCheckResult with status and subscription info
 */
export async function checkSubscription(
  db: D1Database,
  userId: number
): Promise<SubscriptionCheckResult> {
  const subscription = await db.prepare(
    `SELECT * FROM subscriptions 
     WHERE user_id = ? AND is_active = 1 
     ORDER BY end_date DESC 
     LIMIT 1`
  ).bind(userId).first<Subscription>();
  
  if (!subscription) {
    return {
      hasActive: false,
      status: 'none',
      message: '유효한 이용권이 없습니다. 이용권을 구매해주세요.'
    };
  }
  
  const now = new Date();
  const endDate = new Date(subscription.end_date);
  
  // Check if subscription is expired
  if (endDate <= now) {
    // Deactivate expired subscription
    await db.prepare(
      'UPDATE subscriptions SET is_active = 0 WHERE id = ?'
    ).bind(subscription.id).run();
    
    return {
      hasActive: false,
      subscription,
      status: 'expired',
      message: '이용권이 만료되었습니다. 이용권을 갱신해주세요.'
    };
  }
  
  // Calculate days remaining
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    hasActive: true,
    subscription,
    daysRemaining,
    status: 'active'
  };
}

/**
 * Get user's subscription history
 * 구독 이력 조회
 * 
 * @param db - D1 Database instance
 * @param userId - User ID
 * @param limit - Maximum number of records
 * @returns Array of subscriptions
 */
export async function getSubscriptionHistory(
  db: D1Database,
  userId: number,
  limit: number = 50
): Promise<Subscription[]> {
  const { results } = await db.prepare(
    `SELECT * FROM subscriptions 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`
  ).bind(userId, limit).all<Subscription>();
  
  return results;
}

/**
 * Check subscription expiry and send warning if needed
 * 구독 만료 임박 체크
 * 
 * @param subscription - Subscription object
 * @returns Warning message if expiring soon
 */
export function checkExpiryWarning(subscription: Subscription): string | null {
  const now = new Date();
  const endDate = new Date(subscription.end_date);
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining <= 0) {
    return '이용권이 만료되었습니다.';
  } else if (daysRemaining <= 3) {
    return `이용권이 ${daysRemaining}일 후 만료됩니다.`;
  } else if (daysRemaining <= 7) {
    return `이용권이 ${daysRemaining}일 후 만료됩니다.`;
  }
  
  return null;
}

/**
 * Deactivate user's current active subscription
 * 현재 활성 구독 비활성화
 * 
 * @param db - D1 Database instance
 * @param userId - User ID
 */
export async function deactivateCurrentSubscription(
  db: D1Database,
  userId: number
): Promise<void> {
  await db.prepare(
    `UPDATE subscriptions 
     SET is_active = 0 
     WHERE user_id = ? AND is_active = 1`
  ).bind(userId).run();
}
