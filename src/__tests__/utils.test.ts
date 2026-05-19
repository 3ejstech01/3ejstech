import {
  formatDate,
  formatDateDisplay,
  formatDateShort,
  excelSerialToDate,
  toExcelSerial,
  formatTime,
} from '@/lib/utils';

describe('utils', () => {
  describe('formatDate', () => {
    it('should return dash for empty input', () => {
      expect(formatDate('')).toBe('-');
      expect(formatDate('   ')).toBe('-');
    });

    it('should handle ISO dates', () => {
      expect(formatDate('2024-01-15T00:00:00Z')).toBe('01/15/2024');
    });

    it('should handle MM/DD/YYYY format', () => {
      expect(formatDate('01/15/2024')).toBe('01/15/2024');
    });

    it('should convert YYYY-MM-DD to MM/DD/YYYY', () => {
      expect(formatDate('2024-01-15')).toBe('01/15/2024');
    });
  });

  describe('formatDateDisplay', () => {
    it('should return dash for empty input', () => {
      expect(formatDateDisplay('')).toBe('-');
    });

    it('should handle ISO dates', () => {
      const result = formatDateDisplay('2024-01-15');
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('should handle MM/DD/YYYY format', () => {
      const result = formatDateDisplay('01/15/2024');
      expect(result).toMatch(/Jan/);
    });

    it('should handle Excel serial dates', () => {
      const result = formatDateDisplay(45325);
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });
  });

  describe('excelSerialToDate', () => {
    it('should convert Excel serial date to YYYY-MM-DD', () => {
      expect(excelSerialToDate(45325)).toBe('2024-01-15');
    });

    it('should handle string serial dates', () => {
      expect(excelSerialToDate('45325')).toBe('2024-01-15');
    });

    it('should return original value for invalid input', () => {
      expect(excelSerialToDate('invalid')).toBe('invalid');
      expect(excelSerialToDate('')).toBe('');
    });
  });

  describe('toExcelSerial', () => {
    it('should convert date to Excel serial', () => {
      expect(toExcelSerial('2024-01-15')).toBe('45325');
    });

    it('should handle MM/DD/YYYY format', () => {
      expect(toExcelSerial('01/15/2024')).toBe('45325');
    });

    it('should return original for invalid dates', () => {
      expect(toExcelSerial('invalid')).toBe('invalid');
    });
  });

  describe('formatTime', () => {
    it('should return dash for empty input', () => {
      expect(formatTime('')).toBe('-');
    });

    it('should format HH:MM time', () => {
      expect(formatTime('14:30')).toBe('2:30 PM');
    });

    it('should format HH:MM:SS time', () => {
      expect(formatTime('09:15:00')).toBe('9:15 AM');
    });
  });
});