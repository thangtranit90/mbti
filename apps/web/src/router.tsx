/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Link } from 'react-router';
import { RootError } from './pages/RootError';

const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));
const TypeSelector = lazy(() =>
  import('./features/test/components/TypeSelector').then((m) => ({ default: m.TypeSelector })),
);
const TestFlow = lazy(() =>
  import('./features/test/components/TestFlow').then((m) => ({ default: m.TestFlow })),
);
const TestSubmit = lazy(() =>
  import('./features/test/components/TestSubmit').then((m) => ({ default: m.TestSubmit })),
);
const ResultPage = lazy(() =>
  import('./features/result/components/ResultPage').then((m) => ({ default: m.ResultPage })),
);

function PageLoader() {
  return (
    <div className="min-h-svh bg-surface-deep flex items-center justify-center">
      <svg
        className="animate-spin text-white/20"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-label="Đang tải..."
      >
        <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function wrap(element: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

function NotFound() {
  return (
    <div className="min-h-svh bg-surface-base flex items-center justify-center px-6">
      <main id="main" className="text-center max-w-sm">
        <h1 className="text-6xl font-clash font-bold text-white mb-4 leading-none">404</h1>
        <p className="text-slate-400 mb-8">Trang bạn tìm không tồn tại.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cta-primary hover:bg-cta-hover text-white font-medium text-[15px] transition-colors duration-200 cursor-pointer"
        >
          Về trang chủ
        </Link>
      </main>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: wrap(<Landing />),
    errorElement: <RootError />,
  },
  {
    path: '/declare',
    element: wrap(<TypeSelector />),
    errorElement: <RootError />,
  },
  {
    path: '/test',
    element: wrap(<TestFlow />),
    errorElement: <RootError />,
  },
  {
    path: '/test/submit',
    element: wrap(<TestSubmit />),
    errorElement: <RootError />,
  },
  {
    path: '/result/:resultId',
    element: wrap(<ResultPage />),
    errorElement: <RootError />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
