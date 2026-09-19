import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { Button } from '@client/src/components/ui/button';
import { getMyOrders } from '@client/src/api';
import { useAuth } from '@client/src/contexts/AuthContext';
import type { OrderItem, ProductResult } from '@shared/api.interface';

const formatMatchTime = (isoString: string): string => {
  return new Date(isoString).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatOrderTime = (isoString: string): string => {
  return new Date(isoString).toLocaleString('zh-CN');
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

const MyOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyOrders({ pageSize: 100 });
      setOrders(res.items);
    } catch (e) {
      logger.error('获取购买记录失败', e);
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 401) {
        return;
      }
      setError('加载购买记录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    void fetchOrders();
  }, [user, authLoading, navigate, fetchOrders]);

  const handleViewDetail = (productId: string): void => {
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500">
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        还没有购买记录
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">我的购买</h1>
      <div className="space-y-3">
        {orders.map((order: OrderItem) => (
          <div
            key={order.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5
                       flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 mb-1 truncate">
                {order.product
                  ? `${order.product.anchorName}｜${formatMatchTime(order.product.matchTime)}｜${order.product.homeTeam} vs ${order.product.awayTeam}`
                  : `商品 ${order.productId}`}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>
                  购买价格：
                  <span className="text-orange-600 font-semibold">
                    ¥{order.price}
                  </span>
                </span>
                <span>购买时间：{formatOrderTime(order.createdAt)}</span>
                {order.product && formatResult(order.product.result) && (
                  <span className="text-gray-700">
                    {formatResult(order.product.result)}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetail(order.productId)}
            >
              查看内容
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOrdersPage;
