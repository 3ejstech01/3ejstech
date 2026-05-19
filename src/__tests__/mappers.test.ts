import {
  parseExcelSerialDate,
  normalizeAccountNumber,
  normalizeInstallationRow,
  normalizeEloadRow,
} from '@/lib/mappers';
import { InstallationRow, ELoadRow } from '@/lib/types';

describe('mappers', () => {
  describe('parseExcelSerialDate', () => {
    it('should parse Excel serial date correctly', () => {
      expect(parseExcelSerialDate('45325')).toBe('2024-01-15');
    });

    it('should parse 5-digit serial dates', () => {
      const result = parseExcelSerialDate('44895');
      expect(result).toBe('2022-11-01');
    });

    it('should return original string for non-numeric values', () => {
      expect(parseExcelSerialDate('2024-01-15')).toBe('2024-01-15');
    });

    it('should return empty string for empty input', () => {
      expect(parseExcelSerialDate('')).toBe('');
      expect(parseExcelSerialDate(undefined as unknown as string)).toBe('');
    });
  });

  describe('normalizeAccountNumber', () => {
    it('should normalize account numbers', () => {
      expect(normalizeAccountNumber('12345')).toBe('12345');
      expect(normalizeAccountNumber('12345.0')).toBe('12345');
      expect(normalizeAccountNumber('  12345  ')).toBe('12345');
    });

    it('should convert to lowercase', () => {
      expect(normalizeAccountNumber('ABC123')).toBe('abc123');
    });

    it('should handle empty values', () => {
      expect(normalizeAccountNumber('')).toBe('');
      expect(normalizeAccountNumber(null as unknown as string)).toBe('');
      expect(normalizeAccountNumber(undefined as unknown as string)).toBe('');
    });
  });

  describe('normalizeInstallationRow', () => {
    it('should normalize an installation row correctly', () => {
      const row: InstallationRow = {
        id: 'inst-1',
        no: '1',
        date_installed: '45325',
        agent_name: 'Agent Smith',
        jo_number: 'JO-001',
        account_number: '12345',
        subscriber_name: 'John Doe',
        contact_number1: '09123456789',
        contact_number2: '',
        address: '123 Main St',
        house_longlat: '14.5995,120.9842',
        lcp_nap_assignment: 'LCP-01',
        port: '1',
        nap_box_longlat: '14.5996,120.9843',
        assigned_technician: 'Tech A',
        modem_serial: 'MODEM-001',
        reel_no: 'R001',
        start_location: 'Start A',
        end_location: 'End B',
        fiber_optic_cable: 'Fiber 1',
        mechanical_connector: 'MC-1',
        s_clamp: 'SC-1',
        patchcord_apsc: 'PA-1',
        house_bracket: 'HB-1',
        midspan: 'MS-1',
        cable_clip: 'CC-1',
        ftth_terminal_box: 'FTTH-1',
        double_sided_tape: 'DST-1',
        cable_tie_wrap: 'CTW-1',
        status: 'pending',
        month_installed: 'January',
        year_installed: '2024',
        load_expire: '',
        created_at: '2024-01-15',
        updated_at: '2024-01-15',
        notify_status: 'Not Yet Notified',
        load_status: 'Not yet Loaded',
      };

      const result = normalizeInstallationRow(row);

      expect(result.id).toBe('inst-1');
      expect(result.accountNumber).toBe('12345');
      expect(result.houseLatitude).toBe('14.5995');
      expect(result.houseLongitude).toBe('120.9842');
      expect(result.status).toBe('pending');
    });
  });

  describe('normalizeEloadRow', () => {
    it('should normalize an eload row correctly', () => {
      const row: ELoadRow = {
        id: 'el-1',
        gcash_account: 'GCASH-001',
        date_loaded: '2024-01-15',
        gcash_reference: 'REF-001',
        time_loaded: '10:30:00',
        amount: 300,
        account_number: '12345',
        marked_up: 10,
        incentive: 26.6,
        retailer: 15.2,
        dealer: 11.4,
        remarks: '',
        created_at: '2024-01-15',
        updated_at: '2024-01-15',
      };

      const result = normalizeEloadRow(row);

      expect(result.id).toBe('el-1');
      expect(result.gcashAcct).toBe('GCASH-001');
      expect(result.amount).toBe(300);
      expect(result.accountNo).toBe('12345');
    });
  });
});