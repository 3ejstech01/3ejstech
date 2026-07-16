import { checkRateLimit, _resetRateLimits } from '@/lib/rate-limit';

beforeEach(() => _resetRateLimits());

it('persists across reloads via the store', async () => {
  let allowed = 0;
  for (let i = 0; i < 6; i++) {
    const r = await checkRateLimit('login:ip', 5, 60_000);
    if (r.allowed) allowed++;
  }
  expect(allowed).toBe(5);
  const blocked = await checkRateLimit('login:ip', 5, 60_000);
  expect(blocked.allowed).toBe(false);
});