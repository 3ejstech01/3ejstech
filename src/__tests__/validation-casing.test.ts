import { validateInstallation, validateUser } from '@/lib/validation';

describe('validation casing', () => {
  it('accepts only camelCase keys (no snake duplicates)', () => {
    const ok = validateInstallation({ accountNumber: 'A1', subscriberName: 'S', joNumber: 'J1' });
    expect(ok.success).toBe(true);
    const bad = validateInstallation({ accountnumber: 'A1', subsname: 'S', jonumber: 'J1' });
    expect(bad.success).toBe(false);
  });

  it('rejects unknown extra fields on user', () => {
    const r = validateUser({ username: 'abc', password: 'secret1', role: 'admin', evil: 'x' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown extra fields on installation', () => {
    const r = validateInstallation({ accountNumber: 'A1', subscriberName: 'S', joNumber: 'J1', unknownField: 'x' });
    expect(r.success).toBe(false);
  });
});