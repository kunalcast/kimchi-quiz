// Shared booth helpers — used by play.html, index.html, admin.html
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(mode, extra) {
  const url = new URL(apiEndpoint(), location.href);
  url.searchParams.set('mode', mode);
  if (extra) Object.entries(extra).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), { redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Simple POST: URLSearchParams body auto-sets application/x-www-form-urlencoded
// (a "simple" content type → no CORS preflight against Apps Script).
async function submitPlay(play) {
  const r = await fetch(apiEndpoint(), { method: 'POST', body: new URLSearchParams(play) });
  const data = await r.json().catch(() => null);
  if (!data || data.result !== 'success') throw new Error('submit failed');
  return data;
}

// Offline-safe submit: 3 retries, then queue in localStorage and retry in background.
// The sheet is the source of truth — a queued play syncs on the next page load.
// Returns the backend response, or null if it never got through.
async function submitPlaySafe(play) {
  for (let i = 0; i < 3; i++) {
    try { return await submitPlay(play); } catch (e) { await sleep(800 * (i + 1)); }
  }
  const q = JSON.parse(localStorage.getItem('kimchi_pending') || '[]');
  q.push(play);
  localStorage.setItem('kimchi_pending', JSON.stringify(q));
  return null;
}

async function flushPending() {
  const q = JSON.parse(localStorage.getItem('kimchi_pending') || '[]');
  const still = [];
  for (const play of q) {
    try { await submitPlay(play); } catch (e) { still.push(play); }
  }
  localStorage.setItem('kimchi_pending', JSON.stringify(still));
  return q.length - still.length;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
