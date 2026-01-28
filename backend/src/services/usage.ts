import { Bindings, UsageCheckResult, User } from '../types';
import { USAGE_LIMITS } from '../constants';

/**
 * Usage Service
 * 사용량 체크 및 로깅 서비스
 */

/**
 * Check if user can perform keyword search
 * 일일 사용량 제한 체크
 * 
 * @param db - D1 Database instance
 * @param userId - User ID
 * @param requestedCount - Number of keywords to search
 * @returns UsageCheckResult with allowed status and current usage
 */
export async function checkUsageLimit(
  db: D1Database,
  userId: number,
  requestedCount: number
): Promise<UsageCheckResult> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get today's usage
  const result = await db.prepare(
    `SELECT COALESCE(SUM(count), 0) as total 
     FROM usage_logs 
     WHERE user_id = ? AND action_type = 'keyword_search' AND date = ?`
  ).bind(userId, today).first<{ total: number }>();
  
  const currentUsage = result?.total || 0;
  const limit = USAGE_LIMITS.DAILY_KEYWORD_SEARCH;
  const remaining = Math.max(0, limit - currentUsage);
  
  // Check if requested count exceeds remaining
  if (currentUsage + requestedCount > limit) {
    return {
      allowed: false,
      current: currentUsage,
      limit,
      remaining,
      message: `일일 검색 한도를 초과합니다. (현재: ${currentUsage}/${limit}, 요청: ${requestedCount})`
    };
  }
  
  return {
    allowed: true,
    current: currentUsage,
    limit,
    remaining: remaining - requestedCount
  };
}

/**
 * Log usage action
 * 사용량 로그 기록
 * 
 * @param db - D1 Database instance
 * @param userId - User ID
 * @param actionType - Action type
 * @param count - Action count
 */
export async function logUsage(
  db: D1Database,
  userId: number,
  actionType: 'keyword_search' | 'api_call' | 'export',
  count: number = 1
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  await db.prepare(
    `INSERT INTO usage_logs (user_id, action_type, count, date) 
     VALUES (?, ?, ?, ?)`
  ).bind(userId, actionType, count, today).run();
}

/**
 * Get user's daily usage statistics
 * 일일 사용량 통계 조회
 * 
 * @param db - D1 Database instance
 * @param userId - User ID
 * @returns Daily and monthly usage statistics
 */
export async function getUsageStatistics(
  db: D1Database,
  userId: number
) {
  const today = new Date().toISOString().split('T')[0];
  
  // Daily usage
  const dailyResult = await db.prepare(
    `SELECT COALESCE(SUM(count), 0) as total 
     FROM usage_logs 
     WHERE user_id = ? AND action_type = 'keyword_search' AND date = ?`
  ).bind(userId, today).first<{ total: number }>();
  
  // Monthly usage
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];
  
  const monthlyResult = await db.prepare(
    `SELECT COALESCE(SUM(count), 0) as total 
     FROM usage_logs 
     WHERE user_id = ? AND action_type = 'keyword_search' AND date >= ?`
  ).bind(userId, monthStartStr).first<{ total: number }>();
  
  return {
    daily: {
      used: dailyResult?.total || 0,
      limit: USAGE_LIMITS.DAILY_KEYWORD_SEARCH,
      remaining: Math.max(0, USAGE_LIMITS.DAILY_KEYWORD_SEARCH - (dailyResult?.total || 0))
    },
    monthly: {
      used: monthlyResult?.total || 0
    }
  };
}

/**
 * Reset daily usage (for testing)
 * 일일 사용량 초기화 (테스트용)
 * 
 * @param db - D1 Database instance
 * @param userId - User ID
 */
export async function resetDailyUsage(
  db: D1Database,
  userId: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  await db.prepare(
    `DELETE FROM usage_logs 
     WHERE user_id = ? AND date = ?`
  ).bind(userId, today).run();
}
