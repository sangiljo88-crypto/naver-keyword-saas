/**
 * Naver API Integration Utilities
 * 네이버 광고 API와 네이버 개발자센터 API 연동
 */

export interface NaverAdApiCredentials {
  accKey: string;
  secretKey: string;
  customerId: string;
}

export interface NaverDevApiCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * 네이버 광고 API - 키워드 검색량 조회
 * https://naver.github.io/searchad-apidoc/#/guides/get-keyword-volume
 */
export async function getNaverAdKeywordVolume(
  keywords: string[],
  credentials: NaverAdApiCredentials
): Promise<any[]> {
  try {
    const timestamp = Date.now();
    
    // API 호출 (실제 구현 시 서명 생성 필요)
    const response = await fetch('https://api.naver.com/keywordstool', {
      method: 'POST',
      headers: {
        'X-API-KEY': credentials.accKey,
        'X-Customer': credentials.customerId,
        'X-Timestamp': timestamp.toString(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hintKeywords: keywords,
        showDetail: 1
      })
    });
    
    if (!response.ok) {
      throw new Error(`Naver Ad API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.keywordList || [];
  } catch (error) {
    console.error('Naver Ad API error:', error);
    throw error;
  }
}

/**
 * 네이버 개발자센터 API - 블로그 검색 (문서 수)
 * https://developers.naver.com/docs/serviceapi/search/blog/blog.md
 */
export async function getNaverBlogCount(
  keyword: string,
  credentials: NaverDevApiCredentials
): Promise<number> {
  try {
    const url = new URL('https://openapi.naver.com/v1/search/blog.json');
    url.searchParams.set('query', keyword);
    url.searchParams.set('display', '1');
    
    const response = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': credentials.clientId,
        'X-Naver-Client-Secret': credentials.clientSecret
      }
    });
    
    if (!response.ok) {
      throw new Error(`Naver Dev API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.total || 0;
  } catch (error) {
    console.error('Naver Blog API error:', error);
    throw error;
  }
}

/**
 * 네이버 개발자센터 API - 쇼핑 검색 (상품 수)
 * https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
 */
export async function getNaverShoppingCount(
  keyword: string,
  credentials: NaverDevApiCredentials
): Promise<number> {
  try {
    const url = new URL('https://openapi.naver.com/v1/search/shop.json');
    url.searchParams.set('query', keyword);
    url.searchParams.set('display', '1');
    
    const response = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': credentials.clientId,
        'X-Naver-Client-Secret': credentials.clientSecret
      }
    });
    
    if (!response.ok) {
      throw new Error(`Naver Shopping API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.total || 0;
  } catch (error) {
    console.error('Naver Shopping API error:', error);
    throw error;
  }
}

/**
 * 경쟁 비율 계산
 * 검색량 대비 문서/상품 수 비율
 */
export function calculateCompetitionRatio(searchVolume: number, documentCount: number): number {
  if (searchVolume === 0) return 0;
  return Math.round((documentCount / searchVolume) * 100) / 100;
}

/**
 * Mock data for development/testing
 * 실제 API 호출 전 테스트용 데이터
 */
export function getMockKeywordData(keyword: string) {
  const baseVolume = Math.floor(Math.random() * 50000) + 1000;
  const pcRatio = 0.4 + Math.random() * 0.2; // 40-60%
  
  return {
    keyword,
    pcCount: Math.floor(baseVolume * pcRatio),
    mobileCount: Math.floor(baseVolume * (1 - pcRatio)),
    totalCount: baseVolume,
    documentCount: Math.floor(Math.random() * 100000) + 1000,
    productCount: Math.floor(Math.random() * 50000) + 500,
    powerlinkCount: Math.floor(Math.random() * 100) + 1,
    competitionRatio: Math.round((Math.random() * 10 + 1) * 100) / 100
  };
}
