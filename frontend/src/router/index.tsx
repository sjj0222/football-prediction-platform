import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

import Layout from '../components/Layout';
import NotFound from '../pages/NotFound/NotFound';
import HomePage from '../pages/HomePage/HomePage';
import ProductDetailPage from '../pages/ProductDetailPage/ProductDetailPage';
import MyOrdersPage from '../pages/MyOrdersPage/MyOrdersPage';
import WalletPage from '../pages/WalletPage/WalletPage';
import SellerCenterPage from '../pages/SellerCenterPage/SellerCenterPage';
import AdminCenterPage from '../pages/AdminCenterPage/AdminCenterPage';
import LoginPage from '../pages/LoginPage/LoginPage';
import RegisterPage from '../pages/RegisterPage/RegisterPage';

const RoutesComponent = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="product/:id" element={<ProductDetailPage />} />
        <Route path="my-orders" element={<MyOrdersPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="seller" element={<SellerCenterPage />} />
        <Route path="admin" element={<AdminCenterPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default RoutesComponent;
