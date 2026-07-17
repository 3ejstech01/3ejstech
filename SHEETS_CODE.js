// ============================================================
// 3EJS Tech - Google Apps Script (Updated for 2025)
// Handles 3 sheets: installations, users, historicaldata
//
// METADATA COLUMNS:
// - __lastModifiedBy: who last modified the row
// - __updatedAt: ISO timestamp of last modification
// - __checksum: data integrity checksum
// These are added as the LAST 3 columns in each sheet to avoid
// disrupting existing data column positions.
//
// HOW TO DEPLOY:
// 1. Open your Google Sheet
// 2. Extensions > Apps Script
// 3. Replace ALL code with this file
// 4. Click Deploy > New Deployment
// 5. Type: Web app
// 6. Execute as: Me
// 7. Who has access: Anyone
// 8. Click Deploy and COPY THE WEB APP URL
//
// IMPORTANT: Every time you edit, create a NEW deployment.
//
// SETUP APP_SECRET (required for authentication):
// 1. In the Apps Script editor, click Settings (gear icon)
// 2. Check "Show 'appsscript.json' manifest file in editor"
// 3. Click Project Settings again, find "Script Properties"
// 4. Add Property: APP_SECRET, Value: your-secret-key
// 5. Save and redeploy
// ============================================================

var SHEET_NAMES = {
  installations: 'Installations',
  users: 'Users',
  historicaldata: 'HistoricalData'
};

/**
 * Verifies the request includes a valid APP_SECRET.
 * Reads APP_SECRET from Script Properties (set by the user in Project Settings).
 */
function authorized(e) {
  var expected = PropertiesService.getScriptProperties().getProperty('APP_SECRET');
  if (!expected) {
    console.log('APP_SECRET not configured in Script Properties');
    return false;
  }
  var provided = e.parameter.secret;
  if (!provided) {
    var body = e.postData && e.postData.contents;
    if (body) {
      try { provided = JSON.parse(body).secret; } catch(ex) {}
    }
  }
  return provided === expected;
}

function json(data, status) {
  status = status || 200;
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Gets a sheet by name, trying both the display name and the key.
 */
function getSheetByName(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAMES[name]) || ss.getSheetByName(name);
}

/**
 * Formats a cell value for JSON output.
 * Converts Date objects to MM/DD/YYYY strings.
 */
function formatCellValue(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    var y = value.getFullYear();
    var m = String(value.getMonth() + 1).padStart(2, '0');
    var d = String(value.getDate()).padStart(2, '0');
    return m + '/' + d + '/' + y;
  }
  return value !== undefined && value !== null ? String(value) : '';
}

var META_HEADERS = ['__lastModifiedBy', '__updatedAt', '__checksum'];

function ensureMetaHeaders(sheet, data, headerRowIndex) {
  var headers = data[headerRowIndex].map(function(h) {
    return String(h).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  });
  var hasAllMeta = META_HEADERS.every(function(m) { return headers.indexOf(m) !== -1; });
  if (!hasAllMeta) {
    var lastCol = headers.length + 1;
    META_HEADERS.forEach(function(meta, i) {
      sheet.getRange(headerRowIndex + 1, lastCol + i).setValue(meta);
    });
  }
  return !hasAllMeta;
}

/**
 * Finds header row by scanning first 10 rows for known column keywords.
 */
function findHeaderRow(data) {
  var headerKeywords = ['id', 'dateInstalled', 'agentName', 'joNumber', 'accountNumber', 'subscriberName', 'username', 'password', 'gcashHandler', 'subsname', 'gcashAcct', 'status'];
  for (var i = 0; i < Math.min(10, data.length); i++) {
    var rowText = data[i].join(' ').toUpperCase();
    var matchCount = 0;
    for (var k = 0; k < headerKeywords.length; k++) {
      if (rowText.indexOf(headerKeywords[k].toUpperCase()) !== -1) matchCount++;
    }
    if (matchCount >= 2) return i;
  }
  return 0;
}

/**
 * GET - Read rows from a sheet.
 * Usage: ?sheet=installations&secret=YOUR_APP_SECRET
 * Optional: filterColumn=xxx&filterValue=yyy&limit=10&offset=0
 */
