-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table (이용권 관리)
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan_type TEXT NOT NULL CHECK(plan_type IN ('monthly', 'semi-annual', 'annual')),
  price INTEGER NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API Credentials table (네이버 API 키 저장)
CREATE TABLE IF NOT EXISTS api_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  
  -- 네이버 광고 API
  naver_ad_acc_key TEXT,
  naver_ad_secret_key TEXT,
  naver_ad_customer_id TEXT,
  
  -- 네이버 개발자센터 API
  naver_dev_client_id TEXT,
  naver_dev_client_secret TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Keyword History table (키워드 조회 이력)
CREATE TABLE IF NOT EXISTS keyword_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  search_type TEXT NOT NULL CHECK(search_type IN ('blog', 'shopping', 'quick', 'bulk')),
  
  -- 검색 결과 데이터
  pc_count INTEGER,
  mobile_count INTEGER,
  total_count INTEGER,
  document_count INTEGER,
  product_count INTEGER,
  competition_ratio REAL,
  powerlink_count INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Usage Logs table (사용량 추적)
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK(action_type IN ('keyword_search', 'api_call', 'export')),
  count INTEGER DEFAULT 1,
  date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_keyword_history_user_id ON keyword_history(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_history_created_at ON keyword_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON usage_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
