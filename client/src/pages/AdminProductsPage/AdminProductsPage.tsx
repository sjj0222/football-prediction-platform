import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import type { ProductPublic, ProductResult, ProductStatus } from '@shared/api.interface';
import {
  adminGetProducts,
  adminSetOnSale,
  adminSetOffSale,
  adminSetResult,
} from '@client/src/api';
import { useAuth } from '@client/src/contexts/AuthContext';

const statusLabelMap: Record<ProductStatus, string> = {
  on_sale: '上架',
  off_sale: '下架',
};

const statusColorMap: Record<ProductStatus, string> = {
  on_sale: 'bg-green-100 text-green-700',
  off_sale: 'bg-gray-100 text-gray-600',
};

const resultLabelMap: Record<ProductResult, string> = {
  pending: '未标记',
  red: '红',
  black: '黑',
  no_result: '无结果',
};

const resultColorMap: Record<ProductResult, string> = {
  pending: 'bg-gray-100 text-gray-500',
  red: 'bg-red-100 text-red-600',
  black: 'bg-gray-800 text-white',
  no_result: 'bg-blue-100 text-blue-600',
};

const AdminProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();

  const [products, setProducts] = useState<ProductPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState('');

  // 权限检查
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params: { q?: string; status?: string; page: number; pageSize: number } = {
        page,
        pageSize,
      };
      if (search.trim()) params.q = search.trim();
      if (statusFilter) params.status = statusFilter;
      const res = await adminGetProducts(params);
      setProducts(res.items);
      setTotal(res.total);
    } catch (e) {
      logger.error('加载商品列表失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user && user.role === 'admin') {
      void loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, search, user, authLoading]);

  const handleSearch = () => {
    setPage(1);
    void loadProducts();
  };

  const handleToggleSale = async (id: string, currentStatus: ProductStatus) => {
    setActionLoading(id);
    try {
      if (currentStatus === 'on_sale') {
        await adminSetOffSale(id);
        setSuccessMsg('已下架');
      } else {
        await adminSetOnSale(id);
        setSuccessMsg('已上架');
      }
      setTimeout(() => setSuccessMsg(''), 2000);
      void loadProducts();
    } catch (e) {
      logger.error('上下架操作失败', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetResult = async (id: string, result: ProductResult) => {
    if (!result) return;
    setActionLoading(id);
    try {
      await adminSetResult(id, result);
      setSuccessMsg('结果已更新');
      setTimeout(() => setSuccessMsg(''), 2000);
      void loadProducts();
    } catch (e) {
      logger.error('标记结果失败', e);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">商品管理</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/orders')}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            订单管理
          </button>
          <button
            onClick={() => navigate('/admin/products/new')}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:opacity-90"
          >
            新建商品
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          placeholder="搜索主播名或球队"
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md w-64 focus:outline-none focus:border-primary"
        />
        <button
          onClick={handleSearch}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          搜索
        </button>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary"
        >
          <option value="">全部状态</option>
          <option value="on_sale">上架</option>
          <option value="off_sale">下架</option>
        </select>
        {successMsg && (
          <span className="text-sm text-green-600 ml-auto">{successMsg}</span>
        )}
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">商品ID</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">主播</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">比赛时间</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">对阵</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">价格</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">状态</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">结果</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">创建时间</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                  暂无商品
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700 font-mono">
                    {p.id.slice(0, 8)}...
                  </td>
                  <td className="px-3 py-2 text-gray-700">{p.anchorName}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {new Date(p.matchTime).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {p.homeTeam} vs {p.awayTeam}
                  </td>
                  <td className="px-3 py-2 text-gray-700">¥{p.price}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${statusColorMap[p.status]}`}
                    >
                      {statusLabelMap[p.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${resultColorMap[p.result]}`}
                    >
                      {resultLabelMap[p.result]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {new Date(p.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => navigate(`/admin/products/${p.id}`)}
                        className="text-primary hover:underline text-xs"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleToggleSale(p.id, p.status)}
                        disabled={actionLoading === p.id}
                        className={`text-xs ${
                          p.status === 'on_sale'
                            ? 'text-gray-500 hover:text-gray-700'
                            : 'text-green-600 hover:text-green-700'
                        } disabled:opacity-50`}
                      >
                        {p.status === 'on_sale' ? '下架' : '上架'}
                      </button>
                      <select
                        value={p.result}
                        onChange={(e) =>
                          handleSetResult(p.id, e.target.value as ProductResult)
                        }
                        disabled={actionLoading === p.id}
                        className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none"
                      >
                        <option value="pending">未标记</option>
                        <option value="red">红</option>
                        <option value="black">黑</option>
                        <option value="no_result">无结果</option>
                      </select>
                    </div>
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

export default AdminProductsPage;
