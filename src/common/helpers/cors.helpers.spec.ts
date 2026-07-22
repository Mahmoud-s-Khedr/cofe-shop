import { buildSharedCorsOptions, isAllowedOrigin } from './cors.helpers';

describe('buildSharedCorsOptions', () => {
  it('returns null when no origins are configured', () => {
    expect(buildSharedCorsOptions([])).toBeNull();
  });

  it('supports explicit origins with a matcher function and credentials', () => {
    const result = buildSharedCorsOptions(['https://a.com', 'https://b.com']);

    expect(result).toEqual({
      origin: expect.any(Function),
      credentials: true,
    });
  });

  it('uses permissive origin and disables credentials for wildcard', () => {
    expect(buildSharedCorsOptions(['*'])).toEqual({
      origin: true,
      credentials: false,
    });
  });

  it('allows an exact configured origin', () => {
    expect(isAllowedOrigin('https://a.com', ['https://a.com', 'https://b.com'])).toBe(true);
  });

  it('allows localhost config to match 127.0.0.1 with same scheme and port', () => {
    expect(isAllowedOrigin('http://127.0.0.1:8080', ['http://localhost:8080'])).toBe(true);
  });

  it('allows 127.0.0.1 config to match localhost with same scheme and port', () => {
    expect(isAllowedOrigin('http://localhost:3000', ['http://127.0.0.1:3000'])).toBe(true);
  });

  it('rejects a different port for localhost aliases', () => {
    expect(isAllowedOrigin('http://127.0.0.1:8000', ['http://localhost:800'])).toBe(false);
  });

  it('rejects a different scheme for localhost aliases', () => {
    expect(isAllowedOrigin('https://127.0.0.1:8080', ['http://localhost:8080'])).toBe(false);
  });

  it('rejects unrelated hosts', () => {
    expect(isAllowedOrigin('http://example.com:8080', ['http://localhost:8080'])).toBe(false);
  });
});
