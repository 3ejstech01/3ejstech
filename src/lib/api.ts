/**
 * api.ts
 *
 * Client-side fetch wrapper for API calls.
 */

export function getHeaders(init?: RequestInit): HeadersInit {
  const headers: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([k, v]) => { headers[k] = v; });
    } else {
      Object.assign(headers, init.headers);
    }
  }
  return headers;
}

export async function apiGet(url: string): Promise<Response> {
  return fetch(url);
}

export async function apiPost(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function apiPatch(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function apiDelete(url: string): Promise<Response> {
  return fetch(url, { method: 'DELETE' });
}