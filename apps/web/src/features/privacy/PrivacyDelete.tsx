import { useState } from 'react';
import { Link } from 'react-router';
import { apiCall } from '@/lib/api';

// Story 7.4 — user-facing PDPA right-to-erasure affordance (NFR11).
export function PrivacyDelete() {
  const [state, setState] = useState<'idle' | 'confirm' | 'done' | 'error'>('idle');

  const onDelete = async () => {
    try {
      await apiCall('/api/privacy/delete-me', { method: 'DELETE' });
      try {
        localStorage.removeItem('mbti-session-token');
        localStorage.removeItem('mbti-last-result-type');
      } catch {
        /* noop */
      }
      setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <main
      id="main"
      className="min-h-svh bg-surface-deep flex items-center justify-center px-6"
    >
      <div className="max-w-md w-full bg-surface-elevated border border-[var(--hairline)] shadow-[var(--shadow-e2)] rounded-2xl p-8 text-center">
        <h1 className="font-clash font-bold text-2xl text-white mb-3">
          Quyền riêng tư &amp; dữ liệu
        </h1>
        {state === 'done' ? (
          <>
            <p className="text-emerald-400 mb-6">
              Dữ liệu của bạn đã được xoá theo yêu cầu (PDPA).
            </p>
            <Link
              to="/"
              className="inline-flex px-6 py-3 rounded-xl bg-cta-primary hover:bg-cta-hover text-white font-medium cursor-pointer"
            >
              Về trang chủ
            </Link>
          </>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-6">
              Bạn có thể yêu cầu xoá toàn bộ dữ liệu cá nhân (kết quả test, link
              mời, phiếu đánh giá). Hành động này không thể hoàn tác.
            </p>
            {state === 'error' && (
              <p className="text-rose-400 text-sm mb-4">
                Có lỗi xảy ra hoặc bạn chưa có phiên. Thử lại sau.
              </p>
            )}
            {state === 'confirm' ? (
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium cursor-pointer"
                >
                  Xác nhận xoá vĩnh viễn
                </button>
                <button
                  type="button"
                  onClick={() => setState('idle')}
                  className="px-5 py-2.5 rounded-xl border border-[var(--hairline-strong)] text-slate-300 hover:text-white hover:bg-white/[0.04] text-sm cursor-pointer transition-colors duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary/50"
                >
                  Huỷ
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setState('confirm')}
                className="px-5 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-sm font-medium cursor-pointer"
              >
                Xoá dữ liệu của tôi
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
