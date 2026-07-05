/* ══════════════════════════════════════════════════
   APP  — global state, role selection, navigation, boot
   (mirrors RISE ICT Monitor app.js architecture)
══════════════════════════════════════════════════ */

/* ── Global state ── */
let currentRole     = null;   // 'district' | 'provincial' | 'national'
let currentProvince = null;   // 'Manica' | 'Zambezia' (provincial only)

/* ══════════════════════════════════
   LANDING — role selection
══════════════════════════════════ */
function showProvincePicker() {
  document.getElementById('prov-picker').classList.toggle('show');
}

function selectRole(role) {
  const prov = document.getElementById('landing-province').value;

  if (role === 'provincial') {
    if (!prov) { alert('Seleccione a sua província.'); return; }
    currentProvince = prov;
  } else {
    currentProvince = null;
  }

  currentRole = role;

  // Persist role across page refreshes
  store.set('role',     role);
  store.set('province', currentProvince);

  _applyRole();
}

function goBack() {
  document.getElementById('app').style.display     = 'none';
  document.getElementById('landing').style.display = 'flex';
  document.getElementById('prov-picker').classList.remove('show');
  document.getElementById('landing-province').value = '';
  currentRole = currentProvince = null;
}

/* ── Wire up the header and tabs for the chosen role ── */
function _applyRole() {
  const roleLabels   = { district: 'Supervisor Distrital', provincial: 'Supervisor Provincial', national: 'Assessor Nacional' };
  const roleClasses  = { district: 'badge-district', provincial: 'badge-provincial', national: 'badge-national' };
  const scopeTexts   = {
    district:   'Nível Distrital · Formulário de Supervisão',
    provincial: `Nível Provincial · ${currentProvince}`,
    national:   'Nível Nacional · Manica & Zambézia',
  };

  const badge = document.getElementById('role-badge');
  badge.textContent = roleLabels[currentRole];
  badge.className   = 'role-badge ' + roleClasses[currentRole];

  document.getElementById('header-scope-text').textContent = scopeTexts[currentRole];

  // Show correct tab bar
  document.getElementById('district-tabs').style.display = currentRole === 'district' ? 'flex' : 'none';
  document.getElementById('upper-tabs').style.display    = currentRole !== 'district' ? 'flex' : 'none';
  document.getElementById('score-bar').style.display     = currentRole === 'district' ? 'flex' : 'none';

  // Reset all tab panels
  ['tab-form', 'tab-dashboard', 'tab-upper-dash', 'tab-upper-sheets']
    .forEach(id => document.getElementById(id).classList.remove('active'));

  // Reset tab button states
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  if (currentRole === 'district') {
    document.getElementById('tab-form').classList.add('active');
    document.querySelectorAll('#district-tabs .tab-btn')[0].classList.add('active');
    loadAutosave();
  } else {
    document.getElementById('tab-upper-dash').classList.add('active');
    document.querySelectorAll('#upper-tabs .tab-btn')[0].classList.add('active');
    const title = currentRole === 'provincial'
      ? `Dashboard · ${currentProvince}`
      : 'Dashboard Nacional';
    document.getElementById('refresh-title').textContent = title;
    fetchAndRenderUpperDash();
  }

  document.getElementById('landing').style.display = 'none';
  document.getElementById('app').style.display     = 'block';
}

/* ══════════════════════════════════
   NAVIGATION — tab switching
══════════════════════════════════ */
function switchTab(tabId, btn) {
  const allTabs = currentRole === 'district'
    ? ['tab-form', 'tab-dashboard']
    : ['tab-upper-dash', 'tab-upper-sheets'];

  allTabs.forEach(id => document.getElementById(id).classList.remove('active'));

  const allBtns = currentRole === 'district'
    ? document.querySelectorAll('#district-tabs .tab-btn')
    : document.querySelectorAll('#upper-tabs .tab-btn');
  allBtns.forEach(b => b.classList.remove('active'));

  document.getElementById('tab-' + tabId).classList.add('active');
  btn.classList.add('active');

  document.getElementById('score-bar').style.display =
    (tabId === 'form' && currentRole === 'district') ? 'flex' : 'none';

  if (tabId === 'dashboard')   renderDashboard();
  if (tabId === 'upper-dash')  fetchAndRenderUpperDash();
}

/* ── Accordion card toggle ── */
function toggleCard(id) {
  document.getElementById(`card-${id}`).classList.toggle('open');
}

/* ── Save a submitted visit to local history ── */
function saveToHistory(payload) {
  const h = store.get('history') || [];
  h.unshift(payload);            // newest first
  if (h.length > 200) h.pop();  // cap at 200
  store.set('history', h);
}

/* ══════════════════════════════════
   BOOT
══════════════════════════════════ */
function init() {
  // Set today's date as default
  const dateEl = document.getElementById('visit_date');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

  // Render all question modules
  renderModule('items-a', MOD_A, 'yn');
  renderModule('items-b', MOD_B, 'yn-no-na');
  renderModule('items-c', MOD_C, 'scale');
  renderModule('items-d', MOD_D, 'yn');

  // Online / offline listeners
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
  renderPendingPanel();

  // Auto-flush queue after a short delay
  setTimeout(trySyncQueue, 1500);

  // Register service worker for offline PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

window.addEventListener('DOMContentLoaded', init);
