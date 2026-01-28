import { KEYWORD_JUDGMENT } from '../constants';
import { KeywordJudgment, JudgmentLevel } from '../types';

/**
 * Keyword Judgment Service
 * 키워드 경쟁 비율에 따른 자동 판단 로직
 */

/**
 * Calculate keyword judgment based on competition ratio
 * 
 * @param competitionRatio - Document/Product count divided by search volume
 * @returns KeywordJudgment object with level, symbol, label, and description
 * 
 * Examples:
 * - ratio 0.3 → 🔥 우수 (진입 추천)
 * - ratio 0.8 → ✅ 양호 (적당한 경쟁)
 * - ratio 1.5 → ⚠️ 경고 (높은 경쟁)
 * - ratio 3.0 → ❌ 위험 (매우 높은 경쟁)
 */
export function calculateKeywordJudgment(competitionRatio: number): KeywordJudgment {
  let level: JudgmentLevel;
  let judgment;
  
  if (competitionRatio <= KEYWORD_JUDGMENT.EXCELLENT.maxRatio) {
    level = 'excellent';
    judgment = KEYWORD_JUDGMENT.EXCELLENT;
  } else if (competitionRatio <= KEYWORD_JUDGMENT.GOOD.maxRatio) {
    level = 'good';
    judgment = KEYWORD_JUDGMENT.GOOD;
  } else if (competitionRatio <= KEYWORD_JUDGMENT.WARNING.maxRatio) {
    level = 'warning';
    judgment = KEYWORD_JUDGMENT.WARNING;
  } else {
    level = 'danger';
    judgment = KEYWORD_JUDGMENT.DANGER;
  }
  
  return {
    level,
    symbol: judgment.symbol,
    label: judgment.label,
    description: judgment.description
  };
}

/**
 * Get judgment statistics for multiple keywords
 * 
 * @param keywords - Array of keywords with competition ratios
 * @returns Statistics object with counts per judgment level
 */
export function getJudgmentStatistics(keywords: Array<{ competitionRatio: number }>) {
  const stats = {
    excellent: 0,
    good: 0,
    warning: 0,
    danger: 0,
    total: keywords.length
  };
  
  keywords.forEach(keyword => {
    const judgment = calculateKeywordJudgment(keyword.competitionRatio);
    stats[judgment.level]++;
  });
  
  return stats;
}

/**
 * Filter keywords by judgment level
 * 
 * @param keywords - Array of keywords with judgments
 * @param levels - Judgment levels to filter
 * @returns Filtered keywords
 */
export function filterKeywordsByJudgment<T extends { competitionRatio: number }>(
  keywords: T[],
  levels: JudgmentLevel[]
): T[] {
  return keywords.filter(keyword => {
    const judgment = calculateKeywordJudgment(keyword.competitionRatio);
    return levels.includes(judgment.level);
  });
}

/**
 * Sort keywords by judgment quality (excellent → good → warning → danger)
 * 
 * @param keywords - Array of keywords with competition ratios
 * @returns Sorted keywords
 */
export function sortKeywordsByJudgment<T extends { competitionRatio: number }>(
  keywords: T[]
): T[] {
  return [...keywords].sort((a, b) => a.competitionRatio - b.competitionRatio);
}
