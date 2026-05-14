// Cloudflare Pages middleware: inject per-result OG meta tags so social
// crawlers (Facebook, Twitter, Zalo) see the correct preview image when
// users share /result/:resultId URLs.
//
// For non-result paths or non-200 responses, the upstream index.html is
// served unchanged.

type Env = {
  API_URL?: string;
  SITE_URL?: string;
};

const DEFAULT_API_URL = 'https://mbti-api.thangtranit90.workers.dev';
const DEFAULT_SITE_URL = 'https://mbti.thanghost.io.vn';

// UUID v4 — strict 8-4-4-4-12 hex pattern, case-insensitive.
const RESULT_PATH_RE =
  /^\/result\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

class OGRewriter {
  constructor(
    private readonly resultId: string,
    private readonly apiUrl: string,
    private readonly siteUrl: string,
  ) {}

  element(el: Element) {
    const property = el.getAttribute('property');
    const name = el.getAttribute('name');
    const ogImageUrl = `${this.apiUrl}/api/og/${this.resultId}`;
    const pageUrl = `${this.siteUrl}/result/${this.resultId}`;
    const title = 'Tôi vừa khám phá kiểu tính cách của mình — Quiet Mirror';
    const description =
      'Bài trắc nghiệm MBTI chính xác đến mức khó chịu. Bạn cũng thử đi.';

    if (property === 'og:image' || name === 'twitter:image') {
      el.setAttribute('content', ogImageUrl);
    } else if (property === 'og:url') {
      el.setAttribute('content', pageUrl);
    } else if (property === 'og:title' || name === 'twitter:title') {
      el.setAttribute('content', title);
    } else if (property === 'og:description' || name === 'twitter:description') {
      el.setAttribute('content', description);
    }
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const match = url.pathname.match(RESULT_PATH_RE);

  const response = await context.next();
  if (!match) return response;
  if (response.status !== 200) return response;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return response;

  const resultId = match[1].toLowerCase();
  const apiUrl = context.env.API_URL ?? DEFAULT_API_URL;
  const siteUrl = context.env.SITE_URL ?? DEFAULT_SITE_URL;

  return new HTMLRewriter()
    .on('meta', new OGRewriter(resultId, apiUrl, siteUrl))
    .transform(response);
};
