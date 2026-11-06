#!/usr/bin/env node
/* Builds the daily milestone digest per manager from data/current.csv + data/score_history.json.
 * PRINT ONLY — it does not send anything. Wire the output to email/Telegram/n8n once Marco picks
 * the channel and recipients.   Usage: node scripts/manager-digest.js [DYLAN|LEVI|...]
 */
const fs = require('fs');
const path = require('path');
const core = require('../js/manager-hub.js').core;
const root = path.join(__dirname, '..');

const parsed = core.parseCreators(fs.readFileSync(path.join(root, 'data/current.csv'), 'utf8'));
let hist = null;
try { hist = JSON.parse(fs.readFileSync(path.join(root, 'data/score_history.json'), 'utf8')); } catch (e) {}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
const baseDay = hist ? Object.keys(hist.days).filter(d => d < today).sort().pop() : null;
const base = baseDay ? hist.days[baseDay] : null;

function prevFor(c) {
  const v = base && base[c.user.toLowerCase()];
  return v ? { score: v[0], daysHit: !!(v[1] & 1), hoursHit: !!(v[1] & 2), tierHit: !!(v[1] & 4) } : { score: c.score, daysHit: true, hoursHit: true, tierHit: true };
}
const names = Object.keys(core.managerNames(parsed.creators)).filter(n => n !== 'GENIE');
const only = process.argv[2] && process.argv[2].toUpperCase();
names.filter(n => !only || n === only).forEach(n => {
  const mine = parsed.creators.filter(c => c.active && c.managers.indexOf(n) >= 0);
  const items = [];
  mine.forEach(c => core.milestonesFor(c, prevFor(c)).forEach(m => { if (m.big) items.push([c.user, m]); }));
  if (!items.length) return;
  const hit = items.filter(i => i[1].state === 'hit'), about = items.filter(i => i[1].state === 'about');
  console.log(`\n${n[0] + n.slice(1).toLowerCase()} — ${mine.length} active creators (vs ${baseDay || 'n/a'})`);
  if (hit.length) console.log('  Just hit:\n' + hit.map(i => `    • ${i[0]} — ${i[1].title}`).join('\n'));
  if (about.length) console.log('  About to hit:\n' + about.map(i => `    • ${i[0]} — ${i[1].title}`).join('\n'));
});
