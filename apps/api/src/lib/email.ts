import { Resend } from 'resend';
import type { Bindings } from '../types/bindings';

const FROM = 'MBTI <info@mbti.thanghost.io.vn>';
const REPLY_TO = 'info@mbti.thanghost.io.vn';
const UNSUB_MAILTO = 'unsubscribe@mbti.thanghost.io.vn';

type UnlockArgs = {
  to: string;
  paymentId: string;
  resultId: string;
  resultUrl: string;
};

export type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Fires the thank-you email after a `result_unlock` payment is confirmed.
 *
 * Idempotency: `result-unlock/<paymentId>` — Resend dedupes within 24h, and
 * the caller also flips `payments.email_sent_at` so we never even try a
 * second time. Caller wraps in `waitUntil` so the IPN webhook still acks
 * 200 to SePay within 30s.
 */
export async function sendResultUnlockEmail(
  env: Bindings,
  args: UnlockArgs,
): Promise<SendResult> {
  if (!env.RESEND_API_KEY) {
    // Local dev / staging without RESEND_API_KEY configured — log and skip.
    console.warn('sendResultUnlockEmail: RESEND_API_KEY missing, skipping send');
    return { ok: false, error: 'RESEND_API_KEY_MISSING' };
  }

  const resend = new Resend(env.RESEND_API_KEY);

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: [args.to],
      replyTo: REPLY_TO,
      subject: 'Kết quả MBTI của bạn đã sẵn sàng',
      html: renderUnlockHtml(args),
      text: renderUnlockText(args),
      headers: {
        // List-Unsubscribe + One-Click are scoring signals at Gmail/Yahoo
        // even for transactional mail.
        'List-Unsubscribe': `<mailto:${UNSUB_MAILTO}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [{ name: 'category', value: 'result_unlock' }],
    },
    { idempotencyKey: `result-unlock/${args.paymentId}` },
  );

  if (error) {
    console.error('sendResultUnlockEmail: Resend error', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ----- Templates ---------------------------------------------------------

function renderUnlockText(args: UnlockArgs): string {
  return [
    'Chào bạn,',
    '',
    'Cảm ơn bạn đã mở khoá kết quả MBTI. Bạn có thể xem ngay tại link bên dưới (lưu lại để mở lại bất cứ lúc nào):',
    '',
    args.resultUrl,
    '',
    'Link này gắn riêng với kết quả của bạn — đừng chia sẻ rộng nếu bạn muốn giữ riêng tư.',
    '',
    'Hẹn gặp lại,',
    'Đội ngũ MBTI',
    '',
    `Bạn nhận email này vì vừa thanh toán mở khoá kết quả trên mbti.thanghost.io.vn.`,
    `Huỷ nhận tin: mailto:${UNSUB_MAILTO}?subject=unsubscribe`,
  ].join('\n');
}

function renderUnlockHtml(args: UnlockArgs): string {
  const url = escapeHtml(args.resultUrl);
  const preheader =
    'Cảm ơn bạn đã mở khoá kết quả — bấm để xem kiểu tính cách của bạn ngay.';

  // Inline-styled, single-column, max 600px. Avoids web fonts (system fallback
  // stack), no remote images, no JS — maximum client compatibility and the
  // best Spamassassin profile.
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Kết quả MBTI của bạn đã sẵn sàng</title>
<style>
  /* Mobile niceties */
  @media (max-width: 480px) {
    .container { padding: 16px !important; }
    .card { padding: 28px 22px !important; border-radius: 16px !important; }
    h1.hero { font-size: 24px !important; line-height: 1.25 !important; }
    .cta { font-size: 16px !important; padding: 16px 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#0b1020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e6e8ef;">
  <!-- Preheader (hidden, shown by Gmail/iOS as preview) -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(180deg,#0b1020 0%,#0e1430 100%);">
    <tr>
      <td align="center" class="container" style="padding:32px 20px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <!-- Brand row -->
          <tr>
            <td align="left" style="padding:0 4px 18px;">
              <span style="display:inline-block;font-weight:700;font-size:15px;letter-spacing:0.04em;color:#c8c2ff;text-transform:uppercase;">MBTI</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td class="card" style="background:#141a35;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 32px;box-shadow:0 24px 64px rgba(0,0,0,0.45);">

              <!-- Badge -->
              <div style="display:inline-block;font-size:12px;font-weight:600;letter-spacing:0.04em;color:#7c83ff;background:rgba(124,131,255,0.12);border:1px solid rgba(124,131,255,0.35);border-radius:999px;padding:6px 12px;margin-bottom:18px;">
                THANH TOÁN ĐÃ XÁC NHẬN
              </div>

              <h1 class="hero" style="margin:0 0 12px;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.01em;color:#ffffff;">
                Kết quả MBTI của bạn đã sẵn sàng
              </h1>

              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#b4bbd1;">
                Cảm ơn bạn đã mở khoá. Bấm nút bên dưới để xem ngay kiểu tính cách
                — hoặc lưu email này lại để mở lại bất cứ khi nào bạn muốn.
              </p>

              <!-- CTA button (bulletproof: table-based) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
                <tr>
                  <td align="center" bgcolor="#7c83ff" style="border-radius:12px;">
                    <a href="${url}" class="cta" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#0b1020;text-decoration:none;border-radius:12px;background:#7c83ff;mso-padding-alt:0;">
                      Xem kết quả của tôi →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Raw link fallback -->
              <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#7a829c;">
                Nếu nút không hoạt động, sao chép link sau vào trình duyệt:<br />
                <a href="${url}" style="color:#9aa1ff;word-break:break-all;text-decoration:underline;">${url}</a>
              </p>

              <!-- Hairline -->
              <div style="height:1px;background:rgba(255,255,255,0.08);margin:24px 0;"></div>

              <p style="margin:0;font-size:13px;line-height:1.6;color:#7a829c;">
                Link này gắn riêng với kết quả của bạn — hãy giữ riêng tư nếu bạn
                không muốn ai khác xem cùng.
              </p>
            </td>
          </tr>

          <!-- Sign-off -->
          <tr>
            <td style="padding:24px 8px 0;">
              <p style="margin:0 0 4px;font-size:14px;color:#d6dbf0;">Hẹn gặp lại bạn,</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Đội ngũ MBTI</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 8px 8px;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#5e6685;">
                Bạn nhận email này vì vừa thanh toán mở khoá kết quả tại
                <a href="https://mbti.thanghost.io.vn" style="color:#9aa1ff;text-decoration:underline;">mbti.thanghost.io.vn</a>.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#5e6685;">
                Không muốn nhận nữa?
                <a href="mailto:${UNSUB_MAILTO}?subject=unsubscribe" style="color:#9aa1ff;text-decoration:underline;">Huỷ nhận tin</a>.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
