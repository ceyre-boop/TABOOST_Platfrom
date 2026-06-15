# TABOOST CEO Cockpit — Setup

The CEO dashboard lives at **`live.taboost.me/admin/dashboard.html`** (sign in as Marco).
Each division lights up as you fill in its credential. All config is in **one block** near the top of
`admin/dashboard.html` — search the file for `CONFIG —`.

After editing, save and `git push` (GitHub Pages auto-deploys in ~1 min).

> ⚠️ **Security:** this file is **public** on GitHub Pages — anyone can read its source and see any key
> you put in it. Use **read-only / low-scope** keys, and rotate a key if it ever leaks. (Shop needs no
> key. Firebase config is safe to expose — it's protected by Firestore rules, not secrecy.)

---

## Status of each division

| Division | Needs setup? | Source |
|---|---|---|
| **Live (US & UK)** | ✅ Already working | `data/current.csv` (Google Sheets sync) |
| **Shop** | ✅ Already working — **no setup** | `shop.taboost.me` (public) |
| **Talent** | ⛳ 1 key + 1 CORS setting | `email-automation` API (Render) |
| **Brand Deals** | ⛳ 2 values | Monday.com |
| **GPT Command Center** | ⛳ 1 key | OpenAI |
| **Discord Quick Post** | ⛳ webhook URLs | Discord |
| **Sports** | — Placeholder by design | n/a |

Until a division is configured it shows a small **"integration required"** chip — never a big empty card.

---

## 1. Talent (email-automation)  → real email-ops metrics

The backend is already deployed at `https://email-automation-qp2v.onrender.com` (URL is **prefilled**).
You only need to paste its API key and allow the dashboard's origin.

**Step 1 — get the API key**
1. Go to **render.com → your `email-automation` service → Environment**.
2. Copy the value of the **`API_KEY`** variable.

**Step 2 — paste it into the dashboard**
In `admin/dashboard.html`, find:
```js
const EMAIL_API_KEY = 'REPLACE_ME_EMAIL_API_KEY';
```
Replace `REPLACE_ME_EMAIL_API_KEY` with your key.

**Step 3 — allow the dashboard origin (CORS)**
On Render, set the **`ALLOWED_ORIGINS`** env var to include the dashboard:
```
https://live.taboost.me
```
(comma-separated if you have others). Save — Render redeploys automatically.

**Notes**
- The service is on Render's **free tier**, so it **sleeps**. The first load can take **~50 seconds**
  to wake — the panel shows "Waking email service…". That's expected, not a bug.
- Shows: Emails (7d), Automation %, Time Saved, Human Overrides, Poll Errors, plus a recent activity feed.

---

## 2. GPT Command Center  → AI answers + insight notes

1. Get an API key at **platform.openai.com/api-keys**.
2. In `admin/dashboard.html`, replace:
   ```js
   const OPENAI_KEY = 'REPLACE_ME_OPENAI_KEY';
   ```
   with your key.

This also powers the one-line AI summary under the Live and Shop divisions.

---

## 3. Brand Deals (Monday.com)

1. In Monday: **avatar (bottom-left) → Developers → My access tokens → copy** your API token.
2. Open the board you track deals in; the **board ID** is the number in its URL
   (`monday.com/boards/`**`1234567890`**).
3. In `admin/dashboard.html`, replace:
   ```js
   const MONDAY_TOKEN    = 'REPLACE_ME_MONDAY_TOKEN';
   const MONDAY_BOARD_ID = 'REPLACE_ME_MONDAY_BOARD_ID';
   ```

The board's columns should include something like Talent, Value, Due, Status (the code matches these
loosely by name).

---

## 4. Discord Quick Post

For each channel you want to post to:
1. In Discord: **Server Settings → Integrations → Webhooks → New Webhook**, pick the channel, **Copy Webhook URL**.
2. In `admin/dashboard.html`, replace the matching value:
   ```js
   const DISCORD_WEBHOOKS = {
     announcements:   'REPLACE_ME_DISCORD_ANNOUNCEMENTS',
     managers:        'REPLACE_ME_DISCORD_MANAGERS',
     'talent-general':'REPLACE_ME_DISCORD_TALENT_GENERAL'
   };
   ```

---

## 5. Shop — nothing to do

The Shop division reads public data straight from **`shop.taboost.me/data/shop/totals.csv`** and shows
Total GMV, TAP GMV, Commission, Shop Creators, and Top Creator. It just works. (If the custom domain ever
hiccups it automatically falls back to the GitHub raw URL.)

---

## Deploy

```bash
git add admin/dashboard.html
git commit -m "Configure CEO dashboard integrations"
git push
```

GitHub Pages redeploys automatically. Hard-refresh the dashboard (Cmd/Ctrl+Shift+R) to clear cache.
