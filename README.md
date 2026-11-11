# 🫙 Kimchi × KubeCon SLC 2026 — Star-to-Win Booth Game

Turn booth foot traffic into GitHub stars for [`getkimchi/kimchi`](https://github.com/getkimchi/kimchi):
attendees scan a QR code → star the repo → play a 10-question quiz (drawn from a bank of 50) →
every play = one entry → **at 5:00 PM we draw ONE lucky winner for a Grand Theft Auto VI disc**
(PS5 or Xbox Series X|S, winner's pick) at the Kimchi booth.

```
Phone (scan QR) → play.html      star repo → quiz → score POSTed
                        ↓
         Google Sheet via Apps Script (free shared backend)
                        ↓
TV (cast from Mac) → index.html  prize art · 5:00 PM countdown · live entry count · QR
Booth Mac        → draw.html     the 5 PM draw · verify ⭐ · no-show redraws (LOCAL-ONLY)
```

| File | What it is |
|---|---|
| `play.html` | Mobile quiz (entry gate → 10 random Qs from the 50-bank, 15s each, speed + streak bonus) — **deployed** |
| `index.html` | TV display — live leaderboard, GTA VI prize rail, draw countdown, live counts — open fullscreen, cast from the Mac — **deployed** |
| `draw.html` | The 5:00 PM lucky draw — pulls the entry pool, spins, verify ⭐, redraw on no-show — **LOCAL-ONLY, never deployed** |
| `config.js` | **The one file you edit** (endpoint URL, prize, draw time, PIN) |
| `apps-script/Code.gs` | The backend — paste into the Google Sheet |
| `tools/mock-server.py` | Local mock backend for testing |

> 🔒 `admin.html` / booth tools stay gitignored on purpose: they only exist in this folder on the booth
> Mac and are never published to GitHub Pages. Double-click `draw.html` to open it (`file://`).
> Its PIN (`config.js → ADMIN_PIN`) guards against shoulder-surfing at the booth.

---

## One-time setup (~10 min)

### 1. Google Sheet + Apps Script backend

1. Go to [sheets.new](https://sheets.new) → name it **Kimchi KubeCon Quiz**
2. Rename the first tab to **`Plays`** (double-click the tab → rename)
3. In row 1 of `Plays`, enter these headers (column **order doesn't matter** — the backend matches
   by header name — but spelling/case does):

   | Timestamp | Name | GitHub | Email | Designation | Company | Score | Correct | DurationSec |
   |---|---|---|---|---|---|---|---|---|

   > ⚠ **Upgrading from the CYpher sheet?** Just insert the `Designation` and `Company` columns —
   > rows written before the change keep their data, new rows fill everything.

4. **Extensions → Apps Script** → delete everything in `Code.gs` → paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs)
5. (Optional but recommended) In the editor toolbar: **Run → initialSetup** → authorize
6. **Deploy → New deployment**
   - Select type (⚙): **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** → authorize the scopes (Google asks once)
7. Copy the **Web app URL** — it ends in `/exec`

> ⚠ **The new Apps Script version is REQUIRED** — redeploy once (Deploy → Manage deployments →
> ✏️ → New version → Deploy). Until you do:
> - `Designation`/`Company` are silently dropped and email stays optional
> - **old CYpher rows stay on the leaderboard** (fresh-board filtering is server-side: the `SINCE`
>   constant at the top of `Code.gs` — data before `2026-11-11 00:00 MST` is ignored everywhere:
>   leaderboard, stats, ticker, draw pool, and the one-play-per-handle dedupe)
>
> Optional housekeeping once the new version is live: delete the old rows in the `Plays` tab
> (keep row 1 headers) — the screens look identical either way.

### 2. Point the site at your backend

Edit [`config.js`](config.js) → replace the `ENDPOINT` value with your `/exec` URL.
(Easiest: open the repo on github.com → config.js → ✏️ edit → paste → commit. Pages updates in ~1 min.)

While you're in `config.js`:
- `DRAW_TIME: '17:00'` — the lucky draw. 24h, **local time of the booth Mac** (Salt Palace = MST).
- `PRIZE_NAME` / `PRIZE_SUB` — what's on screen.
- `ADMIN_PIN` — change it before the doors open.

### 3. Sanity test (2 min)

1. Open the quiz URL on your phone, play one game
2. Check the Google Sheet — your row should be there (name, email, designation, company, GitHub, score)
3. Delete the test rows from the sheet
4. Open the TV URL — the entry counter should bump within 10 seconds

---

## Day-of runbook

### TV (the big screen)
1. On the booth Mac: open the site's **`index.html`** URL
2. Fullscreen: **F11** (or View → Enter Full Screen)
3. Cast the whole screen (System Settings → Displays → AirPlay, or a USB-C/HDMI cable —
   a cable is more reliable than conference wifi)
4. Leave it running. It polls every 10 s and heals itself if wifi drops (shows "reconnecting").
   The countdown targets 5:00 PM in the **Mac's local timezone** — keep the Mac on Salt Lake time.

### The 5:00 PM draw (draw.html — LOCAL-ONLY)
1. On the booth Mac, double-click **`draw.html`** in this project folder (opens as `file://…`, PIN in `config.js`).
   It is intentionally **not** on the website — nobody outside the booth can reach it.
2. At 5:00 PM, gather a crowd → **🎰 DRAW THE WINNER** — it spins and lands on one entry.
3. Winner walks up: **Verify ⭐** → hand over the GTA VI disc. 🎮
   - ⚠ rate-limited → **Profile ↗** opens their stars tab — eyeball it
   - ✗ no star → "star it right now, then re-check" (10 seconds)
4. **No-show or no star:** **✖ Redraw** — the voided pick is logged (struck through) and excluded
   from the next spin.
5. The **Draw log** (local to that Mac's browser) keeps every pick of the day for your records.
   The Google Sheet always has the full entry pool — export it for the lead list
   (name, work email, designation, company are all there).

### Claim rule (say it out loud at the booth)
> "Star the repo, beat the quiz, and you're in the 5 PM draw — one of you drives home with GTA VI.
> Show your ⭐ starred repo to claim the disc."

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Play submitted but fetch "failed" | Known Apps Script quirk — the row usually lands anyway. Check the sheet. |
| TV stuck / reconnecting | Bad wifi. It retries every 10 s — nothing is lost. |
| Score didn't sync from a phone | The play is queued on that phone; it syncs when the page is next opened on wifi. |
| Verify ⭐ rate-limited | Use **Profile ↗** and eyeball the stars tab. |
| Changed Apps Script code | **Deploy → Manage deployments → ✏️ → New version → Deploy** (edits don't auto-update). Same URL. |
| Draw button says "no entries" | Backend didn't return the raffle pool — check wifi, then `config.js → ENDPOINT`. |
| Star count on TV frozen | Backend caches it 60 s; also tolerates offline. Give it a minute. |
| Designation/Company columns empty | Old Apps Script deployment still live — redeploy a new version (see setup ⚠). |

## Notes & guarantees

- **The TV self-updates:** within ~1 minute of any push it reloads itself — page and
  config changes both picked up. Never refresh it by hand mid-event.
- **Fair play:** one play per GitHub username — the backend accepts only the first play from a
  handle (later POSTs are harmless no-ops), and the form warns players to double-check their handle.
  The draw pool is unique handles, so nobody can farm entries.
- **The questions:** a bank of 50 in `play.html` (~30 Software Factory/Gateway/Inference facts +
  ~20 Kubernetes/KubeCon trivia), all backed by kimchi.dev/software-factory and cncf.io — after each
  answer the player sees the fact with its source. 10 are drawn at random per play.
- **Privacy:** full name, work email (required), designation, company, GitHub username and score,
  all in your own Google Sheet.
- **Prize artwork:** `assets/gta-vi-disc.jpg` (the PS5/Xbox box art). To change it later, replace
  that file keeping the same name — no code edits needed.
- **Cache-proofing:** script tags carry `?v=N` and every top-level UI section is fail-soft — a stale
  cached `config.js` after a push can never blank the TV mid-event.
- The Google Sheet is the source of truth — the draw log lives only in that Mac's browser
  (`localStorage`), and the sheet keeps every play if the Mac restarts.
