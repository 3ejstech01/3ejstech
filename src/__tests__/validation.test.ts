import {
  validateInstallation,
  validateUser,
} from '@/lib/validation';

describe('validation', () => {
  describe('validateInstallation', () => {
    it('should validate a valid installation', () => {
      const data = {
        joNumber: 'JO-001',
        subscriberName: 'John Doe',
        accountNumber: '12345',
      };

      const result = validateInstallation(data);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const data = {
        accountNumber: '12345',
      };

      const result = validateInstallation(data);
      expect(result.success).toBe(false);
    });
  });

  describe('validateUser', () => {
    it('should validate a valid user', () => {
      const data = {
        username: 'testuser',
        password: 'password123',
        role: 'admin',
      };

      const result = validateUser(data);
      expect(result.success).toBe(true);
    });

    it('should reject short username', () => {
      const data = {
        username: 'ab',
        password: 'password123',
        role: 'admin',
      };

      const result = validateUser(data);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const data = {
        username: 'testuser',
        password: '12345',
        role: 'admin',
      };

      const result = validateUser(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const data = {
        username: 'testuser',
        password: 'password123',
        role: 'superadmin',
      };

      const result = validateUser(data);
      expect(result.success).toBe(false);
    });
  });

  });