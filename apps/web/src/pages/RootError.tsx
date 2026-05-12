import { isRouteErrorResponse, useRouteError, Link } from 'react-router';

export function RootError() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Đã xảy ra lỗi không mong muốn';

  return (
    <div className="min-h-svh bg-surface-deep flex items-center justify-center px-6">
      <main id="main" className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5M12 16h.01" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          {is404 ? '404' : 'Lỗi'}
        </h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          {is404 ? 'Trang bạn tìm không tồn tại.' : message}
        </p>
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
