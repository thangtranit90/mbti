import { Navigate, Outlet, Link, useLocation } from 'react-router';
import { getAdminToken, clearAdminToken } from '../lib/adminApi';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/content', label: 'Content' },
  { to: '/admin/insights', label: 'Insights' },
  { to: '/admin/analytics', label: 'Analytics' },
];

export function AdminGuard() {
  const token = getAdminToken();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <div className="min-h-svh bg-surface-deep text-white">
      <header className="border-b border-[var(--hairline)] px-6 py-4 flex items-center justify-between">
        <nav className="flex items-center gap-1 flex-wrap">
          <span className="font-clash font-bold text-lg mr-4 tracking-[-0.01em]">MBTI Admin</span>
          {NAV.map((n) => {
            const active = n.end
              ? location.pathname === n.to
              : location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? 'page' : undefined}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary/50 ${
                  active
                    ? 'bg-cta-primary text-white shadow-[var(--shadow-e1)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => {
            clearAdminToken();
            window.location.href = '/admin/login';
          }}
          className="text-sm text-slate-400 hover:text-white cursor-pointer transition-colors duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary/50 rounded-lg px-2 py-1"
        >
          Đăng xuất
        </button>
      </header>
      <main id="main" className="px-6 py-8 max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
