# TABOOST CEO Cockpit — Setup

The CEO dashboard lives at **`live.taboost.me/admin/dashboard.html`** (sign in as Marco).
**You no longer edit any source file to add keys** — there's a **⚙ Settings** button in the top-right
where you paste them. They save to your private Firebase (admin-only) and sync across your devices.

---

## One-time: publish the Firestore rules

The settings and the GPT memory live in two admin-only Firestore collections. Publish the rules once:

1. **Firebase Console → Firestore Database → Rules**
2. Paste the contents of `firestore-production.rules` (it includes `marco_config` and `marco_memory`)
3. **Publish**

(Until this is done, the dashboard still runs, but it can't save your keys or GPT memory — you'll see a
"Save failed / publish the rule" toast.)

---

## Then: set your keys from the dashboard

Click **⚙ Settings** (top-right) and paste whatever you have:

| Field | Powers | Where to get it |
|---|---|---|
| **OpenAI API key** | Command Center + AI insight notes | platform.openai.com/api-keys |
| **Monday.com API token** | Brand Deals pipeline | Monday → avatar → Developers → My access tokens |
| **Monday board ID** | which board to read | the number in your board's URL |
| **Discord webhooks** (optional) | Quick Post | Discord → Server Settings → Integrations → Webhooks |

Hit **Save & connect** — the divisions reload immediately. The Brand Deals "Connect" button and the
Command Center "Connect OpenAI" prompt both open this same panel.

> 🔒 Keys are stored in your account, **not in the public page source**, so they're not world-readable.
> They're still used in your browser to call OpenAI/Monday directly. Use scoped keys and rotate if needed.

---

## What needs nothing

- **Live · US** (`data/current.csv`) and **Live · UK** (`uk/data/current.csv`) — already live.
- **Shop** — reads public data from `shop.taboost.me`. The full **Shop dashboard** is at
  `live.taboost.me/shop-dashboard.html` (linked from "View Shop Dashboard →").

---

## Tip

If the dashboard ever looks out of date or garbled, hard-refresh (**Cmd/Ctrl + Shift + R**) — that's a
stale browser cache, not the site.
