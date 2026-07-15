# Plan — Backfill Stream Master & Hour Crusher into the month history view

## Context

In the creator dashboard's **month-detail modal** (monthly history view), the achievements strip
never shows **Stream Master** (📺, Days ≥ 22) or **Hour Crusher** (⏰, Hours ≥ 80) for past months.
Marco/creators want to see which achievements were earned in each historical month, not just the
current one.

**Root cause (verified):** the modal reads per-month values from `data/creator_trends.json`. That
file is regenerated **daily** by the GitHub Action (`.github/workflows/update-data.yml`) which runs
`convert_history_csv.py data/history.csv data/creator_trends.json`. `HISTORY.csv` is a rolling
6-month window (currently **Dec 2025 → May 2026**) that carries diamonds/tier/level/rewards/revenue —
but **no hours and no days**. So `creator_trends.json` gets `diamondsHistory[]` but **no
`hoursHistory[]` / `daysHistory[]`**. The modal then hits this gate and hides the whole strip:

```js
// js/creator-dashboard.js  (renderMonthAchievements)
const days  = historyTrends?.daysHistory?.[index];
const hours = historyTrends?.hoursHistory?.[index];
const hasData = !!(historyTrends && row && days !== undefined && days !== -1
                                        && hours !== undefined && hours !== -1);
if (!hasData) { wrapper.style.display = 'none'; return; }   // ← why they never show
```

The historic hours/days *were* pulled once (into `data/creator_history.csv`), but that file is a
**frozen April 15 snapshot**, is **not part of any daily sync**, and covers an older window
(~Sep 2025 → Feb 2026). A feature-branch script (`regenerate_creator_trends.py`) does merge
hours/days but was never wired into CI and hardcodes the stale window.

**Decisions (confirmed with user):**
- Thresholds: Days ≥ 22 = Stream Master, Hours ≥ 80 = Hour Crusher.
- **Backfill only**; defer the ongoing monthly-capture machinery (accepted debt — see Out of Scope).
- Backfill from a **fresh export from Google Sheets**, not the frozen `creator_history.csv`.

### CORRECTION after reading the *deployed* code (was based on the outer feature clone)

The `origin/main` reality differs from what the exploration agents (which read the unmerged
`feature/month-detail-modal` clone) reported. Verified against `origin/main`:
- The **current-month** achievements grid already shows Stream Master + Hour Crusher (live `myData`).
- The **historical month-detail modal** (`MONTH_ACHIEVEMENT_DEFS`, `js/creator-dashboard.js:1233`)
  has only **4** achievements — **Stream Master and Hour Crusher are absent entirely**, not gated.
  The 6-achievement + `daysHistory`/`hoursHistory` version lives only on the unmerged feature branch.
- This clone already **derives month labels dynamically** (`data.months` → Dec 2025…May 2026), so the
  hardcoded-label fix is **not needed here** (that was the outer clone's bug).

So the fix is **two parts**, both required:
1. **UI** — add Stream Master + Hour Crusher to the month modal and compute them per month.
2. **Data** — emit per-month `daysHistory[]` / `hoursHistory[]` into `creator_trends.json`.

---

## Your one deliverable: a fresh export

Re-export from the Sheet (the monthly/per-creator tab that originally produced `creator_history.csv`)
a CSV with **one row per creator per month**, covering the current window (Dec 2025 → May 2026):

| Column | Notes |
|---|---|
| `UID` | Preferred join key — matches `HISTORY.csv` col 0. Include if available. |
| `username` (TikTok handle) | Fallback join key (matches `HISTORY.csv` col 1). |
| `month` | **Unambiguous label**, e.g. `Dec 2025`, `Jan 2026` … `May 2026`. This is what makes alignment robust. |
| `days` | Valid live days that month. |
| `hours` | Hours streamed that month. |

Save as `data/monthly-hours-days.csv`. (If the only practical export matches the existing
`creator_history.csv` shape, that's fine — I'll adapt; a clean `month` label just avoids guesswork.)

---

## Implementation

Work in the active clone `/Users/taboost/TABOOST_Platfrom/TABOOST_Platfrom/` (branch `main`, has the modal).

**Step 0 — Reconcile git first.** Both clones are 9 commits behind `origin/main`. `git pull` to catch
up, then branch (`feat/backfill-month-hours-days`). Avoids conflicts on push and the Antigravity
auto-sync-wipes-edits hazard. Only stage the files this task touches.

**Step 1 — Commit the fresh export** as `data/monthly-hours-days.csv`.

**Step 2 — Teach the CI generator to merge it (so the backfill survives the daily rebuild).**
Extend `convert_history_csv.py` (the script the Action actually runs) to, after building each
creator's `diamondsHistory[]`, populate `daysHistory[]` and `hoursHistory[]` from
`monthly-hours-days.csv`, **aligned by month label** to `HISTORY.csv`'s six month columns (oldest→newest,
same order as `diamondsHistory`). Missing creator-months stay `-1` (correct → strip hidden for that month).
Reuse the proven merge/ordering logic from `regenerate_creator_trends.py` (`build_section_history`,
`load_creator_history_csv`, the oldest→newest reversal) — port it, but key on the explicit `month`
label instead of the unreliable `MonthNum`/serial column.

