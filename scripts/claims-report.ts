#!/usr/bin/env bun
// Monthly Agency Cash Bonus claim report.
// Joins Firestore `cashbackClaims` (who clicked CLAIM) with the live sheet's
// `LM Bonus` column (who was eligible, and for how much).
//
//   bun run claims-report              → report for the current claim window
//   bun run claims-report 2026-08      → report for a past qualification month
//   bun run claims-report --local      → use data/current.csv instead of origin/main
//
// Firestore is read via the public REST API with the client API key. This works
// only while the deployed ruleset allows unauthenticated reads of cashbackClaims.

const PROJECT = 'taboost-platform';
const API_KEY = 'AIzaSyBrApQHC1Fvbjm9EVTptt2kNG2mDb1PzXE';
const RAW_CSV = 'https://raw.githubusercontent.com/ceyre-boop/TABOOST_Platfrom/main/data/current.csv';

const args = process.argv.slice(2);
const useLocal = args.includes('--local');
const monthArg = args.find(a => /^\d{4}-\d{2}$/.test(a));

function qualMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const month = monthArg ?? qualMonth();

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
const money = (s: string | undefined) => parseFloat((s ?? '0').replace(/[$,]/g, '')) || 0;
const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pt = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// --- claims ---
type Claim = { name: string; month: string; at: string };
const claims: Claim[] = [];
let pageToken = '';
do {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/cashbackClaims?pageSize=300&key=${API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`Firestore read failed: ${res.status} ${await res.text()}`); process.exit(1); }
  const j = await res.json() as any;
  for (const d of j.documents ?? []) {
    claims.push({ name: d.fields?.creatorName?.stringValue ?? '', month: d.fields?.month?.stringValue ?? '', at: d.fields?.claimedAt?.timestampValue ?? '' });
  }
  pageToken = j.nextPageToken ?? '';
} while (pageToken);

// --- sheet ---
let csv: string;
if (useLocal) csv = await Bun.file('data/current.csv').text();
else {
  const r = await fetch(RAW_CSV);
  if (!r.ok) { console.error(`CSV fetch failed: ${r.status}`); process.exit(1); }
  csv = await r.text();
}
const lines = csv.split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines[0]);
const sheetDate = header[2] ?? '?';
const iLM = header.indexOf('LM Bonus'), iScore = header.indexOf('Score'), iAgent = header.indexOf('Agent');
if (iLM < 0) { console.error('LM Bonus column not found in CSV header'); process.exit(1); }
const rows = lines.slice(1).map(parseCsvLine).map(r => ({
  name: (r[2] ?? '').trim(), lm: money(r[iLM]), score: r[iScore] ?? '', agent: r[iAgent] ?? '',
}));

// --- join ---
const eligible = rows.filter(r => r.lm > 0).sort((a, b) => b.lm - a.lm);
const monthClaims = claims.filter(c => c.month === month);
const byName = new Map(monthClaims.map(c => [c.name.toLowerCase(), c]));
const claimed = eligible.filter(e => byName.has(e.name.toLowerCase()));
const unclaimed = eligible.filter(e => !byName.has(e.name.toLowerCase()));
const orphans = monthClaims.filter(c => !eligible.some(e => e.name.toLowerCase() === c.name.toLowerCase()));
const sum = (xs: { lm: number }[]) => xs.reduce((a, b) => a + b.lm, 0);

console.log(`# Bonus claim report — qualification month ${month}`);
console.log(`Sheet date ${sheetDate} · ${useLocal ? 'local' : 'origin/main'} CSV · ${monthClaims.length} claims in Firestore\n`);
console.log(`## Claimed — ${claimed.length} creators, ${fmt(sum(claimed))}\n`);
console.log('| Creator | LM Bonus | Score | Agent | Claimed (PT) |\n|---|---|---|---|---|');
for (const e of claimed) console.log(`| ${e.name} | ${fmt(e.lm)} | ${e.score} | ${e.agent} | ${pt(byName.get(e.name.toLowerCase())!.at)} |`);
console.log(`\n## Eligible, did not claim — ${unclaimed.length} creators, ${fmt(sum(unclaimed))}\n`);
console.log('| Creator | LM Bonus | Score | Agent |\n|---|---|---|---|');
for (const e of unclaimed) console.log(`| ${e.name} | ${fmt(e.lm)} | ${e.score} | ${e.agent} |`);
console.log(`\nTotals: ${eligible.length} eligible for ${fmt(sum(eligible))} · ${claimed.length} claimed (${eligible.length ? Math.round(100 * claimed.length / eligible.length) : 0}%) · ${unclaimed.length} unclaimed`);
if (orphans.length) {
  console.log(`\n⚠ Claims with no LM Bonus in the sheet (check before paying): ${orphans.map(o => `${o.name} @ ${pt(o.at)}`).join(', ')}`);
}
const hist: Record<string, number> = {};
for (const c of claims) hist[c.month] = (hist[c.month] ?? 0) + 1;
console.log(`\nClaim history: ${Object.keys(hist).sort().map(m => `${m}: ${hist[m]}`).join(' · ')}`);
