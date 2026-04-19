const SPREADSHEET_ID = 'YOUR_SPREAD_SHEET_ID';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'getSpendings':
        return jsonResponse(getRows('Spendings'));
      case 'addSpending':
        return jsonResponse(addRow('Spendings', data.spending));
      case 'updateSpending':
        return jsonResponse(updateRow('Spendings', data.spending));
      case 'deleteSpending':
        return jsonResponse(deleteRow('Spendings', data.id));
      case 'getBudgets':
        return jsonResponse(getRows('Budgets'));
      case 'addBudget':
        return jsonResponse(addRow('Budgets', data.budget));
      case 'updateBudget':
        return jsonResponse(updateRow('Budgets', data.budget));
      case 'deleteBudget':
        return jsonResponse(deleteRow('Budgets', data.id));
      default:
        return jsonResponse({ error: 'Unknown action' }, 400);
    }
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'Spending Tracker API is running' });
}

function jsonResponse(data, code) {
  const status = code || 200;
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function forceStringFormat(sheet, row, col, value) {
  var cell = sheet.getRange(row, col);
  cell.setNumberFormat('@');
  cell.setValue(String(value));
}

function ensureHeaders(sheet, sheetName) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    if (sheetName === 'Spendings') {
      sheet.appendRow(['id', 'date', 'name', 'category', 'paymentMethod', 'description', 'price']);
      // Force string format on relevant columns
      var headerRow = sheet.getLastRow();
      forceStringFormat(sheet, headerRow, 1, 'id');
      forceStringFormat(sheet, headerRow, 2, 'date');
    } else if (sheetName === 'Budgets') {
      sheet.appendRow(['id', 'category', 'yearMonth', 'amount']);
      var headerRow = sheet.getLastRow();
      forceStringFormat(sheet, headerRow, 1, 'id');
      forceStringFormat(sheet, headerRow, 3, 'yearMonth');
    }
  }
}

function getSheet(sheetName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  ensureHeaders(sheet, sheetName);
  return sheet;
}

function getRows(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { data: [] };

  var headers = data[0];
  var rows = data.slice(1);
  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      var val = row[i];
      if (val instanceof Date) {
        if (header === 'yearMonth') {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM');
        } else {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
      } else if (typeof val === 'string' && header === 'yearMonth') {
        val = val.substring(0, 7);
      }
      obj[header] = val;
    });
    return obj;
  });

  return { data: result };
}

function addRow(sheetName, rowData) {
  var sheet = getSheet(sheetName);
  var id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  rowData.id = id;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(header) {
    if (header === 'price' || header === 'amount') {
      return Number(rowData[header]) || 0;
    }
    return rowData[header] || '';
  });

  sheet.appendRow(row);

  // Force string format on columns that Google Sheets may auto-convert to dates
  var lastRow = sheet.getLastRow();
  headers.forEach(function(header, i) {
    var colIdx = i + 1;
    if (header === 'yearMonth' || header === 'id' || header === 'date') {
      var cellValue = String(row[i]);
      forceStringFormat(sheet, lastRow, colIdx, cellValue);
    }
  });

  return { data: rowData };
}

function updateRow(sheetName, rowData) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === rowData.id) {
      var row = headers.map(function(header, idx) {
        if (header === 'price' || header === 'amount') {
          return Number(rowData[header]) || 0;
        }
        return rowData[header] !== undefined ? rowData[header] : data[i][idx];
      });
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);

      // Force string format on columns that Google Sheets may auto-convert to dates
      headers.forEach(function(header, idx) {
        var colIdx = idx + 1;
        if (header === 'yearMonth' || header === 'id' || header === 'date') {
          var cellValue = String(row[idx]);
          forceStringFormat(sheet, i + 1, colIdx, cellValue);
        }
      });

      return { data: rowData };
    }
  }

  return { error: 'Row not found' };
}

function deleteRow(sheetName, id) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { data: { id: id } };
    }
  }

  return { error: 'Row not found' };
}
