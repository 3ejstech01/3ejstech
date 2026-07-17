jest.mock('@/lib/unified-db', () => ({
  createUser: jest.fn(),
  getAllUsers: jest.fn(async () => []),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock('@/lib/auth-server', () => ({
  toPublicUser: (user: any) => ({ id: user.id, username: user.username, role: user.role }),
}));

import { POST } from '@/app/api/users/route';

describe('POST /api/users', () => {
  it('returns 400 when validation fails', async () => {
    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ username: 'ab', role: 'admin' }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
