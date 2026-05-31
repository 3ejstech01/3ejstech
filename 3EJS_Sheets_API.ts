/**
 * 3EJS Tech - Google Sheets API
 * 
 * This Apps Script provides a REST API for reading and writing to Google Sheets.
 * Deploy as a WebApp and use the URL in your .env.local as NEXT_PUBLIC_WEBAPP_URL
 * 
 * DEPLOYMENT:
 * 1. Save this file
 * 2. Deploy > New deployment > Web app
 * 3. Execute as: Me, Who has access: Anyone
 * 4. Copy the Web App URL
 * 5. Update .env.local with the new URL
 */

// Sheet names
const SHEETS = {
  installations: 'Installations',
  eload: 'E-Load',
  users: 'Users',
  historicaldata: 'HistoricalData'
};

// Column mappings for Installations (matching your database schema)
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

// Column mappings for E-Load
const ELOAD_COLUMNS = [
  'id', 'gcashHandler', 'dateLoaded', 'gcashReference', 'timeLoaded',
  'amount', 'accountNumber', 'markup', 'incentive', 'retailer', 'dealer',
  'remarks', 'createdAt', 'updatedAt'
];

// Column mappings for Users
const USER_COLUMNS = [
  'id', 'username', 'password', 'role', 'createdAt', 'updatedAt'
];

/**
 * Handle CORS preflight requests
 */
function doOptions(e) {
  const output = ContentService.createTextOutput();
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  output.setHeader('Access-Control-Max-Age', '3600');
  return output;
}

/**
 * Handle GET requests - retrieve all rows from a sheet
 * Usage: ?sheet=installations
 */
