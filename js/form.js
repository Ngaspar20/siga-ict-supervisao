/* ══════════════════════════════════════════════════
   FORM  — module rendering, scoring, autosave, submit
══════════════════════════════════════════════════ */

/* ── In-memory answer state ── */
const answers = {};

/* ── Render a module's question list ── */
function renderModule(containerId, items, type) {
  document.getElementById(containerId).innerHTML = items.map(item => {
    if (type === 'yn' || type === 'yn-no-na') {
      const hasNA = (type === 'yn');
      return `
        <div class="question-block">
          <div class="question-text">${item.text}</div>
          <div class="toggle-group">
            <button class="toggle-btn" onclick="setAnswer('${item.id}','Sim',this)" data-key="${item.id}" data-val="Sim">Sim</button>
            <button class="toggle-btn" onclick="setAnswer('${item.id}','Nao',this)" data-key="${item.id}" data-val="Nao">Não</button>
            ${hasNA ? `<button class="toggle-btn" onclick="setAnswer('${item.id}','NA',this)" data-key="${item.id}" data-val="NA">N/A</button>` : ''}
          </div>
        </div>`;
    }
    // Scale 1–4
    return `
      <div class="question-block">
        <div class="question-text">${item.text}</div>
        <div class="scale-group">
          <button class="scale-btn s1" onclick="setAnswer('${item.id}',1,this)" data-key="${item.id}" data-val="1">1<br>Insuf.</button>
          <button class="scale-btn s2" onclick="setAnswer('${item.id}',2,this)" data-key="${item.id}" data-val="2">2<br>Em dev.</button>
          <button class="scale-btn s3" onclick="setAnswer('${item.id}',3,this)" data-key="${item.id}" data-val="3">3<br>Adequado</button>
          <button class="scale-btn s4" onclick="setAnswer('${item.id}',4,this)" data-key="${item.id}" data-val="4">4<br>Excelente</button>
        </div>
      </div>`;
  }).join('<div class="divider"></div>');
}

/* ── Record an answer and refresh UI ── */
function setAnswer(key, val, btn) {
  answers[key] = val;
  document.querySelectorAll(`[data-key="${key}"]`)
    .forEach(b => b.classList.remove('active-sim', 'active-nao', 'active-na', 'active'));

  if      (val === 'Sim') btn.classList.add('active-sim');
  else if (val === 'Nao') btn.classList.add('active-nao');
  else if (val === 'NA')  btn.classList.add('active-na');
  else                    btn.classList.add('active');

  updateScores();
  autosave();
}

/* ── Compute weighted module scores ── */
function computeScores() {
  // Module A — Yes/No (NA excluded from denominator)
  const aS = MOD_A.map(i => answers[i.id]).filter(v => v === 'Sim' || v === 'Nao').map(v => v === 'Sim' ? 1 : 0);
  const scoreA = aS.length ? aS.reduce((a, b) => a + b, 0) / aS.length : 0;

  // Module B — critical: any Nao → score 0
  const bFail  = MOD_B.map(i => answers[i.id]).some(v => v === 'Nao');
  const scoreB = bFail ? 0 : 1;

  // Module C — scale 1–4
  const cVals  = MOD_C.map(i => answers[i.id]).filter(v => v !== undefined && v !== null);
  const scoreC = cVals.length ? cVals.reduce((a, b) => a + Number(b), 0) / (cVals.length * 4) : 0;

  // Module D — Yes/No
  const dS = MOD_D.map(i => answers[i.id]).filter(v => v === 'Sim' || v === 'Nao').map(v => v === 'Sim' ? 1 : 0);
  const scoreD = dS.length ? dS.reduce((a, b) => a + b, 0) / dS.length : 0;

  const overall = MODULE_WEIGHTS.A * scoreA
                + MODULE_WEIGHTS.B * scoreB
                + MODULE_WEIGHTS.C * scoreC
                + MODULE_WEIGHTS.D * scoreD;

  let tl = overall >= THRESHOLD_GREEN ? 'GREEN' : overall >= THRESHOLD_YELLOW ? 'YELLOW' : 'RED';
  if (bFail) tl = 'RED';

  return { scoreA, scoreB, scoreC, scoreD, overall, tl, bCriticalFail: bFail };
}

