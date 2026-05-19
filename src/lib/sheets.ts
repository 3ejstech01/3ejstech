const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || '';

export interface SheetsResponse<T> {
  data: T[] | null;
  error: string | null;
}

async function sheetsFetch<T>(
  sheet: string,
  options: {
    action?: 'append' | 'update' | 'delete' | 'filter';
    row?: Record<string, unknown>;
    keyColumn?: string;
    keyValue?: string;
  } = {}
): Promise<SheetsResponse<T>> {
  if (!WEBAPP_URL) {
    return { data: null, error: 'Google Sheets Web App URL not configured' };
  }

  try {
    if (!options.action) {
      const url = `${WEBAPP_URL}?sheet=${encodeURIComponent(sheet)}`;
      const res = await fetch(url);
      if (!res.ok) {
        return { data: null, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const json = await res.json();
      if (json.error) {
        return { data: null, error: json.error };
      }
      return { data: Array.isArray(json) ? json : [], error: null };
    }

    const payload: Record<string, unknown> = {
      sheet,
      action: options.action,
    };
    if (options.row) payload.row = options.row;
    if (options.keyColumn) payload.keyColumn = options.keyColumn;
    if (options.keyValue) payload.keyValue = options.keyValue;

    const res = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { data: null, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const json = await res.json();
    if (json.error) {
      return { data: null, error: json.error };
    }

    if (options.action === 'filter') {
      return { data: Array.isArray(json) ? json : [], error: null };
    }

    return { data: [json], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

async function getAll<T>(sheet: string): Promise<T[]> {
  const { data, error } = await sheetsFetch<T>(sheet);
  if (error) {
    console.error(`[Sheets] Error fetching ${sheet}:`, error);
    return [];
  }
  return data || [];
}

async function appendRow(sheet: string, row: Record<string, unknown>): Promise<boolean> {
  const { error } = await sheetsFetch(sheet, { action: 'append', row });
  if (error) {
    console.error(`[Sheets] Error appending to ${sheet}:`, error);
    return false;
  }
  return true;
}

async function updateRow(sheet: string, keyColumn: string, keyValue: string, row: Record<string, unknown>): Promise<boolean> {
  const { error } = await sheetsFetch(sheet, { action: 'update', keyColumn, keyValue, row });
  if (error) {
    console.error(`[Sheets] Error updating ${sheet}:`, error);
    return false;
  }
  return true;
}

async function deleteRow(sheet: string, keyColumn: string, keyValue: string): Promise<boolean> {
  const { error } = await sheetsFetch(sheet, { action: 'delete', keyColumn, keyValue });
  if (error) {
    console.error(`[Sheets] Error deleting from ${sheet}:`, error);
    return false;
  }
  return true;
}

async function filterRows<T>(sheet: string, keyColumn: string, keyValue: string): Promise<T[]> {
  const { data, error } = await sheetsFetch<T>(sheet, { action: 'filter', keyColumn, keyValue });
  if (error) {
    console.error(`[Sheets] Error filtering ${sheet}:`, error);
    return [];
  }
  return data || [];
}

export const sheets = {
  getAll,
  appendRow,
  updateRow,
  deleteRow,
  filterRows,
  fetch: sheetsFetch,
};