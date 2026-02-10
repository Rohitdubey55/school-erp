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
        alert('API Error: ' + err.message);
        return null;
    }
}

// --- GLOBAL STATE ---
let STUDENTS = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // If API URL is set, load dashboard
    if (!API_URL.includes('REPLACE_WITH')) {
        loadDashboard();
    }
});

// --- NAVIGATION ---
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active-nav'));
    const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(el => el.getAttribute('onclick').includes(viewId));
    if (activeLink) activeLink.classList.add('active-nav');

    if (viewId === 'students-view') loadStudents();
}

// --- DATA FETCHING ---

async function loadDashboard() {
    const stats = await fetchAPI('getDashboardStats');
    if (!stats) return;

    document.getElementById('stat-total-students').innerText = stats.totalStudents;
    document.getElementById('stat-total-collected').innerText = '₹' + stats.totalCollected.toLocaleString();
    document.getElementById('stat-pending-dues').innerText = '₹' + stats.totalPending.toLocaleString();
    document.getElementById('stat-net-cash').innerText = '₹' + stats.netCash.toLocaleString();
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

        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-slate-900">#${student.Roll || ''}</td>
            <td class="px-6 py-4">
               <div class="flex flex-col">
                  <span class="font-medium text-slate-800">${student.Name}</span>
                  <span class="text-xs text-slate-400">${student['Phone Number'] || ''}</span>
               </div>
            </td>
            <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">${student.Class}</span></td>
            <td class="px-6 py-4 text-slate-600">${student['Father Name']}</td>
            <td class="px-6 py-4 font-bold ${student.Balance > 0 ? 'text-red-600' : 'text-emerald-600'}">
                ₹${(student.Balance || 0).toLocaleString()}
            </td>
            <td class="px-6 py-4">
                <button class="text-indigo-600 hover:text-indigo-800 hover:underline text-sm font-medium mr-3">Edit</button>
                <button class="text-emerald-600 hover:text-emerald-800 hover:underline text-sm font-medium" onclick="openFeeModal('${student.Roll}')">Collect Fee</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
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
        String(s.Name).toLowerCase().includes(term) ||
        String(s.Roll).toLowerCase().includes(term)
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
    const filtered = STUDENTS.filter(s => String(s.Class) === cls);
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
    const student = STUDENTS.find(s => s.Roll == roll);
    if (!student) { alert('Student not found!'); return; }

    document.getElementById('fee-roll').value = student.Roll;
    document.getElementById('fee-student-name').innerText = student.Name;
    document.getElementById('fee-balance').innerText = '₹' + (student.Balance || 0);
    document.querySelector('input[name="Amount"]').value = '';

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
        closeModal('fee-modal');
        loadStudents();
        loadDashboard();

        // WhatsApp
        if (student['Phone Number']) {
            const newBal = (Number(student.Balance) || 0) - Number(data.Amount);
            if (confirm('Fee Collected. Send WhatsApp receipt/reminder?')) {
                sendFeeReminder(student['Phone Number'], student.Name, newBal);
            }
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
