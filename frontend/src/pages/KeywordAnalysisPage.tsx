import { useState, useEffect } from 'react';
import api from '../services/api';

interface KeywordJudgment {
  level: 'excellent' | 'good' | 'warning' | 'danger';
  symbol: string;
  label: string;
  description: string;
}

interface KeywordResult {
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

interface UsageInfo {
  current: number;
  limit: number;
  remaining: number;
}

type SearchType = 'blog' | 'shopping' | 'quick' | 'bulk';

export default function KeywordAnalysisPage() {
  const [searchType, setSearchType] = useState<SearchType>('blog');
  const [keywords, setKeywords] = useState<string>('');
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load usage on mount
  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const response = await api.get('/api/keyword/usage');
      setUsage(response.data.daily);
    } catch (err: any) {
      console.error('Failed to load usage:', err);
    }
  };

  const handleSearch = async () => {
    if (!keywords.trim()) {
      setError('키워드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const keywordList = keywords
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      if (keywordList.length === 0) {
        setError('키워드를 입력해주세요.');
        setLoading(false);
        return;
      }

      if (keywordList.length > 100) {
        setError('한 번에 최대 100개까지 조회 가능합니다.');
        setLoading(false);
        return;
      }

      const response = await api.post('/api/keyword/search', {
        keywords: keywordList,
        searchType
      });

      setResults(response.data.results);
      setUsage(response.data.usage);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || '키워드 분석 중 오류가 발생했습니다.';
      setError(errorMessage);
      
      // Update usage if provided in error
      if (err.response?.data?.usage) {
        setUsage(err.response.data.usage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (results.length === 0) {
      setError('내보낼 데이터가 없습니다.');
      return;
    }

    try {
      const response = await api.post('/api/keyword/export', {
        keywords: results
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `keywords_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('내보내기 중 오류가 발생했습니다.');
    }
  };

  const getJudgmentColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'text-red-600 bg-red-50';
      case 'good':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'danger':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const usagePercentage = usage ? (usage.current / usage.limit) * 100 : 0;
  const usageColor = usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            <i className="fas fa-infinity text-indigo-600 mr-2"></i>
            무한 키워드 v2.0
          </h1>
          
          {/* Usage Display */}
          {usage && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">일일 사용량</div>
                <div className="text-lg font-bold text-gray-900">
                  {usage.current.toLocaleString()} / {usage.limit.toLocaleString()}
                </div>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-3">
                <div
                  className={`${usageColor} h-3 rounded-full transition-all`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">키워드 분석</h2>
            <p className="text-gray-600">
              키워드를 입력하고 검색량과 경쟁 비율을 확인하세요. 자동 판단 기능이 키워드의 진입 가능성을 평가합니다.
            </p>
          </div>

          {/* Search Type Tabs */}
          <div className="mb-4">
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setSearchType('blog')}
                className={`px-4 py-2 font-medium transition-colors ${
                  searchType === 'blog'
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fas fa-blog mr-2"></i>
                블로그 키워드
              </button>
              <button
                onClick={() => setSearchType('shopping')}
                className={`px-4 py-2 font-medium transition-colors ${
                  searchType === 'shopping'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fas fa-shopping-cart mr-2"></i>
                상품 키워드
              </button>
              <button
                onClick={() => setSearchType('quick')}
                className={`px-4 py-2 font-medium transition-colors ${
                  searchType === 'quick'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fas fa-bolt mr-2"></i>
                빠른 검색량
              </button>
              <button
                onClick={() => setSearchType('bulk')}
                className={`px-4 py-2 font-medium transition-colors ${
                  searchType === 'bulk'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="fas fa-list mr-2"></i>
                대량 조회
              </button>
            </div>
          </div>

          {/* Keyword Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              키워드 입력 (한 줄에 하나씩, 최대 100개)
            </label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={`키워드를 입력하세요...\n예시:\n네이버 블로그\n키워드 분석\n마케팅 도구`}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <div className="mt-1 text-sm text-gray-500">
              현재 {keywords.split('\n').filter(k => k.trim().length > 0).length}개 키워드
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  분석 중...
                </>
              ) : (
                <>
                  <i className="fas fa-search mr-2"></i>
                  키워드 분석
                </>
              )}
            </button>
            {results.length > 0 && (
              <button
                onClick={handleExport}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                <i className="fas fa-download mr-2"></i>
                엑셀 다운로드
              </button>
            )}
          </div>

          {/* Results Table */}
          {results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      판단
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      키워드
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PC
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      모바일
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      합계
                    </th>
                    {(searchType === 'blog' || searchType === 'bulk') && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        문서 수
                      </th>
                    )}
                    {(searchType === 'shopping' || searchType === 'bulk') && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상품 수
                      </th>
                    )}
                    {searchType === 'quick' && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        파워링크
                      </th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      경쟁 비율
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full ${getJudgmentColor(result.judgment.level)}`}>
                          <span className="text-2xl mr-2">{result.judgment.symbol}</span>
                          <div className="text-left">
                            <div className="font-bold text-sm">{result.judgment.label}</div>
                            <div className="text-xs opacity-75">{result.judgment.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{result.keyword}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                        {result.pcCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                        {result.mobileCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="font-bold text-indigo-600">
                          {result.totalCount.toLocaleString()}
                        </span>
                      </td>
                      {(searchType === 'blog' || searchType === 'bulk') && result.documentCount !== undefined && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {result.documentCount.toLocaleString()}
                        </td>
                      )}
                      {(searchType === 'shopping' || searchType === 'bulk') && result.productCount !== undefined && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {result.productCount.toLocaleString()}
                        </td>
                      )}
                      {searchType === 'quick' && result.powerlinkCount !== undefined && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {result.powerlinkCount.toLocaleString()}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`font-bold ${
                          result.competitionRatio <= 0.5 ? 'text-red-600' :
                          result.competitionRatio <= 1.0 ? 'text-green-600' :
                          result.competitionRatio <= 2.0 ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {result.competitionRatio.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Results Summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex gap-6">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">🔥</span>
                      <span className="text-sm text-gray-600">
                        우수: <span className="font-bold">{results.filter(r => r.judgment.level === 'excellent').length}개</span>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">✅</span>
                      <span className="text-sm text-gray-600">
                        양호: <span className="font-bold">{results.filter(r => r.judgment.level === 'good').length}개</span>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">⚠️</span>
                      <span className="text-sm text-gray-600">
                        경고: <span className="font-bold">{results.filter(r => r.judgment.level === 'warning').length}개</span>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">❌</span>
                      <span className="text-sm text-gray-600">
                        위험: <span className="font-bold">{results.filter(r => r.judgment.level === 'danger').length}개</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    총 <span className="font-bold text-gray-900">{results.length}개</span> 키워드 분석 완료
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && results.length === 0 && !error && (
            <div className="text-center py-12">
              <i className="fas fa-search text-6xl text-gray-300 mb-4"></i>
              <p className="text-gray-500 text-lg">
                키워드를 입력하고 분석 버튼을 클릭하세요
              </p>
              <p className="text-gray-400 text-sm mt-2">
                자동 판단 기능이 키워드의 경쟁 정도를 분석해드립니다
              </p>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
            <div className="flex items-center mb-2">
              <span className="text-3xl mr-2">🔥</span>
              <div>
                <div className="text-sm text-gray-600">우수</div>
                <div className="font-bold text-gray-900">≤ 0.5</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">진입 추천 키워드</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="flex items-center mb-2">
              <span className="text-3xl mr-2">✅</span>
              <div>
                <div className="text-sm text-gray-600">양호</div>
                <div className="font-bold text-gray-900">≤ 1.0</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">적당한 경쟁</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center mb-2">
              <span className="text-3xl mr-2">⚠️</span>
              <div>
                <div className="text-sm text-gray-600">경고</div>
                <div className="font-bold text-gray-900">≤ 2.0</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">높은 경쟁</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-500">
            <div className="flex items-center mb-2">
              <span className="text-3xl mr-2">❌</span>
              <div>
                <div className="text-sm text-gray-600">위험</div>
                <div className="font-bold text-gray-900">&gt; 2.0</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">매우 높은 경쟁</p>
          </div>
        </div>
      </main>
    </div>
  );
}
