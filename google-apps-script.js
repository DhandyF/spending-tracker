const SPREADSHEET_ID = 'YOUR_SPREAD_SHEET_ID';

var BUDGET_MARKER = '=== BUDGETS ===';
var SPENDING_MARKER = '=== SPENDINGS ===';
var BUDGET_HEADERS = ['id', 'category', 'yearMonth', 'amount', 'totalSpent'];
var SPENDING_HEADERS = ['id', 'date', 'name', 'category', 'paymentMethod', 'description', 'price'];

// ==================== Routing ====================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    switch (action) {
      case 'getSpendings':
        return jsonResponse(getSpendings(data.yearMonth));
      case 'addSpending':
        return jsonResponse(addSpending(data.spending));
      case 'updateSpending':
        return jsonResponse(updateSpending(data.spending));
      case 'deleteSpending':
        return jsonResponse(deleteSpending(data.id, data.yearMonth));
      case 'getBudgets':
        return jsonResponse(getBudgets(data.yearMonth));
      case 'addBudget':
        return jsonResponse(addBudget(data.budget));
      case 'updateBudget':
        return jsonResponse(updateBudget(data.budget));
      case 'deleteBudget':
        return jsonResponse(deleteBudget(data.id, data.yearMonth));
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

// ==================== Utilities ====================

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function forceStringFormat(sheet, row, col, value) {
  var cell = sheet.getRange(row, col);
  cell.setNumberFormat('@');
  cell.setValue(String(value));
}

function extractYearMonth(dateStr) {
  if (!dateStr) return '';
  return String(dateStr).substring(0, 7);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ==================== Sheet Access ====================

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getMonthlySheet(yearMonth) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(yearMonth);
  if (!sheet) {
    sheet = ss.insertSheet(yearMonth);
    initMonthlySheet(sheet);
  }
  return sheet;
}

function initMonthlySheet(sheet) {
  sheet.getRange(1, 1).setValue(BUDGET_MARKER);
  sheet.getRange(2, 1, 1, BUDGET_HEADERS.length).setValues([BUDGET_HEADERS]);
  forceStringFormat(sheet, 2, 1, 'id');
  forceStringFormat(sheet, 2, 3, 'yearMonth');
  sheet.getRange(3, 1).setValue(SPENDING_MARKER);
  sheet.getRange(4, 1, 1, SPENDING_HEADERS.length).setValues([SPENDING_HEADERS]);
  forceStringFormat(sheet, 4, 1, 'id');
  forceStringFormat(sheet, 4, 2, 'date');
}

function findAllMonthlySheets() {
  var ss = getSpreadsheet();
  var sheets = ss.getSheets();
  var result = [];
  var pattern = /^\d{4}-\d{2}$/;
  for (var i = 0; i < sheets.length; i++) {
    if (pattern.test(sheets[i].getName())) {
      result.push(sheets[i]);
    }
  }
  return result;
}

// ==================== Section Helpers ====================

// Returns 0-based indices in the data array
function getSectionBounds(allData, marker) {
  var markerIdx = -1;
  for (var i = 0; i < allData.length; i++) {
    if (String(allData[i][0]).trim() === marker) {
      markerIdx = i;
      break;
    }
  }
  if (markerIdx === -1) return null;

  var headerIdx = markerIdx + 1;
  var dataStart = headerIdx + 1;

  var dataEnd = allData.length;
  var markers = [BUDGET_MARKER, SPENDING_MARKER];
  for (var i = dataStart; i < allData.length; i++) {
    if (markers.indexOf(String(allData[i][0]).trim()) !== -1) {
      dataEnd = i;
      break;
    }
  }

  return {
    headerIdx: headerIdx,
    dataStart: dataStart,
    dataEnd: dataEnd
  };
}

