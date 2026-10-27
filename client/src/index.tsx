import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import { AppContainer } from '@lark-apaas/client-toolkit/components/AppContainer';
import { ErrorRender } from '@lark-apaas/client-toolkit/components/ErrorRender';

import RoutesComponent from './app.tsx';
import './index.css';
import { createPortal } from 'react-dom';
import { Toaster } from '@client/src/components/ui/sonner';

const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';

// 妙搭平台构建时会把 HTML 里的 favicon 替换成应用头像（{{appAvatar}}），未设头像时线上无 icon。
// 这里运行时注入 data-URI 的 LC 字标，与站内 LcLogo 保持一致，平台模板无法干预。
const LC_FAVICON_SVG = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="46" height="46" rx="10" fill="#FAF9F5" stroke="#E8E5DA" stroke-width="1.5"/><g transform="translate(-0.64 0)" stroke="#D97757" stroke-width="5.5" stroke-linejoin="miter" fill="none"><path d="M12 12 V36 H23"/><path d="M38.19 17.13 A9.25 9.25 0 1 0 38.19 30.87"/></g></svg>`;
(function injectFavicon() {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = `data:image/svg+xml,${encodeURIComponent(LC_FAVICON_SVG)}`;
  document.head.appendChild(link);
})();

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <AppContainer defaultTheme="light">
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorRender
              error={error as Error}
              resetErrorBoundary={resetErrorBoundary}
            />
          )}
        >
          <RoutesComponent />
          {createPortal(<Toaster />, document.body)}
        </ErrorBoundary>
      </AppContainer>
    </BrowserRouter>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