**Step 3 — Add the two achievements to the deployed month modal (UI).**
In `js/creator-dashboard.js`: (a) attach `days`/`hours` onto each row in `updateHistory()` from the
resolved creator trend's `daysHistory[index]`/`hoursHistory[index]` (same pattern as diamonds/tier;
filter-safe because the click handler passes the true index); (b) add Stream Master (📺) + Hour
Crusher (⏰) to `MONTH_ACHIEVEMENT_DEFS`; (c) extend `renderMonthAchievements`' `unlocked[]` with
`(row.days ?? -1) >= 22` and `(row.hours ?? -1) >= 80`. Missing data → `-1` → shows locked (graceful),
so deploying is harmless even before the data lands. **No month-label fix needed** — labels already
derive from `data.months`.

**Step 4 — Regenerate + deploy.** Run the updated generator locally to rewrite
`data/creator_trends.json`; run `node validate-and-deploy.js` (cache-bust `?v=`); commit + push.
GitHub Pages auto-deploys.

### Files
| File | Change |
|---|---|
| `data/monthly-hours-days.csv` | **NEW** — fresh Sheets export (user provides) |
| `convert_history_csv.py` | Emit `daysHistory[]`/`hoursHistory[]` from sibling `monthly-hours-days.csv`, aligned by month label; graceful if absent |
| `js/creator-dashboard.js` | Attach `days`/`hours` to rows in `updateHistory()`; add Stream Master + Hour Crusher to `MONTH_ACHIEVEMENT_DEFS` + `renderMonthAchievements` (~L1124, L1233, L1250) |
| `data/creator_trends.json` | Regenerated output (committed after export lands) |
| Reuse — `regenerate_creator_trends.py` | Source the merge/ordering logic; do not run as-is (stale window) |

---

## Verification

1. **Data check:** after regenerate, confirm populated arrays for a known creator, e.g.
   `grep -o 'hoursHistory' data/creator_trends.json | wc -l` > 0, and spot-check one creator's
   `daysHistory`/`hoursHistory` are real numbers (not all `-1`) for the covered months.
2. **Survives CI:** re-run `python convert_history_csv.py data/history.csv data/creator_trends.json`
   and confirm hours/days remain populated (proves the daily Action won't wipe the backfill).
3. **Visual (Interceptor, mandatory):** open `creator-dashboard.html` for a creator with a qualifying
   past month (e.g. one with ≥22 days / ≥80 hours), click that month in the history view, and confirm
   **Stream Master** and **Hour Crusher** tiles render and show unlocked, under the correct month label.
   Check the console `DEBUG - Chart labels` line matches the real months.

---

## Out of Scope (accepted debt)

- **Ongoing monthly capture is deferred** (your call). This backfill covers the months in the fresh
  export; when the rolling window advances past them, later months will show blank again until the
  "store from then on" mechanism is built (add HOURS/DAYS column blocks to the Sheet's History tab +
  extend the sync — the clean self-sustaining option). Flagging so it's a known follow-up, not a surprise.
- Not touching Firebase rules, the UK mirror, or the React dashboards.
