/**
 * CONFIGURATION
 * REPLACE WITH YOUR DEPLOYED WEB APP URL
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbxXSXP_NsYc3J9pCgIA61_kLV8Zic5ImDeYSIxis6ik5kmQiOJKp8HZAqg_T8MggPP5Zw/exec';

// --- API HELPER ---

async function fetchAPI(action, payload = null) {
    if (API_URL.includes('REPLACE_WITH')) {
        alert('Please configure the API_URL in script.js!');
        return null;
    }

    toggleLoader(true);
    try {
        let url = `${API_URL}?action=${action}`;
        let options = {
            method: 'GET',
            mode: 'cors'
            // Note: 'no-cors' needed if Google script is not handling options, 
            // BUT for JSON data we need standard CORS or JSONP.
            // Google Apps Script 'text/plain' returns redirects which fetch handles usually.
            // A common workaround for POST is using 'no-cors' if we don't need response, 
            // but we do.
            // Standard approach: Google Apps Script Web App must be 'Anyone'.
        };

        if (payload) {
            options.method = 'POST';
            options.body = JSON.stringify({ action: action, payload: payload });
            // Remove 'no-cors' to get actual response JSON
        }

        const response = await fetch(url, options);
        const data = await response.json();

        toggleLoader(false);

        if (data.error) throw new Error(data.error);
        return data;

    } catch (err) {
        toggleLoader(false);
        console.error(err);
        showToast('API Error: ' + err.message, 'error');
        return null;
    }
}

// --- GLOBAL STATE ---
let STUDENTS = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in
    const isLoggedIn = localStorage.getItem('erp_auth');
    if (isLoggedIn) {
        showApp();
    }
});

function handleLogin() {
    const pin = document.getElementById('password').value;
    // Simple PIN for demo (In real app, use backend auth)
    if (pin === '1234') {
        localStorage.setItem('erp_auth', 'true');
        showApp();
    } else {
        showToast('Invalid PIN', 'error');
    }
}

function showApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    if (!API_URL.includes('REPLACE_WITH')) {
        loadDashboard();
    }
}

function logout() {
    localStorage.removeItem('erp_auth');
    location.reload();
}

// --- NAVIGATION ---
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active-nav'));
    const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(el => el.getAttribute('onclick').includes(viewId));
    if (activeLink) activeLink.classList.add('active-nav');

    if (viewId === 'students-view') loadStudents();
    if (viewId === 'finance-view') loadFinance();
}

// --- DATA FETCHING ---

async function loadDashboard() {
    const stats = await fetchAPI('getDashboardStats');
    if (!stats) return;

    document.getElementById('stat-total-students').innerText = stats.totalStudents;
    document.getElementById('stat-total-collected').innerText = '₹' + stats.totalCollected.toLocaleString();
    document.getElementById('stat-pending-dues').innerText = '₹' + stats.totalPending.toLocaleString();
    document.getElementById('stat-net-cash').innerText = '₹' + stats.netCash.toLocaleString();

    // Render Charts
    renderCharts(stats);
}

let revenueChart, statusChart, classChart;

function renderCharts(stats) {
    // 1. Fee Status (Doughnut)
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Collected', 'Pending'],
            datasets: [{
                data: [stats.totalCollected, stats.totalPending],
                backgroundColor: ['#10b981', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    });

    // 2. Class Distribution (Bar) - Mock Data for Demo
    const ctxClass = document.getElementById('classChart').getContext('2d');
    if (classChart) classChart.destroy();
    classChart = new Chart(ctxClass, {
        type: 'bar',
        data: {
            labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
            datasets: [{
                label: 'Students',
                data: [15, 20, 18, 22, 10, 5, 8, 12, 14, 9],
                backgroundColor: '#4f46e5',
                borderRadius: 4
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });

    // 3. Revenue Trend (Line) - Mock Data for Demo
    const ctxRev = document.getElementById('revenueChart').getContext('2d');
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctxRev, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue',
                data: [5000, 12000, 18000, 9000, 24000, stats.totalCollected || 30000],
                borderColor: '#4f46e5',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(79, 70, 229, 0.1)'
            }]
        }
    });
}

async function loadStudents() {
    const data = await fetchAPI('getStudents');
    if (!data) return;

    STUDENTS = data;
    renderStudentTable(data);
}

function renderStudentTable(data) {
    const tbody = document.getElementById('student-table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-slate-500">No students found.</td></tr>';
        return;
    }

    data.forEach(student => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition';

        const roll = student.roll || 'N/A';
        const name = student.name || 'Unknown';
        const phone = student.phone || '';
        const sClass = student.class || '-';
        const father = student.fatherName || '-';
        const balance = Number(student.balance) || 0;

        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-slate-900">#${roll}</td>
            <td class="px-6 py-4">
               <div class="flex flex-col">
                  <span class="font-medium text-slate-800">${name}</span>
                  <span class="text-xs text-slate-400">${phone}</span>
               </div>
            </td>
            <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">${sClass}</span></td>
            <td class="px-6 py-4 text-slate-600">${father}</td>
            <td class="px-6 py-4 font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                ₹${balance.toLocaleString()}
            </td>
            <td class="px-6 py-4">
                <button class="text-indigo-600 hover:text-indigo-800 hover:underline text-sm font-medium mr-3" onclick="openStudentDetails('${roll}')">View</button>
                <button class="text-emerald-600 hover:text-emerald-800 hover:underline text-sm font-medium" onclick="openFeeModal('${roll}')">Collect</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- STUDENT DETAILS ---
let currentDetailRoll = null;

async function openStudentDetails(roll) {
    const student = STUDENTS.find(s => s.roll == roll);
    if (!student) return;

    currentDetailRoll = roll;

    // Populate Sidebar
    document.getElementById('detail-name').innerText = student.name;
    document.getElementById('detail-roll').innerText = '#' + student.roll;
    document.getElementById('detail-class').innerText = 'Class ' + student.class;
    document.getElementById('detail-father').innerText = student.fatherName;
    document.getElementById('detail-phone').innerText = student.phone;
    document.getElementById('detail-balance').innerText = '₹' + (Number(student.balance) || 0).toLocaleString();

    openModal('student-detail-modal');

    // Fetch History
    const tbody = document.getElementById('detail-history-body');
    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">Loading history...</td></tr>';

    // We need all transactions to filter for this student
    // Optimization: In real app, make an API call getStudentHistory(roll)
    // Here we will fetch all transactions and filter (since dataset is small)
    const transactions = await fetchAPI('getTransactions');

    if (!transactions) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">Failed to load</td></tr>';
        return;
    }

    const history = transactions.filter(t => t.roll == roll).sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = '';
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">No transactions found</td></tr>';
        return;
    }

    history.forEach(t => {
        const tr = document.createElement('tr');
        const dateStr = t.date ? new Date(t.date).toLocaleDateString() : '-';
        tr.innerHTML = `
            <td class="px-4 py-3 text-slate-600">${dateStr}</td>
            <td class="px-4 py-3 font-medium text-emerald-600">₹${Number(t.amountPaid || t.amount).toLocaleString()}</td>
            <td class="px-4 py-3 text-slate-500">${t.mode}</td>
            <td class="px-4 py-3">
                <button onclick="generateReceipt('${t.roll}', '${t.amountPaid || t.amount}', '${dateStr}')" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded">Print</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openFeeModalFromDetail() {
    if (currentDetailRoll) {
        closeModal('student-detail-modal');
        openFeeModal(currentDetailRoll);
    }
}

function sendReminderFromDetail() {
    const student = STUDENTS.find(s => s.roll == currentDetailRoll);
    if (student) {
        sendFeeReminder(student.phone, student.name, student.balance);
    }
}

// --- UTILS ---
function toggleLoader(show) {
    const loader = document.getElementById('top-loader');
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

// Search Filter
document.querySelector('#search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = STUDENTS.filter(s =>
        String(s.name || '').toLowerCase().includes(term) ||
        String(s.roll || '').toLowerCase().includes(term)
    );
    renderStudentTable(filtered);
});

// Class Filter
document.querySelector('#class-filter').addEventListener('change', (e) => {
    const cls = e.target.value;
    if (!cls) {
        renderStudentTable(STUDENTS);
        return;
    }
    const filtered = STUDENTS.filter(s => String(s.class) === cls);
    renderStudentTable(filtered);
});

// --- MODAL LOGIC ---

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

document.querySelector('#new-admission-btn').addEventListener('click', () => {
    document.getElementById('student-form').reset();
    openModal('student-modal');
});

function openFeeModal(roll) {
    const student = STUDENTS.find(s => s.roll == roll);
    if (!student) { showToast('Student not found!', 'error'); return; }

    document.getElementById('fee-roll').value = student.roll;
    document.getElementById('fee-student-name').innerText = student.name;
    document.getElementById('fee-balance').innerText = '₹' + (student.balance || 0);
    document.querySelector('input[name="amount"]').value = '';

    openModal('fee-modal');
}


// --- FORM HANDLING ---

// Save Student
document.getElementById('student-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    const formData = new FormData(this);
    const data = {};
    formData.forEach((value, key) => data[key] = value);

    const result = await fetchAPI('saveStudent', data);

    btn.innerText = originalText;
    btn.disabled = false;

    if (result && result.success) {
        showToast('Student saved successfully!', 'success');
        closeModal('student-modal');
        loadStudents();
        loadDashboard();
    }
});

// Collect Fee
document.getElementById('fee-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Processing...';
    btn.disabled = true;

    const formData = new FormData(this);
    const data = {};
    formData.forEach((value, key) => data[key] = value);

    const student = STUDENTS.find(s => s.Roll == data.Roll);
    data.Name = student.Name;
    data.Class = student.Class;

    const result = await fetchAPI('collectFee', data);

    btn.innerText = originalText;
    btn.disabled = false;

    if (result && result.success) {
        showToast('Fee collected successfully!', 'success');
        closeModal('fee-modal');
        loadStudents();
        loadDashboard();

        // WhatsApp
        if (student.phone) {
            const newBal = (Number(student.balance) || 0) - Number(data.amount);
            // Optional: Auto-remind or ask
            // sendFeeReminder(student.phone, student.name, newBal);
        }
    }
});


// WhatsApp Utils
function createWhatsAppLink(phone, studentName, dueAmount) {
    if (!phone) return '#';
    let cleanPhone = phone.toString().replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    const message = `Dear Parent, This is a reminder that the fee balance for ${studentName} is Rs. ${dueAmount}. Please pay at the earliest.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}


function sendFeeReminder(phone, name, due) {
    const url = createWhatsAppLink(phone, name, due);
    window.open(url, '_blank');
}

function generateReceipt(roll, amount, date) {
    const student = STUDENTS.find(s => s.roll == roll);
    const name = student ? student.name : 'Unknown';
    const sClass = student ? student.class : '-';
    const receiptNo = 'REC-' + Math.floor(Math.random() * 10000); // Mock receipt no

    const receiptHTML = `
        <html>
        <head>
            <title>Fee Receipt - ${receiptNo}</title>
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                .school-name { font-size: 24px; font-weight: bold; color: #4f46e5; }
                .meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .content { margin-bottom: 30px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 5px; }
                .total { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; color: #4f46e5; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
                .btn { display: block; margin: 20px auto; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; width: fit-content; }
                @media print { .btn { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="school-name">School ERP</div>
                <div>Excellence in Education</div>
            </div>
            
            <div class="meta">
                <div>
                    <strong>Receipt No:</strong> ${receiptNo}<br>
                    <strong>Date:</strong> ${date}
                </div>
                <div style="text-align: right;">
                    <strong>Student:</strong> ${name}<br>
                    <strong>Roll No:</strong> #${roll} | <strong>Class:</strong> ${sClass}
                </div>
            </div>

            <div class="content">
                <div class="row">
                    <span>Fee Payment</span>
                    <span>₹${Number(amount).toLocaleString()}</span>
                </div>
            </div>

            <div class="total">
                Total Paid: ₹${Number(amount).toLocaleString()}
            </div>

            <div class="footer">
                <p>This is a computer-generated receipt.</p>
                <p>Thank you for your payment!</p>
            </div>

            <a href="#" onclick="window.print()" class="btn">Print Receipt</a>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(receiptHTML);
    win.document.close();
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }

    // Create toast
    const toast = document.createElement('div');
    const colorClass = type === 'success' ? 'bg-emerald-600' : 'bg-red-600';
    const icon = type === 'success' ? 'check_circle' : 'error_outline';

    toast.className = `p-4 rounded-lg shadow-lg flex items-center gap-3 text-white transform transition-all duration-300 translate-y-2 opacity-0 min-w-[300px] pointer-events-auto \${colorClass}`;

    toast.innerHTML = `
        <span class="material-icons-outlined text-xl">\${icon}</span>
        <span class="font-medium text-sm flex-1">\${message}</span>
        <button onclick="this.parentElement.remove()" class="text-white/80 hover:text-white transition-colors">
            <span class="material-icons-outlined text-sm">close</span>
        </button>
    `;

    container.appendChild(toast);

    // Animate in (next frame)
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    });

    // Auto dismiss
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- EDIT STUDENT ---
function editStudent(roll) {
    const student = STUDENTS.find(s => s.roll == roll);
    if (!student) return;

    const form = document.getElementById('student-form');
    if (!form) return;

    // Fill basic fields using normalized keys
    // Assuming form inputs still use TitleCase names like name="Roll"
    // We update values from lowercase API data
    const setVal = (name, val) => {
        const input = form.querySelector(`[name="\${name}"]`);
        if (input) input.value = val || '';
    };

    setVal('Roll', student.roll);
    setVal('Class', student.class);
    setVal('Name', student.name);
    setVal('FatherName', student.fatherName);
    setVal('Phone', student.phone);

    // Fees
    setVal('TuitionFee', student.tuitionFee || 0);
    setVal('VanFee', student.vanFee || 0);
    setVal('OtherFee', student.otherFee || 0);
    setVal('PrevBalance', student.prevBalance || 0);

    const title = document.getElementById('modal-title');
    if (title) title.innerText = 'Edit Student';

    openModal('student-modal');
}

// --- FINANCE VIEW ---
async function loadFinance() {
    toggleLoader(true);
    const transactions = await fetchAPI('getTransactions');
    toggleLoader(false);

    if (!transactions) return;

    const tbody = document.getElementById('finance-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-slate-500">No transactions found.</td></tr>';
        return;
    }

    // Sort by Date Descending
    // Make sure we parse dates correctly
    try {
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (e) { console.warn('Sort error', e); }

    transactions.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition';

        let dateStr = '-';
        try {
            if (t.date) dateStr = new Date(t.date).toLocaleDateString();
        } catch (e) { }

        // Handle normalized keys
        // Backend returns: date, roll, name, class, amount, mode, remarks
        // OR amountPaid depending on how we normalized. check getTransactions in backend.
        // It returns data from 'Transactions' sheet.
        // In getData, 'Amount Paid' -> 'amountPaid'. 
        // In collectFee, we append keys: roll, name, class, amount, mode. 
        // Since we write via appendRow, the READ simply normalizes headers.

        // Wait, getTransactions uses getData('Transactions').
        // Headers there are: Date, Roll No, Student Name, Class, Amount Paid, Payment Mode, Remarks.
        // Normalized: date, roll, name, class, amountPaid, mode, remarks.

        const amount = Number(t.amountPaid || t.amount || 0).toLocaleString();

        tr.innerHTML = `
            <td class="px-6 py-4 text-slate-500 text-xs">\${dateStr}</td>
            <td class="px-6 py-4 font-medium text-slate-900">#\${t.roll || '-'}</td>
            <td class="px-6 py-4 text-slate-800">\${t.name || t.studentName || '-'}</td>
            <td class="px-6 py-4 text-slate-600">\${t.class || '-'}</td>
            <td class="px-6 py-4 font-bold text-emerald-600">₹\${amount}</td>
            <td class="px-6 py-4 text-xs text-slate-500">\${t.mode || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

