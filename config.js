// ── Kimchi × CYpher 2026 booth config ────────────────────────────────
// The ONLY file you need to edit after setup:
//   1. ENDPOINT — paste your Apps Script web app URL (ends with /exec)
//   2. TEES_COUNT — how many leaderboard spots win a tee (TV cut-off + phones)
//   3. DRAW_TIMES — tee handout times; the TV counts down to the next one
//   4. ADMIN_PIN — soft PIN for the booth admin page
const CONFIG = {
  REPO_OWNER: 'getkimchi',
  REPO_NAME: 'kimchi',
  REPO_URL: 'https://github.com/getkimchi/kimchi',
  SITE_URL: 'https://kimchi.dev',
  EVENT_NAME: 'CYpher 2026',

  // ⬇ Paste your Apps Script web app URL here (from Deploy → Web app)
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbzMmJJ1XxUbnNOR2sVt_O4ydODukhS-sMSV9fDCIh5wYQG84emyFkndUJo9ZFDnGI_e/exec',

  // How many t-shirts you're giving away (top N on the leaderboard win)
  TEES_COUNT: 10,

  // Tee handout times (24h clock, booth-local). TV counts down to the next one.
  DRAW_TIMES: ['15:00', '17:00', '19:00'],

  // Booth admin PIN (soft gate for admin.html — change me)
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
