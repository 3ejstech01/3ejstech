import { checkRateLimit, _resetRateLimits } from '@/lib/rate-limit';

describe('rate-limit', () => {
  beforeEach(() => _resetRateLimits());

  it('allows up to max requests within the window', async () => {
    const r1 = await checkRateLimit('k', 3, 1000, 100);
    const r2 = await checkRateLimit('k', 3, 1000, 200);
    const r3 = await checkRateLimit('k', 3, 1000, 300);
    expect([r1.allowed, r2.allowed, r3.allowed]).toEqual([true, true, true]);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests beyond max within the window', async () => {
    await checkRateLimit('k', 2, 1000, 100);
    await checkRateLimit('k', 2, 1000, 200);
    const blocked = await checkRateLimit('k', 2, 1000, 300);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets after the window elapses', async () => {
    await checkRateLimit('k', 1, 1000, 100);
    const blocked = await checkRateLimit('k', 1, 1000, 500);
    expect(blocked.allowed).toBe(false);
    const after = await checkRateLimit('k', 1, 1000, 1200);
    expect(after.allowed).toBe(true);
  });

  it('isolates buckets per key', async () => {
    await checkRateLimit('a', 1, 1000, 100);
    const r = await checkRateLimit('b', 1, 1000, 100);
    expect(r.allowed).toBe(true);
  });
});