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

function doOptions(e) {
  const output = ContentService.createTextOutput();
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return output;
}

function doGet(e) {
  const sheetName = e.parameter.sheet;
  if (!sheetName) return jsonResponse({ error: 'Missing sheet parameter' });
  
  const sheet = getSheet(sheetName);
  if (!sheet) return jsonResponse({ error: 'Sheet not found' }, 404);
  
  try {
    return jsonResponse(getAllRows(sheet, sheetName));
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function doPost(e) {
  try {
    const { sheet, action, row, keyColumn, keyValue } = JSON.parse(e.postData.contents);
    if (!sheet || !action) return jsonResponse({ error: 'Missing sheet or action' }, 400);
    
    const sheetObj = getSheet(sheet);
    if (!sheetObj) return jsonResponse({ error: 'Sheet not found' }, 404);
    
    let result;
    switch (action) {
      case 'append': result = appendRow(sheetObj, row); break;
      case 'update': result = updateRow(sheetObj, keyColumn, keyValue, row); break;
      case 'delete': result = deleteRow(sheetObj, keyColumn, keyValue); break;
      case 'filter': result = filterRows(sheetObj, keyColumn, keyValue); break;
      default: return jsonResponse({ error: 'Unknown action' }, 400);
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
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

function jsonResponse(data, status) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
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