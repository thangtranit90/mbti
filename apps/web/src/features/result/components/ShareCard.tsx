import { forwardRef } from 'react';
import type { MBTIType } from '@mbti/shared';

type Props = {
  personaName: string;
  mbtiType: MBTIType;
  insight: string;
};

// 9:16 Stories-format card (1080×1920) used by html-to-image to generate a
// shareable PNG. Rendered off-screen by PersonaReveal so the PNG is ready
// before the user taps "Chia sẻ".
export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { personaName, mbtiType, insight },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '-10000px',
        left: '-10000px',
        width: '1080px',
        height: '1920px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '120px 100px',
        background: '#0D0F1A',
        fontFamily: '"Clash Display", "Inter", -apple-system, sans-serif',
        color: '#fff',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div
        className={`bg-type-${mbtiType}`}
        style={{
          position: 'absolute',
          top: '-200px',
          right: '-200px',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          filter: 'blur(160px)',
          opacity: 0.35,
        }}
      />
      <div
        className={`bg-type-${mbtiType}`}
        style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-150px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          filter: 'blur(140px)',
          opacity: 0.2,
        }}
      />

      <div
        style={{
          fontSize: '32px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#94a3b8',
          position: 'relative',
          zIndex: 10,
        }}
      >
        Quiet Mirror
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <div
          className={`text-type-${mbtiType}`}
          style={{
            fontSize: '120px',
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          {personaName}
        </div>
        <div
          className={`text-type-${mbtiType}`}
          style={{
            fontSize: '40px',
            letterSpacing: '0.3em',
          }}
        >
          {mbtiType}
        </div>
        <div
          style={{
            fontSize: '32px',
            lineHeight: 1.5,
            color: '#cbd5e1',
            maxWidth: '760px',
          }}
        >
          {insight}
        </div>
      </div>

      <div
        style={{
          fontSize: '28px',
          color: '#64748b',
          position: 'relative',
          zIndex: 10,
        }}
      >
        3 kiểu người dễ mâu thuẫn với tôi →
      </div>
    </div>
  );
});
