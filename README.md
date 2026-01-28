# 무한 키워드 - 네이버 키워드 분석 SaaS v2.0

## 🎯 프로젝트 개요

**실제 운영 가능한** 네이버 키워드 분석 SaaS 플랫폼입니다.

프론트엔드/백엔드 완전 분리, 엔터프라이즈급 아키텍처, 키워드 자동 판단 로직, 사용량 차단 시스템을 포함한 프로덕션 레디 구조입니다.

## 🏗️ 프로젝트 구조

```
webapp/
├── backend/                      # 백엔드 API 서버
│   ├── src/
│   │   ├── constants/           # 비즈니스 상수 정의
│   │   ├── middleware/          # 인증/구독/사용량 미들웨어
│   │   ├── routes/              # API 라우트 핸들러
│   │   ├── services/            # 비즈니스 로직 서비스
│   │   ├── utils/               # 유틸리티 함수
│   │   ├── types.ts             # TypeScript 타입 정의
│   │   └── index.ts             # 메인 애플리케이션
│   ├── migrations/              # 데이터베이스 마이그레이션
│   ├── package.json
│   ├── vite.config.ts
│   └── wrangler.jsonc           # Cloudflare 설정
│
├── frontend/                     # 프론트엔드 SPA
│   ├── src/
│   │   ├── components/          # React 컴포넌트
│   │   ├── pages/               # 페이지 컴포넌트
│   │   ├── services/            # API 클라이언트
│   │   ├── hooks/               # Custom React Hooks
│   │   ├── contexts/            # React Context
│   │   ├── utils/               # 유틸리티 함수
│   │   ├── App.tsx              # 메인 앱
│   │   └── main.tsx             # 진입점
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── ecosystem.config.cjs          # PM2 설정 (개발용)
├── README.md                     # 이 파일
└── ARCHITECTURE.md               # 아키텍처 문서
```

## ✨ 주요 기능 v2.0

### 🔒 엔터프라이즈급 보안 및 권한

- ✅ **3단계 미들웨어 체인**
  - 인증 (authMiddleware)
  - 구독 상태 검증 (subscriptionMiddleware)
  - 사용량 제한 검증 (usageLimitMiddleware)

- ✅ **명확한 HTTP 상태 코드**
  - 401: 인증 필요
  - 403: 권한 없음 (구독 만료/없음)
  - 429: 사용량 한도 초과

- ✅ **구독 상태 분기 처리**
  - `active`: 정상 이용권
  - `expired`: 만료된 이용권
  - `none`: 이용권 미구매

### 🔥 키워드 자동 판단 (NEW!)

**Competition Ratio 기반 자동 판단:**

| 비율      | 판단 | 심볼 | 설명              |
|-----------|------|------|-------------------|
| ≤ 0.5     | 우수 | 🔥   | 진입 추천 키워드  |
| ≤ 1.0     | 양호 | ✅   | 적당한 경쟁       |
| ≤ 2.0     | 경고 | ⚠️   | 높은 경쟁         |
| > 2.0     | 위험 | ❌   | 매우 높은 경쟁    |

**API 응답 예시:**
```json
{
  "results": [
    {
      "keyword": "키워드분석",
      "pcCount": 15000,
      "mobileCount": 25000,
      "totalCount": 40000,
      "documentCount": 18000,
      "competitionRatio": 0.45,
      "judgment": {
        "level": "excellent",
        "symbol": "🔥",
        "label": "우수",
        "description": "진입 추천 키워드"
      }
    }
  ]
}
```

### 🚫 사용량 차단 시스템 (NEW!)

- ✅ **요청 전 선검사**
  - 요청 시 `usage_logs` 테이블에서 현재 사용량 조회
  - 요청 키워드 개수 + 현재 사용량 > 20,000 → 즉시 차단

- ✅ **명확한 피드백**
  ```json
  {
    "error": "일일 검색 한도를 초과합니다. (현재: 19,950/20,000, 요청: 100)",
    "code": "USAGE_LIMIT_EXCEEDED",
    "usage": {
      "current": 19950,
      "limit": 20000,
      "remaining": 50,
      "requested": 100
    }
  }
  ```

### 📊 키워드 분석

- ✅ **4가지 검색 타입**
  - 블로그 키워드 추출
  - 상품 키워드 추출
  - 빠른 검색량 조회
  - 대량 키워드 조회

- ✅ **검색 결과**
  - PC/모바일/합계 검색량
  - 문서 수 / 상품 수
  - 경쟁 비율
  - **자동 판단 (NEW!)**

- ✅ **CSV/Excel 내보내기**
  - UTF-8 BOM 포함 (Excel 호환)
  - 판단 심볼 포함

## 🌐 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인

### 사용자
- `GET /api/user/me` - 내 정보
- `PUT /api/user/password` - 비밀번호 변경
- `DELETE /api/user/account` - 계정 삭제
- `GET /api/user/api-credentials` - API 키 조회
- `PUT /api/user/api-credentials` - API 키 저장

### 구독
- `GET /api/subscription/current` - 현재 이용권
- `GET /api/subscription/history` - 이용권 이력
- `GET /api/subscription/plans` - 요금제 조회
- `POST /api/subscription/purchase` - 이용권 구매
- `POST /api/subscription/cancel` - 이용권 취소

### 키워드
- `POST /api/keyword/search` - 키워드 분석 (+ judgment)
- `GET /api/keyword/history` - 검색 이력
- `GET /api/keyword/usage` - 사용량 조회
- `POST /api/keyword/export` - 내보내기

