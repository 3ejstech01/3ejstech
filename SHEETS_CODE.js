// ============================================================
// 3EJS Tech - Google Apps Script (Updated for 2025)
// Handles 4 sheets: installations, eload, users, historicaldata
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
// ============================================================

/**
 * Finds header row by scanning first 10 rows for known column keywords.
 */
function findHeaderRow(data) {
  var headerKeywords = ['id', 'dateInstalled', 'agentName', 'joNumber', 'accountNumber', 'subscriberName', 'username', 'password', 'gcashHandler', 'subsname', 'gcashAcct'];
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
 * Usage: ?sheet=installations
 */
function doGet(e) {
  try {
    var sheetName = e.parameter.sheet || 'installations';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheetNames = ss.getSheets().map(function(s) { return s.getName(); });
    console.log('Spreadsheet: ' + ss.getName());
    console.log('Available sheets: ' + allSheetNames.join(', '));
    console.log('Requested sheet: ' + sheetName);

    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Sheet not found: ' + sheetName + '. Available sheets: ' + allSheetNames.join(', ') })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
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

    var rows = [];
    for (var r = headerRowIndex + 1; r < data.length; r++) {
      var row = data[r];
      var obj = {};
      var hasData = false;
      for (var c = 0; c < validColumns.length; c++) {
        var col = validColumns[c];
        var value = row[col.index] !== undefined && row[col.index] !== null ? row[col.index] : '';
        obj[col.name] = String(value);
        if (String(value).trim() !== '') hasData = true;
      }
      if (hasData) rows.push(obj);
    }

    return ContentService.createTextOutput(JSON.stringify(rows))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST - Write operations (append / update / delete).
 *
 * Request body (JSON):
 *   { action: 'append', sheet: 'installations', row: { col1: val1, ... } }
 *   { action: 'update', sheet: 'installations', keyColumn: 'id', keyValue: '123', row: { col1: newVal } }
 *   { action: 'delete', sheet: 'installations', keyColumn: 'id', keyValue: '123' }
 *   { action: 'filter', sheet: 'installations', keyColumn: 'accountNumber', keyValue: '123' }
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheetName = payload.sheet || e.parameter.sheet || 'installations';
    var action = payload.action || 'append';

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheetNames = ss.getSheets().map(function(s) { return s.getName(); });
    console.log('POST - Spreadsheet: ' + ss.getName());
    console.log('POST - Available sheets: ' + allSheetNames.join(', '));
    console.log('POST - Requested sheet: ' + sheetName);
    console.log('POST - Action: ' + action);

    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Sheet not found: ' + sheetName + '. Available sheets: ' + allSheetNames.join(', ') })
      ).setMimeType(ContentService.MimeType.JSON);
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
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Key column not found: ' + keyColumn })
        ).setMimeType(ContentService.MimeType.JSON);
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
            obj[col.name] = row[col.index] !== undefined && row[col.index] !== null ? String(row[col.index]) : '';
          }
          rows.push(obj);
        }
      }

      return ContentService.createTextOutput(JSON.stringify(rows))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── APPEND: add a new row ──────────────────────────────────
    if (action === 'append') {
      var row = headers.map(function(h) {
        return payload.row[h] !== undefined ? payload.row[h] : '';
      });
      sheet.appendRow(row);
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, action: 'append' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ── UPDATE: edit an existing row by matching a key column ──
    if (action === 'update') {
      var keyColumn = payload.keyColumn || 'id';
      var keyValue = payload.keyValue;
      var keyIndex = headers.indexOf(keyColumn);

      if (keyIndex === -1) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Key column not found: ' + keyColumn })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      var allData = sheet.getDataRange().getValues();
      for (var i = headerRowIndex + 1; i < allData.length; i++) {
        if (String(allData[i][keyIndex]) === String(keyValue)) {
          headers.forEach(function(h, colIdx) {
            if (payload.row[h] !== undefined) {
              sheet.getRange(i + 1, colIdx + 1).setValue(payload.row[h]);
            }
          });
          return ContentService.createTextOutput(
            JSON.stringify({ success: true, action: 'update', rowIndex: i + 1 })
          ).setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Row not found for key: ' + keyValue })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ── DELETE: remove a row by matching a key column ──────────
    if (action === 'delete') {
      var keyColumn = payload.keyColumn || 'id';
      var keyValue = payload.keyValue;
      var keyIndex = headers.indexOf(keyColumn);

      if (keyIndex === -1) {
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Key column not found: ' + keyColumn })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      var allData = sheet.getDataRange().getValues();
      for (var i = headerRowIndex + 1; i < allData.length; i++) {
        if (String(allData[i][keyIndex]) === String(keyValue)) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(
            JSON.stringify({ success: true, action: 'delete', rowIndex: i + 1 })
          ).setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Row not found for key: ' + keyValue })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ error: 'Unknown action: ' + action })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}