function doGet(e) {
  const sheetName = e.parameter.sheet;
  
  if (!sheetName) {
    return JsonResponse({ error: 'Missing sheet parameter' }, 400);
  }
  
  const sheet = getSheet(sheetName);
  if (!sheet) {
    return JsonResponse({ error: 'Sheet not found: ' + sheetName }, 404);
  }
  
  try {
    const data = getAllRows(sheet, sheetName);
    return JsonResponse(data);
  } catch (error) {
    return JsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * Handle POST requests - append, update, delete rows
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { sheet, action, row, keyColumn, keyValue } = payload;
    
    if (!sheet || !action) {
      return JsonResponse({ error: 'Missing sheet or action' }, 400);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spreadSheet = ss.getSheetByName(SHEETS[sheet]) || ss.getSheetByName(sheet);
    
    if (!spreadSheet) {
      return JsonResponse({ error: 'Sheet not found: ' + sheet }, 404);
    }
    
    let result;
    
    switch (action) {
      case 'append':
        result = appendRow(spreadSheet, sheet, row);
        break;
      case 'update':
        result = updateRow(spreadSheet, sheet, keyColumn, keyValue, row);
        break;
      case 'delete':
        result = deleteRow(spreadSheet, sheet, keyColumn, keyValue);
        break;
      case 'filter':
        result = filterRows(spreadSheet, keyColumn, keyValue);
        break;
      default:
        return JsonResponse({ error: 'Unknown action: ' + action }, 400);
    }
    
    return JsonResponse(result);
  } catch (error) {
    return JsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * Get all rows from a sheet
 */
function getAllRows(sheet, sheetName) {
  const columns = getColumns(sheetName);
  const lastRow = Math.max(sheet.getLastRow(), 1);
  
  if (lastRow <= 1) {
    return [];
  }
  
  const range = sheet.getRange(2, 1, lastRow - 1, columns.length);
  const values = range.getValues();
  
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Append a new row to the sheet
 */
function appendRow(sheet, sheetName, row) {
  const columns = getColumns(sheetName);
  const now = new Date().toISOString();
  
  // Add timestamps if not present
  if (!row.createdAt) row.createdAt = now;
  if (!row.updatedAt) row.updatedAt = now;
  
  // Ensure row has all columns
  const rowData = columns.map(col => {
    const value = row[col];
    if (value === undefined || value === null) {
      return '';
    }
    // Convert arrays/objects to string
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  });
  
  sheet.appendRow(rowData);
  
  return { success: true, id: row.id || rowData[0] };
}

/**
 * Update an existing row
 */
function updateRow(sheet, sheetName, keyColumn, keyValue, row) {
  const columns = getColumns(sheetName);
  const data = getAllRows(sheet, sheetName);
  
  const rowIndex = data.findIndex(r => String(r[keyColumn]) === String(keyValue));
  
  if (rowIndex === -1) {
    return { error: 'Row not found' };
  }
  
  const targetRow = rowIndex + 2; // +2 because row 1 is header and data starts at row 2
  
  // Update timestamps
  row.updatedAt = new Date().toISOString();
  
  // Update only provided columns
  columns.forEach((col, i) => {
    if (row.hasOwnProperty(col)) {
      let value = row[col];
      if (value === undefined || value === null) {
        value = '';
      }
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      sheet.getRange(targetRow, i + 1).setValue(value);
    }
  });
  
  return { success: true };
}

/**
 * Delete a row
 */
function deleteRow(sheet, sheetName, keyColumn, keyValue) {
  const data = getAllRows(sheet, sheetName);
  
  const rowIndex = data.findIndex(r => String(r[keyColumn]) === String(keyValue));
  
  if (rowIndex === -1) {
    return { error: 'Row not found' };
  }
  
  const targetRow = rowIndex + 2; // +2 because row 1 is header and data starts at row 2
  sheet.deleteRow(targetRow);
  
  return { success: true };
}

/**
 * Filter rows by key column and value
 */
function filterRows(sheet, keyColumn, keyValue) {
  const data = getAllRows(sheet, sheet.getName());
  return data.filter(row => String(row[keyColumn]) === String(keyValue));
}

/**
 * Get columns for a sheet
 */
function getColumns(sheetName) {
  switch (sheetName) {
    case 'installations':
      return INSTALLATION_COLUMNS;
    case 'eload':
      return ELOAD_COLUMNS;
    case 'users':
      return USER_COLUMNS;
    case 'historicaldata':
      return INSTALLATION_COLUMNS; // Same structure as installations
    default:
      return [];
  }
}

/**
 * Get a sheet by name (tries both direct name and mapped name)
 */
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEETS[name]) || ss.getSheetByName(name);
}

/**
 * Create JSON response with CORS headers
 */
function JsonResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ============= TEST FUNCTIONS (run these to set up sheets) =============

/**
 * Create headers for all sheets - run this once to set up your spreadsheet
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Installations sheet
  let instSheet = ss.getSheetByName('Installations');
  if (!instSheet) {
    instSheet = ss.insertSheet('Installations');
  }
  instSheet.getRange(1, 1, 1, INSTALLATION_COLUMNS.length).setValues([INSTALLATION_COLUMNS]);
  
  // Create E-Load sheet
  let eloadSheet = ss.getSheetByName('E-Load');
  if (!eloadSheet) {
    eloadSheet = ss.insertSheet('E-Load');
  }
  eloadSheet.getRange(1, 1, 1, ELOAD_COLUMNS.length).setValues([ELOAD_COLUMNS]);
  
  // Create Users sheet
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) {
    usersSheet = ss.insertSheet('Users');
  }
  usersSheet.getRange(1, 1, 1, USER_COLUMNS.length).setValues([USER_COLUMNS]);
  
  // Create HistoricalData sheet
  let histSheet = ss.getSheetByName('HistoricalData');
  if (!histSheet) {
    histSheet = ss.insertSheet('HistoricalData');
  }
  histSheet.getRange(1, 1, 1, INSTALLATION_COLUMNS.length).setValues([INSTALLATION_COLUMNS]);
  
  SpreadsheetApp.getUi().alert('Sheets set up successfully!');
}

/**
 * Test function to verify the API works
 */
function testApi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Installations') || ss.insertSheet('Installations');
  
  // Test GET
  const getResult = getAllRows(sheet, 'installations');
  console.log('GET result:', getResult);
  
  // Test POST (append)
  const testRow = {
    id: 'TEST-' + Date.now(),
    no: '1',
    dateInstalled: new Date().toISOString(),
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const appendResult = appendRow(sheet, 'installations', testRow);
  console.log('POST result:', appendResult);
  
  // Test filter
  const filterResult = filterRows(sheet, 'id', testRow.id);
  console.log('FILTER result:', filterResult);
  
  // Test delete
  const deleteResult = deleteRow(sheet, 'installations', 'id', testRow.id);
  console.log('DELETE result:', deleteResult);
  
  SpreadsheetApp.getUi().alert('API test completed! Check console for results.');
}