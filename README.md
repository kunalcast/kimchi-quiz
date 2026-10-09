# 🫙 Kimchi × CYpher 2026 — Star-to-Win Booth Game

Turn booth foot traffic into GitHub stars for [`getkimchi/kimchi`](https://github.com/getkimchi/kimchi):
attendees scan a QR code → star the repo → play a 10-question quiz → the TV shows a live
leaderboard → periodic raffle draws pick who gets the 20–30 t-shirts.

```
Phone (scan QR) → play.html      star repo → quiz → score POSTed
                        ↓
         Google Sheet via Apps Script (free shared backend)
                        ↓
TV (cast from Mac) → index.html  live top-10 · live ⭐ count · QR · raffle countdown
Booth Mac         → admin.html   draw winners · verify ⭐ · track claims
```

| File | What it is |
|---|---|
| `play.html` | Mobile quiz (entry gate → 10 Qs, 15s each, speed + streak bonus) |
| `index.html` | TV display — open fullscreen, cast from the Mac |
| `admin.html` | Booth tools — raffle draw, star verification, winners CSV |
| `config.js` | **The one file you edit** (endpoint URL, draw times, PIN) |
| `apps-script/Code.gs` | The backend — paste into the Google Sheet |
| `tools/mock-server.py` | Local mock backend for testing |

---

## One-time setup (~10 min)

### 1. Google Sheet + Apps Script backend

1. Go to [sheets.new](https://sheets.new) → name it **Kimchi Cypher Quiz**
2. Rename the first tab to **`Plays`** (double-click the tab → rename)
3. In row 1 of `Plays`, enter these exact headers (case matters):

   | A | B | C | D | E | F |
   |---|---|---|---|---|---|
   | Timestamp | Name | GitHub | Score | Correct | DurationSec |

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

### Drawing winners (admin.html)
1. On the booth Mac, open **`/admin.html`** (not linked anywhere; PIN is in `config.js`)
2. When it's raffle time: set the count (e.g. 5) → **🎁 Draw winners**
3. Each winner card → **Verify ⭐** (checks their GitHub against the repo via the backend)
   - ✅ verified → hand them a tee → click **Claimed ✓**
   - ⚠ rate-limited → **Profile ↗** opens their stars tab — eyeball it
   - ✗ no star → "star it right now, then re-check" (they just showed up, they can do it in 10 s)
4. **⬇ Export winners CSV** at the end of the day for your records

### Claim rule (say it out loud at the booth)
> "Winners must show they ⭐ starred `getkimchi/kimchi` to claim a tee."

### Raffle draw times
`config.js → DRAW_TIMES` — the TV counts down to the next one automatically. Change to match
your schedule (24h clock, booth-local time).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Play submitted but fetch "failed" | Known Apps Script quirk — the row usually lands anyway. Check the sheet. |
| Leaderboard stuck / reconnecting | Bad wifi. It retries every 10 s — nothing is lost. |
| Score didn't sync from a phone | The play is queued on that phone; it syncs when the page is next opened on wifi. |
| Verify ⭐ rate-limited | Use **Profile ↗** and eyeball the stars tab. |
| Changed Apps Script code | **Deploy → Manage deployments → ✏️ → New version → Deploy** (edits don't auto-update). Same URL. |
| Star count on TV frozen | Backend caches it 2 min; also tolerates offline. Give it a minute. |

## Notes & guarantees

- **Raffle integrity:** one entry per GitHub username (server dedupes); leaderboard shows best score.
- **Privacy:** only name + GitHub username + score are collected, in your own Google Sheet.
- The Google Sheet is the source of truth — admin page winner state lives in that Mac's browser
  (`Reset winners list` only clears local tracking).
