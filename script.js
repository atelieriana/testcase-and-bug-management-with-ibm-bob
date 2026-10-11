/* =============================================================
   TC & Bug Tracking Manager — script.js
   Vanilla JS SPA — no frameworks
   ============================================================= */

'use strict';

/* ===============================================================
   0. AUTH STATE
=============================================================== */
const DEMO_USER = { email: 'qa@company.com', password: 'password123' };

// Persisted session (auth token)
let currentUser = JSON.parse(localStorage.getItem('tcbug_user') || 'null');

// Profile is stored SEPARATELY so it survives logout/re-login
// tcbug_profile: { name, email, password }
function loadProfile() {
  return JSON.parse(localStorage.getItem('tcbug_profile') || 'null');
}
function saveProfile(profile) {
  localStorage.setItem('tcbug_profile', JSON.stringify(profile));
}

/* ===============================================================
   1. DATA STORE
=============================================================== */
let store = {
  testCases: [
    { id:'TC-001', title:'User Login with Valid Credentials',  module:'Authentication', status:'Pass',    priority:'High',   assignee:'Ibnu',   createdAt:'2024-06-01', description:'Verify that a user can log in using a valid email and password.' },
    { id:'TC-002', title:'User Login with Invalid Password',   module:'Authentication', status:'Fail',    priority:'High',   assignee:'Ibnu',   createdAt:'2024-06-01', description:'Verify that an error message is shown for invalid password.' },
    { id:'TC-003', title:'Add Product to Cart',                module:'Cart',           status:'Pass',    priority:'Medium', assignee:'Nuril',  createdAt:'2024-06-03', description:'Verify that a product can be successfully added to the cart.' },
    { id:'TC-004', title:'Checkout with Credit Card',          module:'Payment',        status:'Pending', priority:'High',   assignee:'Aleena', createdAt:'2024-06-04', description:'Verify the end-to-end checkout flow with a credit card payment.' },
    { id:'TC-005', title:'Password Reset via Email',           module:'Authentication', status:'Pass',    priority:'Medium', assignee:'Ibnu',   createdAt:'2024-06-05', description:'Verify that the user receives a reset link and can change the password.' },
    { id:'TC-006', title:'Search Product by Name',             module:'Search',         status:'Blocked', priority:'Low',    assignee:'Nuril',  createdAt:'2024-06-06', description:'Verify that searching by exact product name returns correct results.' },
    { id:'TC-007', title:'Filter Products by Category',        module:'Search',         status:'Pass',    priority:'Medium', assignee:'Aleena', createdAt:'2024-06-07', description:'Verify product filtering by category on the listing page.' },
    { id:'TC-008', title:'Remove Item from Cart',              module:'Cart',           status:'Fail',    priority:'Medium', assignee:'Nuril',  createdAt:'2024-06-08', description:'Verify that items can be removed from the cart correctly.' },
  ],
  bugs: [
    { id:'BUG-001', title:'Login button unresponsive on Safari',   module:'Authentication', status:'Open',        priority:'Critical', assignee:'Ibnu',   relatedTestCase:'TC-001', createdAt:'2024-06-02', description:'The login submit button does not respond to click events in Safari 17.' },
    { id:'BUG-002', title:'Cart total not updated after removal',   module:'Cart',           status:'In Progress', priority:'High',     assignee:'Nuril',  relatedTestCase:'TC-008', createdAt:'2024-06-09', description:'After removing an item the cart total still shows the old amount until page reload.' },
    { id:'BUG-003', title:'Reset email sent to wrong address',      module:'Authentication', status:'Resolved',    priority:'High',     assignee:'Ibnu',   relatedTestCase:'TC-005', createdAt:'2024-06-06', description:'Under certain conditions the password reset email is sent to the old email address.' },
    { id:'BUG-004', title:'Search returns 500 on special chars',    module:'Search',         status:'Open',        priority:'Medium',   assignee:'Aleena', relatedTestCase:'TC-006', createdAt:'2024-06-07', description:'Searching with special characters like & or # causes a 500 internal server error.' },
    { id:'BUG-005', title:'Payment form loses data on back nav',    module:'Payment',        status:'In Progress', priority:'High',     assignee:'Aleena', relatedTestCase:'TC-004', createdAt:'2024-06-05', description:'All form data is lost when the user navigates back from the confirmation step.' },
    { id:'BUG-006', title:'Category filter resets on page scroll',  module:'Search',         status:'Closed',      priority:'Low',      assignee:'Nuril',  relatedTestCase:'TC-007', createdAt:'2024-06-08', description:'The selected category filter is cleared when the user scrolls down on mobile.' },
  ],
};

let tcIdCounter  = store.testCases.length + 1;
let bugIdCounter = store.bugs.length + 1;

/* ===============================================================
   2. UTILITIES
=============================================================== */
function genTcId()  { return `TC-${String(tcIdCounter++).padStart(3,'0')}`; }
function genBugId() { return `BUG-${String(bugIdCounter++).padStart(3,'0')}`; }

function today() { return new Date().toISOString().slice(0,10); }

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ===============================================================
   2b. ASSIGNEES
=============================================================== */
const ASSIGNEES = ['Ibnu', 'Nuril', 'Aleena'];

// Colour palette per assignee for avatar chips
const ASSIGNEE_COLOR = {
  Ibnu:   { bg: '#dbeafe', text: '#1d4ed8' },
  Nuril:  { bg: '#fce7f3', text: '#9d174d' },
  Aleena: { bg: '#d1fae5', text: '#065f46' },
};

