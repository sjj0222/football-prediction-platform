import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { logger } from '../../utils/logger';
import type { ProductDetail } from '@shared/api.interface';
import {
  adminGetProductDetail,
  adminCreateProduct,
  adminUpdateProduct,
} from '@client/src/api';
import { useAuth } from '@client/src/contexts/AuthContext';

interface FormState {
  anchorName: string;
  matchTime: string;
  homeTeam: string;
  awayTeam: string;
  content: string;
  price: string;
}

const initialForm: FormState = {
  anchorName: '',
  matchTime: '',
  homeTeam: '',
  awayTeam: '',
  content: '',
  price: '',
};

// ISO string → datetime-local input 所需的 "YYYY-MM-DDTHH:mm"
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// datetime-local → ISO 字符串
function datetimeLocalToIso(val: string): string {
  return new Date(val).toISOString();
}

const AdminProductEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [product, setProduct] = useState<ProductDetail | null>(null);

  // 权限检查
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // 编辑模式加载详情
  useEffect(() => {
    if (!isEdit || !id) return;
    if (authLoading) return;
    if (!user || user.role !== 'admin') return;

    setLoading(true);
    adminGetProductDetail(id)
      .then((res) => {
        setProduct(res);
        setForm({
          anchorName: res.anchorName,
          matchTime: isoToDatetimeLocal(res.matchTime),
          homeTeam: res.homeTeam,
          awayTeam: res.awayTeam,
          content: res.content || '',
          price: res.price,
        });
      })
      .catch((e) => {
        logger.error('加载商品详情失败', e);
        setErrorMsg('加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isEdit, id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): string => {
    if (!form.anchorName.trim()) return '请输入主播名称';
    if (!form.matchTime) return '请选择比赛时间';
    if (!form.homeTeam.trim()) return '请输入主队';
    if (!form.awayTeam.trim()) return '请输入客队';
    if (!form.content.trim()) return '请输入预测内容';
    if (!isEdit) {
      const priceNum = Number(form.price);
      if (isNaN(priceNum) || priceNum <= 0) return '请输入有效价格';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      const matchTimeIso = datetimeLocalToIso(form.matchTime);
      if (isEdit && id) {
        await adminUpdateProduct(id, {
          anchorName: form.anchorName,
          matchTime: matchTimeIso,
          homeTeam: form.homeTeam,
          awayTeam: form.awayTeam,
          content: form.content,
        });
      } else {
        await adminCreateProduct({
          anchorName: form.anchorName,
          matchTime: matchTimeIso,
          homeTeam: form.homeTeam,
          awayTeam: form.awayTeam,
          content: form.content,
          price: Number(form.price),
        });
      }
      navigate('/admin');
    } catch (err) {
      logger.error('保存商品失败', err);
      setErrorMsg('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? '编辑商品' : '新建商品'}
        </h1>
        <Link
          to="/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 返回商品列表
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border border-gray-200 p-6 space-y-5"
        >
          {errorMsg && (
            <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded border border-red-200">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              主播名称
            </label>
            <input
              type="text"
              name="anchorName"
              value={form.anchorName}
              onChange={handleChange}
              placeholder="输入主播名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              比赛时间
            </label>
            <input
              type="datetime-local"
              name="matchTime"
              value={form.matchTime}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                主队
              </label>
              <input
                type="text"
                name="homeTeam"
                value={form.homeTeam}
                onChange={handleChange}
                placeholder="主队名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客队
              </label>
              <input
                type="text"
                name="awayTeam"
                value={form.awayTeam}
                onChange={handleChange}
                placeholder="客队名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预测内容
            </label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={6}
              placeholder="输入预测内容详情"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              价格（元）
            </label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              disabled={isEdit}
              min="0"
              step="0.01"
              placeholder="输入商品价格"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary ${
                isEdit ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
            {isEdit && (
              <p className="mt-1 text-xs text-gray-500">创建后不可修改价格</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-primary text-white rounded-md text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              disabled={submitting}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 disabled:opacity-50"
            >
              取消
            </button>
            {product && isEdit && (
              <span className="text-xs text-gray-400 ml-auto">
                更新于 {new Date(product.updatedAt).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminProductEditPage;
