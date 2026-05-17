import { useState } from 'react';
import { useNavigate } from 'react-router';
import { adminCall, setAdminToken, getAdminToken } from '../lib/adminApi';

export function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (getAdminToken()) {
    navigate('/admin', { replace: true });
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await adminCall<{ data: { adminToken: string } | null; error: unknown }>(
        '/api/admin/login',
        { method: 'POST', body: JSON.stringify({ username, password }) },
      );
      if (res.data?.adminToken) {
        setAdminToken(res.data.adminToken);
        navigate('/admin', { replace: true });
      } else {
        setError('Đăng nhập thất bại');
      }
    } catch {
      setError('Sai tài khoản hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh bg-surface-deep flex items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-surface-elevated border border-[var(--hairline)] shadow-[var(--shadow-e3)] rounded-2xl p-8"
      >
        <h1 className="font-clash font-bold text-[28px] tracking-[-0.01em] text-white mb-1">MBTI Admin</h1>
        <p className="text-slate-400 text-sm mb-7">Khu vực quản trị — yêu cầu đăng nhập.</p>
        <label className="block text-sm text-slate-300 mb-1" htmlFor="admin-username">
          Tài khoản
        </label>
        <input
          id="admin-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 rounded-xl bg-surface-deep border border-[var(--hairline)] text-white outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-cta-primary focus:ring-2 focus:ring-cta-primary/30"
        />
        <label className="block text-sm text-slate-300 mb-1" htmlFor="admin-password">
          Mật khẩu
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-5 px-3 py-2 rounded-xl bg-surface-deep border border-[var(--hairline)] text-white outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-cta-primary focus:ring-2 focus:ring-cta-primary/30"
        />
        {error && <p className="text-rose-400 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-cta-primary hover:bg-cta-hover disabled:opacity-50 text-white font-semibold shadow-[var(--shadow-e2)] transition-[transform,background-color] duration-[var(--dur-fast)] hover:-translate-y-[1px] active:translate-y-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated"
        >
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
