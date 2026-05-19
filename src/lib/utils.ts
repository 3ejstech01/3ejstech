/**
 * formatDate — display a date string as-is if it's already readable,
 * or clean it up if it has a time component appended.
 * 
 * The database stores dates in standardized formats (e.g. "09/25/2024" or "2024-09-25").
 * We just display whatever comes from the source, only stripping time suffixes.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const s = dateStr.trim();
  if (!s) return '-';

  // If it contains a T (ISO with time), strip the time part and reformat
  if (s.includes('T')) {
    const datePart = s.split('T')[0]; // YYYY-MM-DD
    const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[2]}/${m[3]}/${m[1]}`; // MM/DD/YYYY
    return datePart;
  }

  // Already MM/DD/YYYY — return as-is
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;

  // YYYY-MM-DD — convert to MM/DD/YYYY
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;

  // Full date string like "Wed Sep 25 2024 00:00:00 GMT+0800"
  // Extract just the meaningful parts
  const fullMatch = s.match(/(\w{3})\s+(\w{3})\s+(\d{1,2})\s+(\d{4})/);
  if (fullMatch) {
    const months: Record<string, string> = {
      Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06',
      Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12'
    };
    const mo = months[fullMatch[2]] || '01';
    const dy = fullMatch[3].padStart(2, '0');
    const yr = fullMatch[4];
    return `${mo}/${dy}/${yr}`;
  }

  // Anything else — return as-is (trust the database)
  return s;
}

/** Display format: "Sep 2, 2025" */
export function formatDateDisplay(dateStr: string | number): string {
  if (!dateStr && dateStr !== 0) return '-';

  let date: Date | null = null;
  const s = String(dateStr).trim();

  // If it looks like a full date string, parse it directly without Excel conversion
  if (s.includes(' ') && s.length > 10) {
    const datePart = s.replace(/GMT[+-]\d{4}.*/i, '').replace(/\(.*\)/, '').trim();
    date = new Date(datePart);
    if (date && !isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  // ISO formats
  if (s.includes('T')) {
    const datePart = s.split('T')[0];
    date = new Date(datePart);
    if (date && !isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    date = new Date(s);
    if (date && !isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [m, d, y] = s.split('/');
    date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (date && !isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  // Excel serial date (only for actual 5-digit numbers like 45325)
  if (typeof dateStr === 'number' || /^\d{5}$/.test(s)) {
    const serial = typeof dateStr === 'number' ? dateStr : parseInt(s);
    date = new Date((serial - 25569) * 86400 * 1000);
    if (date && !isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2100) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  return s;
}

/** Short date format MM/DD/YY */
export function formatDateShort(dateStr: string): string {
  const full = formatDate(dateStr);
  if (full === '-') return '-';
  // Convert MM/DD/YYYY to MM/DD/YY
  const m = full.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[1]}/${m[2]}/${m[3].slice(-2)}`;
  return full;
}

export function excelSerialToDate(serial: string | number | undefined): string {
  if (!serial && serial !== 0) return '';
  const s = String(serial).trim();
  if (!s) return '';
  
  const num = parseInt(s, 10);
  if (isNaN(num)) return s;
  
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + num * 86400 * 1000);
  
  if (isNaN(date.getTime())) return s;
  
  const y = date.getFullYear();
  if (y < 2000 || y > 2100) return s;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toExcelSerial(dateStr: string): string {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (!s) return '';
  
  let date: Date | null = null;
  
  if (s.includes('T')) {
    date = new Date(s.split('T')[0]);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    date = new Date(s);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [m, d, y] = s.split('/');
    date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  
  if (!date || isNaN(date.getTime())) return s;
  
  const excelEpoch = new Date(1899, 11, 30);
  const days = Math.floor((date.getTime() - excelEpoch.getTime()) / (86400 * 1000));
  return String(days);
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '-';
  
  try {
    // Full date string like "Sat Dec 30 1899 21:48:00 GMT+0800"
    const asDate = new Date(timeStr);
    if (!isNaN(asDate.getTime()) && timeStr.includes(' ') && timeStr.length > 10) {
      let hours = asDate.getHours();
      const minutes = asDate.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      return `${hours}:${String(minutes).padStart(2, '0')} ${period}`;
    }

    // HH:MM or HH:MM:SS
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${String(minutes).padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}
