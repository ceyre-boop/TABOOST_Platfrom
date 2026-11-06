#!/usr/bin/env node
/* Daily score snapshot for the Manager Hub's "just hit" detection.
 * Usage: node scripts/snapshot-scores.js [data/current.csv]            -> snapshot today (PT)
 *        node scripts/snapshot-scores.js --backfill 7                  -> rebuild from git history
 * Writes data/score_history.json: { version, days: { "YYYY-MM-DD": { username: [score, flags] } } }
 * flags bitmask: 1 = days goal hit, 2 = hours goal hit, 4 = tier diamond goal hit. Keeps 7 days.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const core = require('../js/manager-hub.js').core;

const OUT = path.join(__dirname, '..', 'data', 'score_history.json');
const KEEP = 7;

function ptDate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);
}
function snap(csvText) {
  const o = {};
  core.parseCreators(csvText).creators.forEach(c => {
    const flags = (c.daysGoal > 0 && c.days >= c.daysGoal ? 1 : 0)
      | (c.hrsGoal > 0 && c.hours >= c.hrsGoal ? 2 : 0)
      | (c.tierGoal > 0 && c.diamonds >= c.tierGoal ? 4 : 0);
    o[c.user.toLowerCase()] = [c.score, flags];
  });
  return o;
}
function load() {
  try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { return { version: 1, days: {} }; }
}
function save(h) {
  const keys = Object.keys(h.days).sort().slice(-KEEP);
  const days = {}; keys.forEach(k => { days[k] = h.days[k]; });
  fs.writeFileSync(OUT, JSON.stringify({ version: 1, days }));
  console.log('score_history.json days:', keys.join(', '));
}

const h = load();
if (process.argv[2] === '--backfill') {
  const n = parseInt(process.argv[3] || '7', 10);
  // last commit of each PT day (= that day's final state)
  const lines = execSync('git log --format="%H %aI" -- data/current.csv', { maxBuffer: 1 << 26 }).toString().trim().split('\n');
  const seen = {};
  for (const l of lines) {
    const [hash, iso] = l.split(' ');
    const day = ptDate(new Date(iso));
    if (seen[day]) continue;
    seen[day] = hash;
    if (Object.keys(seen).length > n) break;
  }
  Object.keys(seen).forEach(day => {
    h.days[day] = snap(execSync(`git show ${seen[day]}:data/current.csv`, { maxBuffer: 1 << 26 }).toString());
  });
} else {
  const csv = process.argv[2] || path.join(__dirname, '..', 'data', 'current.csv');
  h.days[ptDate(new Date())] = snap(fs.readFileSync(csv, 'utf8'));
}
save(h);
