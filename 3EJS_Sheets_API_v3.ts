/**
 * 3EJS Tech - Google Sheets API
 * Deploy as WebApp: Anyone can access
 */

const SHEETS = {
  installations: 'Installations',
  eload: 'E-Load',
  users: 'Users',
  historicaldata: 'HistoricalData'
};

const INSTALLATION_COLUMNS = [
  'id', 'no', 'dateInstalled', 'agentName', 'joNumber', 'accountNumber',
  'subscriberName', 'contactNumber1', 'contactNumber2', 'address',
  'houseLatitude', 'houseLongitude', 'port', 'assignedTechnician',
  'modemSerial', 'reelNo', 'reelStart', 'reelEnd', 'fiberOpticCable',
  'mechanicalConnector', 'sClamp', 'patchcordApsc', 'houseBracket',
  'midspan', 'cableClip', 'ftthTerminalBox', 'doubleSidedTape',
  'cableTieWrap', 'status', 'monthInstalled', 'yearInstalled',
  'loadExpire', 'notifyStatus', 'loadStatus', 'createdAt', 'updatedAt'
];

const ELOAD_COLUMNS = [
  'id', 'gcashHandler', 'dateLoaded', 'gcashReference', 'timeLoaded',
  'amount', 'accountNumber', 'markup', 'incentive', 'retailer', 'dealer',
  'remarks', 'createdAt', 'updatedAt'
];

const USER_COLUMNS = [
  'id', 'username', 'password', 'role', 'createdAt', 'updatedAt'
];

function doGet(e) {
  const sheetName = e.parameter.sheet;
  if (!sheetName) return ContentService.createTextOutput(JSON.stringify({ error: 'Missing sheet parameter' })).setMimeType(ContentService.MimeType.JSON);
  
  const sheet = getSheet(sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ error: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);
  
  try {
    const data = getAllRows(sheet, sheetName);
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const { sheet, action, row, keyColumn, keyValue } = JSON.parse(e.postData.contents);
    if (!sheet || !action) return ContentService.createTextOutput(JSON.stringify({ error: 'Missing sheet or action' })).setMimeType(ContentService.MimeType.JSON);
    
    const sheetObj = getSheet(sheet);
    if (!sheetObj) return ContentService.createTextOutput(JSON.stringify({ error: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);
    
    let result;
    switch (action) {
      case 'append': result = appendRow(sheetObj, row); break;
      case 'update': result = updateRow(sheetObj, keyColumn, keyValue, row); break;
      case 'delete': result = deleteRow(sheetObj, keyColumn, keyValue); break;
      case 'filter': result = filterRows(sheetObj, keyColumn, keyValue); break;
      default: return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEETS[name]) || ss.getSheetByName(name);
}

function getAllRows(sheet, sheetName) {
  const cols = getColumns(sheetName);
  const lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow <= 1) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, cols.length).getValues();
  return values.map(row => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function appendRow(sheet, row) {
  const now = new Date().toISOString();
  row.createdAt = row.createdAt || now;
  row.updatedAt = row.updatedAt || now;
  const cols = getColumns(sheet.getName());
  const rowData = cols.map(col => {
    const v = row[col];
    return (v === undefined || v === null) ? '' : (typeof v === 'object' ? JSON.stringify(v) : v);
  });
  sheet.appendRow(rowData);
  return { success: true, id: row.id || rowData[0] };
}

function updateRow(sheet, keyColumn, keyValue, row) {
  const data = getAllRows(sheet, sheet.getName());
  const idx = data.findIndex(r => String(r[keyColumn]) === String(keyValue));
  if (idx === -1) return { error: 'Row not found' };
  const targetRow = idx + 2;
  row.updatedAt = new Date().toISOString();
  const cols = getColumns(sheet.getName());
  cols.forEach((col, i) => {
    if (row.hasOwnProperty(col)) {
      let v = row[col];
      if (v === undefined || v === null) v = '';
      if (typeof v === 'object') v = JSON.stringify(v);
      sheet.getRange(targetRow, i + 1).setValue(v);
    }
  });
  return { success: true };
}

function deleteRow(sheet, keyColumn, keyValue) {
  const data = getAllRows(sheet, sheet.getName());
  const idx = data.findIndex(r => String(r[keyColumn]) === String(keyValue));
  if (idx === -1) return { error: 'Row not found' };
  sheet.deleteRow(idx + 2);
  return { success: true };
}

function filterRows(sheet, keyColumn, keyValue) {
  return getAllRows(sheet, sheet.getName()).filter(r => String(r[keyColumn]) === String(keyValue));
}

function getColumns(sheetName) {
  if (sheetName === 'installations' || sheetName === 'historicaldata') return INSTALLATION_COLUMNS;
  if (sheetName === 'eload') return ELOAD_COLUMNS;
  if (sheetName === 'users') return USER_COLUMNS;
  return [];
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = [
    { name: 'Installations', cols: INSTALLATION_COLUMNS },
    { name: 'E-Load', cols: ELOAD_COLUMNS },
    { name: 'Users', cols: USER_COLUMNS },
    { name: 'HistoricalData', cols: INSTALLATION_COLUMNS }
  ];
  sheets.forEach(s => {
    let sh = ss.getSheetByName(s.name);
    if (!sh) sh = ss.insertSheet(s.name);
    sh.getRange(1, 1, 1, s.cols.length).setValues([s.cols]);
  });
  SpreadsheetApp.getUi().alert('Done!');
}