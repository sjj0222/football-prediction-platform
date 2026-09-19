import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import HomePage from './pages/HomePage/HomePage';
import ProductDetailPage from './pages/ProductDetailPage/ProductDetailPage';
import MyOrdersPage from './pages/MyOrdersPage/MyOrdersPage';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import AdminProductsPage from './pages/AdminProductsPage/AdminProductsPage';
import AdminProductEditPage from './pages/AdminProductEditPage/AdminProductEditPage';
import AdminOrdersPage from './pages/AdminOrdersPage/AdminOrdersPage';

const RoutesComponent = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="product/:id" element={<ProductDetailPage />} />
        <Route path="my-orders" element={<MyOrdersPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="admin" element={<AdminProductsPage />} />
        <Route path="admin/products/new" element={<AdminProductEditPage />} />
        <Route path="admin/products/:id" element={<AdminProductEditPage />} />
        <Route path="admin/orders" element={<AdminOrdersPage />} />
      </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default RoutesComponent;