function formatCellValue(header, val) {
  if (val instanceof Date) {
    if (header === 'yearMonth') {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM');
    }
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  if (typeof val === 'string' && header === 'yearMonth') {
    return val.substring(0, 7);
  }
  return val;
}

function readSection(allData, marker, headers) {
  var bounds = getSectionBounds(allData, marker);
  if (!bounds || bounds.dataStart >= bounds.dataEnd) return [];

  var rows = [];
  for (var i = bounds.dataStart; i < bounds.dataEnd; i++) {
    var obj = {};
    for (var h = 0; h < headers.length; h++) {
      obj[headers[h]] = formatCellValue(headers[h], allData[i][h]);
    }
    rows.push(obj);
  }
  return rows;
}

function findRowInSection(allData, marker, id) {
  var bounds = getSectionBounds(allData, marker);
  if (!bounds) return -1;

  for (var i = bounds.dataStart; i < bounds.dataEnd; i++) {
    if (String(allData[i][0]) === String(id)) {
      return i;
    }
  }
  return -1;
}

function forceStringColumns(sheet, sheetRow, headers, row) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === 'id' || headers[i] === 'date' || headers[i] === 'yearMonth') {
      forceStringFormat(sheet, sheetRow, i + 1, String(row[i]));
    }
  }
}

// ==================== Spendings CRUD ====================

function getSpendings(yearMonth) {
  if (yearMonth) {
    var sheet = getMonthlySheet(yearMonth);
    var allData = sheet.getDataRange().getValues();
    return { data: readSection(allData, SPENDING_MARKER, SPENDING_HEADERS) };
  }

  var sheets = findAllMonthlySheets();
  var allRows = [];
  for (var i = 0; i < sheets.length; i++) {
    var data = sheets[i].getDataRange().getValues();
    allRows = allRows.concat(readSection(data, SPENDING_MARKER, SPENDING_HEADERS));
  }
  return { data: allRows };
}

function addSpending(spendingData) {
  var yearMonth = extractYearMonth(spendingData.date);
  if (!yearMonth) return { error: 'Invalid date' };

  var sheet = getMonthlySheet(yearMonth);
  spendingData.id = generateId();

  var row = SPENDING_HEADERS.map(function(header) {
    if (header === 'price') return Number(spendingData[header]) || 0;
    return spendingData[header] || '';
  });

  sheet.appendRow(row);
  var lastRow = sheet.getLastRow();
  forceStringColumns(sheet, lastRow, SPENDING_HEADERS, row);

  recalcBudgetTotals(yearMonth);

  return { data: spendingData };
}

function updateSpending(spendingData) {
  var yearMonth = extractYearMonth(spendingData.date);
  if (!yearMonth) return { error: 'Invalid date' };

  var sheet = getMonthlySheet(yearMonth);
  var allData = sheet.getDataRange().getValues();
  var rowIdx = findRowInSection(allData, SPENDING_MARKER, spendingData.id);
  if (rowIdx === -1) return { error: 'Row not found' };

  var row = SPENDING_HEADERS.map(function(header, h) {
    if (header === 'price') return Number(spendingData[header]) || 0;
    return spendingData[header] !== undefined ? spendingData[header] : allData[rowIdx][h];
  });

  var sheetRow = rowIdx + 1;
  sheet.getRange(sheetRow, 1, 1, row.length).setValues([row]);
  forceStringColumns(sheet, sheetRow, SPENDING_HEADERS, row);

  recalcBudgetTotals(yearMonth);

  return { data: spendingData };
}

function deleteSpending(id, yearMonth) {
  if (!yearMonth) return { error: 'yearMonth is required' };

  var sheet = getMonthlySheet(yearMonth);
  var allData = sheet.getDataRange().getValues();
  var rowIdx = findRowInSection(allData, SPENDING_MARKER, id);
  if (rowIdx === -1) return { error: 'Row not found' };

  sheet.deleteRow(rowIdx + 1);
  recalcBudgetTotals(yearMonth);

  return { data: { id: id } };
}

// ==================== Budgets CRUD ====================

function getBudgets(yearMonth) {
  if (yearMonth) {
    var sheet = getMonthlySheet(yearMonth);
    var allData = sheet.getDataRange().getValues();
    return { data: readSection(allData, BUDGET_MARKER, BUDGET_HEADERS) };
  }

  var sheets = findAllMonthlySheets();
  var allRows = [];
  for (var i = 0; i < sheets.length; i++) {
    var data = sheets[i].getDataRange().getValues();
    allRows = allRows.concat(readSection(data, BUDGET_MARKER, BUDGET_HEADERS));
  }
  return { data: allRows };
}

