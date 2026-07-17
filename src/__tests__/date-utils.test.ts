import { formatDateKey, monthLabel, parseDateInput } from '@/lib/date-utils';

describe('date-utils', () => {
  it('parses Sheets date serials', () => {
    const date = parseDateInput(45321);
    expect(date?.toISOString().slice(0, 10)).toBe('2024-01-30');
  });

  it('parses MM/DD/YYYY strings', () => {
    const date = parseDateInput('02/05/2024');
    expect(formatDateKey(date)).toBe('2024-02');
  });

  it('creates short month labels', () => {
    expect(monthLabel('2024-02')).toBe('Feb 24');
  });

  it('returns null for invalid/empty input', () => {
    expect(parseDateInput(null)).toBeNull();
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput('not-a-date')).toBeNull();
  });
});
