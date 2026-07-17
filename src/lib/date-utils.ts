export function parseDateInput(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{5,6}$/.test(raw)) {
    return new Date((Number(raw) - 25569) * 86400 * 1000);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return new Date(raw.substring(0, 10));
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [month, day, year] = raw.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  const cleaned = raw.replace(/GMT[+-]\d{4}.*/i, '').replace(/\(.*\)/, '').trim();
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateKey(value: unknown): string | null {
  const date = parseDateInput(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
