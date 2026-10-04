import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { createPortal } from 'react-dom';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

import RoutesComponent from './router';
import './index.css';
import { Toaster } from './components/ui/sonner';

const CLIENT_BASE_PATH = (import.meta.env.VITE_BASE_PATH as string) || '/';

const MainApp = () => {
  return (
    <ConfigProvider locale={zhCN}>
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <ErrorBoundary
        fallbackRender={({ resetErrorBoundary }) => (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <p style={{ marginBottom: 16 }}>页面出错了</p>
            <button onClick={resetErrorBoundary}>重试</button>
          </div>
        )}
      >
        <RoutesComponent />
        {createPortal(<Toaster />, document.body)}
      </ErrorBoundary>
    </BrowserRouter>
    </ConfigProvider>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
