const SHEET_ID = '16oTFXKd88iXgKMATk12zL9IqtoUKWK4zY3frR4ZoP0o';

// --- API HANDLERS ---

function doGet(e) {
  const action = e.parameter.action;
  let result = {};
  
  try {
    if (action === 'getStudents') {
      result = getStudents();
    } else if (action === 'getTransactions') {
      result = getTransactions();
    } else if (action === 'getDashboardStats') {
      result = getDashboardStats();
    } else {
      result = { error: 'Invalid Action' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result = {};
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'saveStudent') {
      result = saveStudent(data.payload);
    } else if (action === 'collectFee') {
      result = collectFee(data.payload);
    } else if (action === 'saveExpense') {
      result = saveExpense(data.payload);
    } else {
      result = { error: 'Invalid Action' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- DATA HELPERS ---

function getSheetByName(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function getData(sheetName) {
  const sheet = getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

// --- STUDENT MANAGEMENT ---

function getStudents() {
  return getData('Sheet1');
}

function saveStudent(student) {
  const sheet = getSheetByName('Sheet1');
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  const rollColIndex = 0; 
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][rollColIndex] == student.Roll) {
      rowIndex = i + 1;
      break;
    }
  }

  // Calculate Totals
  const prevBal = Number(student.PrevBalance) || 0;
  const tuition = Number(student.TuitionFee) || 0;
  const van = Number(student.VanFee) || 0;
  const other = Number(student.OtherFee) || 0;
  
  const totalDue = prevBal + tuition + van + other;
  
  // If updating, preserve existing 'Total Received' unless we want to reset it
  let totalReceived = 0;
  if(rowIndex > 0) {
      // Fetch existing received amount
      totalReceived = Number(sheet.getRange(rowIndex, 10).getValue()) || 0;
  }
  
  const balance = totalDue - totalReceived;

  const rowData = [
    student.Roll,
    student.Class,
    student.Name,
    student.FatherName,
    prevBal,
    tuition,
    van,
    other,
    totalDue, 
    totalReceived,
    balance,
    student.Phone,
    student.LastReminder || ''
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return { success: true };
}


// --- FINANCE ---

function collectFee(transaction) {
  const tSheet = getSheetByName('Transactions');
  const sSheet = getSheetByName('Sheet1');
  
  // 1. Log Transaction
  tSheet.appendRow([
    new Date(),
    transaction.Roll,
    transaction.Name,
    transaction.Class,
    transaction.Amount,
    transaction.Mode,
    transaction.Remarks
  ]);
  
  // 2. Update Student Balance
  const data = sSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == transaction.Roll) { // Match Roll
      const receivedCol = 10; // Column J (1-based index)
      const balanceCol = 11; // Column K
      
      const currentReceived = Number(data[i][9]) || 0;
      const totalDue = Number(data[i][8]) || 0;
      
      const newReceived = currentReceived + Number(transaction.Amount);
      const newBalance = totalDue - newReceived;
      
      sSheet.getRange(i + 1, receivedCol).setValue(newReceived);
      sSheet.getRange(i + 1, balanceCol).setValue(newBalance);
      break;
    }
  }
  
  return { success: true };
}

function getTransactions() {
  return getData('Transactions');
}

function saveExpense(expense) {
  const sheet = getSheetByName('Expenses');
  sheet.appendRow([
    new Date(),
    expense.Category,
    expense.Amount,
    expense.Description
  ]);
  return { success: true };
}

// --- DASHBOARD ---

function getDashboardStats() {
    const students = getData('Sheet1');
    const transactions = getData('Transactions');
    const expenses = getData('Expenses');

    let totalStudents = students.length;
    let totalCollected = transactions.reduce((sum, t) => sum + (Number(t['Amount Paid']) || 0), 0);
    let totalPending = students.reduce((sum, s) => sum + (Number(s['Balance']) || 0), 0);
    
    // Today's Collection
    const today = new Date().toDateString();
    let todayCollected = transactions
        .filter(t => new Date(t['Date']).toDateString() === today)
        .reduce((sum, t) => sum + (Number(t['Amount Paid']) || 0), 0);

    let todayExpense = expenses
        .filter(e => new Date(e['Date']).toDateString() === today)
        .reduce((sum, e) => sum + (Number(e['Amount']) || 0), 0);
    
    return {
        totalStudents,
        totalCollected,
        totalPending,
        todayCollected,
        todayExpense,
        netCash: totalCollected - expenses.reduce((sum, e) => sum + (Number(e['Amount']) || 0), 0)
    };
}