/* ── Update the sticky score bar ── */
function updateScores() {
  const s   = computeScores();
  const fmt = v => Math.round(v * 100) + '%';
  const cc  = v => v >= THRESHOLD_GREEN ? 'green' : v >= THRESHOLD_YELLOW ? 'yellow' : 'red';

  ['a','b','c','d'].forEach((m, i) => {
    const sc   = [s.scoreA, s.scoreB, s.scoreC, s.scoreD][i];
    const chip = document.getElementById(`chip-${m}`);
    if (chip) { chip.textContent = `${m.toUpperCase()} ${fmt(sc)}`; chip.className = `score-chip ${cc(sc)}`; }
  });

  const ov  = document.getElementById('score-overall');
  const col = s.tl === 'GREEN' ? '#22c55e' : s.tl === 'YELLOW' ? '#f59e0b' : '#dc3545';
  if (ov) {
    ov.innerHTML   = `<span>${s.tl === 'GREEN' ? '🟢' : s.tl === 'YELLOW' ? '🟡' : '🔴'}</span>${fmt(s.overall)}`;
    ov.style.color = col;
  }
}

/* ── Geographic dropdowns ── */
function populateDistricts() {
  const p = document.getElementById('province').value;
  const s = document.getElementById('district');
  s.innerHTML = '<option value="">Seleccionar...</option>';
  (DISTRICTS[p] || []).forEach(d => s.innerHTML += `<option>${d}</option>`);
  document.getElementById('facility').innerHTML = '<option value="">Seleccionar...</option>';
}

function populateFacilities() {
  const d = document.getElementById('district').value;
  const s = document.getElementById('facility');
  s.innerHTML = '<option value="">Seleccionar...</option>';
  (FACILITIES[d] || []).forEach(f => s.innerHTML += `<option>${f}</option>`);
  autosave();
}

/* ── Autosave draft to store ── */
function autosave() {
  store.set('draft', {
    supervisor_name: _val('supervisor_name'),
    province:        _val('province'),
    district:        _val('district'),
    facility:        _val('facility'),
    visit_date:      _val('visit_date'),
    visit_type:      _val('visit_type'),
    counselor_name:  _val('counselor_name'),
    a_notes:         _val('a_notes'),
    b_notes:         _val('b_notes'),
    c_notes:         _val('c_notes'),
    d_notes:         _val('d_notes'),
    strengths:       _val('strengths'),
    improvements:    _val('improvements'),
    agreed_actions:  _val('agreed_actions'),
    answers:         { ...answers },
  });
}

function _val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

/* ── Restore draft from store ── */
function loadAutosave() {
  const s = store.get('draft');
  if (!s) return;

  const set = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
  set('supervisor_name', s.supervisor_name);
  set('province', s.province);
  if (s.province) populateDistricts();
  set('district', s.district);
  if (s.district) populateFacilities();
  set('facility', s.facility);
  set('visit_date', s.visit_date);
  set('visit_type', s.visit_type);
  set('counselor_name', s.counselor_name);
  set('a_notes', s.a_notes);
  set('b_notes', s.b_notes);
  set('c_notes', s.c_notes);
  set('d_notes', s.d_notes);
  set('strengths', s.strengths);
  set('improvements', s.improvements);
  set('agreed_actions', s.agreed_actions);

  if (s.answers) {
    Object.entries(s.answers).forEach(([k, v]) => {
      const btn = document.querySelector(`[data-key="${k}"][data-val="${v}"]`);
      if (btn) btn.click();
    });
  }
}

