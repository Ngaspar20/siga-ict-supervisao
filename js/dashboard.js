/* ══════════════════════════════════════════════════
   DASHBOARD  — visit cards, KPI stats, filter,
                district (local) + upper (Sheets) views
══════════════════════════════════════════════════ */

/* ── Filter state ── */
let dashFilter      = 'ALL';
let upperDashFilter = 'ALL';
let upperData       = [];   // fetched/merged visits for provincial/national

/* ══════════════════════════════════
   DISTRICT DASHBOARD  (localStorage)
══════════════════════════════════ */
function filterDash(f, btn) {
  dashFilter = f;
  _setActiveFilter('#tab-dashboard .filter-chip', btn, f);
  renderDashboard();
}

function renderDashboard() {
  const history  = store.get('history') || [];
  _updateStats('s', history);

  const filtered = dashFilter === 'ALL' ? history : history.filter(v => v.traffic_light === dashFilter);
  const container = document.getElementById('dash-visits');

  if (!filtered.length) {
    container.innerHTML = _emptyState(
      dashFilter === 'ALL'
        ? '📋'
        : '🔍',
      dashFilter === 'ALL'
        ? 'Ainda não há visitas registadas neste dispositivo.<br>Submeta a primeira visita no separador <strong>Formulário</strong>.'
        : 'Nenhuma visita com este filtro.'
    );
    return;
  }

  container.innerHTML = filtered.map((v, i) => renderVisitCard(v, history.indexOf(v), 'v')).join('');
}

/* ══════════════════════════════════
   UPPER DASHBOARD  (Sheets + local)
══════════════════════════════════ */
async function fetchAndRenderUpperDash() {
  const container = document.getElementById('upper-dash-visits');
  container.innerHTML = '<div class="loading-msg">⏳ A carregar dados...</div>';

  // Start with local history
  let visits = store.get('history') || [];

  if (navigator.onLine) {
    try {
      const fromSheets = await fetchFromSheets(currentProvince || '');
      // Merge — avoid timestamp duplicates
      const localTs    = new Set(visits.map(v => v.timestamp));
      visits = [...visits, ...fromSheets.filter(v => !localTs.has(v.timestamp))];

      const now = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      document.getElementById('refresh-last').textContent = `Actualizado às ${now}`;
    } catch {
      document.getElementById('refresh-last').textContent = 'Sem acesso ao Sheets — dados locais';
    }
  } else {
    document.getElementById('refresh-last').textContent = 'Offline — dados locais';
  }

  // Province filter for provincial role
  if (currentRole === 'provincial' && currentProvince) {
    visits = visits.filter(v => (v.province || '').toLowerCase() === currentProvince.toLowerCase());
  }

  // Newest first
  visits.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  upperData = visits;

  renderUpperDashboard();
}

function filterUpperDash(f, btn) {
  upperDashFilter = f;
  _setActiveFilter('#tab-upper-dash .filter-chip', btn, f);
  renderUpperDashboard();
}

function renderUpperDashboard() {
  _updateStats('u', upperData);

  const filtered  = upperDashFilter === 'ALL' ? upperData : upperData.filter(v => v.traffic_light === upperDashFilter);
  const container = document.getElementById('upper-dash-visits');

  if (!filtered.length) {
    container.innerHTML = _emptyState(
      upperDashFilter === 'ALL' ? '📊' : '🔍',
      upperDashFilter === 'ALL'
        ? 'Nenhuma visita encontrada.<br>Clique em <strong>Actualizar</strong> para carregar do Google Sheets.'
        : 'Nenhuma visita com este filtro.'
    );
    return;
  }

  container.innerHTML = filtered.map((v, i) => renderVisitCard(v, i, 'u')).join('');
}

