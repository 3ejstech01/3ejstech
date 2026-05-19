import { Installation, InstallationRow, ELoadTransaction, ELoadRow } from './types';

export function parseExcelSerialDate(value: string | number): string {
  if (!value && value !== 0) return '';
  const s = String(value).trim();
  if (!s) return '';

  if (/^\d{5,6}$/.test(s)) {
    const serial = parseInt(s, 10);
    const date = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return s;
}

export function parseDate(value: string | number | null | undefined): Date | null {
  if (!value && value !== 0) return null;
  const s = String(value).trim();

  if (typeof value === 'number' || /^\d{5,6}$/.test(s)) {
    const serial = typeof value === 'number' ? value : parseInt(s, 10);
    return new Date((serial - 25569) * 86400 * 1000);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s.substring(0, 10));
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [m, d, y] = s.split('/');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }

  if (s.includes(' ')) {
    const datePart = s.replace(/GMT[+-]\d{4}.*/i, '').replace(/\(.*\)/, '').trim();
    const date = new Date(datePart);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

export function normalizeAccountNumber(accountNumber: string | number): string {
  return String(accountNumber || '').replace(/\.0$/, '').trim().toLowerCase();
}

export function normalizeInstallationRow(inst: InstallationRow): Installation {
const dateInstalled = parseExcelSerialDate(inst.dateInstalled);
const [houseLatitude, houseLongitude] = (inst.houseLonglat || '').split(',').map(p => p?.trim() || '');

return {
id: inst.id,
no: inst.no,
dateInstalled,
agentName: inst.agentName,
joNumber: inst.joNumber,
accountNumber: normalizeAccountNumber(inst.accountNumber),
subscriberName: inst.subscriberName,
contactNumber1: inst.contactNumber1,
contactNumber2: inst.contactNumber2,
address: inst.address,
houseLatitude,
  houseLongitude,
  port: inst.port,
napBoxLonglat: inst.napBoxLonglat,
assignedTechnician: inst.assignedTechnician,
modemSerial: inst.modemSerial,
reelNo: inst.reelNo,
start: inst.startLocation,
end: inst.endLocation,
fiberOpticCable: inst.fiberOpticCable,
mechanicalConnector: inst.mechanicalConnector,
sClamp: inst.sClamp,
patchcordApsc: inst.patchcordApsc,
houseBracket: inst.houseBracket,
midspan: inst.midspan,
cableClip: inst.cableClip,
ftthTerminalBox: inst.ftthTerminalBox,
doubleSidedTape: inst.doubleSidedTape,
cableTieWrap: inst.cableTieWrap,
status: (inst.status || 'pending') as 'pending' | 'completed',
monthInstalled: inst.monthInstalled,
yearInstalled: inst.yearInstalled,
loadExpire: inst.loadExpire,
subsName: inst.subscriberName || '',
createdAt: inst.createdAt,
updatedAt: inst.updatedAt,
notifyStatus: (inst.notifyStatus || 'Not Yet Notified') as 'Not Yet Notified' | 'Notified',
loadStatus: (inst.loadStatus || 'Not yet Loaded') as 'Not yet Loaded' | 'Account Loaded',
};
}

export function denormalizeInstallationRow(inst: Partial<Installation>): Partial<InstallationRow> {
return {
id: inst.id,
no: inst.no,
dateInstalled: inst.dateInstalled?.split('T')[0] || '',
agentName: inst.agentName || '',
joNumber: inst.joNumber || '',
accountNumber: inst.accountNumber || '',
subscriberName: inst.subscriberName || '',
contactNumber1: inst.contactNumber1 || '',
contactNumber2: inst.contactNumber2 || '',
address: inst.address || '',
houseLonglat: `${inst.houseLatitude || ''},${inst.houseLongitude || ''}`,
  port: inst.port || '',
napBoxLonglat: inst.napBoxLonglat || '',
assignedTechnician: inst.assignedTechnician || '',
modemSerial: inst.modemSerial || '',
reelNo: inst.reelNo || '',
startLocation: inst.start || '',
endLocation: inst.end || '',
fiberOpticCable: inst.fiberOpticCable || '',
mechanicalConnector: inst.mechanicalConnector || '',
sClamp: inst.sClamp || '',
patchcordApsc: inst.patchcordApsc || '',
houseBracket: inst.houseBracket || '',
midspan: inst.midspan || '',
cableClip: inst.cableClip || '',
ftthTerminalBox: inst.ftthTerminalBox || '',
doubleSidedTape: inst.doubleSidedTape || '',
cableTieWrap: inst.cableTieWrap || '',
status: inst.status || 'pending',
monthInstalled: inst.monthInstalled || '',
yearInstalled: inst.yearInstalled || '',
loadExpire: inst.loadExpire || '',
createdAt: inst.createdAt || new Date().toISOString(),
updatedAt: inst.updatedAt || new Date().toISOString(),
notifyStatus: inst.notifyStatus || 'Not Yet Notified',
loadStatus: inst.loadStatus || 'Not yet Loaded',
};
}

export function normalizeEloadRow(t: ELoadRow): ELoadTransaction {
return {
id: t.id,
gcashAcct: t.gcashAccount,
dateLoaded: t.dateLoaded,
gcashReference: t.gcashReference,
time: t.timeLoaded,
amount: parseFloat(String(t.amount)) || 0,
accountNo: normalizeAccountNumber(t.accountNumber),
remarks: t.remarks || '',
markedUp: t.markedUp,
incentive: t.incentive,
retailer: t.retailer,
dealer: t.dealer,
createdAt: t.createdAt,
updatedAt: t.updatedAt,
};
}

export function denormalizeEloadRow(t: Partial<ELoadTransaction>): Partial<ELoadRow> {
return {
id: t.id,
gcashAccount: t.gcashAcct || '',
dateLoaded: t.dateLoaded || '',
gcashReference: t.gcashReference || '',
timeLoaded: t.time || '',
amount: t.amount || 0,
accountNumber: t.accountNo || '',
remarks: t.remarks || '',
markedUp: t.markedUp,
incentive: t.incentive,
retailer: t.retailer,
dealer: t.dealer,
createdAt: t.createdAt || new Date().toISOString(),
updatedAt: t.updatedAt || new Date().toISOString(),
};
}