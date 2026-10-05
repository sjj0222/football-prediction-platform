import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { logger } from '../utils/logger';
import { useAuth } from '@client/src/context/AuthContext';
import { logout as apiLogout } from '@client/src/api';

const Layout = () => {
  const { user, logout: setLoggedOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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
  const isSeller = user?.role === 'seller' || user?.role === 'admin';

  const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
    isActive ? 'text-primary font-medium' : 'text-gray-600 hover:text-gray-900';

  const NavLinks = (
    <>
      <NavLink to="/" end className={navLinkClass} onClick={() => setMenuOpen(false)}>
        首页
      </NavLink>
      {user && (
        <NavLink to="/my-orders" className={navLinkClass} onClick={() => setMenuOpen(false)}>
          我的购买
        </NavLink>
      )}
      {user && (
        <NavLink to="/wallet" className={navLinkClass} onClick={() => setMenuOpen(false)}>
          我的钱包
        </NavLink>
      )}
      {isSeller && (
        <NavLink to="/seller" className={navLinkClass} onClick={() => setMenuOpen(false)}>
          卖家中心
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/admin" className={navLinkClass} onClick={() => setMenuOpen(false)}>
          管理后台
        </NavLink>
      )}
    </>
  );

  const AuthArea = (
    <>
      {user ? (
        <>
          <span className="text-gray-600">{user.phone}</span>
          <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700">
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
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="text-lg font-bold text-gray-900">
              足球预测平台
            </NavLink>
            <nav className="hidden md:flex items-center gap-4 text-sm">{NavLinks}</nav>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm">{AuthArea}</div>
          <button
            className="md:hidden p-2 -mr-2 text-gray-600"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="菜单"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-gray-200 px-4 py-3 flex flex-col gap-3 text-sm">
            {NavLinks}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">{AuthArea}</div>
          </nav>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        <p>足球预测内容交易平台 V0.2 — 内容交易，仅供参考</p>
      </footer>
    </div>
  );
};

export default Layout;
