import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import { useAuth } from '@client/src/contexts/AuthContext';
import { logout as apiLogout } from '@client/src/api';

const Layout = () => {
  const { user, logout: setLoggedOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiLogout();
      setLoggedOut();
      navigate('/');
    } catch (e) {
      logger.error('登出失败', e);
      setLoggedOut();
      navigate('/');
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="text-lg font-bold text-gray-900">
              足球预测平台
            </NavLink>
            <nav className="flex items-center gap-4 text-sm">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }
              >
                首页
              </NavLink>
              {user && (
                <NavLink
                  to="/my-orders"
                  className={({ isActive }) =>
                    isActive
                      ? 'text-primary font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                >
                  我的购买
                </NavLink>
              )}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    isActive
                      ? 'text-primary font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                >
                  管理后台
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="text-gray-600">
                  {user.username}
                  {isAdmin && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                      管理员
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="text-gray-600 hover:text-gray-900">
                  登录
                </NavLink>
                <NavLink
                  to="/register"
                  className="px-3 py-1.5 bg-primary text-white rounded-md hover:opacity-90"
                >
                  注册
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        <p>足球预测内容交易平台 V0.1 — 模拟购买，内容仅供参考</p>
      </footer>
    </div>
  );
};

export default Layout;
