import { Hono } from 'hono';
import { Bindings, User, KeywordSearchRequest, SearchType, ApiCredentials, ContextVariables, KeywordResult } from '../types';
import { authMiddleware, subscriptionMiddleware, usageLimitMiddleware } from '../middleware/auth';
import { getMockKeywordData, calculateCompetitionRatio } from '../utils/naver-api';
import { calculateKeywordJudgment } from '../services/judgment';
import { logUsage } from '../services/usage';
import { STATUS_CODES, ERROR_MESSAGES, USAGE_LIMITS } from '../constants';

const keyword = new Hono<{ Bindings: Bindings; Variables: ContextVariables }>();

// Apply middlewares in order: auth → subscription → usage limit
keyword.use('/*', authMiddleware);
keyword.use('/*', subscriptionMiddleware);

/**
 * POST /api/keyword/search
 * Search keywords with judgment
 */
keyword.post('/search', usageLimitMiddleware, async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json<KeywordSearchRequest>();
    const { keywords, searchType } = body;
    
    // Validation
    if (!keywords || keywords.length === 0) {
      return c.json(
        { error: '키워드를 입력해주세요.', code: 'INVALID_INPUT' },
        STATUS_CODES.BAD_REQUEST
      );
    }
    
    if (!searchType || !['blog', 'shopping', 'quick', 'bulk'].includes(searchType)) {
      return c.json(
        { error: '유효한 검색 유형을 선택해주세요.', code: 'INVALID_INPUT' },
        STATUS_CODES.BAD_REQUEST
      );
    }
    
    if (keywords.length > USAGE_LIMITS.MAX_KEYWORDS_PER_REQUEST) {
      return c.json(
        { 
          error: ERROR_MESSAGES.MAX_KEYWORDS_EXCEEDED,
          code: 'MAX_KEYWORDS_EXCEEDED',
          limit: USAGE_LIMITS.MAX_KEYWORDS_PER_REQUEST
        },
        STATUS_CODES.BAD_REQUEST
      );
    }
    
    // Get user's API credentials
    const credentials = await c.env.DB.prepare(
      'SELECT * FROM api_credentials WHERE user_id = ?'
    ).bind(currentUser.id).first<ApiCredentials>();
    
    // Check if user has required API credentials
    const hasNaverAd = credentials && 
      credentials.naver_ad_acc_key && 
      credentials.naver_ad_secret_key && 
      credentials.naver_ad_customer_id;
      
    const hasNaverDev = credentials && 
      credentials.naver_dev_client_id && 
      credentials.naver_dev_client_secret;
    
    if (!hasNaverAd && !hasNaverDev) {
      return c.json(
        { 
          error: ERROR_MESSAGES.API_CREDENTIALS_NOT_FOUND,
          code: 'API_CREDENTIALS_NOT_FOUND'
        },
        STATUS_CODES.BAD_REQUEST
      );
    }
    
    // Analyze keywords
    const results: KeywordResult[] = await Promise.all(
      keywords.map(async (kw) => {
        try {
          // For now, use mock data
          // TODO: Integrate real Naver API calls
          const data = getMockKeywordData(kw);
          
          // Calculate judgment based on competition ratio
          const judgment = calculateKeywordJudgment(data.competitionRatio);
          
          // Save to history
          await c.env.DB.prepare(
            `INSERT INTO keyword_history 
             (user_id, keyword, search_type, pc_count, mobile_count, total_count, 
              document_count, product_count, competition_ratio, powerlink_count) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            currentUser.id,
            kw,
            searchType,
            data.pcCount,
            data.mobileCount,
            data.totalCount,
            data.documentCount,
            data.productCount,
            data.competitionRatio,
            data.powerlinkCount
          ).run();
          
          return {
            keyword: kw,
            pcCount: data.pcCount,
            mobileCount: data.mobileCount,
            totalCount: data.totalCount,
            documentCount: searchType === 'blog' || searchType === 'bulk' ? data.documentCount : undefined,
            productCount: searchType === 'shopping' || searchType === 'bulk' ? data.productCount : undefined,
            competitionRatio: data.competitionRatio,
            powerlinkCount: searchType === 'quick' ? data.powerlinkCount : undefined,
            judgment // 🔥 키워드 자동 판단 추가
          };
        } catch (error) {
          console.error(`Error analyzing keyword "${kw}":`, error);
          return {
            keyword: kw,
            pcCount: 0,
            mobileCount: 0,
            totalCount: 0,
            competitionRatio: 0,
            judgment: calculateKeywordJudgment(0)
          } as KeywordResult;
        }
      })
    );
    
    // Log usage
    await logUsage(c.env.DB, currentUser.id, 'keyword_search', keywords.length);
    
    // Get current usage info
    const usage = c.get('usage');
    
    return c.json({
      results,
      usage: {
        current: (usage?.current || 0) + keywords.length,
        limit: usage?.limit || USAGE_LIMITS.DAILY_KEYWORD_SEARCH,
        remaining: Math.max(0, (usage?.limit || USAGE_LIMITS.DAILY_KEYWORD_SEARCH) - ((usage?.current || 0) + keywords.length))
      }
    });
  } catch (error) {
    console.error('Keyword search error:', error);
    return c.json(
      { 
        error: ERROR_MESSAGES.INTERNAL_ERROR,
        code: 'INTERNAL_ERROR'
      },
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /api/keyword/history
 * Get keyword search history
 */
keyword.get('/history', async (c) => {
  try {
    const currentUser = c.get('user');
    const searchType = c.req.query('type') as SearchType | undefined;
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');
    
    let query = `
      SELECT * FROM keyword_history 
      WHERE user_id = ?
    `;
    const params: any[] = [currentUser.id];
    
    if (searchType) {
      query += ' AND search_type = ?';
      params.push(searchType);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // Add judgment to each result
    const resultsWithJudgment = results.map((item: any) => ({
      ...item,
      judgment: calculateKeywordJudgment(item.competition_ratio || 0)
    }));
    
    return c.json({
      history: resultsWithJudgment,
      pagination: {
        limit,
        offset,
        hasMore: results.length === limit
      }
    });
  } catch (error) {
    console.error('Get keyword history error:', error);
    return c.json(
      { 
        error: ERROR_MESSAGES.INTERNAL_ERROR,
        code: 'INTERNAL_ERROR'
      },
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /api/keyword/usage
 * Get current usage statistics
 */
keyword.get('/usage', async (c) => {
  try {
    const currentUser = c.get('user');
    const today = new Date().toISOString().split('T')[0];
    
    // Daily usage
    const dailyUsage = await c.env.DB.prepare(
      `SELECT COALESCE(SUM(count), 0) as total 
       FROM usage_logs 
       WHERE user_id = ? AND action_type = 'keyword_search' AND date = ?`
    ).bind(currentUser.id, today).first<{ total: number }>();
    
    // Monthly usage
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    
    const monthlyUsage = await c.env.DB.prepare(
      `SELECT COALESCE(SUM(count), 0) as total 
       FROM usage_logs 
       WHERE user_id = ? AND action_type = 'keyword_search' AND date >= ?`
    ).bind(currentUser.id, monthStartStr).first<{ total: number }>();
    
    return c.json({
      daily: {
        used: dailyUsage?.total || 0,
        limit: USAGE_LIMITS.DAILY_KEYWORD_SEARCH,
        remaining: Math.max(0, USAGE_LIMITS.DAILY_KEYWORD_SEARCH - (dailyUsage?.total || 0))
      },
      monthly: {
        used: monthlyUsage?.total || 0
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    return c.json(
      { 
        error: ERROR_MESSAGES.INTERNAL_ERROR,
        code: 'INTERNAL_ERROR'
      },
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * POST /api/keyword/export
 * Export keywords to CSV format
 */
keyword.post('/export', async (c) => {
  try {
    const currentUser = c.get('user');
    const { keywords } = await c.req.json<{ keywords: any[] }>();
    
    if (!keywords || keywords.length === 0) {
      return c.json(
        { error: '내보낼 데이터가 없습니다.', code: 'INVALID_INPUT' },
        STATUS_CODES.BAD_REQUEST
      );
    }
    
    // Generate CSV with UTF-8 BOM for Excel
    const BOM = '\uFEFF';
    const headers = ['키워드', 'PC', '모바일', '합계', '문서수', '상품수', '경쟁비율', '판단'];
    const rows = keywords.map(k => [
      k.keyword,
      k.pcCount || '',
      k.mobileCount || '',
      k.totalCount || '',
      k.documentCount || '',
      k.productCount || '',
      k.competitionRatio || '',
      k.judgment?.symbol || ''
    ]);
    
    const csv = BOM + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Log export action
    const today = new Date().toISOString().split('T')[0];
    await logUsage(c.env.DB, currentUser.id, 'export', 1);
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="keywords_${Date.now()}.csv"`
      }
    });
  } catch (error) {
    console.error('Export keywords error:', error);
    return c.json(
      { 
        error: ERROR_MESSAGES.INTERNAL_ERROR,
        code: 'INTERNAL_ERROR'
      },
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default keyword;
