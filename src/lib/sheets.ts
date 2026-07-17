import { getMappingForSheet, mapCamelToSnake, mapSnakeToCamel } from './sheets-mapper';

// Get Web App URL from Electron settings or environment
async function getWebAppUrl(): Promise<string> {
  if (typeof window !== 'undefined' && window.electron?.isElectron) {
    // In the desktop app the URL is stored via Settings (electron-store).
    // Fall back to the build-time NEXT_PUBLIC_WEBAPP_URL (inlined into the
    // client bundle) so the app connects out-of-the-box, same as the web app.
    const stored = await window.electron.getSheetsUrl();
    if (stored) return stored;
  }
  return process.env.NEXT_PUBLIC_WEBAPP_URL || '';
}

export interface SheetsResponse<T> {
  data: T[] | null;
  error: string | null;
  isCorsError?: boolean;
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
  const WEBAPP_URL = await getWebAppUrl();
  
  if (!WEBAPP_URL) {
    return { data: null, error: 'Google Sheets Web App URL not configured' };
  }

  const mapping = getMappingForSheet(sheet);

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
      const rawRows = Array.isArray(json) ? json : [];
      const mappedRows = rawRows.map(r => mapSnakeToCamel(r as Record<string, unknown>, mapping));
      return { data: mappedRows as T[], error: null };
    }

    const payload: Record<string, unknown> = {
      sheet,
      action: options.action,
    };
    
    if (options.row) {
      payload.row = mapCamelToSnake(options.row as Record<string, unknown>, mapping);
    }
    
    if (options.keyColumn) {
      const reverseMap: Record<string, string> = {};
      for (const [snake, camel] of Object.entries(mapping)) {
        reverseMap[camel] = snake;
      }
      payload.keyColumn = reverseMap[options.keyColumn] || options.keyColumn;
    }
    
    if (options.keyValue) payload.keyValue = options.keyValue;

    const res = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
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
      const rawRows = Array.isArray(json) ? json : [];
      const filterMapping = getMappingForSheet(sheet);
      const mappedRows = rawRows.map(r => mapSnakeToCamel(r as Record<string, unknown>, filterMapping));
      return { data: mappedRows as T[], error: null };
    }

    return { data: [json], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isCors = message === 'Failed to fetch' || message.includes('CORS') || message.includes('Access-Control-Allow-Origin') || message.includes('net::');
    return { data: null, error: isCors ? `CORS_ERROR:${message}` : message, isCorsError: isCors };
  }
}

async function getAll<T>(sheet: string): Promise<T[]> {
  const { data, error } = await sheetsFetch<T>(sheet);
  if (error && !error.startsWith('CORS_ERROR:')) {
    console.error(`[Sheets] Error fetching ${sheet}:`, error);
  }
  return data || [];
}

async function appendRow(sheet: string, row: Record<string, unknown>): Promise<{ success: boolean; isCorsError?: boolean; error?: string }> {
  const { error, isCorsError } = await sheetsFetch(sheet, { action: 'append', row });
  if (error && !isCorsError) {
    console.error(`[Sheets] Error appending to ${sheet}:`, error);
  }
  return { success: !error, isCorsError, error: error ?? undefined };
}

async function updateRow(sheet: string, keyColumn: string, keyValue: string, row: Record<string, unknown>): Promise<{ success: boolean; isCorsError?: boolean; error?: string }> {
  const { error, isCorsError } = await sheetsFetch(sheet, { action: 'update', keyColumn, keyValue, row });
  if (error && !isCorsError) {
    console.error(`[Sheets] Error updating ${sheet}:`, error);
  }
  return { success: !error, isCorsError, error: error ?? undefined };
}

async function deleteRow(sheet: string, keyColumn: string, keyValue: string): Promise<{ success: boolean; isCorsError?: boolean; error?: string }> {
  const { error, isCorsError } = await sheetsFetch(sheet, { action: 'delete', keyColumn, keyValue });
  if (error && !isCorsError) {
    console.error(`[Sheets] Error deleting from ${sheet}:`, error);
  }
  return { success: !error, isCorsError, error: error ?? undefined };
}

async function getByKey<T>(sheet: string, keyColumn: string, keyValue: string): Promise<T | null> {
  const rows = await filterRows<T>(sheet, keyColumn, keyValue);
  return rows.length > 0 ? rows[0] : null;
}

async function filterRows<T>(sheet: string, keyColumn: string, keyValue: string): Promise<T[]> {
  const { data, error } = await sheetsFetch<T>(sheet, { action: 'filter', keyColumn, keyValue });
  if (error && !error.startsWith('CORS_ERROR:')) {
    console.error(`[Sheets] Error filtering ${sheet}:`, error);
  }
  return data || [];
}

export const sheets = {
  getAll,
  appendRow,
  updateRow,
  deleteRow,
  getByKey,
  filterRows,
  fetch: sheetsFetch,
};