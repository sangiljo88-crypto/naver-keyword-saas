// Cloudflare Bindings
export type Bindings = {
  DB: D1Database;
};

// User
export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

// Subscription
export type PlanType = 'monthly' | 'semi-annual' | 'annual';

export interface Subscription {
  id: number;
  user_id: number;
  plan_type: PlanType;
  price: number;
  start_date: string;
  end_date: string;
  is_active: number;
  created_at: string;
}

// API Credentials
export interface ApiCredentials {
  id: number;
  user_id: number;
  naver_ad_acc_key: string | null;
  naver_ad_secret_key: string | null;
  naver_ad_customer_id: string | null;
  naver_dev_client_id: string | null;
  naver_dev_client_secret: string | null;
  created_at: string;
  updated_at: string;
}

// Keyword History
export type SearchType = 'blog' | 'shopping' | 'quick' | 'bulk';

export interface KeywordHistory {
  id: number;
  user_id: number;
  keyword: string;
  search_type: SearchType;
  pc_count: number | null;
  mobile_count: number | null;
  total_count: number | null;
  document_count: number | null;
  product_count: number | null;
  competition_ratio: number | null;
  powerlink_count: number | null;
  created_at: string;
}

// Usage Logs
export type ActionType = 'keyword_search' | 'api_call' | 'export';

export interface UsageLog {
  id: number;
  user_id: number;
  action_type: ActionType;
  count: number;
  date: string;
  created_at: string;
}

// Keyword Judgment
export type JudgmentLevel = 'excellent' | 'good' | 'warning' | 'danger';

export interface KeywordJudgment {
  level: JudgmentLevel;
  symbol: string;
  label: string;
  description: string;
}

// API Request/Response Types
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
}

export interface KeywordSearchRequest {
  keywords: string[];
  searchType: SearchType;
}

export interface KeywordResult {
  keyword: string;
  pcCount: number;
  mobileCount: number;
  totalCount: number;
  documentCount?: number;
  productCount?: number;
  competitionRatio: number;
  powerlinkCount?: number;
  judgment: KeywordJudgment;
}

export interface ApiCredentialsRequest {
  naverAdAccKey?: string;
  naverAdSecretKey?: string;
  naverAdCustomerId?: string;
  naverDevClientId?: string;
  naverDevClientSecret?: string;
}

export interface SubscriptionRequest {
  planType: PlanType;
}

// JWT Payload
export interface JWTPayload {
  userId: number;
  email: string;
  exp: number;
}

// Context Variables
export interface ContextVariables {
  user: User;
  subscription?: Subscription;
  usage?: {
    current: number;
    limit: number;
  };
}

// Usage Check Result
export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  message?: string;
}

// Subscription Check Result
export interface SubscriptionCheckResult {
  hasActive: boolean;
  subscription?: Subscription;
  daysRemaining?: number;
  status: 'active' | 'expired' | 'none';
  message?: string;
}
