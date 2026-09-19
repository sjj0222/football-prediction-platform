import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { register, getCaptcha } from '@client/src/api';
import { Image } from '@client/src/components/ui/image';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [captchaCode, setCaptchaCode] = useState<string>('');
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaImage, setCaptchaImage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const loadCaptcha = async (): Promise<void> => {
    try {
      const res = await getCaptcha();
      setCaptchaId(res.captchaId);
      setCaptchaImage(res.image);
    } catch (e: unknown) {
      logger.error('获取验证码失败', e);
    }
  };

  useEffect(() => {
    void loadCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('请输入账号');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    if (password.length < 6) {
      setError('密码长度不能少于 6 位');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('密码必须包含字母和数字');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (!captchaCode.trim()) {
      setError('请输入验证码');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: username.trim(),
        password,
        captchaId,
        captchaCode: captchaCode.trim(),
      });
      navigate('/login');
    } catch (e: unknown) {
      logger.error('注册失败', e);
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || '注册失败，请稍后重试');
      void loadCaptcha();
      setCaptchaCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">创建账号</h1>
          <p className="text-sm text-slate-500 mt-2">注册一个新的账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              账号
            </label>
            <input
              type="text"
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
              placeholder="请输入账号"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="请输入密码（至少 6 位，含字母和数字）"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入密码"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              验证码
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={captchaCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaptchaCode(e.target.value)}
                placeholder="请输入验证码"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                maxLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={loadCaptcha}
                title="点击刷新验证码"
                className="h-[38px] w-28 rounded-lg border border-slate-300 bg-slate-50 overflow-hidden hover:border-primary/40 transition-colors flex items-center justify-center"
                disabled={loading}
              >
                {captchaImage ? (
                  <Image
                    src={`data:image/svg+xml;base64,${captchaImage}`}
                    alt="验证码"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-400">加载中</span>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          已有账号？
          <Link to="/login" className="text-primary hover:underline font-medium ml-1">
            去登录
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
