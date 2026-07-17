import { createHash } from 'crypto';

export function computeChecksum(data: Record<string, unknown>): string {
  const stable = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(stable).digest('hex').slice(0, 16);
}

export function verifyChecksum(data: Record<string, unknown>, checksum: string): boolean {
  return computeChecksum(data) === checksum;
}