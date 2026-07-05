/**
 * SIGA-ICT — Google Apps Script Backend
 * ══════════════════════════════════════════════════════════════
 * Deploy as:  Web App
 *   Execute as:  Me (your email)
 *   Who has access:  Anyone
 *
 * After deploy, paste the Web App URL into js/config.js → SCRIPT_URL
 *
 * Sheet: 'Visits'  (auto-created on first write)
 * ══════════════════════════════════════════════════════════════
 */

const SPREADSHEET_ID = '1mBUjyiU_M35njJMjBbvo9ibZdhoLAwqzMEJWE_xi7rY';
const SHEET_NAME     = 'Visits';

/* ════════════════════════════════════════════════
   POST — receive a visit payload and append a row
════════════════════════════════════════════════ */
function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const sheet = _getOrCreateSheet();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(getHeaders());
    }

    const row = [
      data.timestamp        || '',
      data.supervisor_name  || '',
      data.supervisor_role  || 'district',
      data.province         || '',
      data.district         || '',
      data.facility         || '',
      data.visit_date       || '',
      data.visit_type       || '',
      data.counselor_name   || '',
      // Module A
      data.a1 || '', data.a2 || '', data.a3 || '',
      data.a4 || '', data.a5 || '', data.a6 || '',
      data.a_notes || '',
      data.score_a !== undefined ? data.score_a : '',
      // Module B
      data.b1 || '', data.b2 || '', data.b3 || '', data.b4 || '',
      data.b_notes        || '',
      data.score_b        !== undefined ? data.score_b : '',
      data.b_critical_fail ? 'TRUE' : 'FALSE',
      // Module C
      data.c1 || '', data.c2 || '', data.c3 || '', data.c4 || '',
      data.c5 || '', data.c6 || '', data.c7 || '', data.c8 || '',
      data.c_notes || '',
      data.score_c !== undefined ? data.score_c : '',
      // Module D
      data.d1 || '', data.d2 || '', data.d3 || '', data.d4 || '',
      data.d_notes || '',
      data.score_d !== undefined ? data.score_d : '',
      // Totals
      data.overall_score  !== undefined ? data.overall_score : '',
      data.traffic_light  || '',
      // Summary
      data.strengths      || '',
      data.improvements   || '',
      data.agreed_actions || '',
      data.source         || 'html_offline',
    ];

    sheet.appendRow(row);

    return _json({ status: 'OK' });

  } catch (err) {
    return _json({ status: 'ERROR', message: err.message });
  }
}

/* ════════════════════════════════════════════════
   GET — ping | pull visits (with optional province filter)
   Used by provincial & national dashboards.
════════════════════════════════════════════════ */
function doGet(e) {
  const action   = (e && e.parameter && e.parameter.action)   || 'ping';
  const province = (e && e.parameter && e.parameter.province) || '';

  /* ── Ping ── */
  if (action === 'ping') {
    return _json({ status: 'ok', ts: new Date().toISOString() });
  }

  /* ── Get visits ── */
  if (action === 'get') {
    try {
      const sheet = _getOrCreateSheet();
      if (sheet.getLastRow() <= 1) {
        return _json({ status: 'ok', visits: [] });
      }

      const headers = getHeaders();
      const rows    = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();

      let visits = rows.map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });

      // Optional province filter
      if (province) {
        visits = visits.filter(v => (v.province || '').toLowerCase() === province.toLowerCase());
      }

      return _json({ status: 'ok', visits: visits });

    } catch (err) {
      return _json({ status: 'ERROR', message: err.message, visits: [] });
    }
  }

  return _json({ status: 'unknown_action' });
}

/* ── Column headers (must match doPost row order) ── */
function getHeaders() {
  return [
    'timestamp', 'supervisor_name', 'supervisor_role',
    'province', 'district', 'facility', 'visit_date', 'visit_type', 'counselor_name',
    'a1','a2','a3','a4','a5','a6','a_notes','score_a',
    'b1','b2','b3','b4','b_notes','score_b','b_critical_fail',
    'c1','c2','c3','c4','c5','c6','c7','c8','c_notes','score_c',
    'd1','d2','d3','d4','d_notes','score_d',
    'overall_score','traffic_light',
    'strengths','improvements','agreed_actions','source',
  ];
}

/* ── Internal helpers ── */
function _getOrCreateSheet() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── Manual test — run from Apps Script editor to verify ── */
function testScript() {
  const sheet = _getOrCreateSheet();
  Logger.log('Sheet: ' + sheet.getName() + ' | Rows: ' + sheet.getLastRow());
}
