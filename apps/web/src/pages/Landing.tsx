import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { safeCapture } from '@/lib/posthog';
import { apiCall } from '@/lib/api';
import { getSessionToken } from '@/lib/session';

const TRUST_ITEMS = ['Miễn phí', 'Không đăng ký', 'Kết quả ngay'];

export function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    safeCapture('landing_page_viewed');
  }, []);

  const handleCTAClick = () => {
    safeCapture('cta_tapped', { buttonText: 'Xem tôi thuộc kiểu người nào' });
    if (getSessionToken()) {
      apiCall('/api/sessions/consent', {
        method: 'PATCH',
        body: JSON.stringify({ consentGiven: true, ageConfirmed: true }),
      }).catch(() => {});
    }
    navigate('/declare');
  };

  return (
    <div className="min-h-svh flex items-center justify-center px-6 py-16 relative overflow-hidden bg-surface-deep">
      {/* Layered ambient depth — decorative, never animates */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] max-w-[120vw] h-[420px] rounded-full bg-cta-primary/12 blur-[120px]" />
        <div className="absolute bottom-[18%] right-[12%] w-[320px] h-[320px] rounded-full bg-type-INTJ/[0.07] blur-[90px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <main id="main" className="relative z-10 w-full max-w-[520px] text-center sm:text-left">
        {/* Social proof badge */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-[var(--hairline)] bg-white/[0.04] backdrop-blur-sm mb-9 shadow-[var(--shadow-e1)]">
          <span className="flex gap-0.5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} width="11" height="11" viewBox="0 0 12 12" className="fill-type-INTJ">
                <path d="M6 1l1.4 3.1L11 4.6l-2.5 2.4.6 3.5L6 9 2.9 10.5l.6-3.5L1 4.6l3.6-.5L6 1z" />
              </svg>
            ))}
          </span>
          <p className="text-[13px] text-slate-300 leading-none">
            Hơn 12,000 người Việt đã làm tuần này
          </p>
        </div>

        {/* Headline */}
        <h1
          className="font-clash font-bold leading-[1.06] tracking-[-0.02em] text-white mb-5 text-balance"
          style={{ fontSize: 'clamp(2.25rem, 7vw, 4rem)' }}
        >
          Bạn bè đang so sánh kiểu tính cách với nhau.{' '}
          <span className="bg-gradient-to-r from-cta-primary to-type-INTJ bg-clip-text text-transparent">
            Bạn chưa có kết quả.
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-[17px] text-slate-300/90 leading-relaxed mb-9 max-w-[440px] mx-auto sm:mx-0">
          Không phải trắc nghiệm. Không có kiểu người đúng hay sai. Chỉ có một tấm
          gương — chính xác đến mức khó chịu.
        </p>

        {/* Primary CTA */}
        <Button
          size="lg"
          onClick={handleCTAClick}
          className="group w-full h-auto min-h-[56px] py-4 bg-cta-primary hover:bg-cta-hover text-white text-base font-semibold border-transparent cursor-pointer flex items-center justify-center gap-2 rounded-2xl shadow-[var(--shadow-e2)] transition-[transform,background-color] duration-[var(--dur-fast)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-deep"
        >
          Xem tôi thuộc kiểu người nào
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            className="transition-transform duration-[var(--dur-fast)] group-hover:translate-x-1"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Button>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1.5 mt-5">
          {TRUST_ITEMS.map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-[13px] text-slate-400">
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true" className="text-type-INTP"
              >
                <polyline points="2,6 5,9 10,3" />
              </svg>
              {item}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
