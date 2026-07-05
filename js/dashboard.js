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
  buildSupervisorCoverage(upperData);
  buildCounselorTrends(upperData);

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

/* ══════════════════════════════════════════════════
   PROVINCIAL PANEL 1 — Supervisor Coverage
   Shows how many visits each district supervisor
   has made per facility, so provincial can identify
   sites being under-visited.
══════════════════════════════════════════════════ */
function buildSupervisorCoverage(visits) {
  const el = document.getElementById('supervisor-coverage');
  if (!el) return;
  if (!visits.length) { el.innerHTML = ''; return; }

  // Group: supervisor → facility → {count, lastDate}
  const map = {};
  visits.forEach(v => {
    const sup = v.supervisor_name || 'Desconhecido';
    const fac = v.facility || 'US Desconhecida';
    if (!map[sup]) map[sup] = {};
    if (!map[sup][fac]) map[sup][fac] = { count: 0, lastDate: '' };
    map[sup][fac].count++;
    const vd = _fmtDate(v.visit_date);
    if (!map[sup][fac].lastDate || vd > map[sup][fac].lastDate)
      map[sup][fac].lastDate = vd;
  });

  // Sort supervisors by total visits asc (least active first)
  const supervisors = Object.entries(map)
    .map(([sup, facs]) => ({
      sup,
      facs: Object.entries(facs).sort((a, b) => a[1].count - b[1].count),
      total: Object.values(facs).reduce((s, f) => s + f.count, 0),
    }))
    .sort((a, b) => a.total - b.total);

  const rows = supervisors.map((s, si) => {
    const badge = s.total <= 1
      ? `<span class="sv-badge-warn">${s.total} visita${s.total !== 1 ? 's' : ''}</span>`
      : `<span class="sv-badge-count">${s.total} visitas</span>`;

    const facRows = s.facs.map(([fac, info]) => {
      const warn = info.count === 1 ? 'color:#b91c1c' : '';
      return `<tr class="sv-fac-row">
        <td style="${warn}">📍 ${fac}</td>
        <td style="text-align:right;${warn}">${info.count}x</td>
        <td style="color:#94a3b8;text-align:right">${info.lastDate || '—'}</td>
      </tr>`;
    }).join('');

    return `<tr class="sv-sup-row" onclick="this.nextElementSibling && this.nextElementSibling.classList && (() => {
      const next = this.nextSibling;
      let cur = this.nextElementSibling;
      while (cur && cur.classList.contains('sv-fac-row')) { cur.style.display = cur.style.display === 'none' ? '' : 'none'; cur = cur.nextElementSibling; }
    })()">
      <td>👤 ${s.sup}</td>
      <td style="text-align:right">${badge}</td>
      <td style="text-align:right;color:#94a3b8;font-size:.7rem">${s.facs.length} US</td>
    </tr>${facRows}`;
  }).join('');

  el.innerHTML = `
    <div class="analysis-panel">
      <div class="analysis-panel-hdr" onclick="toggleAnalysisPanel(this)">
        <h4>👥 Cobertura por Supervisor Distrital</h4>
        <span class="toggle-icon">▼</span>
      </div>
      <div class="analysis-panel-body open">
        <table class="sv-table">
          <thead><tr>
            <th>Supervisor / Unidade Sanitária</th>
            <th style="text-align:right">Visitas</th>
            <th style="text-align:right">Última / Nº US</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════
   PROVINCIAL PANEL 2 — Counselor Improvement Trends
   For each counselor with 2+ visits, compares the
   latest score vs the previous visit score and shows
   a trend indicator (↑ improving / ↓ declining / →).
══════════════════════════════════════════════════ */
function buildCounselorTrends(visits) {
  const el = document.getElementById('counselor-trends');
  if (!el) return;

  // Group by counselor + facility, sort by date
  const map = {};
  visits.forEach(v => {
    const key = (v.counselor_name || 'Desconhecido') + '||' + (v.facility || '');
    if (!map[key]) map[key] = [];
    map[key].push(v);
  });

  const counselors = Object.entries(map)
    .map(([key, vs]) => {
      const sorted = vs.sort((a, b) => (b.visit_date || '').localeCompare(a.visit_date || ''));
      return { key, visits: sorted };
    })
    .filter(c => c.visits.length >= 2);   // only those with 2+ visits

  if (!counselors.length) { el.innerHTML = ''; return; }

  // Safe score parser — handles null, undefined, NaN number, and "NaN" string from Sheets
  const safeScore = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
  const fmt = v => { const n = safeScore(v); return n !== null ? Math.round(n * 100) + '%' : '—%'; };
  const tlClass = tl => tl === 'GREEN' ? 'GREEN' : tl === 'YELLOW' ? 'YELLOW' : 'RED';

  // Sort: declining first, then stable, then improving
  const withDelta = counselors.map(c => {
    const curr = c.visits[0];
    const prev = c.visits[1];
    const cs = safeScore(curr.overall_score) ?? 0;
    const ps = safeScore(prev.overall_score) ?? 0;
    const delta = cs - ps;
    return { c, curr, prev, delta };
  })
  .filter(({ curr, prev }) => safeScore(curr.overall_score) !== null || safeScore(prev.overall_score) !== null)
  .sort((a, b) => a.delta - b.delta);

  const rows = withDelta.map(({ c, curr, prev, delta }) => {
    const [name, fac] = c.key.split('||');
    const trendIcon  = delta > 0.02 ? '↑' : delta < -0.02 ? '↓' : '→';
    const trendClass = delta > 0.02 ? 'trend-up' : delta < -0.02 ? 'trend-down' : 'trend-flat';
    const deltaStr   = (delta >= 0 ? '+' : '') + Math.round(delta * 100) + '%';

    return `<tr>
      <td><strong>${name}</strong><br><span style="font-size:.68rem;color:#94a3b8">${fac}</span></td>
      <td><span class="trend-score ${tlClass(prev.traffic_light)}">${fmt(prev.overall_score)}</span><br>
          <span style="font-size:.67rem;color:#94a3b8">${_fmtDate(prev.visit_date)}</span></td>
      <td><span class="trend-score ${tlClass(curr.traffic_light)}">${fmt(curr.overall_score)}</span><br>
          <span style="font-size:.67rem;color:#94a3b8">${_fmtDate(curr.visit_date)}</span></td>
      <td><span class="${trendClass}" style="font-size:1.1rem">${trendIcon}</span>
          <span class="${trendClass}" style="font-size:.72rem;margin-left:3px">${deltaStr}</span></td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="analysis-panel">
      <div class="analysis-panel-hdr" onclick="toggleAnalysisPanel(this)">
        <h4>📈 Evolução por Conselheiro (visitas repetidas)</h4>
        <span class="toggle-icon">▼</span>
      </div>
      <div class="analysis-panel-body open">
        <table class="trend-table">
          <thead><tr>
            <th>Conselheiro / US</th>
            <th>Visita Anterior</th>
            <th>Visita Actual</th>
            <th>Tendência</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

/* ── Toggle analysis panel open/close ── */
function toggleAnalysisPanel(hdr) {
  hdr.classList.toggle('open');
  const body = hdr.nextElementSibling;
  if (body) body.classList.toggle('open');
}

/* ══════════════════════════════════
   SHARED VISIT CARD
══════════════════════════════════ */
function _fmtDate(d) {
  if (!d) return '—';
  // Handle ISO timestamps: "2026-07-04T22:00:00.000Z" → "2026-07-04"
  if (typeof d === 'string' && d.includes('T')) return d.slice(0, 10);
  return d;
}

function renderVisitCard(v, idx, prefix) {
  const score    = (typeof v.overall_score === 'number' && !isNaN(v.overall_score)) ? v.overall_score : null;
  const fmt      = val => (typeof val === 'number' && !isNaN(val)) ? Math.round(val * 100) + '%' : '—%';
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
            ${_fmtDate(v.visit_date)} &nbsp;·&nbsp;
            ${v.district       || ''} &nbsp;·&nbsp;
            ${v.supervisor_name || ''}
          </div>
        </div>
        <div class="visit-score-col">
          <div class="visit-score-big ${v.traffic_light}">${fmt(score)}</div>
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
  el(`${prefix}-grn`).textContent   = visits.filter(v => v.traffic_light === 'GREEN').length;}

function _setActiveFilter(selector, btn, f) {
  document.querySelectorAll(selector).forEach(b => b.className = 'filter-chip');
  btn.classList.add(f === 'ALL' ? 'f-all' : f === 'RED' ? 'f-red' : f === 'YELLOW' ? 'f-yel' : 'f-grn');
}

function _emptyState(icon, msg) {
  return '<div class="empty-dash"><div class="empty-icon">' + icon + '</div><p>' + msg + '</p></div>';
}
