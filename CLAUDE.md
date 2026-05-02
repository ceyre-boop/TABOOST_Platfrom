# CLAUDE.md — TABOOST Live Platform

## What This Is (The Why)

TABOOST is a TikTok Live talent agency. The Live Platform is the creator-facing performance dashboard — it pulls diamond earnings data from TikTok LIVE and surfaces it to each creator as personalized metrics: their goal progress, growth history, income trajectory, and the agent assigned to them.

**The core purpose: teach creators how their behavior drives income.** Hours streamed, days live, stream consistency — these directly determine diamond earnings. The platform makes that connection visible so creators can self-correct and grow.

This is not a back-office admin tool. It's a product that creators actually use to understand their performance. That framing matters when building features — clarity and motivation are the design goals.

---

## What This Is (The How)

Static HTML/CSS/JS site deployed on GitHub Pages. No backend server. Data lives in compiled JS files derived from CSV exports out of Google Sheets. Firebase Realtime DB handles live read/write for real-time features.

### Data Pipeline
```
Google Sheets (managers enter/update creator data)
  → Google Apps Script (.gs in scripts/) syncs to Firebase
  → Manager exports CSVs → saves to data/
  → node update-data.js  →  writes js/data.js (compiled output)
  → node validate-and-deploy.js  →  bumps ?v= cache-bust timestamps
  → git push  →  GitHub Pages auto-deploys
```

### How It's Made — Key Files
| File | Purpose |
|---|---|
| `js/app.js` | Master creator dataset — ALL_CREATORS array (823 records) |
| `js/data.js` | Extended creatorsData (3762 rows, full metrics) — **compiled output, do not edit** |
| `js/dashboard.js` | Main dashboard logic |
| `js/analytics-engine.js` | Diamonds/hours analytics |
| `js/creator-dashboard.js` | Individual creator detail view |
| `js/firebase-realtime.js` | Firebase Realtime DB operations |
| `js/auth.js` / `js/firebase-auth.js` | Firebase Auth (admin vs creator roles) |
| `js/campaigns.js` | Campaign tracking |
| `js/command-center.js` | Bulk admin operations |
| `update-data.js` | CSV → js/data.js compiler (run locally) |
| `validate-and-deploy.js` | Bumps cache-bust ?v= timestamps before push |
| `scripts/*.gs` | Google Apps Script — Sheets → Firebase sync |

### Key Pages
| Page | Purpose |
|---|---|
| `dashboard.html` / `dash.html` | Main ops dashboard |
| `creators.html` | Full creator roster |
| `creator-dashboard.html` | Individual creator performance page |
| `leaderboard.html` | Diamond leaderboard |
| `campaigns.html` | Campaign manager |
| `admin.html` | Admin panel |
| `command-center.html` | Bulk admin operations |
| `login.html` | Firebase auth |

---

## Creator Data Schema

### Core object (js/app.js — ALL_CREATORS)
```js
{
  username, diamonds, diamondsLast,   // current vs prior period
  hours, streams, followers, days,
  group,      // "Staff" | "Rookie" | etc.
  manager,    // assigned agent username (lowercase)
  joined,     // ISO date
  status
}
```

### Extended object (js/data.js — creatorsData)
Adds: `diamondsGoal`, `diamondsPace`, `diamondsLast30`, `hoursGoal`, `validLiveDays`,
`daysGoal`, `tier`, `earned`, `gifted`, `running`, `multiply`

---

## Auth

- **Admin** — `marco@taboost.me` / `admin`
- **Creator** — any creator username / `creator`

Firebase Auth. Config is hardcoded in HTML (client-side app — security enforced by Firestore rules, not hidden config).

---

## How to Update Creator Data

1. Manager exports CSVs from Google Sheets → saves to `data/`
2. `node update-data.js`
3. `node validate-and-deploy.js`
4. `git add . && git commit && git push`

**Never edit `js/data.js` or `js/app.js` directly** — they are compiled outputs.

---

## React Dashboard (Experimental)
`react-dashboard-latest/` and `react-dashboard-new/` — Vite + React + TypeScript experiments. Not deployed to Pages. Use `react-dashboard-latest/` as the current working version.

---

## Do Not
- Edit `js/data.js` or `js/app.js` by hand
- Add a backend server — this is intentionally static
- Change Firestore security rules without testing in `firestore-setup.rules` first
