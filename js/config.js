/* ══════════════════════════════════════════════════
   CONFIG  — constants, geo data, module definitions
   SIGA-ICT · Supervisão ICT · RISE / PEPFAR Mozambique
══════════════════════════════════════════════════ */

/* ── Google Apps Script endpoint ── */
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybQMe5WmVMYd3M-8VSdFb1aB5Xo-J-wZdEpXIlG5jG-CpisXx5KXl90bEjimB4VgOBSA/exec';
const SHEET_URL  = 'https://docs.google.com/spreadsheets/d/1mBUjyiU_M35njJMjBbvo9ibZdhoLAwqzMEJWE_xi7rY';

/* ── Scoring thresholds ── */
const THRESHOLD_GREEN  = 0.80;   // ≥ 80 % → BOM
const THRESHOLD_YELLOW = 0.60;   // ≥ 60 % → EM DESENVOLVIMENTO
// < 60 % → INSUFICIENTE

const MODULE_WEIGHTS = { A: 0.15, B: 0.25, C: 0.35, D: 0.25 };

/* ── Geographic hierarchy ── */
const DISTRICTS = {
  'Manica':   ['Barue','Cidade de Chimoio','Gondola','Guro','Machaze','Manica','Mossurize','Sussundenga','Vanduzi'],
  'Zambezia': ['Alto Molocue','Gile','Milange','Mocuba','Nicoadala'],
};

const FACILITIES = {
  'Barue':              ['CS Honde','HD Catandica'],
  'Cidade de Chimoio':  ['CS 1 de Maio','CS 7 De Abril','CS Chissui','CS Eduardo Mondlane','CS Nhamaonha','CS Vila Nova'],
  'Gondola':            ['CS Amatongas','CS Inchope','CS Muda Serracao','HD Gondola'],
  'Guro':               ['CS Guro - Sede','CS Mandie'],
  'Machaze':            ['CS Chipopopo','CS Chipudji','CS Chitobe','CS Mavende','CS Mazwissanga','CS Save'],
  'Manica':             ['CS 4 Congresso','CS Machipanda','CS Manica','CS Messica'],
  'Mossurize':          ['CS Dacata','CS Espungabera','CS Mude','CS Mupengo'],
  'Sussundenga':        ['CS Dombe','CS Munhinga','CS Sussundenga'],
  'Vanduzi':            ['CS Vanduzi'],
  'Alto Molocue':       ['CS Alto Molocue','CS Bonifacio Groveta','CS Nauela','HR Alto Molocue'],
  'Gile':               ['CS Muiane','CS Uape','HD Gile'],
  'Milange':            ['CS Carico','CS Chitambo','CS Dachudua','CS Dulanha','CS Liciro','CS Milange','CS Muanhambo','CS Tengua','CS Vulalo'],
  'Mocuba':             ['CS 16 de Junho','CS Alto Benfica','CS Mocuba','CS Muanaco','CS Mugeba','CS Munhiba','CS Namanjavira','CS Nhaluanda','CS P.Ucerra (Privado)','CS Pedreira','CS Samora Machel','HD Mocuba'],
  'Nicoadala':          ['CS Amoro','CS Licuar','CS Namacata','CS Nicoadala-Sede','CS Quinta Girassol','PS Domela'],
};

/* ── Module A — Consentimento e Confidencialidade (weight 15%) ── */
const MOD_A = [
  { id: 'a1', text: 'A1. Conselheiro explicou testagem voluntária ao cliente' },
  { id: 'a2', text: 'A2. Consentimento explícito obtido antes de prosseguir' },
  { id: 'a3', text: 'A3. Direito de recusa explicado ao cliente' },
  { id: 'a4', text: 'A4. Consentimento documentado no registo' },
  { id: 'a5', text: 'A5. Sessão realizada em espaço privado e confidencial' },
  { id: 'a6', text: 'A6. Dados do cliente tratados com confidencialidade' },
];

/* ── Module B — Protocolo Crítico (weight 25%) — any NÃO = INSUFICIENTE ── */
const MOD_B = [
  { id: 'b1', text: 'B1. Rastreio de VPI realizado em TODOS os clientes' },
  { id: 'b2', text: 'B2. Abordagem de parceiros acordada com o cliente (sem coerção)' },
  { id: 'b3', text: 'B3. Processo de elicitação realizado sem pressão' },
  { id: 'b4', text: 'B4. Resultados corretos comunicados ao cliente e parceiros' },
];

/* ── Module C — Qualidade Clínica e Elicitação (weight 35%, scale 1–4) ── */
const MOD_C = [
  { id: 'c1', text: 'C1. Abordagem estruturada de elicitação de parceiros' },
  { id: 'c2', text: 'C2. Todos os tipos de parceiros cobertos (sexuais, biológicos)' },
  { id: 'c3', text: 'C3. Mínimo de parceiros elicitados por protocolo (≥ 2)' },
  { id: 'c4', text: 'C4. Aconselhamento centrado no cliente' },
  { id: 'c5', text: 'C5. Tempo adequado dedicado ao cliente' },
  { id: 'c6', text: 'C6. Preocupações do cliente abordadas adequadamente' },
  { id: 'c7', text: 'C7. Ligação ao tratamento para parceiros HIV+' },
  { id: 'c8', text: 'C8. Ligação à prevenção para parceiros HIV−' },
];

/* ── Module D — Registos e Qualidade de Dados (weight 25%) ── */
const MOD_D = [
  { id: 'd1', text: 'D1. Registo actualizado e completo' },
  { id: 'd2', text: 'D2. Todos os campos obrigatórios preenchidos' },
  { id: 'd3', text: 'D3. Dados consistentes com o relatório verbal' },
  { id: 'd4', text: 'D4. Acções anteriores acordadas foram abordadas' },
];

/* ── NAV config per role (mirrors RISE ICT Monitor pattern) ── */
const NAV = {
  district: [
    { id: 'form',      icon: '📋', label: 'Formulário' },
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  ],
  provincial: [
    { id: 'dashboard', icon: '📊', label: 'Dashboard Provincial' },
    { id: 'sheets',    icon: '🔗', label: 'Google Sheets' },
  ],
  national: [
    { id: 'dashboard', icon: '📊', label: 'Dashboard Nacional' },
    { id: 'sheets',    icon: '🔗', label: 'Google Sheets' },
  ],
};
