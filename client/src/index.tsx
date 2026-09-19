import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { createPortal } from 'react-dom';

import RoutesComponent from './app.tsx';
import './index.css';
import { Toaster } from './components/ui/sonner';

const CLIENT_BASE_PATH = (import.meta.env.VITE_BASE_PATH as string) || '/';

const MainApp = () => {
  return (
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
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
