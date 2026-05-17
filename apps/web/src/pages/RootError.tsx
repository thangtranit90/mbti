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
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" className="text-rose-400">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5M12 16h.01" />
          </svg>
        </div>
        <h1 className="font-clash text-4xl font-bold text-white mb-3">
          {is404 ? '404' : 'Lỗi'}
        </h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          {is404 ? 'Trang bạn tìm không tồn tại.' : message}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cta-primary hover:bg-cta-hover text-white font-semibold text-[15px] transition-[transform,background-color] duration-[var(--dur-fast)] hover:-translate-y-[1px] active:translate-y-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-deep"
        >
          Về trang chủ
        </Link>
      </main>
    </div>
  );
}