## 🚀 빠른 시작

### 개발 환경 실행

```bash
# 1. 백엔드 데이터베이스 마이그레이션
cd backend
npm run db:migrate:local

# 2. 백엔드 빌드
npm run build

# 3. 루트 디렉토리로 돌아가서 PM2로 백엔드 시작
cd ..
pm2 start ecosystem.config.cjs --only naver-keyword-backend

# 4. 프론트엔드 시작 (선택사항)
pm2 start ecosystem.config.cjs --only naver-keyword-frontend

# 5. 테스트
curl http://localhost:3000/api/health
```

### 백엔드 전용 개발

```bash
cd backend
npm run dev:sandbox
```

### 프론트엔드 전용 개발

```bash
cd frontend
npm run dev
```

## 📊 데이터베이스 스키마

- **users** - 회원 정보
- **subscriptions** - 구독/이용권
- **api_credentials** - 네이버 API 키
- **keyword_history** - 키워드 조회 이력
- **usage_logs** - 사용량 추적

## 🔧 환경 변수

### 백엔드 (.dev.vars)
```bash
# Cloudflare D1 Database는 wrangler.jsonc에 설정
```

### 프론트엔드 (.env)
```bash
VITE_API_BASE_URL=http://localhost:3000
```

## 🎨 기술 스택

### 백엔드
- **프레임워크**: Hono v4
- **런타임**: Cloudflare Workers
- **데이터베이스**: Cloudflare D1 (SQLite)
- **인증**: JWT + bcryptjs
- **빌드**: Vite

### 프론트엔드
- **프레임워크**: React 18
- **라우팅**: React Router DOM v6
- **상태 관리**: Zustand
- **HTTP 클라이언트**: Axios
- **스타일링**: TailwindCSS
- **빌드**: Vite

## 📝 개발 가이드

### 백엔드 개발

1. **새로운 API 엔드포인트 추가**
   ```typescript
   // backend/src/routes/my-route.ts
   import { Hono } from 'hono';
   import { authMiddleware, subscriptionMiddleware } from '../middleware/auth';
   
   const myRoute = new Hono();
   
   myRoute.use('/*', authMiddleware, subscriptionMiddleware);
   
   myRoute.get('/data', async (c) => {
     const user = c.get('user');
     return c.json({ data: 'example' });
   });
   
   export default myRoute;
   ```

2. **미들웨어 체인 사용**
   ```typescript
   // 인증만 필요한 경우
   route.use('/*', authMiddleware);
   
   // 인증 + 구독 필요
   route.use('/*', authMiddleware, subscriptionMiddleware);
   
   // 인증 + 구독 + 사용량 제한
   route.use('/*', authMiddleware, subscriptionMiddleware, usageLimitMiddleware);
   
   // 또는 한번에
   route.use('/*', protectedRouteMiddleware);
   ```

3. **에러 처리**
   ```typescript
   return c.json(
     {
       error: ERROR_MESSAGES.SOME_ERROR,
       code: 'ERROR_CODE'
     },
     STATUS_CODES.BAD_REQUEST
   );
   ```

### 프론트엔드 개발

1. **API 호출**
   ```typescript
   import api from '@/services/api';
   
   const response = await api.post('/api/keyword/search', {
     keywords: ['키워드1', '키워드2'],
     searchType: 'blog'
   });
   ```

2. **컴포넌트 작성**
   ```tsx
   // frontend/src/components/MyComponent.tsx
   import { useState } from 'react';
   
   export default function MyComponent() {
     const [data, setData] = useState(null);
     return <div>My Component</div>;
   }
   ```

## 🔍 테스트

### API 테스트

```bash
# Health Check
curl http://localhost:3000/api/health

# 회원가입
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"테스터"}'

# 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 키워드 분석 (토큰 필요)
curl -X POST http://localhost:3000/api/keyword/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"keywords":["키워드분석"],"searchType":"blog"}'
```

## 📈 성능 최적화

- ✅ 미들웨어 체인 최적화
- ✅ 데이터베이스 인덱스
- ✅ API 응답 캐싱 준비
- ✅ 프론트엔드 코드 스플리팅

## 🚧 현재 제한사항

1. **네이버 API**: Mock 데이터 사용 중 (실제 연동 준비 완료)
2. **결제 시스템**: 간단한 구독 모델만 구현
3. **프론트엔드**: 기본 구조만 완성 (UI 구현 진행 중)

## 📚 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 상세 아키텍처
- [USER_GUIDE.md](./USER_GUIDE.md) - 사용자 가이드

## 🔐 보안 고려사항

- ✅ JWT 토큰 기반 인증
- ✅ 비밀번호 bcrypt 해싱
- ✅ API 키 마스킹 처리
- ✅ CORS 설정
- ✅ SQL Injection 방어 (Prepared Statements)

## 🎯 다음 단계

1. **프론트엔드 완성** (진행 중)
   - 키워드 분석 UI
   - 결과 테이블 + 판단 표시
   - API 키 설정 폼
   - 대시보드 통계

2. **네이버 API 실제 연동**
   - API 서명 생성
   - 에러 핸들링
   - 재시도 로직

3. **결제 시스템**
   - 토스페이먼츠 연동
   - 웹훅 처리

4. **배포**
   - Cloudflare Pages 배포
   - 프로덕션 DB 설정

## 📄 라이선스

MIT License

## 👨‍💻 개발자

- AI Assistant
- 프로젝트 버전: v2.0
- 작성일: 2026-01-28
