import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Bindings } from './types';

// Import routes
import auth from './routes/auth';
import user from './routes/user';
import subscription from './routes/subscription';
import keyword from './routes/keyword';

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// API Routes
app.route('/api/auth', auth);
app.route('/api/user', user);
app.route('/api/subscription', subscription);
app.route('/api/keyword', keyword);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Frontend route - serve React app
app.get('*', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>네이버 키워드 분석 SaaS - 무한 키워드</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div id="root"></div>
        
        <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        
        <script type="text/babel">
          const { useState, useEffect, createContext, useContext } = React;
          
          // Auth Context
          const AuthContext = createContext(null);
          
          function AuthProvider({ children }) {
            const [user, setUser] = useState(null);
            const [token, setToken] = useState(localStorage.getItem('token'));
            const [loading, setLoading] = useState(true);
            
            useEffect(() => {
              if (token) {
                axios.defaults.headers.common['Authorization'] = \`Bearer \${token}\`;
                // Fetch user info
                axios.get('/api/user/me')
                  .then(res => setUser(res.data))
                  .catch(() => {
                    setToken(null);
                    localStorage.removeItem('token');
                  })
                  .finally(() => setLoading(false));
              } else {
                setLoading(false);
              }
            }, [token]);
            
            const login = (newToken, userData) => {
              setToken(newToken);
              setUser(userData);
              localStorage.setItem('token', newToken);
              axios.defaults.headers.common['Authorization'] = \`Bearer \${newToken}\`;
            };
            
            const logout = () => {
              setToken(null);
              setUser(null);
              localStorage.removeItem('token');
              delete axios.defaults.headers.common['Authorization'];
            };
            
            return (
              <AuthContext.Provider value={{ user, token, login, logout, loading }}>
                {children}
              </AuthContext.Provider>
            );
          }
          
          function useAuth() {
            return useContext(AuthContext);
          }
          
          // Login Page
          function LoginPage() {
            const [isLogin, setIsLogin] = useState(true);
            const [email, setEmail] = useState('');
            const [password, setPassword] = useState('');
            const [name, setName] = useState('');
            const [error, setError] = useState('');
            const [loading, setLoading] = useState(false);
            const { login } = useAuth();
            
            const handleSubmit = async (e) => {
              e.preventDefault();
              setError('');
              setLoading(true);
              
              try {
                const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
                const data = isLogin ? { email, password } : { email, password, name };
                
                const res = await axios.post(endpoint, data);
                login(res.data.token, res.data.user);
              } catch (err) {
                setError(err.response?.data?.error || '오류가 발생했습니다.');
              } finally {
                setLoading(false);
              }
            };
            
            return (
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      <i className="fas fa-infinity text-indigo-600 mr-2"></i>
                      무한 키워드
                    </h1>
                    <p className="text-gray-600">네이버 키워드 분석 SaaS</p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="이름을 입력하세요"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="email@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="최소 6자 이상"
                      />
                    </div>
                    
                    {error && (
                      <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                    >
                      {loading ? '처리중...' : (isLogin ? '로그인' : '회원가입')}
                    </button>
                  </form>
                  
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                      }}
                      className="text-indigo-600 hover:text-indigo-700 text-sm"
                    >
                      {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                    </button>
                  </div>
                </div>
              </div>
            );
          }
          
          // Main Dashboard
          function Dashboard() {
            const { user, logout } = useAuth();
            const [activeTab, setActiveTab] = useState('blog');
            
            return (
              <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b">
                  <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">
                      <i className="fas fa-infinity text-indigo-600 mr-2"></i>
                      무한 키워드
                    </h1>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">{user?.email}</span>
                      <button
                        onClick={logout}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        <i className="fas fa-sign-out-alt mr-1"></i>
                        로그아웃
                      </button>
                    </div>
                  </div>
                </header>
                
                {/* Sidebar + Content */}
                <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
                  {/* Sidebar */}
                  <nav className="w-64 bg-white rounded-lg shadow-sm p-4">
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('blog')}
                        className={\`w-full text-left px-4 py-2 rounded-lg \${activeTab === 'blog' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}\`}
                      >
                        <i className="fas fa-blog mr-2"></i>
                        블로그 키워드 추출
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('shopping')}
                        className={\`w-full text-left px-4 py-2 rounded-lg \${activeTab === 'shopping' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}\`}
                      >
                        <i className="fas fa-shopping-cart mr-2"></i>
                        상품 키워드 추출
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('quick')}
                        className={\`w-full text-left px-4 py-2 rounded-lg \${activeTab === 'quick' ? 'bg-gray-100 text-gray-700' : 'hover:bg-gray-100'}\`}
                      >
                        <i className="fas fa-bolt mr-2"></i>
                        빠른 검색량 조회
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('bulk')}
                        className={\`w-full text-left px-4 py-2 rounded-lg \${activeTab === 'bulk' ? 'bg-red-100 text-red-700' : 'hover:bg-gray-100'}\`}
                      >
                        <i className="fas fa-list mr-2"></i>
                        대량 키워드 조회
                      </button>
                      
                      <hr className="my-4" />
                      
                      <button
                        onClick={() => setActiveTab('api')}
                        className={\`w-full text-left px-4 py-2 rounded-lg \${activeTab === 'api' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}\`}
                      >
                        <i className="fas fa-key mr-2"></i>
                        API 설정
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('subscription')}
                        className={\`w-full text-left px-4 py-2 rounded-lg \${activeTab === 'subscription' ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-gray-100'}\`}
                      >
                        <i className="fas fa-credit-card mr-2"></i>
                        이용권 결제
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('profile')}
                        className={\`w-full text-left px-4 py-2 rounded-lg \${activeTab === 'profile' ? 'bg-gray-100 text-gray-700' : 'hover:bg-gray-100'}\`}
                      >
                        <i className="fas fa-user mr-2"></i>
                        내 정보
                      </button>
                    </div>
                  </nav>
                  
                  {/* Content */}
                  <main className="flex-1">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h2 className="text-2xl font-bold mb-6">
                        {activeTab === 'blog' && '블로그 키워드 추출'}
                        {activeTab === 'shopping' && '상품 키워드 추출'}
                        {activeTab === 'quick' && '빠른 검색량 조회'}
                        {activeTab === 'bulk' && '대량 키워드 조회'}
                        {activeTab === 'api' && 'API 설정'}
                        {activeTab === 'subscription' && '이용권 결제'}
                        {activeTab === 'profile' && '내 정보'}
                      </h2>
                      
                      <div className="text-gray-600">
                        {activeTab === 'blog' && <p>블로그 키워드 분석 기능입니다. PC/모바일/합계 검색량과 문서수를 확인할 수 있습니다.</p>}
                        {activeTab === 'shopping' && <p>상품 키워드 분석 기능입니다. 검색량과 상품수를 확인할 수 있습니다.</p>}
                        {activeTab === 'quick' && <p>빠른 검색량 조회 기능입니다.</p>}
                        {activeTab === 'bulk' && <p>대량 키워드를 한번에 조회할 수 있습니다.</p>}
                        {activeTab === 'api' && <p>네이버 API 키를 설정하세요.</p>}
                        {activeTab === 'subscription' && <SubscriptionContent />}
                        {activeTab === 'profile' && <p>내 정보 페이지입니다.</p>}
                      </div>
                    </div>
                  </main>
                </div>
              </div>
            );
          }
          
          // Subscription Content
          function SubscriptionContent() {
            const [plans, setPlans] = useState([]);
            const [loading, setLoading] = useState(true);
            
            useEffect(() => {
              axios.get('/api/subscription/plans')
                .then(res => setPlans(res.data.plans))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
            }, []);
            
            const handlePurchase = async (planType) => {
              if (!confirm(\`\${planType} 이용권을 구매하시겠습니까?\`)) return;
              
              try {
                await axios.post('/api/subscription/purchase', { planType });
                alert('이용권이 성공적으로 구매되었습니다!');
              } catch (err) {
                alert(err.response?.data?.error || '구매에 실패했습니다.');
              }
            };
            
            if (loading) return <p>로딩중...</p>;
            
            return (
              <div className="grid grid-cols-3 gap-6 mt-6">
                {plans.map(plan => (
                  <div key={plan.type} className="border rounded-lg p-6 hover:shadow-lg transition">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-3xl font-bold text-indigo-600 mb-4">
                      {plan.price.toLocaleString()}원
                    </p>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    {plan.discount && (
                      <p className="text-green-600 mb-4">
                        <i className="fas fa-tag mr-1"></i>
                        {plan.discount}% 할인
                      </p>
                    )}
                    <button
                      onClick={() => handlePurchase(plan.type)}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                    >
                      구매하기
                    </button>
                  </div>
                ))}
              </div>
            );
          }
          
          // Main App
          function App() {
            const { user, loading } = useAuth();
            
            if (loading) {
              return (
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-4xl text-indigo-600 mb-4"></i>
                    <p className="text-gray-600">로딩중...</p>
                  </div>
                </div>
              );
            }
            
            return user ? <Dashboard /> : <LoginPage />;
          }
          
          // Render
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(
            <AuthProvider>
              <App />
            </AuthProvider>
          );
        </script>
    </body>
    </html>
  `);
});

export default app;
