# TABOOST CEO Cockpit — Setup

The CEO dashboard lives at **`live.taboost.me/admin/dashboard.html`** (sign in as Marco).
All config is in **one block** near the top of `admin/dashboard.html` — search the file for `CONFIG —`.

After editing, save and `git push` (GitHub Pages auto-deploys in ~1 min, then hard-refresh: Cmd/Ctrl+Shift+R).

> ⚠️ **Security:** this file is **public** on GitHub Pages — anyone can read its source and see any key
> you put in it. Use **read-only / low-scope** keys, and rotate a key if it ever leaks. (Live + Shop need
> no key. Firebase config is safe to expose — it's protected by Firestore rules, not secrecy.)

---

## Divisions

| Division | Needs setup? | Source |
|---|---|---|
| **Live · US** | ✅ Already working | `data/current.csv` |
| **Live · UK** | ✅ Already working | `uk/data/current.csv` |
| **Shop** | ✅ Already working — **no setup** | `shop.taboost.me` (public) |
| **Brand Deals** | ⛳ 2 values | Monday.com |
| **GPT Command Center** | ⛳ 1 key + 1 rules publish | OpenAI + Firebase |

Until a division is configured it shows a small **"integration required"** chip — never a big empty card.

---

## 1. GPT Command Center  (with learning memory)

The GPT remembers and learns from every exchange. Memory is stored in **Firebase** (secured to Marco,
syncs across devices) and can be exported to Obsidian markdown anytime from the rail (**Export .md**).

**A. OpenAI key**
1. Get a key at **platform.openai.com/api-keys**.
2. In `admin/dashboard.html`, replace `REPLACE_ME_OPENAI_KEY` with your key.
   (This also powers the one-line AI summaries under the Live and Shop cards.)

**B. Publish the memory's Firestore rule (one time)**
The memory lives in a `marco_memory` collection. The rule is already in `firestore-production.rules`:
```
match /marco_memory/{docId} { allow read, write: if isAdmin(); }
```
Publish it: **Firebase Console → Firestore Database → Rules** → paste the contents of
`firestore-production.rules` → **Publish**. (Firestore rules don't deploy via git.)
Until you publish, the GPT still answers but can't save memory (you'll see a "Memory save failed" toast).

**How it learns:** after each answer, a quick second call extracts any durable fact about how you run
the agency (preferences, decisions, priorities) and saves it. The rail shows the learning count, and
**Export .md** downloads everything as an Obsidian-ready note. **Clear memory** wipes it.

---

## 2. Brand Deals (Monday.com)

1. In Monday: **avatar (bottom-left) → Developers → My access tokens → copy** your API token →
   paste over `REPLACE_ME_MONDAY_TOKEN`.
2. Open your deals board; the number in its URL (`monday.com/boards/`**`1234567890`**) is the **board ID**
   → paste over `REPLACE_ME_MONDAY_BOARD_ID`.

The board's columns should include something like Talent, Value, Due, Status (matched loosely by name).

---

## 3. Discord Quick Post

For each channel: Discord → **Server Settings → Integrations → Webhooks → New Webhook** → copy URL →
paste over the matching value:
```js
const DISCORD_WEBHOOKS = {
  announcements:   'REPLACE_ME_DISCORD_ANNOUNCEMENTS',
  managers:        'REPLACE_ME_DISCORD_MANAGERS',
  'talent-general':'REPLACE_ME_DISCORD_TALENT_GENERAL'
};
```

---

## Live & Shop — nothing to do

- **Live · US** reads `data/current.csv`; **Live · UK** reads `uk/data/current.csv` (both from the
  Google Sheets sync). The top **Scorecard** shows US + UK combined.
- **Shop** reads public data from **`shop.taboost.me`** (Total GMV, TAP GMV, Commission, Shop Creators,
  Top Creator). It just works; falls back to the GitHub raw URL if the custom domain hiccups.

---

## Deploy

```bash
git add admin/dashboard.html
git commit -m "Configure CEO dashboard"
git push
```

GitHub Pages redeploys automatically. Hard-refresh (Cmd/Ctrl+Shift+R) to clear cache.
