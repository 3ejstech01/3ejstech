import '@testing-library/jest-dom';

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = mockLocalStorage as unknown as Storage;

global.window = global.window || {};
global.window.addEventListener = jest.fn();
global.window.removeEventListener = jest.fn();
global.window.dispatchEvent = jest.fn();

global.fetch = jest.fn();

if (typeof globalThis.Request === 'undefined') {
  class FakeRequest {
    url: string;
    method: string;
    headers: Map<string, string>;
    private _body: string | undefined;
    constructor(input: string | URL, init?: RequestInit) {
      this.url = typeof input === 'string' ? input : input.toString();
      this.method = (init?.method || 'GET').toUpperCase();
      this.headers = new Map();
      if (init?.headers) {
        const h = init.headers as Record<string, string>;
        for (const [k, v] of Object.entries(h)) this.headers.set(k.toLowerCase(), String(v));
      }
      this._body = typeof init?.body === 'string' ? init.body : undefined;
    }
    async json() {
      return this._body ? JSON.parse(this._body) : {};
    }
  }
  // @ts-expect-error - polyfill for test env
  globalThis.Request = FakeRequest;
}

if (typeof globalThis.Response === 'undefined') {
  class FakeResponse {
    status: number;
    body: string;
    headers: Map<string, string>;
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.status = init?.status ?? 200;
      this.body = typeof body === 'string' ? body : '';
      this.headers = new Map();
      if (init?.headers) {
        const h = init.headers as Record<string, string>;
        for (const [k, v] of Object.entries(h)) this.headers.set(k.toLowerCase(), String(v));
      }
    }
    async json() {
      return this.body ? JSON.parse(this.body) : {};
    }
  }
  // @ts-expect-error - polyfill for test env
  globalThis.Response = FakeResponse as unknown as typeof Response;
}

if (typeof (globalThis as { Headers?: unknown }).Headers === 'undefined') {
  // @ts-expect-error - polyfill for test env
  globalThis.Headers = class {
    private map = new Map<string, string>();
    constructor(init?: Record<string, string>) {
      if (init) for (const [k, v] of Object.entries(init)) this.map.set(k.toLowerCase(), v);
    }
    get(k: string) { return this.map.get(k.toLowerCase()) ?? null; }
  };
}

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private _body: unknown;
    headers: Map<string, string>;
    constructor(body?: unknown, init?: { status?: number }) {
      this._body = body ?? '';
      this.status = init?.status ?? 200;
      this.headers = new Map();
    }
    static json(body: unknown, init?: { status?: number }) {
      return { status: init?.status ?? 200, _body: body, json: async () => body };
    }
  }
  return {
    NextRequest: globalThis.Request,
    NextResponse: MockNextResponse,
  };
});