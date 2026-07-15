# Plan: UK Earnings-History label "Est $ Value" → "Est £ Value"

## Context
Continuing UK GBP localization. The Earnings History table on the UK creator dashboard still has a USD-symbol column header. Change it to the pound sign. US stays USD.

## Change (single line, UK only)
- `uk/creator-dashboard.html:724` — `<th>Est $ Value</th>` → `<th>Est £ Value</th>`
- Do NOT touch `creator-dashboard.html:739` (US — stays `$`).

(The cell values under this column are already converted to `£` from the earlier GBP work in `uk/js/creator-dashboard.js`; this is just the header label.)

## Verification
1. Read-back: `uk/creator-dashboard.html` line 724 reads `Est £ Value`; US line 739 unchanged.
2. Deploy: bump UK cache (or `validate-and-deploy.js` + manual UK `?v=` bump as before), commit `uk/creator-dashboard.html`, push (isolated-worktree push if the data case-collision blocks it).
3. Live check: `https://live.taboost.me/uk/creator-dashboard.html?testUser=stiansings` (hard refresh) — Earnings History header reads "Est £ Value".
