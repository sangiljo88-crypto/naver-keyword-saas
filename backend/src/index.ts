import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Bindings, ContextVariables } from './types';

// Import routes
import auth from './routes/auth';
import user from './routes/user';
import subscription from './routes/subscription';
import keyword from './routes/keyword';

const app = new Hono<{ Bindings: Bindings; Variables: ContextVariables }>();

// Global Middleware
app.use('*', logger());

// CORS Configuration
app.use('/api/*', cors({
  origin: '*', // In production, set specific origins
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
  credentials: true
}));

// API Routes
app.route('/api/auth', auth);
app.route('/api/user', user);
app.route('/api/subscription', subscription);
app.route('/api/keyword', keyword);

// Health Check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: 'production'
  });
});

// API Documentation Endpoint
app.get('/api', (c) => {
  return c.json({
    name: '네이버 키워드 분석 SaaS API',
    version: '2.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': '회원가입',
        'POST /api/auth/login': '로그인'
      },
      user: {
        'GET /api/user/me': '내 정보 조회',
        'PUT /api/user/password': '비밀번호 변경',
        'DELETE /api/user/account': '계정 삭제',
        'GET /api/user/api-credentials': 'API 키 조회',
        'PUT /api/user/api-credentials': 'API 키 저장'
      },
      subscription: {
        'GET /api/subscription/current': '현재 이용권',
        'GET /api/subscription/history': '이용권 이력',
        'GET /api/subscription/plans': '요금제 조회',
        'POST /api/subscription/purchase': '이용권 구매',
        'POST /api/subscription/cancel': '이용권 취소'
      },
      keyword: {
        'POST /api/keyword/search': '키워드 분석',
        'GET /api/keyword/history': '검색 이력',
        'GET /api/keyword/usage': '사용량 조회',
        'POST /api/keyword/export': '내보내기'
      }
    },
    docs: 'https://github.com/yourusername/naver-keyword-saas'
  });
});

// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      code: 'NOT_FOUND',
      path: c.req.path
    },
    404
  );
});

// Error Handler
app.onError((err, c) => {
  console.error('Server Error:', err);
  
  return c.json(
    {
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message
    },
    500
  );
});

export default app;
