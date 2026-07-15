# Plan: Add a REGISTRATION campaign tag (bright orange)

## Context

The "MY CAMPAIGNS" popup that creators see (the modal in the screenshot — TikTok logo,
title, a campaign card with a colored pill, date range, and a "View →" link) supports a few
badge types today: **HOT** (gold), **NEW** (pink), **FINISHED** (gray), and a default cyan
card when no badge is set. The user wants a new **REGISTRATION** tag — a bright-orange pill in
the same family as NEW/HOT/FINISHED — to flag campaigns that creators need to sign up for.

The chosen look is the **full treatment** (matching how NEW works): an orange pill **plus** a
pulsing orange card border/glow **plus** an orange "View →" arrow.

This is purely additive — it introduces a new badge option without touching the existing ones.

## Where this lives

The popup is rendered **inline** inside two HTML files (not in `campaigns.js`, and not via
the unused `.badge-new` CSS class in `css/campaigns.css`):

- `creator-dashboard.html` — primary
- `uk/creator-dashboard.html` — UK copy, identical logic at different line numbers

Both read `data/campaigns.csv`. **Row 5** of that CSV is the per-campaign badge value
(`FEATURE` → FEATURED, `NEW`, `FINISHED`, or blank). The renderer maps that value to three
coordinated styles via ternaries: `cardStyle`, `badgePill`, and `arrowColor`.

Both files must be changed identically — the grep (`rg -l "camp-red-pulse"`) confirms these are
the only two copies.

## Changes

### 1. Add the `camp-orange-pulse` keyframe

In each file's badge `<style>` block (alongside `camp-gold-pulse` / `camp-red-pulse` —
`creator-dashboard.html` ~lines 1428-1437; `uk/creator-dashboard.html` ~line 1314), add:

```css
@keyframes camp-orange-pulse {
  0%,100% { box-shadow: 0 0 10px rgba(255,122,0,.25), 0 0 0 1px rgba(255,122,0,.4); }
  50%      { box-shadow: 0 0 22px rgba(255,122,0,.55), 0 0 0 1px rgba(255,122,0,.75); }
}
```

### 2. Add a `REGISTRATION` branch to all three ternaries

In the `toShow.map(c => { ... })` render block (`creator-dashboard.html` lines 1508-1537;
`uk/creator-dashboard.html` ~lines 1390-1410):

**`cardStyle`** — add a `REGISTRATION` branch (after the `NEW` branch):
```js
: b === 'REGISTRATION'
? 'background:rgba(255,122,0,0.07);border-color:rgba(255,122,0,0.5);animation:camp-orange-pulse 2s ease-in-out infinite;'
```

**`badgePill`** — add a `REGISTRATION` branch (orange gradient pill, white text, same
shape/weight as the NEW pill):
```js
: b === 'REGISTRATION'
? `<span style="background:linear-gradient(135deg,#ff6a00,#ff9500);color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:8px;letter-spacing:0.4px;flex-shrink:0;">REGISTRATION</span>`
```

**`arrowColor`** — add `REGISTRATION` to the chain so the "View →" arrow goes orange:
```js
const arrowColor = b === 'FEATURED' ? '#ffc800' : b === 'NEW' ? '#ff3366' : b === 'REGISTRATION' ? '#ff9500' : '#00ccff';
```

### 3. Update the CSV format comment

In both files, update the inline comment describing row 5 (e.g. `creator-dashboard.html`
line 1441) so it reads `(FEATURED|NEW|FINISHED|REGISTRATION|blank)`. Documentation only.

### 4. Turn it on for a campaign (data)

The tag only appears when a campaign's **row 5 in `data/campaigns.csv`** is set to
`REGISTRATION`. No campaign uses it yet (current row 5 values are `FEATURE`, `NEW`). To flag a
campaign for registration, set its row-5 cell to `REGISTRATION` (via the Google Sheet → export,
or directly in `data/campaigns.csv`). This is the normal data-update path, not part of the code
change — call out to the user which campaign(s) should carry it.

## Notes / constraints

- One badge per campaign (single row-5 value) — REGISTRATION is mutually exclusive with NEW/HOT/
  FINISHED, same as the others. No multi-badge support is being added.
- No emoji on the pill (matches NEW). The word "REGISTRATION" is longer than NEW/HOT, but the
  pill auto-sizes and the row already wraps (`flex-wrap:wrap`).
- Do **not** touch `js/campaigns.js` or `css/campaigns.css` — that badge system renders the
  separate main `campaigns.html` page and is not what the screenshot shows.
- Per project CLAUDE.md: `creator-dashboard.html` is hand-edited source (not a compiled output
  like `js/data.js`), so editing it directly is correct. No `update-data.js` run needed for the
  code change.

## Verification

1. Temporarily set one test campaign's row-5 value to `REGISTRATION` in `data/campaigns.csv`,
   making sure a known test creator username appears in that campaign's column (rows 6+).
2. Use the **Interceptor** skill to open `creator-dashboard.html` (served locally or on the live
   site), log in as that test creator, and trigger the MY CAMPAIGNS popup.
3. Confirm: the campaign card shows the bright-orange **REGISTRATION** pill, an orange pulsing
   border/glow, and an orange "View →" arrow — matching the chosen mockup.
4. Confirm existing badges are unaffected: a `NEW` campaign still renders pink, `FEATURE` still
   gold, `FINISHED` still gray, blank still cyan.
5. Repeat the visual check against `uk/creator-dashboard.html`.
6. Deploy via the normal path: `node validate-and-deploy.js` (bumps `?v=` cache-bust), then
   `git add . && git commit && git push` (GitHub Pages auto-deploys). Re-verify on the live URL
   with Interceptor.
