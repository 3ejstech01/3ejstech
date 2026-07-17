/* eslint-disable @typescript-eslint/no-unused-vars */
// Each test dynamically re-imports the module after jest.resetModules()/
// jest.doMock(), so the top-level imports look unused to the linter.
import { authenticateCredentials, toPublicUser } from '@/lib/auth-server';

describe('auth-server', () => {
  const hashed = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8q3pF8hF4tW1eKb9Vw8qj8M5c5W3jG';

  describe('authenticateCredentials', () => {
    it('returns the user when credentials are valid', async () => {
      jest.resetModules();
      jest.doMock('@/lib/unified-db', () => ({
        getAllUsers: async () => [
          { id: 'alice', username: 'alice', password: hashed, role: 'admin', createdAt: '2025-01-01T00:00:00Z' },
        ],
      }));
      jest.doMock('@/lib/auth-utils', () => ({
        verifyPassword: async () => true,
      }));
      const { authenticateCredentials } = await import('@/lib/auth-server');
      const user = await authenticateCredentials('alice', 'correctPassword');
      expect(user?.username).toBe('alice');
    });

    it('returns null when username does not exist', async () => {
      jest.resetModules();
      jest.doMock('@/lib/unified-db', () => ({
        getAllUsers: async () => [],
      }));
      const { authenticateCredentials } = await import('@/lib/auth-server');
      const user = await authenticateCredentials('ghost', '');
      expect(user).toBeNull();
    });

    it('matches username case-insensitively', async () => {
      jest.resetModules();
      jest.doMock('@/lib/unified-db', () => ({
        getAllUsers: async () => [
          { id: 'Alice', username: 'Alice', password: hashed, role: 'admin', createdAt: '2025-01-01T00:00:00Z' },
        ],
      }));
      jest.doMock('@/lib/auth-utils', () => ({
        verifyPassword: async () => true,
      }));
      const { authenticateCredentials } = await import('@/lib/auth-server');
      const user = await authenticateCredentials('ALICE', 'whatever');
      expect(user?.username).toBe('Alice');
    });

    it('returns null when password verification fails', async () => {
      jest.resetModules();
      jest.doMock('@/lib/unified-db', () => ({
        getAllUsers: async () => [
          { id: 'alice', username: 'alice', password: hashed, role: 'admin', createdAt: '2025-01-01T00:00:00Z' },
        ],
      }));
      jest.doMock('@/lib/auth-utils', () => ({
        verifyPassword: async () => false,
      }));
      const { authenticateCredentials } = await import('@/lib/auth-server');
      const user = await authenticateCredentials('alice', 'wrong');
      expect(user).toBeNull();
    });
  });

  describe('toPublicUser', () => {
    it('strips password and other sensitive fields', () => {
      const row = {
        id: '1',
        username: 'bob',
        password: '$2a$12$SECRETHASH',
        role: 'admin',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-02-01T00:00:00Z',
      };
      expect(toPublicUser(row)).toEqual({
        id: '1',
        username: 'bob',
        role: 'admin',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-02-01T00:00:00Z',
      });
    });
  });
});
