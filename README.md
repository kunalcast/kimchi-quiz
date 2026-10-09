# 🫙 Kimchi × CYpher 2026 — Star-to-Win Booth Game

Turn booth foot traffic into GitHub stars for [`getkimchi/kimchi`](https://github.com/getkimchi/kimchi):
attendees scan a QR code → star the repo → play a 10-question quiz → the TV shows a live
leaderboard → the top 10 players each get one of the 10 t-shirts.

```
Phone (scan QR) → play.html      star repo → quiz → score POSTed
                        ↓
         Google Sheet via Apps Script (free shared backend)
                        ↓
TV (cast from Mac) → index.html  live top-10 · live ⭐ count · QR · handout countdown · live cut-off
Booth Mac         → admin.html   pull top 10 · verify ⭐ · track claims
```

| File | What it is |
|---|---|
| `play.html` | Mobile quiz (entry gate → 10 Qs, 15s each, speed + streak bonus) — **deployed** |
| `index.html` | TV display — open fullscreen, cast from the Mac — **deployed** |
| `admin.html` | Booth tools — top-10 winners, star verification, winners CSV — **LOCAL-ONLY, never deployed** |
| `config.js` | **The one file you edit** (endpoint URL, tee count, handout times, PIN) |
| `apps-script/Code.gs` | The backend — paste into the Google Sheet |
| `tools/mock-server.py` | Local mock backend for testing |

> 🔒 `admin.html` is gitignored on purpose: it only exists in this folder on the booth
> Mac and is never published to GitHub Pages. Double-click it to open (`file://`).
> Its PIN (`config.js → ADMIN_PIN`) guards against shoulder-surfing at the booth.

---

## One-time setup (~10 min)

### 1. Google Sheet + Apps Script backend

1. Go to [sheets.new](https://sheets.new) → name it **Kimchi Cypher Quiz**
2. Rename the first tab to **`Plays`** (double-click the tab → rename)
3. In row 1 of `Plays`, enter these headers (case matters — `Email` in column G is optional):

   | A | B | C | D | E | F | G |
   |---|---|---|---|---|---|---|
   | Timestamp | Name | GitHub | Score | Correct | DurationSec | Email |

4. **Extensions → Apps Script** → delete everything in `Code.gs` → paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs)
5. (Optional but recommended) In the editor toolbar: **Run → initialSetup** → authorize
6. **Deploy → New deployment**
   - Select type (⚙): **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** → authorize the scopes (Google asks once)
7. Copy the **Web app URL** — it ends in `/exec`

### 2. Point the site at your backend

Edit [`config.js`](config.js) → replace `PASTE_APPS_SCRIPT_EXEC_URL_HERE` with your `/exec` URL.
(Easiest: open the repo on github.com → config.js → ✏️ edit → paste → commit. Pages updates in ~1 min.)

### 3. Sanity test (2 min)

1. Open the quiz URL on your phone, play one game
2. Check the Google Sheet — your row should be there
3. Delete the test rows from the sheet (or leave them; only-real-player rows matter)
4. Open the TV URL — your score should appear within 10 seconds

---

## Day-of runbook

### TV (the big screen)
1. On the booth Mac: open the site's **`index.html`** URL
2. Fullscreen: **F11** (or View → Enter Full Screen)
3. Cast the whole screen (System Settings → Displays → AirPlay, or a USB-C/HDMI cable —
   a cable is more reliable than conference wifi)
4. Leave it running. It polls every 10 s and heals itself if wifi drops (shows "reconnecting").

### Handing out winners (admin.html — LOCAL-ONLY)
1. On the booth Mac, double-click **`admin.html`** in this project folder (opens as `file://…`, PIN in `config.js`).
   It is intentionally **not** on the website — nobody outside the booth can reach it.
2. Tee handout times live in `config.js → DRAW_TIMES` (`['15:00','17:00','19:00']`) — the TV counts
   down to the next one. Edit on github.com → the TV self-updates within a minute.
3. At handout time: **👕 Pull the top 10** — the current live top N becomes the winners list
   (re-pulling re-syncs ranks from the board and keeps already-verified/claimed marks per handle)
4. Each winner card → **Verify ⭐** (checks their GitHub against the repo via the backend)
   - ✅ verified → hand them a tee → click **Claimed ✓**
   - ⚠ rate-limited → **Profile ↗** opens their stars tab — eyeball it
   - ✗ no star → "star it right now, then re-check" (they just showed up, they can do it in 10 s)
5. **⬇ Export winners CSV** at the end of the day for your records
6. **No-shows:** the **⏳ Standby list** button (opens `standby.html`, same PIN) shows ranks 11-20
   — call the next person down, verify their ⭐, hand them the tee. Each runner-up row has
   Verify ⭐ / Profile ↗ / Absent ✖ (absent marks persist until cleared) and their email if they left one.

### Claim rule (say it out loud at the booth)
> "The top 10 on the TV each win a Kimchi tee — show your ⭐ starred repo to claim it."

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Play submitted but fetch "failed" | Known Apps Script quirk — the row usually lands anyway. Check the sheet. |
| Leaderboard stuck / reconnecting | Bad wifi. It retries every 10 s — nothing is lost. |
| Score didn't sync from a phone | The play is queued on that phone; it syncs when the page is next opened on wifi. |
| Verify ⭐ rate-limited | Use **Profile ↗** and eyeball the stars tab. |
| Changed Apps Script code | **Deploy → Manage deployments → ✏️ → New version → Deploy** (edits don't auto-update). Same URL. |
| Star count on TV frozen | Backend caches it 60 s; also tolerates offline. Give it a minute. |

## Notes & guarantees

- **The TV self-updates:** within ~1 minute of any push it reloads itself — page and
  config changes both picked up. Never refresh it by hand mid-event.
- **Fair play:** one play per GitHub username — the backend accepts only the first play from a
  handle (later POSTs are harmless no-ops), and the form warns players to double-check their handle.
- **Privacy:** name + GitHub username + score are collected, plus an optional email
  (updates), all in your own Google Sheet.
- **Tee artwork:** the prize mockup lives at `assets/tee-mockup.jpg` (TV card) and
  `assets/tee-mockup-thumb.jpg` (phone strips) — swap in a photo of your real t-shirt
  using the same filenames and every page picks it up.
- The Google Sheet is the source of truth — admin page winner state lives in that Mac's browser
  (`Reset winners list` only clears local tracking).
