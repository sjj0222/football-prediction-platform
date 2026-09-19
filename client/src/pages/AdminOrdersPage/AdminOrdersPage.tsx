import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { logger } from '../../utils/logger';
import type { AdminOrderItem } from '@shared/api.interface';
import { adminGetOrders } from '@client/src/api';
import { useAuth } from '@client/src/contexts/AuthContext';

const AdminOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  // 权限检查
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await adminGetOrders({ page, pageSize });
      setOrders(res.items);
      setTotal(res.total);
    } catch (e) {
      logger.error('加载订单列表失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user && user.role === 'admin') {
      void loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user, authLoading]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">订单管理</h1>
        <Link
          to="/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 返回商品管理
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                订单号
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                买家
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                商品
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                价格
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                购买时间
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                状态
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  暂无订单
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-2 text-gray-700 font-mono">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {order.username || '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {order.product
                      ? `${order.product.anchorName}｜${order.product.homeTeam}vs${order.product.awayTeam}`
                      : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-700">¥{order.price}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {new Date(order.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                      已支付
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {total > 0 && (
          <div className="flex items-center justify-between px-3 py-3 border-t border-gray-200 text-sm">
            <span className="text-gray-500">共 {total} 条</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
