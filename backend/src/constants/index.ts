/**
 * Business Constants
 * 비즈니스 로직 상수 정의
 */

// Subscription Plans
export const PLAN_PRICES = {
  monthly: 9900,
  'semi-annual': 29900,
  annual: 49900
} as const;

export const PLAN_DURATIONS = {
  monthly: 30,
  'semi-annual': 180,
  annual: 365
} as const;

// Usage Limits
export const USAGE_LIMITS = {
  DAILY_KEYWORD_SEARCH: 20000,
  MAX_KEYWORDS_PER_REQUEST: 100,
  MAX_HISTORY_RECORDS: 1000
} as const;

// Keyword Judgment Thresholds
export const KEYWORD_JUDGMENT = {
  EXCELLENT: {
    symbol: '🔥',
    label: '우수',
    maxRatio: 0.5,
    description: '진입 추천 키워드'
  },
  GOOD: {
    symbol: '✅',
    label: '양호',
    maxRatio: 1.0,
    description: '적당한 경쟁'
  },
  WARNING: {
    symbol: '⚠️',
    label: '경고',
    maxRatio: 2.0,
    description: '높은 경쟁'
  },
  DANGER: {
    symbol: '❌',
    label: '위험',
    maxRatio: Infinity,
    description: '매우 높은 경쟁'
  }
} as const;

// API Response Status Codes
export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Auth
  AUTH_REQUIRED: '인증이 필요합니다.',
  INVALID_TOKEN: '유효하지 않은 토큰입니다.',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 일치하지 않습니다.',
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다.',
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
  
  // Subscription
  NO_ACTIVE_SUBSCRIPTION: '유효한 이용권이 없습니다. 이용권을 구매해주세요.',
  SUBSCRIPTION_EXPIRED: '이용권이 만료되었습니다. 이용권을 갱신해주세요.',
  
  // Usage
  DAILY_LIMIT_EXCEEDED: '일일 검색 한도를 초과했습니다.',
  MAX_KEYWORDS_EXCEEDED: `한 번에 최대 ${USAGE_LIMITS.MAX_KEYWORDS_PER_REQUEST}개까지 조회 가능합니다.`,
  
  // API Credentials
  API_CREDENTIALS_NOT_FOUND: 'API 인증 정보가 설정되지 않았습니다. 설정 페이지에서 네이버 API 키를 등록해주세요.',
  
  // General
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  INTERNAL_ERROR: '서버 오류가 발생했습니다.'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  REGISTERED: '회원가입이 완료되었습니다.',
  LOGIN: '로그인되었습니다.',
  PASSWORD_CHANGED: '비밀번호가 성공적으로 변경되었습니다.',
  ACCOUNT_DELETED: '계정이 성공적으로 삭제되었습니다.',
  API_CREDENTIALS_SAVED: 'API 인증 정보가 성공적으로 저장되었습니다.',
  SUBSCRIPTION_PURCHASED: '이용권이 성공적으로 구매되었습니다.',
  SUBSCRIPTION_CANCELLED: '이용권이 성공적으로 취소되었습니다.'
} as const;
