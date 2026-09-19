import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { Button } from '@client/src/components/ui/button';
import { getProductDetail, buyProduct } from '@client/src/api';
import { useAuth } from '@client/src/contexts/AuthContext';
import type { ProductDetail, ProductResult } from '@shared/api.interface';

const formatMatchTime = (isoString: string): string => {
  return new Date(isoString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getProductDetail(id);
      setProduct(res);
    } catch (e) {
      logger.error('获取商品详情失败', e);
      setLoadError('加载商品详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const handleBuy = async (): Promise<void> => {
    if (!id) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (buying) return;
    setBuying(true);
    setBuyError(null);
    setBuySuccess(false);
    try {
      await buyProduct(id);
      setBuySuccess(true);
      await fetchDetail();
    } catch (e) {
      logger.error('购买失败', e);
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      const msg = err.response?.data?.message || '购买失败，请稍后重试';
      setBuyError(msg);
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-gray-500">
        加载中...
      </div>
    );
  }

  if (loadError && !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-red-500">
        {loadError}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-gray-500">
        商品不存在
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <span className="font-medium text-gray-700">{product.anchorName}</span>
            <span>{formatMatchTime(product.matchTime)}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {product.homeTeam} vs {product.awayTeam}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-orange-600">
              ¥{product.price}
            </span>
            {formatResult(product.result) && (
              <span className="text-base text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                {formatResult(product.result)}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {product.hasPurchased ? (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                预测内容
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-gray-700 leading-relaxed">
                {product.content || '暂无预测内容'}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">购买后可查看完整预测内容</p>
              <p className="text-sm text-gray-400 mb-6">
                价格：
                <span className="text-orange-600 font-semibold text-lg">
                  ¥{product.price}
                </span>
              </p>
              <Button size="lg" onClick={handleBuy} disabled={buying}>
                {buying ? '购买中...' : '立即购买'}
              </Button>
              {buySuccess && (
                <p className="mt-4 text-sm text-green-600">购买成功，正在加载内容...</p>
              )}
              {buyError && (
                <p className="mt-4 text-sm text-red-500">{buyError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
