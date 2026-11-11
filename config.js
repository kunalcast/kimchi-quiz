// ── Kimchi × KubeCon SLC 2026 booth config ───────────────────────────
// The ONLY file you need to edit after setup:
//   1. ENDPOINT  — paste your Apps Script web app URL (ends with /exec)
//   2. DRAW_TIME — 24h local booth time when the GTA VI winner is drawn
//   3. ADMIN_PIN — soft PIN for the booth draw page (draw.html)
const CONFIG = {
  REPO_OWNER: 'getkimchi',
  REPO_NAME: 'kimchi',
  REPO_URL: 'https://github.com/getkimchi/kimchi',
  SITE_URL: 'https://kimchi.dev',
  EVENT_NAME: 'KubeCon + CloudNativeCon NA 2026',
  EVENT_CITY: 'Salt Lake City',

  // ⬇ Paste your Apps Script web app URL here (from Deploy → Web app)
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbzMmJJ1XxUbnNOR2sVt_O4ydODukhS-sMSV9fDCIh5wYQG84emyFkndUJo9ZFDnGI_e/exec',

  // ⬇ The prize + draw time (24h, local time of the booth Mac)
  PRIZE_NAME: 'Grand Theft Auto VI',
  PRIZE_SUB: 'GTA VI — winner\'s choice of PS5 or Xbox Series X|S disc',
  DRAW_TIME: '17:00',          // 5:00 PM — lucky draw at the booth
  DRAW_TZ: 'MST',              // label only — Salt Palace local time

  // Booth admin PIN (soft gate for draw.html — change me)
  ADMIN_PIN: '565656',

  // Leave empty to auto-derive the QR target from this site's origin.
  QUIZ_URL: ''
};

// Resolve API endpoint (URL ?endpoint=... overrides — used for local mock testing)
function apiEndpoint() {
  const q = new URLSearchParams(location.search).get('endpoint');
  return q || CONFIG.ENDPOINT;
}

function quizUrl() {
  if (CONFIG.QUIZ_URL) return CONFIG.QUIZ_URL;
  // Works for project pages (github.io/REPO/) and root domains alike
  const dir = location.pathname.replace(/index\.html$/, '');
  return location.origin + dir + (dir.endsWith('/') ? '' : '/') + 'play.html';
}

// Today's draw as a Date in the booth machine's local time zone.
// Returns the next 5:00 PM today; if it already passed, returns tomorrow's
// (the booth resets daily at a multi-day conference).
function drawDate() {
  const m = String(CONFIG.DRAW_TIME || '17:00').match(/^(\d{1,2}):(\d{2})/) || [0, 17, 0];
  const d = new Date();
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

function drawTimeLabel() {
  const m = String(CONFIG.DRAW_TIME || '17:00').match(/^(\d{1,2}):(\d{2})/) || [0, 17, 0];
  let h = parseInt(m[1], 10);
  const mer = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return h + ':' + m[2] + ' ' + mer + (CONFIG.DRAW_TZ ? ' ' + CONFIG.DRAW_TZ : '');
}