/* ── Build and submit visit payload ── */
function submitForm() {
  const sup = _val('supervisor_name').trim();
  const fac = _val('facility');
  const dt  = _val('visit_date');

  if (!sup || !fac || !dt) {
    alert('Preencha: Nome do Supervisor, Unidade Sanitária e Data.');
    return;
  }

  const s       = computeScores();
  const payload = {
    timestamp:       new Date().toISOString(),
    supervisor_name: sup,
    supervisor_role: 'district',
    province:        _val('province'),
    district:        _val('district'),
    facility:        fac,
    visit_date:      dt,
    visit_type:      _val('visit_type'),
    counselor_name:  _val('counselor_name'),
    // Module A
    a1: answers.a1 || '', a2: answers.a2 || '', a3: answers.a3 || '',
    a4: answers.a4 || '', a5: answers.a5 || '', a6: answers.a6 || '',
    a_notes: _val('a_notes'),  score_a: Math.round(s.scoreA * 100) / 100,
    // Module B
    b1: answers.b1 || '', b2: answers.b2 || '', b3: answers.b3 || '', b4: answers.b4 || '',
    b_notes: _val('b_notes'),  score_b: Math.round(s.scoreB * 100) / 100,
    b_critical_fail: s.bCriticalFail,
    // Module C
    c1: answers.c1 || '', c2: answers.c2 || '', c3: answers.c3 || '', c4: answers.c4 || '',
    c5: answers.c5 || '', c6: answers.c6 || '', c7: answers.c7 || '', c8: answers.c8 || '',
    c_notes: _val('c_notes'),  score_c: Math.round(s.scoreC * 100) / 100,
    // Module D
    d1: answers.d1 || '', d2: answers.d2 || '', d3: answers.d3 || '', d4: answers.d4 || '',
    d_notes: _val('d_notes'),  score_d: Math.round(s.scoreD * 100) / 100,
    // Summary
    overall_score:   Math.round(s.overall * 100) / 100,
    traffic_light:   s.tl,
    strengths:       _val('strengths'),
    improvements:    _val('improvements'),
    agreed_actions:  _val('agreed_actions'),
    source:          'html_offline',
  };

  saveToHistory(payload);
  showResult(s, payload);
  sendToSheets(payload);
}

/* ── Build failing fields breakdown ── */
function buildFailingFields(s) {
  const blocks = [];

  // Module A — items answered NÃO
  if (s.scoreA < THRESHOLD_GREEN) {
    const failed = MOD_A.filter(i => answers[i.id] === 'Nao');
    if (failed.length) blocks.push({
      mod: 'A', label: 'Consentimento e Confidencialidade',
      items: failed.map(i => i.text),
      isRed: s.scoreA < THRESHOLD_YELLOW,
    });
  }

  // Module B — critical items answered NÃO
  if (s.bCriticalFail || s.scoreB < THRESHOLD_GREEN) {
    const failed = MOD_B.filter(i => answers[i.id] === 'Nao');
    if (failed.length) blocks.push({
      mod: 'B', label: 'Protocolo Crítico ⚠',
      items: failed.map(i => i.text),
      isRed: true,
    });
  }

  // Module C — items scored 1 or 2
  if (s.scoreC < THRESHOLD_GREEN) {
    const poor = MOD_C.filter(i => answers[i.id] !== undefined && answers[i.id] !== null && Number(answers[i.id]) <= 2);
    if (poor.length) blocks.push({
      mod: 'C', label: 'Qualidade Clínica e Elicitação',
      items: poor.map(i => `${i.text}  [${answers[i.id]}/4]`),
      isRed: s.scoreC < THRESHOLD_YELLOW,
    });
  }

  // Module D — items answered NÃO
  if (s.scoreD < THRESHOLD_GREEN) {
    const failed = MOD_D.filter(i => answers[i.id] === 'Nao');
    if (failed.length) blocks.push({
      mod: 'D', label: 'Registos e Qualidade de Dados',
      items: failed.map(i => i.text),
      isRed: s.scoreD < THRESHOLD_YELLOW,
    });
  }

  return blocks;
}

