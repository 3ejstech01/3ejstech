import { computeChecksum, verifyChecksum } from '@/lib/checksum';

it('computes a stable hash from an object', () => {
  const data = { name: 'Juan', role: 'admin', updatedAt: '2026-07-17' };
  const hash = computeChecksum(data);
  expect(typeof hash).toBe('string');
  expect(hash.length).toBe(16); // 16-char hex
});

it('returns same hash for same data regardless of key order', () => {
  const a = { name: 'Juan', role: 'admin' };
  const b = { role: 'admin', name: 'Juan' };
  expect(computeChecksum(a)).toBe(computeChecksum(b));
});

it('returns different hash for different data', () => {
  const a = { name: 'Juan' };
  const b = { name: 'Mario' };
  expect(computeChecksum(a)).not.toBe(computeChecksum(b));
});

it('verifies checksum matches', () => {
  const data = { name: 'Juan' };
  const hash = computeChecksum(data);
  expect(verifyChecksum(data, hash)).toBe(true);
  expect(verifyChecksum({ name: 'Mario' }, hash)).toBe(false);
});