function addBudget(budgetData) {
  var yearMonth = extractYearMonth(budgetData.yearMonth);
  if (!yearMonth) return { error: 'Invalid yearMonth' };

  var sheet = getMonthlySheet(yearMonth);
  budgetData.id = generateId();
  budgetData.totalSpent = 0;

  var allData = sheet.getDataRange().getValues();

  // Find spending marker row to insert budget before it
  var spendingMarkerRow = -1;
  for (var i = 0; i < allData.length; i++) {
    if (String(allData[i][0]).trim() === SPENDING_MARKER) {
      spendingMarkerRow = i + 1;
      break;
    }
  }
  if (spendingMarkerRow === -1) return { error: 'Sheet structure corrupted' };

  sheet.insertRowBefore(spendingMarkerRow);

  var row = BUDGET_HEADERS.map(function(header) {
    if (header === 'amount' || header === 'totalSpent') return Number(budgetData[header]) || 0;
    return budgetData[header] || '';
  });

  sheet.getRange(spendingMarkerRow, 1, 1, row.length).setValues([row]);
  forceStringColumns(sheet, spendingMarkerRow, BUDGET_HEADERS, row);

  recalcBudgetTotals(yearMonth);

  return { data: budgetData };
}

function updateBudget(budgetData) {
  var yearMonth = extractYearMonth(budgetData.yearMonth);
  if (!yearMonth) return { error: 'Invalid yearMonth' };

  var sheet = getMonthlySheet(yearMonth);
  var allData = sheet.getDataRange().getValues();
  var rowIdx = findRowInSection(allData, BUDGET_MARKER, budgetData.id);
  if (rowIdx === -1) return { error: 'Row not found' };

  var row = BUDGET_HEADERS.map(function(header, h) {
    if (header === 'amount' || header === 'totalSpent') return Number(budgetData[header]) || 0;
    return budgetData[header] !== undefined ? budgetData[header] : allData[rowIdx][h];
  });

  var sheetRow = rowIdx + 1;
  sheet.getRange(sheetRow, 1, 1, row.length).setValues([row]);
  forceStringColumns(sheet, sheetRow, BUDGET_HEADERS, row);

  recalcBudgetTotals(yearMonth);

  return { data: budgetData };
}

function deleteBudget(id, yearMonth) {
  if (!yearMonth) return { error: 'yearMonth is required' };

  var sheet = getMonthlySheet(yearMonth);
  var allData = sheet.getDataRange().getValues();
  var rowIdx = findRowInSection(allData, BUDGET_MARKER, id);
  if (rowIdx === -1) return { error: 'Row not found' };

  sheet.deleteRow(rowIdx + 1);

  return { data: { id: id } };
}

// ==================== Budget Recalculation ====================

function recalcBudgetTotals(yearMonth) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(yearMonth);
  if (!sheet) return;

  var allData = sheet.getDataRange().getValues();

  // Sum spendings by category
  var spentByCategory = {};
  var spBounds = getSectionBounds(allData, SPENDING_MARKER);
  if (spBounds) {
    var catIdx = SPENDING_HEADERS.indexOf('category');
    var priceIdx = SPENDING_HEADERS.indexOf('price');
    for (var i = spBounds.dataStart; i < spBounds.dataEnd; i++) {
      var cat = allData[i][catIdx];
      var price = Number(allData[i][priceIdx]) || 0;
      spentByCategory[cat] = (spentByCategory[cat] || 0) + price;
    }
  }

  // Update totalSpent in budget rows
  var bBounds = getSectionBounds(allData, BUDGET_MARKER);
  if (!bBounds || bBounds.dataStart >= bBounds.dataEnd) return;

  var totalSpentIdx = BUDGET_HEADERS.indexOf('totalSpent');
  var bCatIdx = BUDGET_HEADERS.indexOf('category');

  for (var i = bBounds.dataStart; i < bBounds.dataEnd; i++) {
    var cat = allData[i][bCatIdx];
    var spent = spentByCategory[cat] || 0;
    sheet.getRange(i + 1, totalSpentIdx + 1).setValue(spent);
  }
}
