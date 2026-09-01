# Firestore Rules — canonical source

**Deploy ONLY `firestore-production.rules`.** All other `*.rules*` files here are
disabled (`.DISABLED`) because deploying them is dangerous or breaks the app.

## ⚠️ SHARED PROJECT — read before deploying
The `taboost-platform` Firebase project is SHARED with **TABOOST-Shop**. The live
ruleset must ALSO contain Shop's `tapBonusClaims` rule. When you publish, MERGE
`firestore-production.rules` with Shop's existing rules — do NOT replace the whole
ruleset and drop Shop's block, or Shop's anti-double-claim breaks.

## Deploy (Firebase Console — no CLI needed)
1. https://console.firebase.google.com/project/taboost-platform/firestore/rules
2. Compare current live rules against `firestore-production.rules`.
3. Keep any Shop-specific blocks (e.g. `tapBonusClaims`) that are NOT in this file.
4. Paste the merged result, **Publish**.

This closes the current open read/write state.