/* ── Show result modal ── */
function showResult(s, p) {
  const fmt = v => Math.round(v * 100) + '%';
  const tl  = s.tl;
  const col = tl === 'GREEN' ? '#22c55e' : tl === 'YELLOW' ? '#f59e0b' : '#dc3545';
  const emoji = tl === 'GREEN' ? '🟢' : tl === 'YELLOW' ? '🟡' : '🔴';
  const lbl   = tl === 'GREEN' ? 'BOM' : tl === 'YELLOW' ? 'EM DESENVOLVIMENTO' : 'INSUFICIENTE';

  document.getElementById('r-emoji').textContent  = emoji;
  document.getElementById('r-score').textContent  = fmt(s.overall);
  document.getElementById('r-score').style.color  = col;
  document.getElementById('r-label').textContent  = lbl;
  document.getElementById('r-label').style.color  = col;
  document.getElementById('r-meta').textContent   = `${p.facility} · ${p.counselor_name || '—'} · ${p.visit_date}`;

  const mc = sc => sc >= 0.80 ? '#dcfce7;color:#15803d' : sc >= 0.60 ? '#fef9c3;color:#92400e' : '#fee2e2;color:#b91c1c';
  document.getElementById('r-modules').innerHTML =
    [['A · Consentimento', s.scoreA, '15%'],
     ['B · Protocolo',     s.scoreB, '25%'],
     ['C · Qualidade',     s.scoreC, '35%'],
     ['D · Registos',      s.scoreD, '25%']]
    .map(([l, sc, w]) =>
      `<div class="mod-result" style="background:${mc(sc)}">
         <div class="mod-score">${fmt(sc)}</div>
         <div style="font-size:0.7rem">${l}<br><span style="opacity:.7">(${w})</span></div>
       </div>`).join('');

  // ── Failing fields breakdown ──────────────────────────
  const failEl = document.getElementById('r-failures');
  if (tl !== 'GREEN') {
    const blocks = buildFailingFields(s);
    if (blocks.length) {
      const titleDiv = '<div style="font-size:.74rem;font-weight:700;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Campos com falha / pontuação baixa</div>';
      const blockHtml = blocks.map(b => {
        const bg  = b.isRed ? '#fee2e2' : '#fef9c3';
        const clr = b.isRed ? '#b91c1c' : '#92400e';
        const itemsHtml = b.items.map(item => '<div class="fail-item" style="color:' + clr + '">' + item + '</div>').join('');
        return '<div class="fail-block" style="background:' + bg + '"><div class="fail-block-title" style="color:' + clr + '">Módulo ' + b.mod + ' — ' + b.label + '</div>' + itemsHtml + '</div>';
      }).join('');
      failEl.innerHTML = titleDiv + blockHtml;
    } else {
      failEl.innerHTML = '';
    }
  } else {
    failEl.innerHTML = '';
  }

  if (s.bCriticalFail) {
    const el = document.getElementById('r-sync-msg');
    el.textContent = 'FALHA CRITICA — Módulo B. Escalação recomendada.';
    el.style.cssText = 'background:#fee2e2;color:#b91c1c;padding:8px 12px;border-radius:10px;margin-bottom:13px;font-weight:600;font-size:.79rem';
  } else {
    document.getElementById('r-sync-msg').textContent = 'A enviar para Google Sheets...';
    document.getElementById('r-sync-msg').className   = 'result-sync-msg sync-queued';
  }

  document.getElementById('result-panel').classList.add('show');
}

/* ── Close result modal and reset form ── */
function closeResult() {
  document.getElementById('result-panel').classList.remove('show');

  // Clear counselor-specific fields only (keep supervisor/facility for next visit)
  document.getElementById('counselor_name').value = '';
  ['a','b','c','d'].forEach(m => { document.getElementById(m + '_notes').value = ''; });
  document.getElementById('strengths').value      = '';
  document.getElementById('improvements').value   = '';
  document.getElementById('agreed_actions').value = '';

  // Reset all answer buttons
  document.querySelectorAll('.toggle-btn,.scale-btn')
    .forEach(b => b.classList.remove('active-sim','active-nao','active-na','active'));
  Object.keys(answers).forEach(k => delete answers[k]);

  updateScores();
  store.remove('draft');
  window.scrollTo(0, 0);
}
