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
  
  // Create a mapping of original headers to normalized keys
  const keyMap = headers.map(h => {
    return h.toString().toLowerCase()
      .replace(/\s+/g, '') // remove spaces
      .replace(/[^a-z0-9]/g, ''); // remove non-alphanumeric
  });

  // Manual overrides for specific columns to ensure consistency
  // This maps the "clean" header to our desired internal key
  const fieldMapping = {
    'rollno': 'roll',
    'roll': 'roll',
    'studentname': 'name',
    'name': 'name',
    'fathername': 'fatherName',
    'phonenumber': 'phone',
    'phone': 'phone',
    'class': 'class',
    'tuitionfee': 'tuitionFee',
    'vanfee': 'vanFee',
    'otherfee': 'otherFee',
    'prevbalance': 'prevBalance',
    'balance': 'balance',
    'totalreceived': 'totalReceived',
    'amountpaid': 'amountPaid',
    'paymentmode': 'mode',
    'date': 'date',
    'amount': 'amount',
    'category': 'category',
    'description': 'description',
    'remarks': 'remarks'
  };

  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
        const cleanHeader = keyMap[i];
        // Use mapped key if exists, else default to clean header
        const key = fieldMapping[cleanHeader] || cleanHeader;
        obj[key] = row[i];
    });
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
    if (data[i][rollColIndex] == student.roll) {
      rowIndex = i + 1;
      break;
    }
  }

  // Calculate Totals
  const prevBal = Number(student.prevBalance) || 0;
  const tuition = Number(student.tuitionFee) || 0;
  const van = Number(student.vanFee) || 0;
  const other = Number(student.otherFee) || 0;
  
  const totalDue = prevBal + tuition + van + other;
  
  // If updating, preserve existing 'Total Received' unless we want to reset it
  let totalReceived = 0;
  if(rowIndex > 0) {
      // Fetch existing received amount
      totalReceived = Number(sheet.getRange(rowIndex, 10).getValue()) || 0;
  }
  
  const balance = totalDue - totalReceived;

  const rowData = [
    student.roll,
    student.class,
    student.name,
    student.fatherName,
    prevBal,
    tuition,
    van,
    other,
    totalDue, 
    totalReceived,
    balance,
    student.phone,
    student.lastReminder || ''
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
    transaction.roll,
    transaction.name,
    transaction.class,
    transaction.amount,
    transaction.mode,
    transaction.remarks
  ]);
  
  // 2. Update Student Balance
  const data = sSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == transaction.roll) { // Match Roll
      const receivedCol = 10; // Column J (1-based index)
      const balanceCol = 11; // Column K
      
      const currentReceived = Number(data[i][9]) || 0;
      const totalDue = Number(data[i][8]) || 0;
      
      const newReceived = currentReceived + Number(transaction.amount);
      const newBalance = totalDue - newReceived;
      
      const rowNum = i + 1; // 1-based index
      sSheet.getRange(rowNum, receivedCol).setValue(newReceived);
      sSheet.getRange(rowNum, balanceCol).setValue(newBalance);
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
    expense.category,
    expense.amount,
    expense.description
  ]);
  return { success: true };
}

// --- DASHBOARD ---

function getDashboardStats() {
    const students = getData('Sheet1');
    const transactions = getData('Transactions');
    const expenses = getData('Expenses');

    let totalStudents = students.length;
    let totalCollected = transactions.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    let totalPending = students.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
    
    // Today's Collection
    const today = new Date().toDateString();
    let todayCollected = transactions
        .filter(t => new Date(t.date).toDateString() === today)
        .reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    let todayExpense = expenses
        .filter(e => new Date(e.date).toDateString() === today)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    return {
        totalStudents,
        totalCollected,
        totalPending,
        todayCollected,
        todayExpense,
        netCash: totalCollected - expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    };
}
