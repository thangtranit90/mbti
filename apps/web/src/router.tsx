/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Link, Outlet } from 'react-router';
import { RootError } from './pages/RootError';
import { SocialNotificationToast } from './features/social/components/SocialNotificationToast';

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
const InviteeLanding = lazy(() =>
  import('./features/social/components/InviteeLanding').then((m) => ({
    default: m.InviteeLanding,
  })),
);
const FeedPage = lazy(() =>
  import('./features/feed/components/FeedPage').then((m) => ({ default: m.FeedPage })),
);
const ArticlePage = lazy(() =>
  import('./features/feed/components/ArticlePage').then((m) => ({ default: m.ArticlePage })),
);
const AdminGuard = lazy(() =>
  import('./features/admin/components/AdminGuard').then((m) => ({ default: m.AdminGuard })),
);
const AdminLogin = lazy(() =>
  import('./features/admin/components/AdminLogin').then((m) => ({ default: m.AdminLogin })),
);
const AdminDashboard = lazy(() =>
  import('./features/admin/components/AdminDashboard').then((m) => ({
    default: m.AdminDashboard,
  })),
);
const ArticleEditor = lazy(() =>
  import('./features/admin/components/ArticleEditor').then((m) => ({
    default: m.ArticleEditor,
  })),
);
const InsightReview = lazy(() =>
  import('./features/admin/components/InsightReview').then((m) => ({
    default: m.InsightReview,
  })),
);
const AnalyticsPanel = lazy(() =>
  import('./features/admin/components/AnalyticsPanel').then((m) => ({
    default: m.AnalyticsPanel,
  })),
);
const PrivacyDelete = lazy(() =>
  import('./features/privacy/PrivacyDelete').then((m) => ({ default: m.PrivacyDelete })),
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

function RootLayout() {
  return (
    <>
      <Outlet />
      <SocialNotificationToast />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RootError />,
    children: [
      { path: '/', element: wrap(<Landing />) },
      { path: '/declare', element: wrap(<TypeSelector />) },
      { path: '/test', element: wrap(<TestFlow />) },
      { path: '/test/submit', element: wrap(<TestSubmit />) },
      { path: '/result/:resultId', element: wrap(<ResultPage />) },
      { path: '/invite/:token', element: wrap(<InviteeLanding />) },
      { path: '/feed', element: wrap(<FeedPage />) },
      { path: '/feed/:slug', element: wrap(<ArticlePage />) },
      { path: '/privacy', element: wrap(<PrivacyDelete />) },
      { path: '/admin/login', element: wrap(<AdminLogin />) },
      {
        path: '/admin',
        element: wrap(<AdminGuard />),
        children: [
          { index: true, element: wrap(<AdminDashboard />) },
          { path: 'content', element: wrap(<ArticleEditor />) },
          { path: 'insights', element: wrap(<InsightReview />) },
          { path: 'analytics', element: wrap(<AnalyticsPanel />) },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
