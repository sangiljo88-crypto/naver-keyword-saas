# 네이버 키워드 분석 SaaS - 프로젝트 아키텍처 및 설계 문서

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [화면 구조](#화면-구조)
3. [데이터베이스 설계](#데이터베이스-설계)
4. [API 엔드포인트](#api-엔드포인트)
5. [인증 및 권한](#인증-및-권한)
6. [네이버 API 연동](#네이버-api-연동)
7. [파일 구조](#파일-구조)
8. [개발 가이드](#개발-가이드)

---

## 프로젝트 개요

### 목표
스크린샷으로 제공된 실제 운영 중인 네이버 키워드 분석 SaaS를 기준으로, 동일한 기능을 제공하는 풀스택 웹 애플리케이션 구축

### 기술 스택
- **프론트엔드**: React 18 (CDN) + TailwindCSS + Axios
- **백엔드**: Hono Framework + TypeScript
- **데이터베이스**: Cloudflare D1 (SQLite)
- **인증**: JWT + bcryptjs
- **배포**: Cloudflare Pages
- **API**: 네이버 광고 API + 네이버 개발자센터 API

---

## 화면 구조

### 1. 블로그 키워드 추출 (녹색 탭)
- **기능**: 블로그 키워드 검색량 및 문서 수 분석
- **데이터 컬럼**:
  - 키워드
  - PC 검색량
  - 모바일(MO) 검색량
  - 합계(SUM)
  - 문서 수
  - 비율 (경쟁 비율)

### 2. 상품 키워드 추출 (보라색 탭)
- **기능**: 쇼핑 키워드 검색량 및 상품 수 분석
- **데이터 컬럼**:
  - 키워드
  - PC 검색량
  - 모바일 검색량
  - 합계
  - 상품 수
  - 비율

### 3. 빠른 검색량 조회 (회색 탭)
- **기능**: 빠른 검색량 조회
- **데이터 컬럼**:
  - 키워드
  - PC 검색량
  - 모바일 검색량
  - 검색 총합
  - 파워링크 수

### 4. 대량 키워드 조회 (빨간색 탭)
- **기능**: 키워드 일괄 입력 및 조회
- **특징**: 
  - 여러 키워드 한번에 입력
  - 문서 수 / 상품 수 선택 조회
  - "수동 키워드 조회 시대 끝" 메시지

### 5. API 설정
- **네이버 광고 API**:
  - ACC KEY
  - SECRET KEY (비밀키)
  - CUSTOMER_ID
- **네이버 개발자센터 API**:
  - Client ID
  - Client Secret
- **기능**: API 테스트, 저장

### 6. 이용권 결제
- **30일 이용권**: 12,000원 → **9,900원** (변경됨)
- **6개월 이용권**: **29,900원** (신규)
- **12개월 이용권**: **49,900원** (신규)
- **포함 기능**:
  - 키워드 조회수 제한 없음
  - 키워드 분석 제한 없음
  - 키워드 대량 조회
  - 대량 키워드 엑셀 다운로드

### 7. 내 정보
- ID 표시
- 가입일
- 이메일 (설정 링크)
- 비밀번호 변경
- 회원탈퇴
- 결제 기록

---

## 데이터베이스 설계

### users (회원)
```sql
- id: INTEGER PRIMARY KEY
- email: TEXT UNIQUE NOT NULL
- password_hash: TEXT NOT NULL
- name: TEXT
- created_at: DATETIME
- updated_at: DATETIME
```

### subscriptions (구독/이용권)
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FK
- plan_type: TEXT ('monthly', 'semi-annual', 'annual')
- price: INTEGER (9900, 29900, 49900)
- start_date: DATETIME
- end_date: DATETIME
- is_active: INTEGER (0/1)
- created_at: DATETIME
```

### api_credentials (API 키)
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER UNIQUE FK
- naver_ad_acc_key: TEXT
- naver_ad_secret_key: TEXT
- naver_ad_customer_id: TEXT
- naver_dev_client_id: TEXT
- naver_dev_client_secret: TEXT
- created_at: DATETIME
- updated_at: DATETIME
```

### keyword_history (키워드 이력)
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FK
- keyword: TEXT
- search_type: TEXT ('blog', 'shopping', 'quick', 'bulk')
- pc_count: INTEGER
- mobile_count: INTEGER
- total_count: INTEGER
- document_count: INTEGER
- product_count: INTEGER
- competition_ratio: REAL
- powerlink_count: INTEGER
- created_at: DATETIME
```

### usage_logs (사용량 추적)
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FK
- action_type: TEXT ('keyword_search', 'api_call', 'export')
- count: INTEGER
- date: DATE
- created_at: DATETIME
```

---

## API 엔드포인트

### 인증 (Auth)
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인

### 사용자 (User)
- `GET /api/user/me` - 내 정보
- `PUT /api/user/password` - 비밀번호 변경
- `DELETE /api/user/account` - 계정 삭제
- `GET /api/user/api-credentials` - API 키 조회
- `PUT /api/user/api-credentials` - API 키 저장

### 구독 (Subscription)
- `GET /api/subscription/current` - 현재 이용권
- `GET /api/subscription/history` - 이용권 이력
- `GET /api/subscription/plans` - 요금제 목록
- `POST /api/subscription/purchase` - 이용권 구매
- `POST /api/subscription/cancel` - 이용권 취소

### 키워드 (Keyword)
- `POST /api/keyword/search` - 키워드 분석
  - Request: `{ keywords: string[], searchType: 'blog'|'shopping'|'quick'|'bulk' }`
  - Response: `{ results: KeywordResult[], usage: { current, limit } }`
- `GET /api/keyword/history` - 검색 이력
- `GET /api/keyword/usage` - 사용량 조회
- `POST /api/keyword/export` - CSV/Excel 내보내기

---

## 인증 및 권한

### 인증 흐름
1. 사용자 로그인/회원가입
2. JWT 토큰 발급 (7일 유효)
3. Authorization 헤더로 토큰 전송
4. 미들웨어에서 토큰 검증
5. 사용자 정보 컨텍스트에 저장

### 권한 체크
- **authMiddleware**: 로그인 필수 라우트
- **subscriptionMiddleware**: 유효한 이용권 필수 라우트

---

## 네이버 API 연동

### 네이버 광고 API
- **용도**: 키워드 검색량 조회
- **필요 정보**: ACC KEY, SECRET KEY, CUSTOMER_ID
- **엔드포인트**: `https://api.naver.com/keywordstool`
- **반환 데이터**: PC/모바일/합계 검색량

### 네이버 개발자센터 API

#### 블로그 검색 API
- **용도**: 블로그 문서 수 조회
- **필요 정보**: Client ID, Client Secret
- **엔드포인트**: `https://openapi.naver.com/v1/search/blog.json`
- **반환 데이터**: total (문서 수)

#### 쇼핑 검색 API
- **용도**: 쇼핑 상품 수 조회
- **필요 정보**: Client ID, Client Secret
- **엔드포인트**: `https://openapi.naver.com/v1/search/shop.json`
- **반환 데이터**: total (상품 수)

---

## 파일 구조

```
webapp/
├── src/
│   ├── index.tsx              # 메인 애플리케이션 + React UI
│   ├── types.ts               # TypeScript 타입 정의
│   ├── middleware/
│   │   └── auth.ts            # 인증/구독 미들웨어
│   ├── routes/
│   │   ├── auth.ts            # 인증 라우트
│   │   ├── user.ts            # 사용자 라우트
│   │   ├── subscription.ts    # 구독 라우트
│   │   └── keyword.ts         # 키워드 라우트
│   └── utils/
│       ├── auth.ts            # 인증 유틸리티
│       └── naver-api.ts       # 네이버 API 연동
├── migrations/
│   └── 0001_initial_schema.sql
├── public/
│   └── static/
├── ecosystem.config.cjs       # PM2 설정
├── wrangler.jsonc             # Cloudflare 설정
└── package.json
```

---

## 개발 가이드

### 로컬 개발 실행

```bash
# 1. 의존성 설치
npm install

# 2. DB 마이그레이션
npm run db:migrate:local

# 3. 빌드
npm run build

# 4. 서비스 시작
pm2 start ecosystem.config.cjs

# 5. 테스트
curl http://localhost:3000/api/health
```

### 개발 워크플로우

1. **백엔드 API 수정**
   - `src/routes/` 파일 수정
   - `npm run build`
   - `pm2 restart naver-keyword-saas`

2. **프론트엔드 UI 수정**
   - `src/index.tsx` 파일 수정
   - `npm run build`
   - 브라우저 새로고침

3. **데이터베이스 변경**
   - `migrations/` 폴더에 새 SQL 파일 생성
   - `npm run db:migrate:local`

### 다음 단계

1. **네이버 API 실제 연동**
   - `src/utils/naver-api.ts` 파일 구현
   - API 키 검증 및 에러 핸들링

2. **프론트엔드 완성**
   - 키워드 입력 폼
   - 결과 테이블
   - 파일 업로드

3. **결제 시스템**
   - 토스페이먼츠/아임포트 연동
   - 웹훅 처리

4. **배포**
   - Cloudflare Pages 배포
   - 프로덕션 DB 생성

---

## 참고 사항

- 현재는 목 데이터(Mock Data)로 동작
- 실제 네이버 API 연동 필요
- 결제 시스템은 간단한 구독 모델만 구현
- 프론트엔드는 기본 구조만 완성

## 문의

프로젝트 관련 문의는 GitHub Issues를 활용해주세요.
