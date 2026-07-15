# TAP Bonus Requests section on Marco's admin dashboard

> Note: this plan file previously covered the Activity Level tooltip update (shipped and complete). Overwritten for this new, unrelated task.

## Context

TABOOST-Shop (a separate repo, powers shop.taboost.me) just shipped a "TAP Bonus" feature: creators opt in, then claim a cash bonus once they hit a TikTok Shop GMV milestone. Claiming fires a Google Apps Script webhook that emails marco@taboost.me with the creator's name and bonus amount — but that's the *only* place this shows up today. Marco wants the same information available directly on his cockpit (`admin/dashboard.html`) as a simple collapsible table, so he isn't bouncing to email to track outstanding requests.

**Key technical fact that shapes this whole plan**: the Apps Script webhook is fire-and-forget email only — its `doGet` handler always returns an error, so there's no API to read claims back from it. All real state (who opted in, who claimed, which tier) lives in **Firestore**, in the same `taboost-platform` project that `admin/dashboard.html` *already* authenticates against (`const db = firebase.firestore();` is already initialized at line 1112). This means the new section needs zero new auth/config — just new Firestore reads using the compat SDK style already in use here.

**Scope decisions (no response came back when asked, proceeding with the recommended defaults — flag if you want it different):**
- Table shows **claim requests only** (creator, tier, $ amount, claimed date) — this exactly mirrors what's already emailed to you. Opt-in-only creators (haven't hit a tier yet) are not shown; that could be a fast-follow.
- Adds a **"Mark Paid" button** per row, since you said you want to "interact with" it. Marking paid writes back to Firestore and moves the row into a small collapsed "Paid" history sub-list, so the main view naturally shrinks to just what's outstanding.
- No manual refresh button / polling — matches the rest of this dashboard (nothing else here has one; a page reload re-fetches everything via `loadAllDivisions()`).

**Real risk worth knowing about, not something this plan fixes**: TABOOST_Platfrom's own `firestore-production.rules` file does **not** contain the `tapBonusClaims` permission block — only TABOOST-Shop's copy of that file does. Both repos point at the same Firebase project, but only whichever rules file was last actually deployed via `firebase deploy` is what's live; this can't be confirmed by reading files. If Marco's Firestore user doc has `role: 'admin'` (it does — set by `admin/bootstrap-marco.html`) and the Shop repo's rules are the ones actually live, this works with no changes needed here. If not, the new card will show a clear "permission denied" error instead of silently looking empty — see Verification below.

## Implementation

All changes are in **`admin/dashboard.html`** — no other file needs to change, no new Firebase config, no new CSS file.

**1. Tier reference table** (add near the `SHOP_TOTALS_*` constants, ~line 1120) — dollar amounts verified from TABOOST-Shop's `scripts/tap-bonus-email.gs` `TIER_AMOUNTS` (the server-side source of truth; never trust an amount from the client):
```js
const TAP_BONUS_TIERS = {
  tier1: { amount: 500,  label: 'Tier 1', goal: '$100K TAP GMV' },
  tier2: { amount: 1000, label: 'Tier 2', goal: '$250K TAP GMV' },
  tier3: { amount: 1500, label: 'Tier 3', goal: '$1M TAP GMV' }
};
```

