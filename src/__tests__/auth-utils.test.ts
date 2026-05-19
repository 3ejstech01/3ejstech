import { hashPassword, verifyPassword, hashPasswordIfNeeded } from '@/lib/auth-utils';

describe('auth-utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed.startsWith('$2')).toBe(true);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword', hashed);
      expect(isValid).toBe(false);
    });

    it('should reject invalid hash format', async () => {
      const isValid = await verifyPassword('password', 'plaintext');
      expect(isValid).toBe(false);
    });

    it('should reject empty hash', async () => {
      const isValid = await verifyPassword('password', '');
      expect(isValid).toBe(false);
    });
  });

  describe('hashPasswordIfNeeded', () => {
    it('should hash a plain text password', async () => {
      const password = 'plainPassword';
      const result = await hashPasswordIfNeeded(password);

      expect(result).not.toBe(password);
      expect(result.startsWith('$2')).toBe(true);
    });

    it('should return already hashed password unchanged', async () => {
      const hashed = await hashPassword('password');
      const result = await hashPasswordIfNeeded(hashed);

      expect(result).toBe(hashed);
    });
  });
});