import { Hono } from 'hono';
import { Bindings, User, KeywordSearchRequest, SearchType, ApiCredentials } from '../types';
import { authMiddleware, subscriptionMiddleware } from '../middleware/auth';
import { getMockKeywordData, calculateCompetitionRatio } from '../utils/naver-api';

const keyword = new Hono<{ Bindings: Bindings }>();

// Apply auth and subscription middleware to all routes
keyword.use('/*', authMiddleware, subscriptionMiddleware);

/**
 * POST /api/keyword/search
 * Search keywords and return analysis results
 */
keyword.post('/search', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    const body = await c.req.json<KeywordSearchRequest>();
    const { keywords, searchType } = body;
    
    if (!keywords || keywords.length === 0) {
      return c.json({ error: '키워드를 입력해주세요.' }, 400);
    }
    
    if (!searchType || !['blog', 'shopping', 'quick', 'bulk'].includes(searchType)) {
      return c.json({ error: '유효한 검색 유형을 선택해주세요.' }, 400);
    }
    
    // Check usage limits (20,000 searches per subscription)
    const today = new Date().toISOString().split('T')[0];
    const usage = await c.env.DB.prepare(
      `SELECT COALESCE(SUM(count), 0) as total 
       FROM usage_logs 
       WHERE user_id = ? AND action_type = 'keyword_search' AND date >= ?`
    ).bind(currentUser.id, today).first<{ total: number }>();
    
    const currentUsage = usage?.total || 0;
    if (currentUsage + keywords.length > 20000) {
      return c.json({ 
        error: `일일 검색 한도를 초과했습니다. (현재: ${currentUsage}/20,000)` 
      }, 429);
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
      return c.json({ 
        error: 'API 인증 정보가 설정되지 않았습니다. 설정 페이지에서 네이버 API 키를 등록해주세요.' 
      }, 400);
    }
    
    // Analyze keywords
    const results = await Promise.all(
      keywords.map(async (kw) => {
        try {
          // For now, use mock data
          // TODO: Integrate real Naver API calls
          const data = getMockKeywordData(kw);
          
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
            powerlinkCount: searchType === 'quick' ? data.powerlinkCount : undefined
          };
        } catch (error) {
          console.error(`Error analyzing keyword "${kw}":`, error);
          return {
            keyword: kw,
            error: '분석 실패'
          };
        }
      })
    );
    
    // Log usage
    await c.env.DB.prepare(
      `INSERT INTO usage_logs (user_id, action_type, count, date) 
       VALUES (?, 'keyword_search', ?, ?)`
    ).bind(currentUser.id, keywords.length, today).run();
    
    return c.json({
      results,
      usage: {
        current: currentUsage + keywords.length,
        limit: 20000
      }
    });
  } catch (error) {
    console.error('Keyword search error:', error);
    return c.json({ error: '키워드 분석 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * GET /api/keyword/history
 * Get keyword search history
 */
keyword.get('/history', async (c) => {
  try {
    const currentUser = c.get('user') as User;
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
    
    return c.json({
      history: results,
      pagination: {
        limit,
        offset,
        hasMore: results.length === limit
      }
    });
  } catch (error) {
    console.error('Get keyword history error:', error);
    return c.json({ error: '키워드 이력 조회 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * GET /api/keyword/usage
 * Get current usage statistics
 */
keyword.get('/usage', async (c) => {
  try {
    const currentUser = c.get('user') as User;
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
        limit: 20000
      },
      monthly: {
        used: monthlyUsage?.total || 0
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    return c.json({ error: '사용량 조회 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * POST /api/keyword/export
 * Export keywords to CSV/Excel format
 */
keyword.post('/export', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    const { keywords } = await c.req.json<{ keywords: any[] }>();
    
    if (!keywords || keywords.length === 0) {
      return c.json({ error: '내보낼 데이터가 없습니다.' }, 400);
    }
    
    // Generate CSV
    const headers = ['키워드', 'PC', '모바일', '합계', '문서수', '상품수', '경쟁비율'];
    const rows = keywords.map(k => [
      k.keyword,
      k.pcCount || '',
      k.mobileCount || '',
      k.totalCount || '',
      k.documentCount || '',
      k.productCount || '',
      k.competitionRatio || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Log export action
    const today = new Date().toISOString().split('T')[0];
    await c.env.DB.prepare(
      `INSERT INTO usage_logs (user_id, action_type, count, date) 
       VALUES (?, 'export', 1, ?)`
    ).bind(currentUser.id, today).run();
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="keywords_${Date.now()}.csv"`
      }
    });
  } catch (error) {
    console.error('Export keywords error:', error);
    return c.json({ error: '내보내기 중 오류가 발생했습니다.' }, 500);
  }
});

export default keyword;
