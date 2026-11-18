/**
 * Security headers for every route (L1). Applied in next.config.ts.
 *
 * CSP sources and why each is there:
 *  - default-src 'self'            Everything not listed below: same origin only.
 *  - script-src 'self'             Next.js chunks under /_next/static.
 *      'unsafe-inline'             Next.js App Router inlines its RSC flight data
 *                                  (self.__next_f.push) and bootstrap scripts, and next-themes
 *                                  injects an inline script to set the theme before paint. Both
 *                                  would need per-request nonces (dynamic rendering of every page)
 *                                  to drop this. There is no dangerouslySetInnerHTML and no
 *                                  third-party script, so the remaining XSS surface is small.
 *      'unsafe-eval' (dev only)    React dev tooling / Turbopack HMR use eval in development.
 *  - style-src 'self' 'unsafe-inline'
 *                                  Tailwind CSS file plus inline style attributes from Radix UI
 *                                  (popper positioning), dnd-kit transforms, sonner and next/font.
 *  - img-src 'self' data: blob:    App icons in /public; data: and blob: URLs used by UI libraries.
 *  - font-src 'self' data:         next/font/google self-hosts Inter and JetBrains Mono at build
 *                                  time under /_next/static/media; no fonts.googleapis.com request.
 *  - connect-src 'self'            tRPC (/api/trpc), /api/push/*, service worker fetches.
 *      ws: (dev only)              Next.js dev server HMR websocket.
 *    Clash of Clans API calls (cocproxy.royaleapi.dev) are made server-side only, and the
 *    browser's push subscription to FCM / Mozilla / Apple / WNS is made by the browser's push
 *    service itself, which CSP does not govern, so neither host is listed.
 *  - worker-src 'self'             /sw.js service worker.
 *  - manifest-src 'self'           /manifest.webmanifest (src/app/manifest.ts).
 *  - frame-src 'none'              The app embeds no frames.
 *  - frame-ancestors 'none'        No one may frame the app (clickjacking).
 *  - object-src 'none'             No plugins.
 *  - base-uri 'self'               Blocks <base> tag hijacking of relative URLs.
 *  - form-action 'self'            Forms may only submit to this origin.
 * The only external link (supercell.com fan content policy) is a plain navigation, which CSP
 * does not restrict.
 */
export function buildCsp(isDev: boolean): string {
  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])]],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:']],
    ['font-src', ["'self'", 'data:']],
    ['connect-src', ["'self'", ...(isDev ? ['ws:'] : [])]],
    ['worker-src', ["'self'"]],
    ['manifest-src', ["'self'"]],
    ['frame-src', ["'none'"]],
    ['frame-ancestors', ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
}

export function buildSecurityHeaders(isDev: boolean): { key: string; value: string }[] {
  const headers = [
    { key: 'Content-Security-Policy', value: buildCsp(isDev) },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    },
  ];
  // HSTS only in production: on http://localhost it is ignored anyway, and it must not pin a
  // dev host to HTTPS. Two years, subdomains included; not submitted for preload.
  if (!isDev) headers.push({ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' });
  return headers;
}