function assigneeChip(name) {
  const c = ASSIGNEE_COLOR[name] || { bg: '#f3f4f6', text: '#374151' };
  const initials = (name || '?').slice(0, 2).toUpperCase();
  return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold" style="background:${c.bg};color:${c.text};">
    <span class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style="background:${c.text};color:#fff;">${initials}</span>
    ${escHtml(name || '—')}
  </span>`;
}

function assigneeSelect(currentVal) {
  return `<select id="f-assignee" class="form-select">
    <option value="">— Select assignee —</option>
    ${ASSIGNEES.map(a => `<option value="${a}" ${currentVal === a ? 'selected' : ''}>${a}</option>`).join('')}
  </select>`;
}

/* ===============================================================
   3. BADGE HELPERS
=============================================================== */
const statusClassTC  = { Pass:'badge-pass', Fail:'badge-fail', Pending:'badge-pending', Blocked:'badge-blocked' };
const statusClassBug = { Open:'badge-open', 'In Progress':'badge-in-progress', Resolved:'badge-resolved', Closed:'badge-closed' };
const priorityClass  = { Critical:'badge-critical', High:'badge-high', Medium:'badge-medium', Low:'badge-low' };

function statusBadge(status, type='tc') {
  const cls = type === 'tc' ? (statusClassTC[status]||'') : (statusClassBug[status]||'');
  return `<span class="badge ${cls}">${escHtml(status)}</span>`;
}

function priorityBadge(p) {
  return `<span class="badge ${priorityClass[p]||''}">${escHtml(p)}</span>`;
}

/* ===============================================================
   4. TOAST
=============================================================== */
function showToast(msg, type='success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ===============================================================
   5. MODAL ENGINE
=============================================================== */
const $modalOverlay = document.getElementById('modal-overlay');
const $modalTitle   = document.getElementById('modal-title');
const $modalBody    = document.getElementById('modal-body');
const $modalFooter  = document.getElementById('modal-footer');

function openModal({ title, body, footer, wide = false }) {
  $modalTitle.textContent = title;
  $modalBody.innerHTML    = body;
  $modalFooter.innerHTML  = footer || '';
  const box = document.getElementById('modal-box');
  box.style.maxWidth = wide ? '640px' : '512px';
  $modalOverlay.classList.remove('hidden');
}

function closeModal() { $modalOverlay.classList.add('hidden'); }

document.getElementById('modal-close').addEventListener('click', closeModal);
$modalOverlay.addEventListener('click', e => { if (e.target === $modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ===============================================================
   6. SIDEBAR TOGGLE
=============================================================== */
let sidebarCollapsed = false;

function initSidebarToggle() {
  const btn     = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const iconOpen   = document.getElementById('toggle-icon-open');
  const iconClosed = document.getElementById('toggle-icon-closed');

  btn.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    iconOpen.classList.toggle('hidden', sidebarCollapsed);
    iconClosed.classList.toggle('hidden', !sidebarCollapsed);
  });
}

/* ===============================================================
   7. DARK / LIGHT MODE
=============================================================== */
function initThemeToggle() {
  const btn      = document.getElementById('theme-toggle');
  const iconMoon = document.getElementById('icon-moon');
  const iconSun  = document.getElementById('icon-sun');
  const html     = document.documentElement;

  // Restore saved preference
  const saved = localStorage.getItem('tcbug_theme');
  if (saved === 'dark') applyDark();

  btn.addEventListener('click', () => {
    if (html.classList.contains('dark')) {
      applyLight();
      localStorage.setItem('tcbug_theme', 'light');
    } else {
      applyDark();
      localStorage.setItem('tcbug_theme', 'dark');
    }
  });

  function applyDark() {
    html.classList.add('dark');
    iconMoon.classList.add('hidden');
    iconSun.classList.remove('hidden');
  }

  function applyLight() {
    html.classList.remove('dark');
    iconSun.classList.add('hidden');
    iconMoon.classList.remove('hidden');
  }
}

/* ===============================================================
   8. AUTH  (Login / Logout)
=============================================================== */
function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.remove('flex');
  document.getElementById('app-shell').classList.add('hidden');
  // clear fields
  document.getElementById('login-email').value    = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
}

function showAppShell() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('flex');
  updateProfileLabels();
}

function updateProfileLabels() {
  // Always read from the persisted profile store — not from the session object
  const profile = loadProfile();
  const name  = profile?.name  || 'QA Engineer';
  const email = profile?.email || 'qa@company.com';
  const avatar = document.getElementById('profile-avatar');
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'QA';
  avatar.textContent = initials;
  document.getElementById('profile-name-label').textContent  = name;
  document.getElementById('profile-email-label').textContent = email;
}

function initAuth() {
  // Login button
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  // Logout button
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Profile avatar → settings
  document.getElementById('profile-avatar').addEventListener('click', openProfileSettings);

  // Initial state
  if (currentUser) {
    showAppShell();
    navigateTo('dashboard');
  } else {
    showLoginScreen();
  }
}

function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');

  if (!email || !password) {
    errEl.textContent = 'Please enter email and password.';
    errEl.classList.remove('hidden');
    return;
  }

  // Load persisted profile to check custom password
  const savedProfile = loadProfile();
  const validPassword = savedProfile?.password || DEMO_USER.password;
  const validEmail    = savedProfile?.email    || DEMO_USER.email;

  if (email === validEmail && password === validPassword) {
    errEl.classList.add('hidden');
    // Session only stores a flag — profile lives in tcbug_profile
    currentUser = { loggedIn: true };
    localStorage.setItem('tcbug_user', JSON.stringify(currentUser));
    // Initialise profile store on first ever login
    if (!savedProfile) {
      saveProfile({ name: 'QA Engineer', email: email, password: password });
    }
    showAppShell();
    navigateTo('dashboard');
    const displayName = loadProfile()?.name || 'QA Engineer';
    showToast('Welcome back, ' + displayName + '!');
  } else {
    errEl.textContent = 'Invalid email or password.';
    errEl.classList.remove('hidden');
    document.getElementById('login-password').value = '';
  }
}

function handleLogout() {
  openModal({
    title: 'Sign Out',
    body: `
      <div class="text-center py-4">
        <div class="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </div>
        <p class="text-gray-700 text-sm">Are you sure you want to sign out?</p>
        <p class="text-xs text-gray-400 mt-1">You will need to sign in again to continue.</p>
      </div>
    `,
    footer: `
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
      <button onclick="confirmLogout()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Sign Out</button>
    `,
  });
}

function confirmLogout() {
  currentUser = null;
  localStorage.removeItem('tcbug_user');
  // NOTE: tcbug_profile is intentionally NOT removed — profile persists across sessions
  closeModal();
  showLoginScreen();
  showToast('Signed out successfully.', 'info');
}

/* ===============================================================
   9. PROFILE SETTINGS MODAL
=============================================================== */
function openProfileSettings() {
  // Always read from persistent profile store
  const p = loadProfile() || {};
  const name  = p.name  || 'QA Engineer';
  const email = p.email || 'qa@company.com';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'QA';

  openModal({
    title: 'Profile Settings',
    body: `
      <div class="space-y-5">
        <!-- Avatar preview -->
        <div class="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div id="settings-avatar" class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
            ${escHtml(initials)}
          </div>
          <div>
            <p id="settings-avatar-name" class="font-semibold text-gray-900">${escHtml(name)}</p>
            <p class="text-xs text-gray-500">${escHtml(email)}</p>
          </div>
        </div>

        <!-- Name -->
        <div>
          <label class="form-label">Full Name</label>
          <input id="ps-name" type="text" class="form-input" value="${escHtml(name)}" placeholder="Your full name" oninput="previewAvatar(this.value)" />
        </div>

        <!-- Email -->
        <div>
          <label class="form-label">Email Address</label>
          <input id="ps-email" type="email" class="form-input" value="${escHtml(email)}" placeholder="your@email.com" />
        </div>

        <!-- Divider -->
        <div class="pt-2 border-t border-gray-100">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Change Password</p>
          <div class="space-y-3">
            <div>
              <label class="form-label">Current Password</label>
              <input id="ps-current-pw" type="password" class="form-input" placeholder="Enter current password" />
            </div>
            <div>
              <label class="form-label">New Password</label>
              <input id="ps-new-pw" type="password" class="form-input" placeholder="Minimum 8 characters" oninput="updateStrength(this.value)" />
              <!-- Strength bar -->
              <div class="mt-2 flex gap-1">
                <div id="s-bar-1" class="strength-bar flex-1 bg-gray-200"></div>
                <div id="s-bar-2" class="strength-bar flex-1 bg-gray-200"></div>
                <div id="s-bar-3" class="strength-bar flex-1 bg-gray-200"></div>
                <div id="s-bar-4" class="strength-bar flex-1 bg-gray-200"></div>
              </div>
              <p id="s-label" class="text-xs text-gray-400 mt-1"></p>
            </div>
            <div>
              <label class="form-label">Confirm New Password</label>
              <input id="ps-confirm-pw" type="password" class="form-input" placeholder="Repeat new password" />
            </div>
          </div>
        </div>
      </div>
    `,
    footer: `
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
      <button onclick="saveProfileSettings()" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
    `,
  });
}

// Live avatar preview while typing name
function previewAvatar(name) {
  const initials = (name||'QA').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'QA';
  const el = document.getElementById('settings-avatar');
  const nameEl = document.getElementById('settings-avatar-name');
  if (el) el.textContent = initials;
  if (nameEl) nameEl.textContent = name || 'QA Engineer';
}

// Password strength indicator
function updateStrength(pw) {
  let score = 0;
  if (pw.length >= 8)              score++;
  if (/[A-Z]/.test(pw))            score++;
  if (/[0-9]/.test(pw))            score++;
  if (/[^A-Za-z0-9]/.test(pw))     score++;

  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#16a34a'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById(`s-bar-${i}`);
    if (bar) bar.style.background = i <= score ? colors[score] : '#e5e7eb';
  }
  const lbl = document.getElementById('s-label');
  if (lbl) {
    lbl.textContent = pw.length > 0 ? labels[score] : '';
    lbl.style.color = colors[score] || '#9ca3af';
  }
}

function saveProfileSettings() {
  const name      = document.getElementById('ps-name').value.trim();
  const email     = document.getElementById('ps-email').value.trim();
  const currentPw = document.getElementById('ps-current-pw').value;
  const newPw     = document.getElementById('ps-new-pw').value;
  const confirmPw = document.getElementById('ps-confirm-pw').value;

  if (!name)  { showToast('Name cannot be empty.', 'error'); return; }
  if (!email) { showToast('Email cannot be empty.', 'error'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Please enter a valid email.', 'error'); return; }

  // Load current persisted profile to get current password
  const existingProfile = loadProfile() || {};
  let updatedPassword = existingProfile.password || DEMO_USER.password;

  // Password change is optional — only validate if user filled anything
  if (currentPw || newPw || confirmPw) {
    if (currentPw !== updatedPassword) {
      showToast('Current password is incorrect.', 'error'); return;
    }
    if (newPw.length < 8) { showToast('New password must be at least 8 characters.', 'error'); return; }
    if (newPw !== confirmPw) { showToast('New passwords do not match.', 'error'); return; }
    updatedPassword = newPw;
  }

  // Save EVERYTHING to the separate persistent profile store
  saveProfile({ name, email, password: updatedPassword });
  updateProfileLabels();
  closeModal();
  showToast('Profile updated successfully.');
}

/* ===============================================================
   10. ROUTER / VIEW SWITCHER
=============================================================== */
const views = {
  dashboard : renderDashboard,
  testcases : renderTestCases,
  bugs      : renderBugs,
  reports   : renderReports,
};

const viewMeta = {
  dashboard : { title:'Dashboard',   subtitle:'Overview of your testing activities' },
  testcases : { title:'Test Cases',  subtitle:'Manage and track all test cases' },
  bugs      : { title:'Bug Tracker', subtitle:'Track and manage reported bugs' },
  reports   : { title:'Reports',     subtitle:'Summary and statistics of QA activities' },
};

let currentView = 'dashboard';

function navigateTo(view) {
  if (!views[view]) return;
  currentView = view;

  const meta = viewMeta[view];
  document.getElementById('page-title').textContent    = meta.title;
  document.getElementById('page-subtitle').textContent = meta.subtitle;

  const actionBtn   = document.getElementById('header-action-btn');
  const actionLabel = document.getElementById('header-action-label');
  if (view === 'testcases') {
    actionBtn.classList.remove('hidden');
    actionLabel.textContent = 'Add Test Case';
    actionBtn.onclick = () => openAddTestCaseModal();
  } else if (view === 'bugs') {
    actionBtn.classList.remove('hidden');
    actionLabel.textContent = 'Add Bug';
    actionBtn.onclick = () => openAddBugModal();
  } else {
    actionBtn.classList.add('hidden');
  }

  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.view === view);
  });

  document.getElementById('view-container').innerHTML = '';
  views[view]();
}

// Sidebar nav clicks
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(link.dataset.view);
  });
});

/* ===============================================================
   11. DASHBOARD VIEW
=============================================================== */

// Dashboard date-range filter state (persists while staying on dashboard)
let dashFilter = { from: '', to: '' };

function renderDashboard() {
  // Derive default date range: earliest createdAt to today
  const allDates = [
    ...store.testCases.map(t => t.createdAt),
    ...store.bugs.map(b => b.createdAt),
  ].sort();
  const defaultFrom = allDates[0] || today();
  const defaultTo   = today();

  if (!dashFilter.from) dashFilter.from = defaultFrom;
  if (!dashFilter.to)   dashFilter.to   = defaultTo;

  document.getElementById('view-container').innerHTML = `
    <!-- Date range filter bar -->
    <div class="bg-white border border-gray-200 rounded-xl px-5 py-3 mb-5 flex flex-wrap items-center gap-4">
      <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <span class="text-sm font-medium text-gray-600">Date Range:</span>
      <div class="flex items-center gap-2">
        <input id="dash-from" type="date" class="form-input text-sm py-1.5" value="${dashFilter.from}" max="${today()}" />
        <span class="text-gray-400 text-sm">–</span>
        <input id="dash-to"   type="date" class="form-input text-sm py-1.5" value="${dashFilter.to}"   max="${today()}" min="${dashFilter.from}" />
      </div>
      <button onclick="applyDashFilter()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">Apply</button>
      <button onclick="resetDashFilter()" class="px-3 py-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-colors">Reset</button>
      <span id="dash-range-label" class="ml-auto text-xs text-gray-400"></span>
    </div>

    <!-- Stat cards (always full dataset — shows global context) -->
    <div id="dash-stat-cards" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5"></div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
      <!-- TC Status Pie -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900 text-sm">Test Case Status</h3>
          <span id="tc-chart-subtitle" class="text-xs text-gray-400"></span>
        </div>
        <div id="tc-pie-wrap" class="flex items-center justify-center gap-8 min-h-[170px]"></div>
      </div>
      <!-- Bug Status Pie -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900 text-sm">Bug Status</h3>
          <span id="bug-chart-subtitle" class="text-xs text-gray-400"></span>
        </div>
        <div id="bug-pie-wrap" class="flex items-center justify-center gap-8 min-h-[170px]"></div>
      </div>
    </div>

    <!-- Recent lists row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900 text-sm">Recent Test Cases</h3>
          <button class="text-xs text-blue-600 font-medium hover:underline" onclick="navigateTo('testcases')">View all →</button>
        </div>
        <div id="recent-tc-list" class="divide-y divide-gray-50"></div>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900 text-sm">Recent Bugs</h3>
          <button class="text-xs text-blue-600 font-medium hover:underline" onclick="navigateTo('bugs')">View all →</button>
        </div>
        <div id="recent-bug-list" class="divide-y divide-gray-50"></div>
      </div>
    </div>
  `;

  // Wire date inputs → live update on change too
  document.getElementById('dash-from').addEventListener('change', applyDashFilter);
  document.getElementById('dash-to').addEventListener('change',   applyDashFilter);

  renderDashboardData();
}

function applyDashFilter() {
  const from = document.getElementById('dash-from')?.value;
  const to   = document.getElementById('dash-to')?.value;
  if (from) dashFilter.from = from;
  if (to)   dashFilter.to   = to;
  renderDashboardData();
}

function resetDashFilter() {
  dashFilter = { from: '', to: '' };
  // Re-render whole dashboard to reset inputs
  renderDashboard();
}

function renderDashboardData() {
  const from = dashFilter.from;
  const to   = dashFilter.to;

  // Filter by date range
  const filteredTC   = store.testCases.filter(t => (!from || t.createdAt >= from) && (!to || t.createdAt <= to));
  const filteredBugs = store.bugs.filter(b =>      (!from || b.createdAt >= from) && (!to || b.createdAt <= to));

  // Stat cards use filtered data
  const pass   = filteredTC.filter(t => t.status === 'Pass').length;
  const fail   = filteredTC.filter(t => t.status === 'Fail').length;
  const open   = filteredBugs.filter(b => b.status === 'Open').length;
  const inProg = filteredBugs.filter(b => b.status === 'In Progress').length;

  const cardsEl = document.getElementById('dash-stat-cards');
  if (cardsEl) {
    cardsEl.innerHTML = `
      ${statCard('Total Test Cases', filteredTC.length,  '#3b82f6', iconClipboard())}
      ${statCard('Passed',           pass,               '#16a34a', iconCheck())}
      ${statCard('Failed',           fail,               '#dc2626', iconXCircle())}
      ${statCard('Open Bugs',        open + inProg,      '#f59e0b', iconBug())}
    `;
  }

  // Range label
  const rangeLabel = document.getElementById('dash-range-label');
  if (rangeLabel) {
    const total = filteredTC.length + filteredBugs.length;
    rangeLabel.textContent = `${total} record${total !== 1 ? 's' : ''} in range`;
  }

  // Subtitles
  const tcSub  = document.getElementById('tc-chart-subtitle');
  const bugSub = document.getElementById('bug-chart-subtitle');
  if (tcSub)  tcSub.textContent  = `${filteredTC.length} test case${filteredTC.length !== 1 ? 's' : ''}`;
  if (bugSub) bugSub.textContent = `${filteredBugs.length} bug${filteredBugs.length !== 1 ? 's' : ''}`;

  // Pie charts
  const tcSlices = [
    { label: 'Pass',    value: filteredTC.filter(t => t.status === 'Pass').length,    color: '#16a34a' },
    { label: 'Fail',    value: filteredTC.filter(t => t.status === 'Fail').length,    color: '#dc2626' },
    { label: 'Pending', value: filteredTC.filter(t => t.status === 'Pending').length, color: '#eab308' },
    { label: 'Blocked', value: filteredTC.filter(t => t.status === 'Blocked').length, color: '#9333ea' },
  ];

  const bugSlices = [
    { label: 'Open',        value: filteredBugs.filter(b => b.status === 'Open').length,        color: '#dc2626' },
    { label: 'In Progress', value: filteredBugs.filter(b => b.status === 'In Progress').length, color: '#f59e0b' },
    { label: 'Resolved',    value: filteredBugs.filter(b => b.status === 'Resolved').length,    color: '#16a34a' },
    { label: 'Closed',      value: filteredBugs.filter(b => b.status === 'Closed').length,      color: '#6b7280' },
  ];

  const tcWrap  = document.getElementById('tc-pie-wrap');
  const bugWrap = document.getElementById('bug-pie-wrap');
  if (tcWrap)  tcWrap.innerHTML  = buildPieChart(tcSlices,  filteredTC.length);
  if (bugWrap) bugWrap.innerHTML = buildPieChart(bugSlices, filteredBugs.length);

  // Recent lists
  const recentTC   = [...filteredTC].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const recentBugs = [...filteredBugs].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const tcList = document.getElementById('recent-tc-list');
  if (tcList) {
    tcList.innerHTML = recentTC.length
      ? recentTC.map(t => {
          const summary = t.description ? t.description.slice(0, 80) + (t.description.length > 80 ? '…' : '') : '';
          return `
          <div class="px-5 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
            <!-- Row 1: title + status badge -->
            <div class="flex items-start justify-between gap-3">
              <p class="text-sm font-medium text-gray-800 leading-snug flex-1 min-w-0">${escHtml(t.title)}</p>
              ${statusBadge(t.status,'tc')}
            </div>
            <!-- Row 2: summary -->
            ${summary ? `<p class="text-xs text-gray-500 mt-1 leading-relaxed">${escHtml(summary)}</p>` : ''}
            <!-- Row 3: meta -->
            <div class="flex items-center gap-3 mt-2 flex-wrap">
              ${assigneeChip(t.assignee)}
              <span class="text-xs text-gray-400">${escHtml(t.module)}</span>
              <span class="text-xs text-gray-400">·</span>
              <span class="text-xs text-gray-400">${formatDate(t.createdAt)}</span>
              ${priorityBadge(t.priority)}
            </div>
          </div>`;
        }).join('')
      : `<p class="text-sm text-gray-400 text-center py-8">No test cases in this range.</p>`;
  }

  const bugList = document.getElementById('recent-bug-list');
  if (bugList) {
    bugList.innerHTML = recentBugs.length
      ? recentBugs.map(b => {
          const summary = b.description ? b.description.slice(0, 80) + (b.description.length > 80 ? '…' : '') : '';
          return `
          <div class="px-5 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
            <!-- Row 1: title + status badge -->
            <div class="flex items-start justify-between gap-3">
              <p class="text-sm font-medium text-gray-800 leading-snug flex-1 min-w-0">${escHtml(b.title)}</p>
              ${statusBadge(b.status,'bug')}
            </div>
            <!-- Row 2: summary -->
            ${summary ? `<p class="text-xs text-gray-500 mt-1 leading-relaxed">${escHtml(summary)}</p>` : ''}
            <!-- Row 3: meta -->
            <div class="flex items-center gap-3 mt-2 flex-wrap">
              ${assigneeChip(b.assignee)}
              <span class="text-xs text-gray-400">${escHtml(b.module)}</span>
              <span class="text-xs text-gray-400">·</span>
              <span class="text-xs text-gray-400">${formatDate(b.createdAt)}</span>
              ${priorityBadge(b.priority)}
            </div>
          </div>`;
        }).join('')
      : `<p class="text-sm text-gray-400 text-center py-8">No bugs in this range.</p>`;
  }
}

/* ---------------------------------------------------------------
   PIE CHART BUILDER (pure SVG, no external library)
--------------------------------------------------------------- */
function buildPieChart(slices, total) {
  const SIZE    = 160;
  const CX      = SIZE / 2;
  const CY      = SIZE / 2;
  const R       = 62;
  const R_INNER = 38;

  // Legend is always shown
  const legend = `
    <div class="flex flex-col gap-2">
      ${slices.map(s => `
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full shrink-0" style="background:${s.color};opacity:${s.value===0?0.3:0.9};"></span>
          <span class="text-xs text-gray-600 w-20">${escHtml(s.label)}</span>
          <span class="text-xs font-semibold text-gray-900 w-6 text-right">${s.value}</span>
          <span class="text-xs text-gray-400">${total > 0 ? Math.round((s.value/total)*100) : 0}%</span>
        </div>
      `).join('')}
    </div>`;

  // Empty state
  if (total === 0) {
    const emptySvg = `
      <svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#e5e7eb" stroke-width="${R - R_INNER}"/>
        <text x="${CX}" y="${CY - 6}" text-anchor="middle" font-size="13" fill="#9ca3af">—</text>
        <text x="${CX}" y="${CY + 12}" text-anchor="middle" font-size="9" fill="#9ca3af">NO DATA</text>
      </svg>`;
    return emptySvg + legend;
  }

  const activeSlices = slices.filter(s => s.value > 0);
  const toRad = deg => (deg * Math.PI) / 180;

  let paths = '';

  // Special case: exactly one non-zero slice (arc path degenerates to a point)
  // Render as two concentric circles (a solid donut ring) instead.
  if (activeSlices.length === 1) {
    const s = activeSlices[0];
    paths = `
      <circle cx="${CX}" cy="${CY}" r="${R}"       fill="${s.color}" opacity="0.9"/>
      <circle cx="${CX}" cy="${CY}" r="${R_INNER}" class="donut-inner-bg"/>
      <title>${s.label}: ${s.value} (100%)</title>`;
  } else {
    let startAngle = -90;
    activeSlices.forEach(s => {
      const pct        = s.value / total;
      const sweepAngle = pct * 360;
      // Clamp sweep to just under 360 to avoid degenerate paths from floating point
      const sweep      = Math.min(sweepAngle, 359.9999);
      const endAngle   = startAngle + sweep;
      const isBig      = sweep > 180 ? 1 : 0;

      const x1  = CX + R       * Math.cos(toRad(startAngle));
      const y1  = CY + R       * Math.sin(toRad(startAngle));
      const x2  = CX + R       * Math.cos(toRad(endAngle));
      const y2  = CY + R       * Math.sin(toRad(endAngle));
      const ix1 = CX + R_INNER * Math.cos(toRad(startAngle));
      const iy1 = CY + R_INNER * Math.sin(toRad(startAngle));
      const ix2 = CX + R_INNER * Math.cos(toRad(endAngle));
      const iy2 = CY + R_INNER * Math.sin(toRad(endAngle));

      const d = [
        `M ${x1} ${y1}`,
        `A ${R} ${R} 0 ${isBig} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${R_INNER} ${R_INNER} 0 ${isBig} 0 ${ix1} ${iy1}`,
        'Z',
      ].join(' ');

      paths += `<path d="${d}" fill="${s.color}" opacity="0.9" class="pie-slice">
        <title>${s.label}: ${s.value} (${Math.round(pct*100)}%)</title>
      </path>`;

      startAngle += sweepAngle; // use real angle (not clamped) for next start
    });
  }

  // Centre label (dark-mode-aware via CSS class)
  const centreLabel = `
    <text x="${CX}" y="${CY - 6}" text-anchor="middle" font-size="22" font-weight="700" class="donut-center-value">${total}</text>
    <text x="${CX}" y="${CY + 12}" text-anchor="middle" font-size="9" fill="#9ca3af" font-weight="500">TOTAL</text>`;

  const svg = `
    <svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" style="overflow:visible;">
      ${paths}
      ${centreLabel}
    </svg>`;

  return svg + legend;
}

function statCard(label, value, color, icon) {
  return `
    <div class="stat-card flex items-center gap-4">
      <div class="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style="background:${color}18;">
        <span style="color:${color};">${icon}</span>
      </div>
      <div>
        <p class="text-2xl font-bold text-gray-900">${value}</p>
        <p class="text-xs text-gray-500 mt-0.5">${label}</p>
      </div>
    </div>`;
}

/* ===============================================================
   12. TEST CASES VIEW
=============================================================== */
let tcFilter = { search:'', status:'', priority:'', from:'', to:'' };

function renderTestCases() {
  const todayVal = today();
  document.getElementById('view-container').innerHTML = `
    <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
        <input id="tc-search" type="text" placeholder="Search test cases…" value="${escHtml(tcFilter.search)}" class="form-input w-44 text-sm" />
        <select id="tc-filter-status" class="form-select w-32 text-sm">
          <option value="">All Status</option>
          <option value="Pass">Pass</option>
          <option value="Fail">Fail</option>
          <option value="Pending">Pending</option>
          <option value="Blocked">Blocked</option>
        </select>
        <select id="tc-filter-priority" class="form-select w-32 text-sm">
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <!-- Date range -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs text-gray-500 font-medium">Date:</span>
          <input id="tc-date-from" type="date" class="form-input text-sm py-1.5 w-36" max="${todayVal}" value="${escHtml(tcFilter.from)}" title="From date" />
          <span class="text-gray-400 text-xs">–</span>
          <input id="tc-date-to"   type="date" class="form-input text-sm py-1.5 w-36" max="${todayVal}" value="${escHtml(tcFilter.to)}"   title="To date" />
          <button onclick="resetTcDateFilter()" class="text-xs text-gray-400 hover:text-red-500 transition-colors px-1" title="Clear date filter">✕</button>
        </div>
        <span class="ml-auto text-xs text-gray-400" id="tc-count"></span>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>ID</th><th>Title</th><th>Module</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody id="tc-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('tc-filter-status').value   = tcFilter.status;
  document.getElementById('tc-filter-priority').value = tcFilter.priority;
  renderTcRows();

  document.getElementById('tc-search').addEventListener('input',   e => { tcFilter.search = e.target.value;   renderTcRows(); });
  document.getElementById('tc-filter-status').addEventListener('change',   e => { tcFilter.status   = e.target.value; renderTcRows(); });
  document.getElementById('tc-filter-priority').addEventListener('change', e => { tcFilter.priority = e.target.value; renderTcRows(); });
  document.getElementById('tc-date-from').addEventListener('change', e => {
    tcFilter.from = e.target.value;
    // Ensure "to" is never before "from"
    const toEl = document.getElementById('tc-date-to');
    if (toEl && tcFilter.to && tcFilter.to < tcFilter.from) {
      tcFilter.to = tcFilter.from;
      toEl.value  = tcFilter.from;
    }
    renderTcRows();
  });
  document.getElementById('tc-date-to').addEventListener('change', e => {
    tcFilter.to = e.target.value;
    renderTcRows();
  });
}