function doGet(e) {
  try {
    if (!authorized(e)) return json({ error: 'unauthorized' }, 401);

    var sheetName = e.parameter.sheet || 'installations';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheetNames = ss.getSheets().map(function(s) { return s.getName(); });
    console.log('Spreadsheet: ' + ss.getName());
    console.log('Available sheets: ' + allSheetNames.join(', '));
    console.log('Requested sheet: ' + sheetName);

    var sheet = getSheetByName(sheetName);

    if (!sheet) {
      return json({ error: 'Sheet not found: ' + sheetName + '. Available sheets: ' + allSheetNames.join(', ') }, 404);
    }

    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return json([]);
    }

    var headerRowIndex = findHeaderRow(data);
    var headers = data[headerRowIndex].map(function(h) {
      return String(h).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    });

    var validColumns = [];
    for (var i = 0; i < headers.length; i++) {
      if (headers[i] !== '') {
        validColumns.push({ index: i, name: headers[i] });
      }
    }

    // Server-side filtering + pagination
    var filterCol = e.parameter.filterColumn;
    var filterVal = e.parameter.filterValue;
    var limit = e.parameter.limit ? Number(e.parameter.limit) : 0;
    var offset = e.parameter.offset ? Number(e.parameter.offset) : 0;

    var rows = [];
    for (var r = headerRowIndex + 1; r < data.length; r++) {
      var row = data[r];
      var obj = {};
      var hasData = false;
      for (var c = 0; c < validColumns.length; c++) {
        var col = validColumns[c];
        var value = row[col.index] !== undefined && row[col.index] !== null ? row[col.index] : '';
        obj[col.name] = formatCellValue(value);
        if (String(value).trim() !== '') hasData = true;
      }
      if (!hasData) continue;

      // Apply filter if specified
      if (filterCol && filterVal !== undefined) {
        var filterColIndex = headers.indexOf(filterCol);
        if (filterColIndex !== -1) {
          var colValue = row[filterColIndex];
          if (String(colValue) !== String(filterVal)) continue;
        }
      }

      // Include metadata columns if present (last 3 columns)
      var totalCols = row.length;
      if (totalCols >= 3) {
        var metaStart = totalCols - 3;
        var lastHeader = headers[totalCols - 3];
        if (lastHeader === '__lastModifiedBy') {
          obj.__lastModifiedBy = row[totalCols - 3] || '';
          obj.__updatedAt = row[totalCols - 2] || '';
          obj.__checksum = row[totalCols - 1] || '';
        }
      }

      rows.push(obj);
    }

    if (offset > 0) rows = rows.slice(offset);
    if (limit > 0) rows = rows.slice(0, limit);

    return json(rows);
  } catch (err) {
    return json({ error: err.toString() }, 500);
  }
}

/**
 * POST - Write operations (append / update / delete).
 *
 * Request body (JSON):
 *   { action: 'append', sheet: 'installations', secret: 'YOUR_APP_SECRET', row: { col1: val1, ... } }
 *   { action: 'update', sheet: 'installations', secret: 'YOUR_APP_SECRET', keyColumn: 'id', keyValue: '123', row: { col1: newVal } }
 *   { action: 'delete', sheet: 'installations', secret: 'YOUR_APP_SECRET', keyColumn: 'id', keyValue: '123' }
 *   { action: 'filter', sheet: 'installations', secret: 'YOUR_APP_SECRET', keyColumn: 'accountNumber', keyValue: '123' }
 */
