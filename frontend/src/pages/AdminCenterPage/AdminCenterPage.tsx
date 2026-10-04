import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Modal } from 'antd';
import { logger } from '../../utils/logger';
import {
  adminGetUsers,
  adminSetUserRole,
  adminFreezeUser,
  adminUnfreezeUser,
  adminResetPassword,
  adminGetProducts,
  adminApproveProduct,
  adminRejectProduct,
  adminOfflineProduct,
  adminDeleteProduct,
  adminGetOrders,
  adminRefundOrder,
  adminGetLogs,
} from '@client/src/api';
import { useAuth } from '@client/src/context/AuthContext';

const roleLabel: Record<string, string> = {
  buyer: '买家',
  seller: '卖家',
  admin: '管理员',
};

const statusLabel: Record<string, string> = {
  active: '正常',
  frozen: '已冻结',
};

const productStatusLabel: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  online: '在售',
  offline: '已下架',
  deleted: '已删除',
};

const orderStatusLabel: Record<string, string> = {
  paid: '已支付',
  refunded: '已退款',
};

const actionLabel: Record<string, string> = {
  freeze_user: '冻结用户',
  unfreeze_user: '解冻用户',
  reset_password: '重置密码',
  assign_seller: '指定卖家',
  revoke_seller: '取消卖家',
  approve_product: '审核通过',
  reject_product: '审核拒绝',
  offline_product: '下架商品',
  delete_product: '删除商品',
  refund_order: '订单退款',
};

const AdminCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'users' | 'products' | 'orders' | 'logs'>('users');
  const [users, setUsers] = useState<unknown[]>([]);
  const [products, setProducts] = useState<unknown[]>([]);
  const [orders, setOrders] = useState<unknown[]>([]);
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  // 重置密码弹窗
  const [resetTarget, setResetTarget] = useState<{ id: string; phone: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetUsers({ pageSize: 50 });
      setUsers(res.items);
    } catch (e) {
      logger.error('获取用户失败', e);
      message.error('获取用户失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetProducts({ pageSize: 50 });
      setProducts(res.items);
    } catch (e) {
      logger.error('获取商品失败', e);
      message.error('获取商品失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetOrders({ pageSize: 50 });
      setOrders(res.items);
    } catch (e) {
      logger.error('获取订单失败', e);
      message.error('获取订单失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetLogs({ pageSize: 50 });
      setLogs(res.items);
    } catch (e) {
      logger.error('获取日志失败', e);
      message.error('获取日志失败');
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
    if (user.role !== 'admin') {
      message.warning('仅管理员可访问管理后台');
      navigate('/');
      return;
    }
    void fetchUsers();
    void fetchProducts();
    void fetchOrders();
    void fetchLogs();
  }, [user, authLoading, navigate, fetchUsers, fetchProducts, fetchOrders, fetchLogs]);

  const refreshAll = useCallback(() => {
    void fetchUsers();
    void fetchProducts();
    void fetchOrders();
    void fetchLogs();
  }, [fetchUsers, fetchProducts, fetchOrders, fetchLogs]);

  const handleSetRole = async (id: string, role: 'seller' | 'buyer'): Promise<void> => {
    try {
      await adminSetUserRole(id, role);
      message.success(role === 'seller' ? '已设为卖家' : '已取消卖家');
      void fetchUsers();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? '操作失败');
    }
  };

  const handleFreeze = async (id: string, status: string): Promise<void> => {
    try {
      if (status === 'active') {
        await adminFreezeUser(id);
        message.success('已冻结');
      } else {
        await adminUnfreezeUser(id);
        message.success('已解冻');
      }
      void fetchUsers();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? '操作失败');
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (!resetTarget) return;
    if (!newPassword || newPassword.length < 6) {
      message.warning('密码至少 6 位');
      return;
    }
    try {
      await adminResetPassword(resetTarget.id, newPassword);
      message.success(`已重置 ${resetTarget.phone} 的密码`);
      setResetTarget(null);
      setNewPassword('');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? '重置失败');
    }
  };

  const handleProductAction = async (
    id: string,
    action: 'approve' | 'reject' | 'offline' | 'delete',
    title: string,
  ): Promise<void> => {
    const doAction = async (): Promise<void> => {
      try {
        if (action === 'approve') await adminApproveProduct(id);
        if (action === 'reject') await adminRejectProduct(id);
        if (action === 'offline') await adminOfflineProduct(id);
        if (action === 'delete') await adminDeleteProduct(id);
        message.success('操作成功');
        void fetchProducts();
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        message.error(err.response?.data?.message ?? '操作失败');
      }
    };
    if (action === 'delete') {
      Modal.confirm({
        title: '删除商品',
        content: `删除「${title}」将自动向所有已购买用户退款，确认删除？`,
        okText: '确认删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: doAction,
      });
      return;
    }
    await doAction();
  };

  const handleRefund = async (id: string): Promise<void> => {
    Modal.confirm({
      title: '订单退款',
      content: '确认向该订单买家退款？',
      okText: '确认退款',
      cancelText: '取消',
      onOk: async () => {
        try {
          await adminRefundOrder(id);
          message.success('已退款');
          void fetchOrders();
        } catch (e) {
          const err = e as { response?: { data?: { message?: string } } };
          message.error(err.response?.data?.message ?? '退款失败');
        }
      },
    });
  };

  if (authLoading) {
    return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-500">加载中...</div>;
  }

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'users', label: '用户管理' },
    { key: 'products', label: '商品审核' },
    { key: 'orders', label: '订单退款' },
    { key: 'logs', label: '操作日志' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">管理后台</h1>
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm ${
              tab === t.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-10 text-gray-500">加载中...</div>}

      {!loading && tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">手机号</th>
                <th className="text-left px-4 py-3">角色</th>
                <th className="text-left px-4 py-3">状态</th>
                <th className="text-left px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(users as { id: string; phone: string; role: string; status: string }[]).map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                      {roleLabel[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        u.status === 'frozen'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {statusLabel[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {u.role !== 'admin' && (
                      <>
                        <button
                          onClick={() => handleSetRole(u.id, u.role === 'seller' ? 'buyer' : 'seller')}
                          className="text-primary hover:underline"
                        >
                          {u.role === 'seller' ? '取消卖家' : '设为卖家'}
                        </button>
                        <button
                          onClick={() => handleFreeze(u.id, u.status)}
                          className={u.status === 'frozen' ? 'text-green-600 hover:underline' : 'text-red-500 hover:underline'}
                        >
                          {u.status === 'frozen' ? '解冻' : '冻结'}
                        </button>
                        <button
                          onClick={() => {
                            setResetTarget({ id: u.id, phone: u.phone });
                            setNewPassword('');
                          }}
                          className="text-gray-500 hover:underline"
                        >
                          重置密码
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'products' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">标题</th>
                <th className="text-left px-4 py-3">比赛</th>
                <th className="text-left px-4 py-3">价格</th>
                <th className="text-left px-4 py-3">状态</th>
                <th className="text-left px-4 py-3">卖家</th>
                <th className="text-left px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(products as {
                id: string;
                title: string;
                homeTeam: string;
                awayTeam: string;
                price: string;
                status: string;
                sellerPhone: string;
              }[]).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">{p.title}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.homeTeam} vs {p.awayTeam}
                  </td>
                  <td className="px-4 py-3">¥{p.price}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                      {productStatusLabel[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.sellerPhone}</td>
                  <td className="px-4 py-3 flex gap-2">
                    {p.status === 'pending_review' && (
                      <>
                        <button
                          onClick={() => handleProductAction(p.id, 'approve', p.title)}
                          className="text-green-600 hover:underline"
                        >
                          通过
                        </button>
                        <button
                          onClick={() => handleProductAction(p.id, 'reject', p.title)}
                          className="text-amber-600 hover:underline"
                        >
                          拒绝
                        </button>
                      </>
                    )}
                    {p.status === 'online' && (
                      <button
                        onClick={() => handleProductAction(p.id, 'offline', p.title)}
                        className="text-gray-500 hover:underline"
                      >
                        下架
                      </button>
                    )}
                    {p.status !== 'deleted' && (
                      <button
                        onClick={() => handleProductAction(p.id, 'delete', p.title)}
                        className="text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'orders' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">商品</th>
                <th className="text-left px-4 py-3">买家</th>
                <th className="text-left px-4 py-3">金额</th>
                <th className="text-left px-4 py-3">状态</th>
                <th className="text-left px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(orders as {
                id: string;
                productTitle: string;
                buyerPhone: string;
                price: string;
                status: string;
              }[]).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">{o.productTitle}</td>
                  <td className="px-4 py-3 text-gray-500">{o.buyerPhone}</td>
                  <td className="px-4 py-3">¥{o.price}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        o.status === 'refunded'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {orderStatusLabel[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.status === 'paid' && (
                      <button
                        onClick={() => handleRefund(o.id)}
                        className="text-red-500 hover:underline"
                      >
                        退款
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {(logs as {
            id: string;
            action: string;
            targetType: string;
            targetId: string;
            reason: string;
            adminPhone: string;
            createdAt: string;
          }[]).map((l) => (
            <div key={l.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-gray-800">
                  {actionLabel[l.action] ?? l.action}
                </div>
                <div className="text-sm text-gray-500">
                  管理员 {l.adminPhone} · {l.targetType}:{l.targetId.slice(0, 8)}
                  {l.reason ? ` · ${l.reason}` : ''}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {new Date(l.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={resetTarget !== null}
        title={resetTarget ? `重置密码：${resetTarget.phone}` : ''}
        onOk={handleResetPassword}
        onCancel={() => setResetTarget(null)}
        okText="重置"
        cancelText="取消"
      >
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="新密码（至少 6 位）"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </Modal>
    </div>
  );
};

export default AdminCenterPage;
