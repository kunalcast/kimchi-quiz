/**
 * Kimchi × CYpher 2026 — booth quiz backend (Google Apps Script)
 *
 * SETUP (see README.md for the full walkthrough):
 *   1. Create a Google Sheet with a tab named "Plays" and these headers in row 1:
 *      Timestamp | Name | GitHub | Score | Correct | DurationSec
 *   2. Extensions → Apps Script → paste this entire file
 *   3. (Optional but recommended) Run initialSetup() once and authorize
 *   4. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone
 *   5. Copy the /exec URL into config.js ENDPOINT
 */

const SHEET_NAME = 'Plays';
const MAX_SCORE = 2500;   // 10 questions × (100 correct + 50 speed + 100 streak)
const MAX_CORRECT = 10;
const GH_REPO = 'getkimchi/kimchi';

function getDoc_() {
  const key = PropertiesService.getScriptProperties().getProperty('key');
  return key ? SpreadsheetApp.openById(key) : SpreadsheetApp.getActiveSpreadsheet();
}

function initialSetup() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) PropertiesService.getScriptProperties().setProperty('key', active.getId());
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    // Manual parse — e.parameter silently mangles keys with special characters.
    const p = {};
    if (e && e.postData && e.postData.contents) {
      e.postData.contents.split('&').forEach(function (pair) {
        const kv = pair.split('=');
        const k = decodeURIComponent(kv[0] || '').replace(/\+/g, ' ');
        const v = kv.length > 1 ? decodeURIComponent(kv[1] || '').replace(/\+/g, ' ') : '';
        p[k] = v;
      });
    }
    const name = String(p['Name'] || '').substring(0, 40).trim();
    const github = String(p['GitHub'] || '').substring(0, 39).trim();
    if (!name || !/^[A-Za-z0-9-]{1,39}$/.test(github)) {
      return json_({ result: 'error', error: 'invalid name or GitHub username' });
    }
    const score = Math.max(0, Math.min(MAX_SCORE, parseInt(p['Score'], 10) || 0));
    const correct = Math.max(0, Math.min(MAX_CORRECT, parseInt(p['Correct'], 10) || 0));
    const dur = Math.max(0, Math.min(3600, parseInt(p['DurationSec'], 10) || 0));

    const sheet = getDoc_().getSheetByName(SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(function (h) {
      if (h === 'Timestamp') return new Date();
      if (h === 'Name') return name;
      if (h === 'GitHub') return github;
      if (h === 'Score') return score;
      if (h === 'Correct') return correct;
      if (h === 'DurationSec') return dur;
      return '';
    });
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
    return json_({ result: 'success', row: nextRow });
  } catch (err) {
    return json_({ result: 'error', error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const mode = (e && e.parameter && e.parameter.mode) || 'leaderboard';
  try {
    if (mode === 'stars') return json_(stars_());
    if (mode === 'starred') return json_(starred_(e && e.parameter ? e.parameter.user : ''));

    const sheet = getDoc_().getSheetByName(SHEET_NAME);
    const last = sheet.getLastRow();
    const rows = last > 1 ? sheet.getRange(2, 1, last - 1, 6).getValues() : [];

    const best = {};    // github(lower) → best play
    const entries = []; // unique players (raffle pool)
    const recent = [];
    rows.forEach(function (r) {
      const github = String(r[2] || '').trim();
      if (!github) return;
      const rec = {
        name: String(r[1]),
        github: github,
        score: Number(r[3]) || 0,
        correct: Number(r[4]) || 0,
        when: r[0]
      };
      const key = github.toLowerCase();
      if (!best[key]) {
        best[key] = rec;
        entries.push({ name: rec.name, github: github });
      } else if (rec.score > best[key].score) {
        best[key] = rec;
      }
      recent.push(rec);
    });

    const top = Object.values(best)
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 20)
      .map(function (x, i) {
        return { rank: i + 1, name: x.name, github: x.github, score: x.score, correct: x.correct };
      });

    if (mode === 'raffle') return json_({ result: 'success', players: entries.length, entries: entries });

    return json_({
      result: 'success',
      players: entries.length,
      plays: rows.length,
      top: top,
      recent: recent.slice(-6).reverse().map(function (x) {
        return { name: x.name, github: x.github, score: x.score };
      })
    });
  } catch (err) {
    return json_({ result: 'error', error: String(err) });
  }
}

// Live repo star count — fetched from Google's IPs (not the venue's),
// so the shared GitHub rate limit is never a problem. Cached 2 minutes.
function stars_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('stars');
  if (cached) return { result: 'success', stars: Number(cached), cached: true };
  const resp = UrlFetchApp.fetch('https://api.github.com/repos/' + GH_REPO, {
    headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'kimchi-booth' }
  });
  const data = JSON.parse(resp.getContentText());
  cache.put('stars', String(data.stargazers_count), 120);
  return { result: 'success', stars: data.stargazers_count };
}

// Has {user} starred the repo? The per-user check endpoint is gone, so we scan
// their public starred list (most recent first — a star given today is almost
// always on page 1). Runs from Google's IPs; result cached 10 min per user.
function starred_(user) {
  if (!user || !/^[A-Za-z0-9-]{1,39}$/.test(user)) {
    return { result: 'error', error: 'invalid username' };
  }
  const cache = CacheService.getScriptCache();
  const key = 'starred:' + user.toLowerCase();
  const cached = cache.get(key);
  if (cached) return { result: 'success', user: user, starred: cached === 'yes', pages: 0 };

  const MAX_PAGES = 3; // 300 most recent stars — beyond that, ask a human
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const resp = UrlFetchApp.fetch(
        'https://api.github.com/users/' + encodeURIComponent(user) + '/starred?per_page=100&page=' + page,
        { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'kimchi-booth' }, muteHttpExceptions: true }
      );
      const code = resp.getResponseCode();
      if (code === 403 || code === 429) {
        return { result: 'rate_limited', user: user };
      }
      if (code !== 200) {
        return { result: 'error', error: 'HTTP ' + code, user: user };
      }
      const repos = JSON.parse(resp.getContentText());
      if (!Array.isArray(repos)) return { result: 'error', error: 'bad response', user: user };
      for (let i = 0; i < repos.length; i++) {
        if (repos[i] && repos[i].full_name === GH_REPO) {
          cache.put(key, 'yes', 600);
          return { result: 'success', user: user, starred: true, pages: page };
        }
      }
      if (repos.length < 100) break; // list exhausted, not starred
    }
    cache.put(key, 'no', 600);
    return { result: 'success', user: user, starred: false, pages: MAX_PAGES };
  } catch (err) {
    return { result: 'error', error: String(err), user: user };
  }
}
