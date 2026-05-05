import { Hono } from 'hono';
import type { Bindings } from '../types/bindings';

const ssr = new Hono<{ Bindings: Bindings }>();

const landingHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#050507">
  <title>MBTI Platform — Khám phá kiểu tính cách của bạn</title>
  <meta name="description" content="Bài trắc nghiệm tính cách chuẩn xác, không cần đăng ký. Nhận kết quả ngay.">
  <meta property="og:title" content="MBTI Platform — Khám phá kiểu tính cách của bạn">
  <meta property="og:description" content="Bài trắc nghiệm tính cách — chính xác đến mức khó chịu">
  <meta property="og:type" content="website">
  <link rel="manifest" href="/manifest.json">
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin>
  <link rel="preload" href="/fonts/ClashDisplay-Variable.woff2" as="font" type="font/woff2" crossorigin>
  <link href="https://api.fontshare.com/v2/css?f[]=clash-display@700,600,500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #050507; font-family: -apple-system, sans-serif; color: #f1f5f9; }
    .landing { min-height: 100svh; display: flex; align-items: center; justify-content: center; padding: 60px 24px 40px; }
    .inner { width: 100%; max-width: 480px; }
    .ticker { font-size: 13px; color: #64748b; animation: mbti-pulse 2s ease-in-out infinite; margin-bottom: 32px; }
    @keyframes mbti-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    .headline { font-family: 'Clash Display', sans-serif; font-size: clamp(2.25rem, 6vw, 4rem); font-weight: 700; line-height: 1.1; color: #fff; margin-bottom: 16px; }
    .subtext { font-size: 16px; color: #94a3b8; line-height: 1.6; margin-bottom: 32px; }
    .cta { display: block; width: 100%; min-height: 48px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; padding: 12px 24px; text-align: center; text-decoration: none; }
    .cta:hover { background: #4f46e5; }
    .cta:active { background: #3730a3; }
    .microcopy { font-size: 13px; color: #64748b; text-align: center; margin-top: 8px; }
  </style>
</head>
<body>
  <div id="root">
    <div class="landing">
      <div class="inner">
        <p class="ticker">Hơn 12,000 người tại Việt Nam đã làm bài này tuần này</p>
        <h1 class="headline">Bạn bè bạn đang so sánh kiểu tính cách với nhau. Bạn chưa có kết quả.</h1>
        <p class="subtext">Không phải trắc nghiệm. Không có kiểu người đúng hay sai. Chỉ có một tấm gương — chính xác đến mức khó chịu.</p>
        <a class="cta" href="/consent" role="button">Xem tôi thuộc kiểu người nào →</a>
        <p class="microcopy">Miễn phí · Không cần đăng ký · Kết quả ngay</p>
      </div>
    </div>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

const privacyHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#050507">
  <meta name="robots" content="noindex">
  <title>Chính sách Bảo mật — MBTI Platform</title>
  <meta name="description" content="Chính sách bảo mật của MBTI Platform — minh bạch, plain-language, tuân thủ PDPA.">
  <link rel="manifest" href="/manifest.json">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #050507; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #f1f5f9; line-height: 1.6; }
    main { max-width: 640px; margin: 0 auto; padding: 60px 24px 80px; }
    h1 { font-size: 32px; color: #fff; margin-bottom: 8px; }
    .updated { font-size: 13px; color: #64748b; margin-bottom: 32px; }
    h2 { font-size: 20px; color: #fff; margin-top: 32px; margin-bottom: 12px; }
    ul { padding-left: 20px; margin-bottom: 8px; }
    li { color: #cbd5e1; margin-bottom: 6px; }
    p { color: #cbd5e1; margin-bottom: 12px; }
    .footnote { margin-top: 48px; padding-top: 24px; border-top: 1px solid #1e293b; font-style: italic; color: #94a3b8; font-size: 14px; }
    a { color: #818cf8; }
  </style>
</head>
<body>
  <main>
    <h1>Chính sách Bảo mật</h1>
    <p class="updated">Cập nhật: 2026-05-05</p>

    <h2>Chúng tôi thu thập gì</h2>
    <ul>
      <li>Câu trả lời 12 câu hỏi tình huống trong bài test</li>
      <li>Loại MBTI bạn tự dự đoán (nếu chọn ở bước trước)</li>
      <li>ID phiên ẩn danh (UUID) — không gắn với danh tính cá nhân</li>
      <li>Hành vi trên nền tảng (lượt chia sẻ, lượt xem)</li>
    </ul>

    <h2>Chúng tôi dùng cho gì</h2>
    <ul>
      <li>Tạo kết quả MBTI và thông tin cá nhân hoá</li>
      <li>Cải thiện chất lượng câu hỏi và bài viết</li>
      <li>Phân tích xu hướng tổng hợp (không nhận diện cá nhân)</li>
    </ul>

    <h2>Lưu trữ</h2>
    <ul>
      <li>Phiên ẩn danh hết hạn sau 30 ngày</li>
      <li>Kết quả test giữ tối đa 12 tháng nếu không hoạt động</li>
      <li>Cơ sở hạ tầng: Cloudflare (offshore) ở giai đoạn MVP</li>
    </ul>

    <h2>Quyền của bạn (PDPA — Nghị định 13/2023)</h2>
    <ul>
      <li>Yêu cầu xoá toàn bộ dữ liệu bất cứ lúc nào</li>
      <li>Xem những gì chúng tôi lưu về bạn</li>
      <li>Xử lý trong 30 ngày kể từ ngày yêu cầu</li>
    </ul>

    <h2>Liên hệ</h2>
    <p>Email: <a href="mailto:privacy@mbti.example.vn">privacy@mbti.example.vn</a></p>

    <p class="footnote">Đây là công cụ tự phản chiếu, không phải đánh giá lâm sàng.</p>
  </main>
</body>
</html>`;

ssr.get('/', (c) => c.html(landingHtml));
ssr.get('/privacy', (c) => c.html(privacyHtml));

export default ssr;
