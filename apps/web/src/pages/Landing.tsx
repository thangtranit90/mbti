import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { safeCapture } from '@/lib/posthog';

export function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    safeCapture('landing_page_viewed');
  }, []);

  const handleCTAClick = () => {
    safeCapture('cta_tapped', {
      buttonText: 'Xem tôi thuộc kiểu người nào →',
    });
    navigate('/consent');
  };

  return (
    <div
      className="min-h-svh flex items-center justify-center px-6 py-[60px]"
      style={{ backgroundColor: 'var(--color-surface-deep)' }}
    >
      <div className="w-full max-w-[480px]">
        {/* Social proof ticker */}
        <p className="text-[13px] text-slate-500 animate-pulse mb-8">
          Hơn 12,000 người tại Việt Nam đã làm bài này tuần này
        </p>

        {/* Headline */}
        <h1
          className="font-clash font-bold leading-[1.1] text-white mb-4"
          style={{ fontSize: 'clamp(2.25rem, 6vw, 4rem)' }}
        >
          Bạn bè bạn đang so sánh kiểu tính cách với nhau. Bạn chưa có kết quả.
        </h1>

        {/* Subtext */}
        <p className="text-base text-slate-400 leading-relaxed mb-8">
          Không phải trắc nghiệm. Không có kiểu người đúng hay sai. Chỉ có một tấm gương — chính xác đến mức khó chịu.
        </p>

        {/* Primary CTA */}
        <Button
          size="lg"
          className="w-full h-auto min-h-[48px] py-3 bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#3730A3] text-white text-base font-medium border-transparent"
          onClick={handleCTAClick}
        >
          Xem tôi thuộc kiểu người nào →
        </Button>

        {/* Micro-copy */}
        <p className="text-[13px] text-slate-500 text-center mt-2">
          Miễn phí · Không cần đăng ký · Kết quả ngay
        </p>
      </div>
    </div>
  );
}
