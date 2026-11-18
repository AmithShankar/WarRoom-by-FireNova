import { describe, expect, it } from 'vitest';
import { buildSecurityHeaders, buildCsp } from '@/lib/security-headers';

const asMap = (isDev: boolean) => Object.fromEntries(buildSecurityHeaders(isDev).map(h => [h.key, h.value]));

describe('security headers (L1)', () => {
  it('sets the full header set in production', () => {
    const h = asMap(false);
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Permissions-Policy']).toContain('camera=()');
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d{8,}; includeSubDomains/);
    expect(h['Content-Security-Policy']).toBe(buildCsp(false));
  });

  it('builds a CSP that blocks framing, plugins and foreign scripts', () => {
    const csp = buildCsp(false);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toMatch(/script-src 'self' 'unsafe-inline'(;|$)/);
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/https?:/);
  });

  it('allows eval only in development (React dev tooling)', () => {
    expect(buildCsp(true)).toContain("'unsafe-eval'");
    expect(asMap(true)['Strict-Transport-Security']).toBeUndefined();
  });
});
