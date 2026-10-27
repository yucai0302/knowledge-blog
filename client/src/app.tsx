import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { BlogProvider } from './blog-context';
import Layout from './components/Layout';
import HomePage from './pages/Home/HomePage';
import TimelinePage from './pages/Timeline/TimelinePage';
import NotFound from './pages/NotFound/NotFound';

// 文章页依赖 Streamdown（KaTeX/shiki/marked 全家桶），懒加载避免拖慢首屏
const PostPage = lazy(() => import('./pages/Post/PostPage'));
const ProjectsPage = lazy(() => import('./pages/Projects/ProjectsPage'));
const AboutPage = lazy(() => import('./pages/About/AboutPage'));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
      加载中…
    </div>
  );
}

const RoutesComponent = () => {
  return (
    <BlogProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route
            path="projects"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ProjectsPage />
              </Suspense>
            }
          />
          <Route
            path="about"
            element={
              <Suspense fallback={<RouteFallback />}>
                <AboutPage />
              </Suspense>
            }
          />
          <Route
            path="post/:slug"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PostPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BlogProvider>
  );
};

export default RoutesComponent;
