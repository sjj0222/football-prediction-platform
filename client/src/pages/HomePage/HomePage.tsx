import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { Search } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { getProducts } from '@client/src/api';
import type { ProductPublic, ProductResult } from '@shared/api.interface';

const formatMatchTime = (isoString: string): string => {
  const d = new Date(isoString);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${hh}:${mm} ${mo}/${da}`;
};

const formatResult = (result: ProductResult): string => {
  switch (result) {
    case 'red':
      return '🔴 红';
    case 'black':
      return '⚫ 黑';
    case 'no_result':
      return '无结果';
    case 'pending':
    default:
      return '';
  }
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [products, setProducts] = useState<ProductPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchProducts = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts({ q: q || undefined, page: p, pageSize });
      setProducts(res.items);
      setTotal(res.total);
    } catch (e) {
      logger.error('获取商品列表失败', e);
      setError('加载商品失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts(keyword, page);
  }, [keyword, page, fetchProducts]);

  const handleSearch = (): void => {
    setPage(1);
    setKeyword(searchInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCardClick = (id: string): void => {
    navigate(`/product/${id}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-center mb-8">
        <div className="flex gap-2 w-full max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchInput(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="搜索主播、球队..."
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch}>搜索</Button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-500">加载中...</div>
      )}

      {error && (
        <div className="text-center py-16 text-red-500">{error}</div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="text-center py-16 text-gray-500">暂无上架商品</div>
      )}

      {!loading && !error && products.length > 0 && (
        <>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            data-ai-section-type="card-list"
          >
            {products.map((p: ProductPublic) => (
              <div
                key={p.id}
                onClick={() => handleCardClick(p.id)}
                className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer
                           shadow-sm hover:shadow-md transition-shadow duration-200
                           flex flex-col gap-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{p.anchorName}</span>
                  <span className="text-gray-500">{formatMatchTime(p.matchTime)}</span>
                </div>
                <div className="text-base font-semibold text-gray-800">
                  {p.homeTeam} vs {p.awayTeam}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xl font-bold text-orange-600">
                    ¥{p.price}
                  </span>
                  {formatResult(p.result) && (
                    <span className="text-sm text-gray-700">
                      {formatResult(p.result)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {total > pageSize && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomePage;
