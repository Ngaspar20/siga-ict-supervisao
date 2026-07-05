/* ══════════════════════════════════════════════════
   STORE  — namespaced localStorage wrapper
   All SIGA-ICT data lives under the 'siga_ict_' namespace.

   Keys used:
     siga_ict_role         → 'district' | 'provincial' | 'national'
     siga_ict_province     → 'Manica' | 'Zambezia' (provincial only)
     siga_ict_draft        → current form autosave object
     siga_ict_history      → Visit[] — submitted visits (newest first)
     siga_ict_queue        → Visit[] — pending sync to Google Sheets
     siga_ict_last_sync    → ISO datetime string
══════════════════════════════════════════════════ */

const NS = 'siga_ict_';

const store = {
  get:    k => { try { return JSON.parse(localStorage.getItem(NS + k)); } catch { return null; } },
  set:    (k, v) => localStorage.setItem(NS + k, JSON.stringify(v)),
  remove: k => localStorage.removeItem(NS + k),
};