/* ══════════════════════════════════
   SHARED VISIT CARD
══════════════════════════════════ */
function renderVisitCard(v, idx, prefix) {
  const fmt      = val => Math.round((val || 0) * 100) + '%';
  const barColor = sc  => sc >= 0.80 ? '#22c55e' : sc >= 0.60 ? '#f59e0b' : '#dc3545';
  const tlLbl    = v.traffic_light === 'GREEN' ? 'BOM'
                 : v.traffic_light === 'YELLOW' ? 'EM DESENVOLVIMENTO'
                 : 'INSUFICIENTE';

  return `
    <div class="visit-card">
      <div class="visit-card-header" onclick="toggleVisitDetail('${prefix}-${idx}')">
        <div class="tl-dot ${v.traffic_light}"></div>
        <div class="visit-info">
          <div class="visit-facility">
            ${v.facility || '—'}
            ${v.b_critical_fail ? '<span class="critical-badge">FALHA CRÍTICA</span>' : ''}
          </div>
          <div class="visit-sub">
            ${v.counselor_name || '—'} &nbsp;·&nbsp;
            ${v.visit_date     || '—'} &nbsp;·&nbsp;
            ${v.district       || ''} &nbsp;·&nbsp;
            ${v.supervisor_name || ''}
          </div>
        </div>
        <div class="visit-score-col">
          <div class="visit-score-big ${v.traffic_light}">${fmt(v.overall_score)}</div>
          <div class="visit-tl-label  ${v.traffic_light}">${tlLbl}</div>
        </div>
      </div>
      <div class="visit-detail" id="vd-${prefix}-${idx}">
        <div class="mod-bars">
          ${[['A · Consentimento (15%)', v.score_a],
             ['B · Protocolo Crítico (25%)', v.score_b],
             ['C · Qualidade Clínica (35%)', v.score_c],
             ['D · Registos (25%)', v.score_d]]
            .map(([lbl, sc]) => `
              <div class="mod-bar-item">
                <div class="mod-bar-label">${lbl}</div>
                <div class="mod-bar-track">
                  <div class="mod-bar-fill" style="width:${Math.round((sc||0)*100)}%;background:${barColor(sc||0)}"></div>
                </div>
                <div class="mod-bar-val" style="color:${barColor(sc||0)}">${fmt(sc)}</div>
              </div>`).join('')}
        </div>
        ${v.strengths    ? `<div class="visit-notes-section"><strong>Pontos Fortes:</strong><br>${v.strengths}</div>` : ''}
        ${v.improvements ? `<div class="visit-notes-section" style="margin-top:7px"><strong>Áreas de Melhoria:</strong><br>${v.improvements}</div>` : ''}
        ${v.agreed_actions ? `<div class="visit-notes-section" style="margin-top:7px"><strong>Acções Acordadas:</strong><br>${v.agreed_actions}</div>` : ''}
        <div class="visit-notes-section" style="margin-top:7px;font-size:.69rem;color:#94a3b8">
          ${v.province || ''} · ${v.district || ''} · ${v.visit_type || ''} · ${v.source || ''}
        </div>
      </div>
    </div>`;
}

function toggleVisitDetail(id) {
  const el = document.getElementById('vd-' + id);
  if (el) el.classList.toggle('open');
}

/* ── Helpers ── */
function _updateStats(prefix, visits) {
  const el = id => document.getElementById(id);
  if (!el(`${prefix}-total`)) return;
  el(`${prefix}-total`).textContent = visits.length;
  el(`${prefix}-red`).textContent   = visits.filter(v => v.traffic_light === 'RED').length;
  el(`${prefix}-yel`).textContent   = visits.filter(v => v.traffic_light === 'YELLOW').length;
  el(`${prefix}-grn`).textContent   = visits.filter(v => v.traffic_light === 'GREEN').length;
}

function _setActiveFilter(selector, btn, f) {
  document.querySelectorAll(selector).forEach(b => b.className = 'filter-chip');
  btn.classList.add(f === 'ALL' ? 'f-all' : f === 'RED' ? 'f-red' : f === 'YELLOW' ? 'f-yel' : 'f-grn');
}

function _emptyState(icon, msg) {
  return `<div class="empty-dash"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
}
