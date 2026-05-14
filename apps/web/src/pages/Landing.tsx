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
    <div
      className="min-h-svh flex items-center justify-center px-6 py-[60px] relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface-deep)' }}
    >
      {/* Subtle ambient glow — decorative, never animates */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[400px] rounded-full bg-[#6366F1]/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-[#818CF8]/6 blur-[80px]" />
      </div>

      <main id="main" className="relative z-10 w-full max-w-[480px]">
        {/* Social proof badge */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 mb-8">
          <span className="flex gap-0.5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} width="11" height="11" viewBox="0 0 12 12" fill="#818CF8">
                <path d="M6 1l1.4 3.1L11 4.6l-2.5 2.4.6 3.5L6 9 2.9 10.5l.6-3.5L1 4.6l3.6-.5L6 1z" />
              </svg>
            ))}
          </span>
          <p className="text-[13px] text-slate-400 leading-none">
            Hơn 12,000 người tại Việt Nam đã làm bài này tuần này
          </p>
        </div>

        {/* Headline */}
        <h1
          className="font-clash font-bold leading-[1.1] text-white mb-5"
          style={{ fontSize: 'clamp(2.25rem, 6vw, 4rem)' }}
        >
          Bạn bè bạn đang so sánh kiểu tính cách với nhau. Bạn chưa có kết quả.
        </h1>

        {/* Subtext */}
        <p className="text-base text-slate-400 leading-relaxed mb-8 max-w-[400px]">
          Không phải trắc nghiệm. Không có kiểu người đúng hay sai. Chỉ có một tấm gương — chính xác đến mức khó chịu.
        </p>

        {/* Primary CTA */}
        <Button
          size="lg"
          className="w-full h-auto min-h-[52px] py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#3730A3] text-white text-base font-semibold border-transparent cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2"
          onClick={handleCTAClick}
        >
          Xem tôi thuộc kiểu người nào
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Button>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 mt-4">
          {TRUST_ITEMS.map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-[13px] text-slate-500">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
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