function resetTcDateFilter() {
  tcFilter.from = '';
  tcFilter.to   = '';
  const fromEl = document.getElementById('tc-date-from');
  const toEl   = document.getElementById('tc-date-to');
  if (fromEl) fromEl.value = '';
  if (toEl)   toEl.value   = '';
  renderTcRows();
}

function renderTcRows() {
  const tbody = document.getElementById('tc-tbody');
  if (!tbody) return;
  const s = tcFilter.search.toLowerCase();
  const filtered = store.testCases.filter(t =>
    (!s || t.title.toLowerCase().includes(s) || t.id.toLowerCase().includes(s) || t.module.toLowerCase().includes(s))
    && (!tcFilter.status   || t.status   === tcFilter.status)
    && (!tcFilter.priority || t.priority === tcFilter.priority)
    && (!tcFilter.from     || t.createdAt >= tcFilter.from)
    && (!tcFilter.to       || t.createdAt <= tcFilter.to)
  );

  document.getElementById('tc-count').textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-12 text-center text-sm text-gray-400">No test cases found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => `
    <tr>
      <td><span class="font-mono text-xs text-gray-500">${escHtml(t.id)}</span></td>
      <td class="max-w-xs"><p class="font-medium text-gray-800 truncate" title="${escHtml(t.title)}">${escHtml(t.title)}</p></td>
      <td><span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">${escHtml(t.module)}</span></td>
      <td>${statusBadge(t.status,'tc')}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td>${assigneeChip(t.assignee)}</td>
      <td class="text-sm text-gray-500">${formatDate(t.createdAt)}</td>
      <td>
        <div class="flex items-center gap-1">
          <button class="btn-icon btn-icon-view"   title="View"   onclick="viewTc('${t.id}')">${iconEye()}</button>
          <button class="btn-icon btn-icon-edit"   title="Edit"   onclick="editTc('${t.id}')">${iconPen()}</button>
          <button class="btn-icon btn-icon-delete" title="Delete" onclick="deleteTc('${t.id}')">${iconTrash()}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* --- TC MODALS --- */
function openAddTestCaseModal() {
  openModal({
    title: 'Add New Test Case',
    body: tcForm(null),
    footer: `
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
      <button onclick="submitTcForm(null)" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Test Case</button>
    `,
  });
}

function editTc(id) {
  const tc = store.testCases.find(t => t.id === id);
  if (!tc) return;
  openModal({
    title: 'Edit Test Case',
    body: tcForm(tc),
    footer: `
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
      <button onclick="submitTcForm('${id}')" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update</button>
    `,
  });
}

function tcForm(tc) {
  const v   = (f, d='') => tc ? escHtml(tc[f] ?? d) : d;
  const sel = (f, val) => tc && tc[f] === val ? 'selected' : '';
  return `
    <div class="space-y-4">
      <div>
        <label class="form-label">Title <span class="text-red-500">*</span></label>
        <input id="f-title" type="text" class="form-input" placeholder="Test case title" value="${v('title')}" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="form-label">Module <span class="text-red-500">*</span></label>
          <input id="f-module" type="text" class="form-input" placeholder="e.g. Authentication" value="${v('module')}" />
        </div>
        <div>
          <label class="form-label">Assignee</label>
          ${assigneeSelect(v('assignee'))}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="form-label">Status <span class="text-red-500">*</span></label>
          <select id="f-status" class="form-select">
            <option value="Pending" ${sel('status','Pending')}>Pending</option>
            <option value="Pass"    ${sel('status','Pass')}>Pass</option>
            <option value="Fail"    ${sel('status','Fail')}>Fail</option>
            <option value="Blocked" ${sel('status','Blocked')}>Blocked</option>
          </select>
        </div>
        <div>
          <label class="form-label">Priority <span class="text-red-500">*</span></label>
          <select id="f-priority" class="form-select">
            <option value="Low"    ${sel('priority','Low')}>Low</option>
            <option value="Medium" ${sel('priority','Medium')}>Medium</option>
            <option value="High"   ${sel('priority','High')}>High</option>
          </select>
        </div>
      </div>
      <div>
        <label class="form-label">Date <span class="text-red-500">*</span></label>
        <input id="f-date" type="date" class="form-input" max="${today()}" value="${tc ? v('createdAt') : today()}" />
      </div>
      <div>
        <label class="form-label">Description</label>
        <textarea id="f-description" class="form-textarea" placeholder="Describe the test case…">${v('description')}</textarea>
      </div>
    </div>
  `;
}

function submitTcForm(id) {
  const title       = document.getElementById('f-title').value.trim();
  const module      = document.getElementById('f-module').value.trim();
  const assignee    = document.getElementById('f-assignee').value.trim();
  const status      = document.getElementById('f-status').value;
  const priority    = document.getElementById('f-priority').value;
  const createdAt   = document.getElementById('f-date').value;
  const description = document.getElementById('f-description').value.trim();

  if (!title || !module)    { showToast('Title and Module are required.', 'error'); return; }
  if (!createdAt)           { showToast('Date is required.', 'error'); return; }
  if (createdAt > today())  { showToast('Date cannot be in the future.', 'error'); return; }

  if (id) {
    const idx = store.testCases.findIndex(t => t.id === id);
    if (idx !== -1) store.testCases[idx] = { ...store.testCases[idx], title, module, assignee, status, priority, description, createdAt };
    showToast('Test case updated.');
  } else {
    store.testCases.unshift({ id:genTcId(), title, module, assignee, status, priority, description, createdAt });
    showToast('Test case added.');
  }
  closeModal();
  renderTcRows();
}

function viewTc(id) {
  const t = store.testCases.find(t => t.id === id);
  if (!t) return;
  openModal({
    title: `Test Case — ${t.id}`,
    body: `
      <div>
        <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value font-mono text-gray-500">${escHtml(t.id)}</span></div>
        <div class="detail-row"><span class="detail-label">Title</span><span class="detail-value font-semibold">${escHtml(t.title)}</span></div>
        <div class="detail-row"><span class="detail-label">Module</span><span class="detail-value">${escHtml(t.module)}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${statusBadge(t.status,'tc')}</span></div>
        <div class="detail-row"><span class="detail-label">Priority</span><span class="detail-value">${priorityBadge(t.priority)}</span></div>
        <div class="detail-row"><span class="detail-label">Assignee</span><span class="detail-value">${t.assignee ? assigneeChip(t.assignee) : '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Created At</span><span class="detail-value">${formatDate(t.createdAt)}</span></div>
        <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value text-gray-600 leading-relaxed">${escHtml(t.description)||'—'}</span></div>
      </div>`,
    footer: `
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
      <button onclick="closeModal();editTc('${t.id}')" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
    `,
  });
}

function deleteTc(id) {
  const t = store.testCases.find(t => t.id === id);
  if (!t) return;
  openModal({
    title: 'Delete Test Case',
    body: `
      <div class="text-center py-2">
        <div class="delete-confirm-icon">
          <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        </div>
        <p class="text-gray-700 text-sm mb-1">Are you sure you want to delete:</p>
        <p class="font-semibold text-gray-900">"${escHtml(t.title)}"</p>
        <p class="text-xs text-gray-400 mt-2">This action cannot be undone.</p>
      </div>`,
    footer: `
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
      <button onclick="confirmDeleteTc('${id}')" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
    `,
  });
}

function confirmDeleteTc(id) {
  store.testCases = store.testCases.filter(t => t.id !== id);
  closeModal();
  renderTcRows();
  showToast('Test case deleted.', 'info');
}

/* ===============================================================
   13. BUG TRACKER VIEW
=============================================================== */
let bugFilter = { search:'', status:'', priority:'', from:'', to:'' };

function renderBugs() {
  const todayVal = today();
  document.getElementById('view-container').innerHTML = `
    <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
        <input id="bug-search" type="text" placeholder="Search bugs…" value="${escHtml(bugFilter.search)}" class="form-input w-44 text-sm" />
        <select id="bug-filter-status" class="form-select w-32 text-sm">
          <option value="">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
        <select id="bug-filter-priority" class="form-select w-32 text-sm">
          <option value="">All Priority</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <!-- Date range -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs text-gray-500 font-medium">Date:</span>
          <input id="bug-date-from" type="date" class="form-input text-sm py-1.5 w-36" max="${todayVal}" value="${escHtml(bugFilter.from)}" title="From date" />
          <span class="text-gray-400 text-xs">–</span>
          <input id="bug-date-to"   type="date" class="form-input text-sm py-1.5 w-36" max="${todayVal}" value="${escHtml(bugFilter.to)}"   title="To date" />
          <button onclick="resetBugDateFilter()" class="text-xs text-gray-400 hover:text-red-500 transition-colors px-1" title="Clear date filter">✕</button>
        </div>
        <span class="ml-auto text-xs text-gray-400" id="bug-count"></span>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>ID</th><th>Title</th><th>Module</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Related TC</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody id="bug-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('bug-filter-status').value   = bugFilter.status;
  document.getElementById('bug-filter-priority').value = bugFilter.priority;
  renderBugRows();

  document.getElementById('bug-search').addEventListener('input',   e => { bugFilter.search   = e.target.value; renderBugRows(); });
  document.getElementById('bug-filter-status').addEventListener('change',   e => { bugFilter.status   = e.target.value; renderBugRows(); });
  document.getElementById('bug-filter-priority').addEventListener('change', e => { bugFilter.priority = e.target.value; renderBugRows(); });
  document.getElementById('bug-date-from').addEventListener('change', e => {
    bugFilter.from = e.target.value;
    const toEl = document.getElementById('bug-date-to');
    if (toEl && bugFilter.to && bugFilter.to < bugFilter.from) {
      bugFilter.to = bugFilter.from;
      toEl.value   = bugFilter.from;
    }
    renderBugRows();
  });
  document.getElementById('bug-date-to').addEventListener('change', e => {
    bugFilter.to = e.target.value;
    renderBugRows();
  });
}

function resetBugDateFilter() {
  bugFilter.from = '';
  bugFilter.to   = '';
  const fromEl = document.getElementById('bug-date-from');
  const toEl   = document.getElementById('bug-date-to');
  if (fromEl) fromEl.value = '';
  if (toEl)   toEl.value   = '';
  renderBugRows();
}

function renderBugRows() {
  const tbody = document.getElementById('bug-tbody');
  if (!tbody) return;
  const s = bugFilter.search.toLowerCase();
  const filtered = store.bugs.filter(b =>
    (!s || b.title.toLowerCase().includes(s) || b.id.toLowerCase().includes(s) || b.module.toLowerCase().includes(s))
    && (!bugFilter.status   || b.status   === bugFilter.status)
    && (!bugFilter.priority || b.priority === bugFilter.priority)
    && (!bugFilter.from     || b.createdAt >= bugFilter.from)
    && (!bugFilter.to       || b.createdAt <= bugFilter.to)
  );

  document.getElementById('bug-count').textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-sm text-gray-400">No bugs found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td><span class="font-mono text-xs text-gray-500">${escHtml(b.id)}</span></td>
      <td class="max-w-xs"><p class="font-medium text-gray-800 truncate" title="${escHtml(b.title)}">${escHtml(b.title)}</p></td>
      <td><span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">${escHtml(b.module)}</span></td>
      <td>${statusBadge(b.status,'bug')}</td>
      <td>${priorityBadge(b.priority)}</td>
      <td>${assigneeChip(b.assignee)}</td>
      <td>${b.relatedTestCase
          ? `<button onclick="viewTc('${b.relatedTestCase}')" class="font-mono text-xs text-blue-500 hover:text-blue-700 hover:underline underline-offset-2 transition-colors cursor-pointer" title="View ${escHtml(b.relatedTestCase)}">${escHtml(b.relatedTestCase)}</button>`
          : '<span class="text-gray-400">—</span>'
        }</td>
      <td class="text-sm text-gray-500">${formatDate(b.createdAt)}</td>
      <td>
        <div class="flex items-center gap-1">
          <button class="btn-icon btn-icon-view"   title="View"   onclick="viewBug('${b.id}')">${iconEye()}</button>
          <button class="btn-icon btn-icon-edit"   title="Edit"   onclick="editBug('${b.id}')">${iconPen()}</button>
          <button class="btn-icon btn-icon-delete" title="Delete" onclick="deleteBug('${b.id}')">${iconTrash()}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* --- Bug MODALS --- */
function openAddBugModal() {
  openModal({
    title: 'Report New Bug',
    body: bugForm(null),
    footer: `
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
      <button onclick="submitBugForm(null)" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Bug</button>
    `,
  });
}

function editBug(id) {
  const b = store.bugs.find(b => b.id === id);
  if (!b) return;
  openModal({
    title: 'Edit Bug',
    body: bugForm(b),
    footer: `
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
      <button onclick="submitBugForm('${id}')" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update Bug</button>
    `,
  });
}

function bugForm(b) {
  const v   = (f, d='') => b ? escHtml(b[f] ?? d) : d;
  const sel = (f, val) => b && b[f] === val ? 'selected' : '';
  const tcOptions = store.testCases.map(t =>
    `<option value="${t.id}" ${b && b.relatedTestCase === t.id ? 'selected' : ''}>${escHtml(t.id)} — ${escHtml(t.title.substring(0,40))}</option>`
  ).join('');
  return `
    <div class="space-y-4">
      <div>
        <label class="form-label">Title <span class="text-red-500">*</span></label>
        <input id="f-title" type="text" class="form-input" placeholder="Bug title" value="${v('title')}" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="form-label">Module <span class="text-red-500">*</span></label>
          <input id="f-module" type="text" class="form-input" placeholder="e.g. Cart" value="${v('module')}" />
        </div>
        <div>
          <label class="form-label">Assignee</label>
          ${assigneeSelect(v('assignee'))}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="form-label">Status <span class="text-red-500">*</span></label>
          <select id="f-status" class="form-select">
            <option value="Open"        ${sel('status','Open')}>Open</option>
            <option value="In Progress" ${sel('status','In Progress')}>In Progress</option>
            <option value="Resolved"    ${sel('status','Resolved')}>Resolved</option>
            <option value="Closed"      ${sel('status','Closed')}>Closed</option>
          </select>
        </div>
        <div>
          <label class="form-label">Priority <span class="text-red-500">*</span></label>
          <select id="f-priority" class="form-select">
            <option value="Low"      ${sel('priority','Low')}>Low</option>
            <option value="Medium"   ${sel('priority','Medium')}>Medium</option>
            <option value="High"     ${sel('priority','High')}>High</option>
            <option value="Critical" ${sel('priority','Critical')}>Critical</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="form-label">Related Test Case</label>
          <select id="f-related-tc" class="form-select">
            <option value="">— None —</option>
            ${tcOptions}
          </select>
        </div>
        <div>
          <label class="form-label">Date <span class="text-red-500">*</span></label>
          <input id="f-date" type="date" class="form-input" max="${today()}" value="${b ? v('createdAt') : today()}" />
        </div>
      </div>
      <div>
        <label class="form-label">Description</label>
        <textarea id="f-description" class="form-textarea" placeholder="Describe the bug…">${v('description')}</textarea>
      </div>
    </div>
  `;
}

function submitBugForm(id) {
  const title           = document.getElementById('f-title').value.trim();
  const module          = document.getElementById('f-module').value.trim();
  const assignee        = document.getElementById('f-assignee').value.trim();
  const status          = document.getElementById('f-status').value;
  const priority        = document.getElementById('f-priority').value;
  const relatedTestCase = document.getElementById('f-related-tc').value;
  const createdAt       = document.getElementById('f-date').value;
  const description     = document.getElementById('f-description').value.trim();

  if (!title || !module)   { showToast('Title and Module are required.', 'error'); return; }
  if (!createdAt)          { showToast('Date is required.', 'error'); return; }
  if (createdAt > today()) { showToast('Date cannot be in the future.', 'error'); return; }

  if (id) {
    const idx = store.bugs.findIndex(b => b.id === id);
    if (idx !== -1) store.bugs[idx] = { ...store.bugs[idx], title, module, assignee, status, priority, relatedTestCase, description, createdAt };
    showToast('Bug updated.');
  } else {
    store.bugs.unshift({ id:genBugId(), title, module, assignee, status, priority, relatedTestCase, description, createdAt });
    showToast('Bug reported.');
  }
  closeModal();
  renderBugRows();
}

function viewBug(id) {
  const b = store.bugs.find(b => b.id === id);
  if (!b) return;
  openModal({
    title: `Bug — ${b.id}`,
    body: `
      <div>
        <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value font-mono text-gray-500">${escHtml(b.id)}</span></div>
        <div class="detail-row"><span class="detail-label">Title</span><span class="detail-value font-semibold">${escHtml(b.title)}</span></div>
        <div class="detail-row"><span class="detail-label">Module</span><span class="detail-value">${escHtml(b.module)}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${statusBadge(b.status,'bug')}</span></div>
        <div class="detail-row"><span class="detail-label">Priority</span><span class="detail-value">${priorityBadge(b.priority)}</span></div>
        <div class="detail-row"><span class="detail-label">Assignee</span><span class="detail-value">${b.assignee ? assigneeChip(b.assignee) : '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Related TC</span><span class="detail-value">${
          b.relatedTestCase
            ? `<button onclick="closeModal();viewTc('${b.relatedTestCase}')" class="font-mono text-xs text-blue-500 hover:text-blue-700 hover:underline underline-offset-2 transition-colors" title="View ${escHtml(b.relatedTestCase)}">${escHtml(b.relatedTestCase)} ↗</button>`
            : '<span class="text-gray-400">—</span>'
        }</span></div>
        <div class="detail-row"><span class="detail-label">Created At</span><span class="detail-value">${formatDate(b.createdAt)}</span></div>
        <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value text-gray-600 leading-relaxed">${escHtml(b.description)||'—'}</span></div>
      </div>`,
    footer: `
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
      <button onclick="closeModal();editBug('${b.id}')" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
    `,
  });
}

function deleteBug(id) {
  const b = store.bugs.find(b => b.id === id);
  if (!b) return;
  openModal({
    title: 'Delete Bug',
    body: `
      <div class="text-center py-2">
        <div class="delete-confirm-icon">
          <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        </div>
        <p class="text-gray-700 text-sm mb-1">Are you sure you want to delete:</p>
        <p class="font-semibold text-gray-900">"${escHtml(b.title)}"</p>
        <p class="text-xs text-gray-400 mt-2">This action cannot be undone.</p>
      </div>`,
    footer: `
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
      <button onclick="confirmDeleteBug('${id}')" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
    `,
  });
}

function confirmDeleteBug(id) {
  store.bugs = store.bugs.filter(b => b.id !== id);
  closeModal();
  renderBugRows();
  showToast('Bug deleted.', 'info');
}

/* ===============================================================
   14. REPORTS VIEW
=============================================================== */
function renderReports() {
  const tc   = store.testCases;
  const bugs = store.bugs;

  const tcTotal   = tc.length;
  const tcPass    = tc.filter(t => t.status === 'Pass').length;
  const tcFail    = tc.filter(t => t.status === 'Fail').length;
  const tcPending = tc.filter(t => t.status === 'Pending').length;
  const tcBlocked = tc.filter(t => t.status === 'Blocked').length;
  const passRate  = tcTotal > 0 ? Math.round((tcPass / tcTotal) * 100) : 0;

  const bugTotal    = bugs.length;
  const bugOpen     = bugs.filter(b => b.status === 'Open').length;
  const bugInProg   = bugs.filter(b => b.status === 'In Progress').length;
  const bugResolved = bugs.filter(b => b.status === 'Resolved').length;
  const bugClosed   = bugs.filter(b => b.status === 'Closed').length;

  const modules = [...new Set([...tc.map(t=>t.module),...bugs.map(b=>b.module)])].sort();
  const modRows = modules.map(m => {
    const mTc   = tc.filter(t=>t.module===m).length;
    const mBugs = bugs.filter(b=>b.module===m).length;
    const mPass = tc.filter(t=>t.module===m && t.status==='Pass').length;
    const rate  = mTc > 0 ? Math.round((mPass/mTc)*100) : 0;
    return { m, mTc, mBugs, rate };
  });

  document.getElementById('view-container').innerHTML = `
    <div class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${summaryCard('Pass Rate',      passRate+'%',          '#16a34a')}
        ${summaryCard('Total Tests',    tcTotal,               '#3b82f6')}
        ${summaryCard('Total Bugs',     bugTotal,              '#f59e0b')}
        ${summaryCard('Resolved Bugs',  bugResolved+bugClosed, '#6366f1')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white border border-gray-200 rounded-xl p-5">
          <h3 class="font-semibold text-gray-900 text-sm mb-4">Test Case Status Distribution</h3>
          <div class="space-y-3">
            ${progressRow('Pass',    tcPass,    tcTotal, '#16a34a', 'badge-pass')}
            ${progressRow('Fail',    tcFail,    tcTotal, '#dc2626', 'badge-fail')}
            ${progressRow('Pending', tcPending, tcTotal, '#eab308', 'badge-pending')}
            ${progressRow('Blocked', tcBlocked, tcTotal, '#9333ea', 'badge-blocked')}
          </div>
        </div>
        <div class="bg-white border border-gray-200 rounded-xl p-5">
          <h3 class="font-semibold text-gray-900 text-sm mb-4">Bug Status Distribution</h3>
          <div class="space-y-3">
            ${progressRow('Open',        bugOpen,     bugTotal, '#dc2626', 'badge-open')}
            ${progressRow('In Progress', bugInProg,   bugTotal, '#eab308', 'badge-in-progress')}
            ${progressRow('Resolved',    bugResolved, bugTotal, '#16a34a', 'badge-resolved')}
            ${progressRow('Closed',      bugClosed,   bugTotal, '#6b7280', 'badge-closed')}
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <h3 class="font-semibold text-gray-900 text-sm mb-4">Bug Priority Breakdown</h3>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${bugPriorityCard('Critical', bugs.filter(b=>b.priority==='Critical').length, '#9d174d', '#fce7f3')}
          ${bugPriorityCard('High',     bugs.filter(b=>b.priority==='High').length,     '#991b1b', '#fee2e2')}
          ${bugPriorityCard('Medium',   bugs.filter(b=>b.priority==='Medium').length,   '#9a3412', '#fff7ed')}
          ${bugPriorityCard('Low',      bugs.filter(b=>b.priority==='Low').length,      '#1e40af', '#eff6ff')}
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900 text-sm">Module Breakdown</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Module</th><th class="text-center">Test Cases</th><th class="text-center">Bugs</th><th>Pass Rate</th></tr></thead>
            <tbody>
              ${modRows.map(r=>`
                <tr>
                  <td class="font-medium">${escHtml(r.m)}</td>
                  <td class="text-center">${r.mTc}</td>
                  <td class="text-center">${r.mBugs}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="progress-bar-track flex-1"><div class="progress-bar-fill" style="width:${r.rate}%;background:#16a34a;"></div></div>
                      <span class="text-xs font-medium text-gray-600 w-8 text-right">${r.rate}%</span>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function summaryCard(label, value, color) {
  return `
    <div class="bg-white border border-gray-200 rounded-xl p-5">
      <p class="text-2xl font-bold" style="color:${color};">${value}</p>
      <p class="text-xs text-gray-500 mt-1">${label}</p>
    </div>`;
}

function progressRow(label, count, total, color, badgeCls) {
  const pct = total > 0 ? Math.round((count/total)*100) : 0;
  return `
    <div>
      <div class="flex justify-between items-center mb-1">
        <span class="badge ${badgeCls}">${label}</span>
        <span class="text-xs text-gray-500">${count} / ${total} <span class="text-gray-400">(${pct}%)</span></span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${pct}%;background:${color};"></div>
      </div>
    </div>`;
}

function bugPriorityCard(label, count, textColor, bgColor) {
  return `
    <div class="rounded-xl p-4 text-center" style="background:${bgColor};">
      <p class="text-3xl font-bold" style="color:${textColor};">${count}</p>
      <p class="text-xs font-semibold mt-1" style="color:${textColor};">${label}</p>
    </div>`;
}

/* ===============================================================
   15. SVG ICON HELPERS
=============================================================== */
function iconEye()       { return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`; }
function iconPen()       { return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`; }
function iconTrash()     { return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`; }
function iconClipboard() { return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>`; }
function iconCheck()     { return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`; }
function iconXCircle()   { return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`; }
function iconBug()       { return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`; }

/* ===============================================================
   16. BOOT
=============================================================== */
(function boot() {
  document.getElementById('header-date').textContent =
    new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  initThemeToggle();
  initSidebarToggle();
  initAuth();
})();
