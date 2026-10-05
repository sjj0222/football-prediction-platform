import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { logger } from '../../utils/logger';
import {
  sellerGetMyProducts,
  sellerCreateProduct,
  sellerSubmitProduct,
  sellerOfflineProduct,
  sellerGetSales,
  getMatches,
  createMatch,
} from '@client/src/api';
import { useAuth } from '@client/src/context/AuthContext';
import type { ProductPublic, ProductDetail, MatchInfo } from '@shared/api.interface';

const statusLabel: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  online: '在售',
  offline: '已下架',
  deleted: '已删除',
};

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-amber-100 text-amber-700',
  online: 'bg-green-100 text-green-700',
  offline: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-600',
};

const SellerCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'products' | 'create' | 'sales'>('products');
  const [products, setProducts] = useState<ProductPublic[]>([]);
  const [sales, setSales] = useState<unknown[]>([]);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 创建商品表单
  const [matchId, setMatchId] = useState<string | undefined>();
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  // 新建比赛表单
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [league, setLeague] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchPickerOpen, setMatchPickerOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sellerGetMyProducts();
      setProducts(res.items);
    } catch (e) {
      logger.error('获取商品失败', e);
      message.error('获取商品失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      const res = await sellerGetSales();
      setSales(res);
    } catch (e) {
      logger.error('获取销售记录失败', e);
    }
  }, []);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await getMatches({ pageSize: 50 });
      setMatches(res.items);
    } catch (e) {
      logger.error('获取比赛失败', e);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'seller' && user.role !== 'admin') {
      message.warning('仅卖家可访问卖家中心');
      navigate('/');
      return;
    }
    void fetchProducts();
    void fetchSales();
    void fetchMatches();
  }, [user, authLoading, navigate, fetchProducts, fetchSales, fetchMatches]);

  const handleSubmitReview = async (id: string): Promise<void> => {
    try {
      await sellerSubmitProduct(id);
      message.success('已提交审核');
      void fetchProducts();
    } catch (e) {
      logger.error('提交审核失败', e);
      message.error('提交审核失败');
    }
  };

  const handleOffline = async (id: string): Promise<void> => {
    try {
      await sellerOfflineProduct(id);
      message.success('已下架');
      void fetchProducts();
    } catch (e) {
      logger.error('下架失败', e);
      message.error('下架失败');
    }
  };

  const handleCreateMatch = async (): Promise<void> => {
    if (!homeTeam.trim() || !awayTeam.trim() || !matchTime) {
      message.warning('请填写主队、客队和比赛时间');
      return;
    }
    try {
      const res = await createMatch({
        league: league.trim() || undefined,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        matchTime,
      });
      setShowNewMatch(false);
      setLeague('');
      setHomeTeam('');
      setAwayTeam('');
      setMatchTime('');
      // 刷新比赛列表并选中新比赛
      await fetchMatches();
      setMatchId(res.match.id);
      message.success('比赛已创建');
    } catch (e) {
      logger.error('创建比赛失败', e);
      message.error('创建比赛失败');
    }
  };

  const handleCreateProduct = async (): Promise<void> => {
    if (!matchId) {
      message.warning('请选择比赛');
      return;
    }
    if (!author.trim()) {
      message.warning('请填写作者');
      return;
    }
    if (!content.trim()) {
      message.warning('请填写商品内容');
      return;
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 10) {
      message.warning('价格最低为 10 元');
      return;
    }
    setSubmitting(true);
    try {
      const created = await sellerCreateProduct({
        matchId,
        author: author.trim(),
        description: description.trim() || undefined,
        content,
        price: priceNum,
      });
      message.success('商品已创建（草稿），可提交审核');
      setAuthor('');
      setDescription('');
      setContent('');
      setPrice('');
      setMatchId(undefined);
      setTab('products');
      void fetchProducts();
    } catch (e) {
      logger.error('创建商品失败', e);
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? '创建商品失败');
    } finally {
      setSubmitting(false);
    }
  };

  const formatMatchTime = (isoString: string | undefined): string => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isSellerOrAdmin = user && (user.role === 'seller' || user.role === 'admin');

  if (authLoading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">卖家中心</h1>
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
        {(
          [
            ['products', '我的商品'],
            ['create', '发布商品'],
            ['sales', '销售记录'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm ${
              tab === key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="space-y-3">
          {loading && <div className="text-center py-10 text-gray-500">加载中...</div>}
          {!loading && products.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              还没有商品，去「发布商品」创建一个吧
            </div>
          )}
          {products.map((p: ProductPublic) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="font-medium text-gray-900">{p.title}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[p.status] ?? ''}`}>
                  {statusLabel[p.status] ?? p.status}
                </span>
              </div>
              <div className="text-sm text-gray-500 mb-3">
                {p.homeTeam} vs {p.awayTeam} · {formatMatchTime(p.matchTime)} · 价格 ¥{p.price}
              </div>
              <div className="flex gap-2">
                {p.status === 'draft' && (
                  <button
                    onClick={() => handleSubmitReview(p.id)}
                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:opacity-90"
                  >
                    提交审核
                  </button>
                )}
                {p.status === 'online' && (
                  <button
                    onClick={() => handleOffline(p.id)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    下架
                  </button>
                )}
                <button
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  查看
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'create' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
          <h2 className="text-base font-semibold text-gray-900 mb-4">发布商品</h2>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">绑定比赛 *</label>
            <select
              value={matchId ?? ''}
              onChange={(e) => setMatchId(e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">请选择比赛</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.league ? `${m.league} · ` : ''}
                  {m.homeTeam} vs {m.awayTeam} · {formatMatchTime(m.matchTime)}
                </option>
              ))}
            </select>
            {!showNewMatch ? (
              <button
                onClick={() => setShowNewMatch(true)}
                className="mt-2 text-sm text-primary hover:underline"
              >
                + 比赛不存在？创建新比赛
              </button>
            ) : (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={league}
                  onChange={(e) => setLeague(e.target.value)}
                  placeholder="联赛（可选）"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:col-span-2"
                />
                <input
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  placeholder="主队 *"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  placeholder="客队 *"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <div className="sm:col-span-2">
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    placeholder="选择比赛时间 *"
                    value={matchTime ? dayjs(matchTime) : undefined}
                    open={matchPickerOpen}
                    onOpenChange={setMatchPickerOpen}
                    onChange={(v) => {
                      setMatchTime(v ? v.format('YYYY-MM-DD HH:mm') : '');
                      // 点击确认后收起面板
                      setMatchPickerOpen(false);
                    }}
                    className="w-full"
                  />
                </div>
                <button
                  onClick={handleCreateMatch}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm sm:col-span-2 hover:opacity-90"
                >
                  创建比赛
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">作者 *</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="例如：老A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              商品标题将自动生成：作者｜比赛时间｜主队 vs 客队
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">商品简介</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="一句话介绍（可选）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">预测内容 *（买家购买后可见）</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="完整分析内容……"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-1">价格 *（最低 10 元，创建后不可修改）</label>
            <input
              type="number"
              min={10}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <button
            onClick={handleCreateProduct}
            disabled={submitting}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? '创建中...' : '创建商品'}
          </button>
        </div>
      )}

      {tab === 'sales' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {sales.length === 0 && (
            <div className="p-10 text-center text-gray-500">暂无销售记录</div>
          )}
          {(sales as { id: string; title: string; homeTeam: string; awayTeam: string; matchTime: string; price: string; createdAt: string }[]).map((s) => (
            <div key={s.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-gray-800">{s.title}</div>
                <div className="text-sm text-gray-500">
                  {s.homeTeam} vs {s.awayTeam} · {formatMatchTime(s.matchTime)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(s.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="text-lg font-semibold text-green-600">¥{s.price}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerCenterPage;
