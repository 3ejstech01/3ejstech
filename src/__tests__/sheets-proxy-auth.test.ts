import { NextRequest } from 'next/server';
import { POST } from '@/app/api/sheets-proxy/route';

class TestNextRequest extends NextRequest {
  get cookies() {
    const cookieHeader = this.headers.get('cookie') || '';
    const map: Record<string, string> = {};
    cookieHeader.split(';').forEach((c) => {
      const [name, value] = c.trim().split('=');
      if (name && value) map[name] = value;
    });
    return { get: (name: string) => (map[name] ? { value: map[name] } : undefined) };
  }
}

function makeReq(init: { method?: string; body?: string; cookie?: string } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (init.cookie) headers.set('cookie', init.cookie);
  return new TestNextRequest('http://localhost/api/sheets-proxy', {
    method: init.method || 'POST',
    body: init.body,
    headers,
  });
}

it('rejects unauthenticated proxied writes', async () => {
  const req = makeReq({ method: 'POST', body: JSON.stringify({ sheet: 'installations', action: 'append', row: { x: 1 } }) });
  const res = await POST(req);
  expect(res.status).toBe(401);
});
