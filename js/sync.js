/* ══════════════════════════════════════════════════
   SYNC  — queue management, online/offline status,
           Google Sheets push (doPost) & pull (doGet)
══════════════════════════════════════════════════ */

/* ── Push one visit to Google Sheets ── */
async function sendToSheets(payload) {
  try {
    // GAS does not handle OPTIONS preflight — use text/plain to avoid it.
    // e.postData.contents still carries the JSON string on the server side.
    const r = await fetch(SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(payload),
      redirect: 'follow',
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);

    store.set('last_sync', new Date().toISOString());
    document.getElementById('r-sync-msg').textContent = '✅ Sincronizado com Google Sheets!';
    document.getElementById('r-sync-msg').className   = 'result-sync-msg sync-ok';
    store.remove('draft');
  } catch (e) {
    saveToQueue(payload);
    document.getElementById('r-sync-msg').textContent = '📴 Sem internet. Guardado localmente — sincronizará automaticamente.';
    document.getElementById('r-sync-msg').className   = 'result-sync-msg sync-queued';
  }
  renderPendingPanel();
}

/* ── Add to offline queue ── */
function saveToQueue(payload) {
  const q = store.get('queue') || [];
  q.push(payload);
  store.set('queue', q);
}

/* ── Flush the offline queue ── */
async function trySyncQueue() {
  const q = store.get('queue') || [];
  if (!q.length) return;

  const remaining = [];
  for (const item of q) {
    try {
      const r = await fetch(SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(item),
        redirect: 'follow',
      });
      if (!r.ok) remaining.push(item);
    } catch {
      remaining.push(item);
      break; // no point retrying if offline
    }
  }
  store.set('queue', remaining);
  if (remaining.length < q.length) store.set('last_sync', new Date().toISOString());
  renderPendingPanel();
}

/* ── Pull visits from Google Sheets (provincial / national dashboard) ── */
async function fetchFromSheets(province = '') {
  let url = SCRIPT_URL + '?action=get';
  if (province) url += '&province=' + encodeURIComponent(province);
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const data = await r.json();
  return Array.isArray(data.visits) ? data.visits : [];
}

/* ── Render the pending-sync panel ── */
function renderPendingPanel() {
  const q      = store.get('queue') || [];
  const panel  = document.getElementById('pending-panel');
  const list   = document.getElementById('pending-list');
  const badge  = document.getElementById('sync-badge');
  const label  = document.getElementById('sync-label');

  if (!panel) return;

  if (q.length) {
    panel.classList.add('show');
    list.innerHTML = q.map(i => `• ${i.facility} · ${i.visit_date}`).join('<br>');
    badge.classList.add('has-pending');
    label.textContent = `${q.length} pendente${q.length > 1 ? 's' : ''}`;
  } else {
    panel.classList.remove('show');
    badge.classList.remove('has-pending');
  }
}

/* ── Online / offline indicator ── */
function updateOnlineStatus() {
  const on  = navigator.onLine;
  const dot = document.getElementById('sync-dot');
  if (dot) {
    dot.className = on ? 'sync-dot' : 'sync-dot offline';
    if (!document.getElementById('sync-badge').classList.contains('has-pending')) {
      document.getElementById('sync-label').textContent = on ? 'Online' : 'Offline';
    }
  }
  if (on) trySyncQueue();
}
