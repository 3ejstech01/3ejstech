export type DataFetchState = 'idle' | 'loading' | 'ready' | 'error';

export interface DataFetchResult<T> {
  data: T[];
  state: DataFetchState;
  error?: string;
  lastFetched: number | null;
}

export function emptyResult<T>(): DataFetchResult<T> {
  return { data: [], state: 'idle', lastFetched: null };
}

export function loadingResult<T>(previous: T[] = []): DataFetchResult<T> {
  return { data: previous, state: 'loading', lastFetched: null };
}

export function readyResult<T>(data: T[]): DataFetchResult<T> {
  return { data, state: 'ready', lastFetched: Date.now() };
}

export function errorResult<T>(error: string, previous: T[] = []): DataFetchResult<T> {
  return { data: previous, state: 'error', error, lastFetched: null };
}
