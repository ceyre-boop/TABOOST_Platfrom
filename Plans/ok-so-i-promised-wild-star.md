---
task: Play the TABOOST "Genie Reveal" intro on every login / refresh / agent↔creator switch
slug: genie-intro-everywhere
effort: E3
phase: plan
project: TABOOST Platform
---

# Genie intro on every dashboard load (and view-switch)

## Context
There's a finished brand intro animation — the **"Genie Reveal"** — fully spec'd in Obsidian at
`~/Obsidian/Obsidian/TABOOST-Intro-Animation.md` (canonical source: TABOOST-Shop `genie-preview`,
`css/genie.css` + `index.html`). It's a self-contained HTML/CSS/JS overlay (~2.25s): dark stage,
expanding hot-red rings, **TABOOST** wordmark, genie icon bounces in then zooms through the screen, tagline
**"Your Hustle. Amplified."**, then fades and removes itself. No libraries, respects
`prefers-reduced-motion`, `z-index:99999`.

Marco wants it to play **first, for everyone (including himself), on every login and every refresh**, and
**again whenever an agent switches agent↔creator view (both directions)**. The spec's default plays *once
per session* — we **drop that guard** so it replays every load, and add a replay hook for the view-switch.

## Approach (DRY, with admin kept separate)
**1. New `js/genie-intro.js`** (shared, creator-side). Self-contained:
- Injects its `<style>` once (the genie CSS from the Obsidian note), and defines `window.playGenieIntro()`
  which builds the `#genie-intro` overlay (image `/images/taboost-genie.jpg` — absolute, works from `/`,
  `/uk/`, `/admin/`), appends to `<body>`, then `setTimeout 1700 → .genie-exit → 580ms → remove`.
- **Auto-plays on load every time** (DOMContentLoaded / immediate) — **no `sessionStorage` guard**, so login
  *and* refresh both trigger it. Skips entirely under `prefers-reduced-motion`. Calling `playGenieIntro()`
  again re-creates the overlay → clean replay. Image verified present at repo-root `images/taboost-genie.jpg`.

**2. Include it** via absolute path on each authenticated dashboard (so login → land on dashboard → it plays
first; refresh → plays again):
`<script src="/js/genie-intro.js" defer></script>` on:
`creator-dashboard.html`, `agent-dashboard.html`, `dashboard.html`, `managers.html`, `dash.html`
+ their `uk/` counterparts (`uk/creator-dashboard.html`, `uk/agent-dashboard.html`, `uk/dashboard.html`,
`uk/managers.html`, `uk/dash.html`). *(Not on login pages — it should play once you're in.)*

**3. Agent↔creator replay** — in `creator-dashboard.html` + `uk/creator-dashboard.html`, add
`window.playGenieIntro && window.playGenieIntro();` at the top of `window.toggleAgentPanel` (line ~1259;
it calls `showCreatorPanel`/`showAgentPanel`, so this covers **both** directions on the user's toggle —
not on initial load, avoiding a double-play).

**4. Marco's cockpit, kept separate** — per the standing "CEO dashboard = zero shared files with the creator
side" rule, give `admin/dashboard.html` its **own** `admin/genie-intro.js` (identical copy) included as
`<script src="genie-intro.js" defer></script>`. No dependency on the shared creator-side file.

## Behavior summary
- Login (land on any dashboard) → plays first. ✓  Refresh → plays again. ✓
- Agent taps "Agent View" or "Creator View" → replays each way. ✓
- `prefers-reduced-motion` users → skipped. ✓  Overlay self-removes (no leftover stacking context). ✓

## Critical files
- **New:** `js/genie-intro.js` (shared, creator-side) + `admin/genie-intro.js` (cockpit copy).
- **Edited (add `<script>` include):** `creator-dashboard.html`, `agent-dashboard.html`, `dashboard.html`,
  `managers.html`, `dash.html`, `admin/dashboard.html`, and the five `uk/` counterparts.
- **Edited (toggle replay):** `creator-dashboard.html`, `uk/creator-dashboard.html` (`toggleAgentPanel`).
- Source of truth for the markup/CSS/timings: `~/Obsidian/Obsidian/TABOOST-Intro-Animation.md`.

## Verification (headless Chrome — existing harness)
1. Load `creator-dashboard.html?testUser=skylerclarkk` → `#genie-intro` overlay present on load with the
   genie image, rings, wordmark, tagline; it self-removes after ~2.3s (poll DOM at 0.5s = present, at 3s =
   gone). Repeat a second load → it plays **again** (no session guard).
2. Call `toggleAgentPanel()` (or `playGenieIntro()`) post-load → overlay re-appears (replay) → confirms the
   agent↔creator hook.
3. Spot-check one of each surface type: `dashboard.html`, `agent-dashboard.html`, `admin/dashboard.html`
   (uses its own `admin/genie-intro.js`), and a `uk/` page → overlay plays via the absolute `/js/` (and
   `/images/`) paths from each depth.
4. `node --check` `js/genie-intro.js` + `admin/genie-intro.js`. Scoped commit → push → verify live (grep the
   `<script>` include + that `genie-intro.js` is served) → remind hard-refresh.

## Out of scope
Login pages (`firebase-login.html` etc.), the redesign of the animation itself (use the spec as-is), any
data/auth/Firebase logic. Won't change existing dashboard behavior beyond adding the overlay.
