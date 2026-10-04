import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { getWalletBalance, getWalletTransactions } from '@client/src/api';
import { useAuth } from '@client/src/context/AuthContext';

interface TxItem {
  id: string;
  amount: string;
  type: string;
  remark: string;
  createdAt: string;
}

const typeLabel: Record<string, string> = {
  admin_add: '充值',
  refund: '退款',
  purchase: '购买扣款',
};

const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleString('zh-CN');
};

const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState('0');
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bal, tx] = await Promise.all([
        getWalletBalance(),
        getWalletTransactions({ pageSize: 50 }),
      ]);
      setBalance(bal.balance);
      setTransactions(tx.items as TxItem[]);
    } catch (e) {
      logger.error('获取钱包失败', e);
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 401) {
        return;
      }
      setError('加载钱包失败，请稍后重试');
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
    void fetchWallet();
  }, [user, authLoading, navigate, fetchWallet]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">我的钱包</h1>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="text-sm text-gray-500 mb-1">当前余额</div>
        <div className="text-3xl font-bold text-orange-600">¥{balance}</div>
        <p className="text-xs text-gray-400 mt-2">余额采用账本模式，流水可追溯</p>
      </div>

      <h2 className="text-base font-semibold text-gray-900 mb-3">收支明细</h2>
      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
          暂无收支记录
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {transactions.map((tx) => {
            const amountNum = Number(tx.amount);
            return (
              <div key={tx.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-gray-800">
                    {typeLabel[tx.type] ?? tx.type}
                  </div>
                  {tx.remark && (
                    <div className="text-sm text-gray-500">{tx.remark}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatTime(tx.createdAt)}
                  </div>
                </div>
                <div
                  className={`text-lg font-semibold ${
                    amountNum >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {amountNum >= 0 ? '+' : ''}
                  {tx.amount}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WalletPage;