**2. New functions**, inserted right after `loadMondayDivision()` closes (~line 1864, immediately before `function draftFollowup`):
- `let _tapBonusClaims = [];` — local cache of fetched claim docs, so "Mark Paid" can re-render without a second Firestore read.
- `async function loadTapBonusDivision()` — `const snap = await db.collection('tapBonusClaims').get();` (a plain one-shot read, no `where`/`orderBy` — combining a filter with a sort would need a composite Firestore index that doesn't exist yet; the collection is small enough to filter/sort client-side, matching how every other section in this file already works). Maps docs into `_tapBonusClaims`, sets `tapBonusKPIs.summary`, calls `renderTapBonusTable()`.
- `function renderTapBonusTable()` — builds the HTML (below) from `_tapBonusClaims`, calls `ensureSection('tapBonusDivision', html)`.
- `async function markTapBonusPaid(claimId)` — the write-back (below).
- `function fmtClaimDate(ts)` — formats a Firestore `Timestamp` field (`ts.toDate().toLocaleDateString()`); this is the first place in the file reading a real Firestore Timestamp back out, everything else here stores plain ISO strings.

**3. Markup** — a native `<details>` element (there's no existing collapsible/accordion component anywhere in this codebase to reuse, and `toggleTriage()`'s single-open-chip-panel pattern is the wrong shape for a persistent table — `<details>` needs zero custom JS toggle logic):
```html
<details id="tapBonusDetails" open>
  <summary>
    <span class="status-dot" id="tapBonusDot"></span>
    TAP Bonus Requests
    <span class="tap-bonus-summary">{N} outstanding · ${total} owed</span>
  </summary>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Creator</th><th>Tier</th><th>Amount</th><th>Claimed</th><th>Action</th></tr></thead>
      <tbody><!-- one row per outstanding claim, or "No outstanding TAP bonus claims" --></tbody>
    </table>
  </div>
  <!-- nested <details class="tap-bonus-history"> with a "Paid (N)" summary, shown only if any exist -->
</details>
```
Reuses the plain `<table>`/`<thead>`/`<tbody>` CSS already defined (~line 535-571) and used verbatim by the Brand Deals table — no new table styling needed. Small CSS addition needed for the `<summary>` (chevron, bottom border matching `.division-card h2`) since no `<details>` exists in the codebase yet — uses the existing `--text`/`--secondary`/`--line` custom properties, not new colors.

**4. Wiring**: add `loadTapBonusDivision()` to the `Promise.allSettled([...])` array in `loadAllDivisions()` (line 1375) so it loads automatically alongside everything else, and add a `TAP BONUS CLAIMS: ${tapBonusKPIs.summary}` line to the GPT Command Center's system prompt (~line 1904) so Marco's AI assistant has this context too, matching how Shop/Monday already feed in.

**5. Empty/error states**, matching `loadShopDivision`'s existing try/catch convention:
- Zero outstanding claims → green dot (`setDot('tapBonusDot', '#00C896')`), table shows "No outstanding TAP bonus claims 🎉".
- Firestore read throws (e.g. the rules-divergence risk above) → red dot (`'#FF0050'`, the exact value `setDot()` checks to flip the card border to "offline"), and the card explicitly renders "TAP bonus claims could not be loaded (permission denied — check Firestore rules)" when `err.code === 'permission-denied'` — so a rules problem shows up as a clear message, not a silently-empty table that could be misread as "no claims."

**6. "Mark Paid" write-back**:
```js
await db.collection('tapBonusClaims').doc(claimId).update({
  paid: true,
  paidAt: firebase.firestore.FieldValue.serverTimestamp()
});
```
One `confirm()` guard before the write (this changes financial-tracking state). The button disables itself during the request. Local state (`_tapBonusClaims`) is only mutated *after* the `await` succeeds — never optimistically before — so a failed write (e.g. permission denied) leaves the row exactly as it was and shows an error toast via the existing `showToast()` helper, rather than the row silently disappearing on a write that didn't actually happen.

## Verification

No build step (static site). After implementing:
1. Open `admin/dashboard.html` signed in as Marco. Confirm the new "TAP Bonus Requests" card appears in the same area as the Brand Deals card, with correct data if any real claims exist (or "No outstanding TAP bonus claims" if none yet — create a test claim via the shop dashboard's opt-in/claim flow if needed to verify end-to-end).
2. **This is the critical check given the rules-divergence risk**: confirm no `permission-denied` error appears. If it does, that confirms TABOOST_Platfrom's stale local rules file (missing the `tapBonusClaims` block) — not this repo's Shop copy — is what's actually deployed, and the fix is a `firebase deploy --only firestore:rules` from whichever repo has the correct/intended rules (a decision and action outside this repo, flag it back rather than guessing).
3. Click "Mark Paid" on a test claim, confirm it moves into the "Paid" sub-list and the write persists across a page reload (re-fetches from Firestore, doesn't just look right from cached local state).
4. Confirm the collapsible `<details>` opens/closes normally and doesn't visually break the `#brandDealsSlot` layout when both the Brand Deals and TAP Bonus cards are present together.
