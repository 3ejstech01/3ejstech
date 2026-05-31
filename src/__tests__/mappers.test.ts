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
      expect(parseExcelSerialDate('45306')).toBe('01/15/2024');
    });

    it('should parse 5-digit serial dates', () => {
      const result = parseExcelSerialDate('44866');
      expect(result).toBe('11/01/2022');
    });

    it('should convert YYYY-MM-DD to MM/DD/YYYY', () => {
      expect(parseExcelSerialDate('2024-01-15')).toBe('01/15/2024');
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
        dateInstalled: '45306',
        agentName: 'Agent Smith',
        joNumber: 'JO-001',
        accountNumber: '12345',
        subscriberName: 'John Doe',
        contactNumber1: '09123456789',
        contactNumber2: '',
        address: '123 Main St',
        houseLonglat: '14.5995,120.9842',
        port: '1',
        napBoxLonglat: '14.5996,120.9843',
        assignedTechnician: 'Tech A',
        modemSerial: 'MODEM-001',
        reelNo: 'R001',
        startLocation: 'Start A',
        endLocation: 'End B',
        fiberOpticCable: 'Fiber 1',
        mechanicalConnector: 'MC-1',
        sClamp: 'SC-1',
        patchcordApsc: 'PA-1',
        houseBracket: 'HB-1',
        midspan: 'MS-1',
        cableClip: 'CC-1',
        ftthTerminalBox: 'FTTH-1',
        doubleSidedTape: 'DST-1',
        cableTieWrap: 'CTW-1',
        status: 'pending',
        monthInstalled: 'January',
        yearInstalled: '2024',
        loadExpire: '',
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
        notifyStatus: 'Not Yet Notified',
        loadStatus: 'Not yet Loaded',
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
        gcashHandler: 'GCASH-001',
        dateLoaded: '2024-01-15',
        gcashReference: 'REF-001',
        timeLoaded: '10:30:00',
        amount: 300,
        accountNumber: '12345',
        markedUp: 10,
        incentive: 26.6,
        retailer: 15.2,
        dealer: 11.4,
        remarks: '',
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
      };

      const result = normalizeEloadRow(row);

      expect(result.id).toBe('el-1');
      expect(result.gcashAcct).toBe('GCASH-001');
      expect(result.amount).toBe(300);
      expect(result.accountNo).toBe('12345');
    });
  });
});