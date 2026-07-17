import { formatCurrency, parseNumberInput } from '@/lib/number-utils';

describe('number-utils', () => {
  it('parses numeric strings safely', () => {
    expect(parseNumberInput('1,234.50')).toBe(1234.5);
    expect(parseNumberInput('not-a-number', 7)).toBe(7);
  });

  it('returns numbers unchanged when finite', () => {
    expect(parseNumberInput(42)).toBe(42);
    expect(parseNumberInput(Number.NaN, 0)).toBe(0);
  });

  it('formats PHP currency', () => {
    expect(formatCurrency('1234.5')).toContain('₱');
    expect(formatCurrency('1234.5')).toContain('1,234.50');
  });
});