function doPost(e) {
  try {
    if (!authorized(e)) return json({ error: 'unauthorized' }, 401);

    var payload = JSON.parse(e.postData.contents);
    var sheetName = payload.sheet || e.parameter.sheet || 'installations';
    var action = payload.action || 'append';

    var ALLOWED_SHEETS = ['installations', 'users', 'historicaldata'];
    if (ALLOWED_SHEETS.indexOf(sheetName) === -1) {
      return json({ error: 'sheet not allowed' }, 400);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheetNames = ss.getSheets().map(function(s) { return s.getName(); });
    console.log('POST - Spreadsheet: ' + ss.getName());
    console.log('POST - Available sheets: ' + allSheetNames.join(', '));
    console.log('POST - Requested sheet: ' + sheetName);
    console.log('POST - Action: ' + action);

    var sheet = getSheetByName(sheetName);

    if (!sheet) {
      return json({ error: 'Sheet not found: ' + sheetName + '. Available sheets: ' + allSheetNames.join(', ') }, 404);
    }

    var data = sheet.getDataRange().getValues();
    var headerRowIndex = findHeaderRow(data);
    var headers = data[headerRowIndex].map(function(h) {
      return String(h).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    });

    // ── FILTER: return matching rows ────────────────────────────
    if (action === 'filter') {
      var keyColumn = payload.keyColumn || 'id';
      var keyValue = payload.keyValue;
      var keyIndex = headers.indexOf(keyColumn);

      if (keyIndex === -1) {
        return json({ error: 'Key column not found: ' + keyColumn }, 400);
      }

      var validColumns = [];
      for (var i = 0; i < headers.length; i++) {
        if (headers[i] !== '') validColumns.push({ index: i, name: headers[i] });
      }

      var rows = [];
      for (var r = headerRowIndex + 1; r < data.length; r++) {
        var row = data[r];
        if (String(row[keyIndex]) === String(keyValue)) {
          var obj = {};
          for (var c = 0; c < validColumns.length; c++) {
            var col = validColumns[c];
            obj[col.name] = formatCellValue(row[col.index]);
          }
          // Include metadata columns if present
          var totalCols = row.length;
          if (totalCols >= 3) {
            var lastHeader = headers[totalCols - 3];
            if (lastHeader === '__lastModifiedBy') {
              obj.__lastModifiedBy = row[totalCols - 3] || '';
              obj.__updatedAt = row[totalCols - 2] || '';
              obj.__checksum = row[totalCols - 1] || '';
            }
          }
          rows.push(obj);
        }
      }

      return json(rows);
    }

    // ── APPEND: add a new row ──────────────────────────────────
    if (action === 'append') {
      // Ensure metadata headers exist
      ensureMetaHeaders(sheet, data, headerRowIndex);
      // Refresh data to get updated headers
      data = sheet.getDataRange().getValues();
      headers = data[headerRowIndex].map(function(h) {
        return String(h).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      });

      var row = headers.map(function(h) {
        return payload.row[h] !== undefined ? payload.row[h] : '';
      });
      // Append metadata columns
      row.push(payload._lastModifiedBy || 'unknown');
      row.push(new Date().toISOString());
      row.push(payload._checksum || '');
      sheet.appendRow(row);
      return json({ success: true, action: 'append' });
    }

    // ── UPDATE: edit an existing row by matching a key column ──
    if (action === 'update') {
      var keyColumn = payload.keyColumn || 'id';
      var keyValue = payload.keyValue;
      var keyIndex = headers.indexOf(keyColumn);

      if (keyIndex === -1) {
        return json({ error: 'Key column not found: ' + keyColumn }, 400);
      }

      // Ensure metadata headers exist
      ensureMetaHeaders(sheet, data, headerRowIndex);

      var allData = sheet.getDataRange().getValues();
      // Refresh headers after potential update
      var updatedHeaders = allData[headerRowIndex].map(function(h) {
        return String(h).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      });
      for (var i = headerRowIndex + 1; i < allData.length; i++) {
        if (String(allData[i][keyIndex]) === String(keyValue)) {
          updatedHeaders.forEach(function(h, colIdx) {
            if (payload.row[h] !== undefined) {
              sheet.getRange(i + 1, colIdx + 1).setValue(payload.row[h]);
            }
          });
          // Update metadata columns (last 3 columns)
          var totalCols = updatedHeaders.length;
          sheet.getRange(i + 1, totalCols - 1).setValue(payload._lastModifiedBy || 'unknown');
          sheet.getRange(i + 1, totalCols).setValue(new Date().toISOString());
          if (payload._checksum) {
            sheet.getRange(i + 1, totalCols - 2).setValue(payload._checksum);
          }
          return json({ success: true, action: 'update', rowIndex: i + 1 });
        }
      }

      return json({ error: 'Row not found for key: ' + keyValue }, 404);
    }

    // ── DELETE: remove a row by matching a key column ──────────
    if (action === 'delete') {
      var keyColumn = payload.keyColumn || 'id';
      var keyValue = payload.keyValue;
      var keyIndex = headers.indexOf(keyColumn);

      if (keyIndex === -1) {
        return json({ error: 'Key column not found: ' + keyColumn }, 400);
      }

      var allData = sheet.getDataRange().getValues();
      for (var i = headerRowIndex + 1; i < allData.length; i++) {
        if (String(allData[i][keyIndex]) === String(keyValue)) {
          sheet.deleteRow(i + 1);
          return json({ success: true, action: 'delete', rowIndex: i + 1 });
        }
      }

      return json({ error: 'Row not found for key: ' + keyValue }, 404);
    }

    return json({ error: 'Unknown action: ' + action }, 400);

  } catch (err) {
    return json({ error: err.toString() }, 500);
  }
}