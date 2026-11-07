/* Manager Hub — roster + milestone watch for managers (Dylan, Levi, …) and Marco.
 * Reads data/current.csv only (same file the creator dashboard + agent page use).
 * Pure logic lives in window.ManagerHub.core so it can be unit-tested in node.
 * Auth/role gating is done by manager-dashboard.html, which calls ManagerHub.init().
 */
(function (root) {
  'use strict';

  var BIG_SCORES = [50, 70, 90];
  var ALL_SCORES = [30, 50, 70, 90];
  var SCORE_LABEL = {
    30: 'Score 30 · Rewards',
    50: 'Score 50',
    70: 'Score 70 · Cash Bonus',
    90: 'Score 90 · Rank Boost'
  };

  /* ───────────── CSV ───────────── */
  function parseCsv(text) {
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function num(s) {
    var v = parseFloat(String(s == null ? '' : s).replace(/[^0-9.\-]/g, ''));
    return isFinite(v) ? v : 0;
  }
  function col(headers) {
    var names = Array.prototype.slice.call(arguments, 1);
    for (var n = 0; n < names.length; n++) {
      var i = headers.findIndex(function (h) { return (h || '').trim() === names[n]; });
      if (i >= 0) return i;
    }
    return -1;
  }

  /* ───────────── Creators ───────────── */
  // First row per username wins (the sheet lists the current month first).
  function parseCreators(csvText) {
    var rows = parseCsv(csvText);
    if (!rows.length) return { creators: [], stamp: '' };
    var h = rows[0];
    var iAgentMgr = h.map(function (x) { return (x || '').trim(); }).lastIndexOf('Agent');
    var iAgentRec = col(h, 'Agent');
    var I = {
      cid: 1, user: 2,
      level: col(h, 'Level'), days: col(h, 'Days'), daysGoal: col(h, 'Days Goal'),
      hours: col(h, 'Hours'), hrsGoal: col(h, 'Hrs Goal'), hoursLeft: col(h, 'Hours Left'),
      dia: col(h, '💎', '?'), tier: col(h, 'Tier'), tierGoal: col(h, 'Tier Goal'),
      tierLeft: col(h, 'Tier Left'), tierStatus: col(h, 'Tier Status'),
      score: col(h, 'Score'), active: col(h, 'Active'), link: col(h, 'Link')
    };
    var seen = {}, out = [];
    for (var r = 1; r < rows.length; r++) {
      var x = rows[r];
      var user = (x[I.user] || '').trim();
      if (!user || seen[user.toLowerCase()]) continue;
      seen[user.toLowerCase()] = 1;
      // Co-managed creators read "DYLAN + BRYTON" — split so each manager sees them.
      var managers = (x[iAgentMgr] || '').toUpperCase().split('+').map(function (n) { return n.trim(); })
        .filter(function (n) { return n && n !== 'N/A' && n !== '#N/A'; });
      var rec = (x[iAgentRec] || '').trim().toUpperCase();
      out.push({
        cid: x[I.cid], user: user,
        managers: managers, manager: managers.join(' + '),
        recruiter: rec,
        active: (x[I.active] || '').trim().toUpperCase() === 'Y',
        level: num(x[I.level]),
        score: num(x[I.score]),
        days: num(x[I.days]), daysGoal: num(x[I.daysGoal]),
        hours: num(x[I.hours]), hrsGoal: num(x[I.hrsGoal]), hoursLeft: num(x[I.hoursLeft]),
        diamonds: num(x[I.dia]),
        tier: num(x[I.tier]), tierGoal: num(x[I.tierGoal]), tierLeft: num(x[I.tierLeft]),
        tierStatus: (x[I.tierStatus] || '').trim(),
        link: (x[I.link] || '').trim()
      });
    }
    return { creators: out, stamp: (h[2] || '').trim() };
  }

  /* ───────────── Milestones ───────────── */
  // Which score thresholds a creator is near / has crossed. `prev` = last-seen snapshot (or null).
  function milestonesFor(c, prev) {
    var items = [];
    var s = c.score;

    ALL_SCORES.forEach(function (T) {
      var big = BIG_SCORES.indexOf(T) >= 0;
      if (s < T) {
        var gap = T - s, win = big ? 5 : 3;
        if (gap <= win) items.push({ kind: 'score', state: 'about', big: big, target: T, gap: gap,
          title: gap + ' pt' + (gap === 1 ? '' : 's') + ' from ' + SCORE_LABEL[T], pri: (big ? 0 : 40) + gap });
      } else {
        var fresh = prev ? (prev.score < T) : (s - T <= 2 && big);
        if (fresh) items.push({ kind: 'score', state: 'hit', big: big, target: T, gap: 0,
          title: 'Hit ' + SCORE_LABEL[T] + ' (now ' + s + ')', pri: (big ? -10 : 30) });
      }
    });

    if (c.daysGoal > 0) {
      var dl = c.daysGoal - c.days;
      if (dl > 0 && dl <= 1) items.push({ kind: 'days', state: 'about', big: false, gap: dl,
        title: dl + ' live day from the ' + c.daysGoal + '-day goal', pri: 60 + dl });
      else if (dl <= 0 && prev && !prev.daysHit) items.push({ kind: 'days', state: 'hit', big: false, gap: 0,
        title: 'Hit the ' + c.daysGoal + '-day goal', pri: 55 });
    }
    if (c.hrsGoal > 0) {
      var hl = c.hrsGoal - c.hours;
      if (hl > 0 && hl <= 3) items.push({ kind: 'hours', state: 'about', big: false, gap: hl,
        title: hl + ' hr' + (hl === 1 ? '' : 's') + ' from the ' + c.hrsGoal + '-hour goal', pri: 62 + hl });
      else if (hl <= 0 && prev && !prev.hoursHit) items.push({ kind: 'hours', state: 'hit', big: false, gap: 0,
        title: 'Hit the ' + c.hrsGoal + '-hour goal', pri: 56 });
    }
    if (c.tierGoal > 0) {
      var pct = c.diamonds / c.tierGoal;
      if (pct >= 0.85 && pct < 1) items.push({ kind: 'tier', state: 'about', big: false, gap: c.tierGoal - c.diamonds,
        title: Math.round(pct * 100) + '% of the way to the next tier', pri: 64 + (1 - pct) * 10 });
      else if (pct >= 1 && prev && !prev.tierHit) items.push({ kind: 'tier', state: 'hit', big: false, gap: 0,
        title: 'Reached the tier diamond goal', pri: 54 });
    }
    items.forEach(function (m) { m.user = c.user; });
    return items.sort(function (a, b) { return a.pri - b.pri; });
  }

  function snapshotOf(creators) {
    var o = {};
    creators.forEach(function (c) {
      o[c.user.toLowerCase()] = {
        score: c.score,
        daysHit: c.daysGoal > 0 && c.days >= c.daysGoal,
        hoursHit: c.hrsGoal > 0 && c.hours >= c.hrsGoal,
        tierHit: c.tierGoal > 0 && c.diamonds >= c.tierGoal
      };
    });
    return o;
  }
  function signature(creators, stamp) {
    var h = 0, str = stamp + '|';
    creators.forEach(function (c) { str += c.user + c.score + ':' + c.days + ':' + c.hours + ':' + c.diamonds + ';'; });
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return String(h);
  }

  function managerNames(creators) {
    var m = {};
    creators.forEach(function (c) { c.managers.forEach(function (n) { m[n] = (m[n] || 0) + 1; }); });
    return m;
  }

  var core = {
    parseCsv: parseCsv, parseCreators: parseCreators, milestonesFor: milestonesFor,
    snapshotOf: snapshotOf, signature: signature, managerNames: managerNames,
    BIG_SCORES: BIG_SCORES, ALL_SCORES: ALL_SCORES
  };
  root.ManagerHub = { core: core };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ManagerHub;
  if (typeof document === 'undefined') return;

  /* ───────────── UI ───────────── */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function title(s) { return s ? s.charAt(0) + s.slice(1).toLowerCase() : ''; }
  function titleList(s) { return String(s || '').split(' + ').map(title).join(' + '); }
  function isRecruit(c) { return !!c.recruiter && c.managers.indexOf(c.recruiter) >= 0; }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function short(n) { return n >= 1e6 ? (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n)); }
  function safeGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }

  var S = { all: [], stamp: '', viewing: '', canSwitch: false, prevSnap: null, filters: { q: '', recruited: false, activeOnly: true, kind: 'all', sort: 'close' }, byUser: {} };

  // Live team shown in the switcher (key -> label + sheet-name aliases). OTHER = everyone not on this team.
  var TEAM = [
    { key: 'MARCO', label: 'Marco', alias: ['MARCO'] }, { key: 'SKYLER', label: 'Skyler', alias: ['SKYLER'] },
    { key: 'LEVI', label: 'Levi', alias: ['LEVI'] }, { key: 'DYLAN', label: 'Dylan', alias: ['DYLAN'] },
    { key: 'EMILEE', label: 'Emilee', alias: ['EMILEE', 'EMILY'] }, { key: 'MANDY', label: 'Mandy', alias: ['MANDY', 'MANDI'] },
    { key: 'OTHER', label: 'Other', alias: [] }
  ];
  var TEAM_ALIASES = [].concat.apply([], TEAM.map(function (t) { return t.alias; }));
  function teamOf(key) { return TEAM.filter(function (t) { return t.key === key; })[0]; }
  function isTeam(c, aliases) { return c.managers.some(function (m) { return aliases.indexOf(m) >= 0; }) || aliases.indexOf(c.recruiter) >= 0; }
  function rosterFor(name) {
    var t = teamOf(name);
    return S.all.filter(function (c) {
      if (t && name === 'OTHER') return !isTeam(c, TEAM_ALIASES);
      if (t) return isTeam(c, t.alias);
      return name === '*' ? c.managers.length > 0 : (c.managers.indexOf(name) >= 0 || c.recruiter === name);
    });
  }
  function viewLabel(k) { var t = teamOf(k); return t ? t.label : (k === '*' ? 'Everyone' : title(k)); }

  function bestMilestone(items) { return items.length ? items[0] : null; }

  function computeAll(roster) {
    return roster.map(function (c) {
      var prev = S.prevSnap ? S.prevSnap[c.user.toLowerCase()] : null;
      if (S.prevSnap && !prev) prev = null;
      return { c: c, ms: milestonesFor(c, S.prevSnap ? (prev || { score: c.score, daysHit: true, hoursHit: true, tierHit: true }) : null) };
    });
  }

  function init(opts) {
    // opts: { csvUrl, manager: 'DYLAN' | '*', canSwitch, label }
    return fetch((opts.csvUrl || 'data/current.csv') + '?v=' + Date.now()).then(function (r) {
      if (!r.ok) throw new Error('current.csv ' + r.status);
      return r.text();
    }).then(function (text) {
      var parsed = parseCreators(text);
      S.all = parsed.creators; S.stamp = parsed.stamp;
      return fetch('data/score_history.json?v=' + Date.now()).then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; }).then(function (h) { S.hist = h; return parsed; });
    }).then(function (parsed) {
      S.canSwitch = !!opts.canSwitch;
      S.viewing = opts.manager;
      var names = managerNames(S.all);
      if (opts.manager !== '*' && !teamOf(opts.manager) && !names[opts.manager]) {
        $('hubBody').innerHTML = '<div class="empty"><h3>No creators linked to ' + esc(title(opts.manager)) + ' yet</h3><p>Ask Marco to confirm which manager name your account maps to.</p></div>';
        return;
      }
      loadSnapshot(opts.manager === '*' ? 'ALL' : opts.manager);
      renderSwitcher(names);
      bind();
      render();
      showToasts();
    });
  }

  function loadSnapshot(key) {
    var base = historyBaseline();
    if (base) { S.prevSnap = base.snap; S.baselineDate = base.date; S.snapKey = null; return; }
    S.baselineDate = '';
    var storeKey = 'mh_snap_v1_' + key;
    var stored = safeGet(storeKey);
    var sig = signature(S.all, S.stamp);
    var cur = snapshotOf(S.all);
    if (stored && stored.sig === sig) S.prevSnap = stored.prev;          // same data: keep the baseline
    else { S.prevSnap = stored ? stored.cur : null; safeSet(storeKey, { sig: sig, prev: S.prevSnap, cur: cur }); }
    S.snapKey = storeKey;
  }

  // Baseline = the most recent daily snapshot from a PREVIOUS Pacific-time day (written by the sync workflow).
  function historyBaseline() {
    if (!S.hist || !S.hist.days) return null;
    var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
    var days = Object.keys(S.hist.days).filter(function (d) { return d < today; }).sort();
    if (!days.length) return null;
    var date = days[days.length - 1], src = S.hist.days[date], snap = {};
    Object.keys(src).forEach(function (u) {
      var v = src[u];
      snap[u] = { score: v[0], daysHit: !!(v[1] & 1), hoursHit: !!(v[1] & 2), tierHit: !!(v[1] & 4) };
    });
    return { date: date, snap: snap };
  }

  function renderSwitcher(names) {
    var el = $('switcher');
    if (!S.canSwitch) { el.innerHTML = ''; return; }
    var chips = TEAM.map(function (t) { return t.key; });
    el.innerHTML = chips.map(function (n) {
      var label = viewLabel(n);
      var count = rosterFor(n).length;
      return '<button class="chip' + (S.viewing === n ? ' on' : '') + '" data-mgr="' + esc(n) + '">' + esc(label) + ' <b>' + count + '</b></button>';
    }).join('');
    el.innerHTML = '<button class="chip nav" data-step="-1" aria-label="Previous manager">‹</button>' + el.innerHTML + '<button class="chip nav" data-step="1" aria-label="Next manager">›</button>';
    var on = el.querySelector('.chip.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    el.onclick = function (e) {
      var st = e.target.closest('[data-step]'), b = e.target.closest('[data-mgr]');
      if (st) { var i = chips.indexOf(S.viewing) + parseInt(st.getAttribute('data-step'), 10); b = { getAttribute: function () { return chips[(i + chips.length) % chips.length]; } }; }
      if (!b) return;
      S.viewing = b.getAttribute("data-mgr");
      loadSnapshot(S.viewing === '*' ? 'ALL' : S.viewing);
      renderSwitcher(names); render();
    };
  }

  function bind() {
    if (S.bound) return; S.bound = true;
    $('q').addEventListener('input', function (e) { S.filters.q = e.target.value.toLowerCase().trim(); renderRoster(); });
    $('fRecruited').addEventListener('change', function (e) { S.filters.recruited = e.target.checked; renderRoster(); });
    $('fActive').addEventListener('change', function (e) { S.filters.activeOnly = e.target.checked; render(); });
    $('sortBy').addEventListener('change', function (e) { S.filters.sort = e.target.value; renderRoster(); });
    $('kinds').addEventListener('click', function (e) {
      var b = e.target.closest('[data-kind]'); if (!b) return;
      S.filters.kind = b.getAttribute('data-kind');
      Array.prototype.forEach.call($('kinds').children, function (x) { x.classList.toggle('on', x === b); });
      renderWatch();
    });
    document.addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]'); if (o) { openModal(o.getAttribute('data-open')); return; }
      if (e.target.closest('[data-close]') || e.target.id === 'modalBg') closeModal();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    $('bell').addEventListener('click', function () { $('watch').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  function currentRows() {
    var roster = rosterFor(S.viewing);
    if (S.filters.activeOnly) roster = roster.filter(function (c) { return c.active; });
    var rows = computeAll(roster);
    rows.forEach(function (r) { S.byUser[r.c.user.toLowerCase()] = r; });
    return rows;
  }

  function render() {
    var rows = currentRows();
    S.rows = rows;
    var name = viewLabel(S.viewing);
    $('who').textContent = S.viewing === '*' ? name : (S.viewing === 'OTHER' ? 'Other creators' : name + "'s creators");
    $('stamp').textContent = 'Sheet date ' + (S.stamp || '—') + (S.baselineDate ? ' · changes since ' + S.baselineDate : '');
    renderStats(rows);
    renderWatch();
    renderRoster();
    var n = rows.reduce(function (a, r) { return a + r.ms.filter(function (m) { return m.state === 'about' || m.state === 'hit'; }).length; }, 0);
    $('bellN').textContent = n; $('bellN').style.display = n ? '' : 'none';
  }

  function renderStats(rows) {
    var cs = rows.map(function (r) { return r.c; });
    var avg = cs.length ? cs.reduce(function (a, c) { return a + c.score; }, 0) / cs.length : 0;
    var at = function (t) { return cs.filter(function (c) { return c.score >= t; }).length; };
    var near = rows.filter(function (r) { return r.ms.some(function (m) { return m.big && m.state === 'about'; }); }).length;
    var tiles = [
      ['Creators', cs.length, ''], ['Avg score', avg.toFixed(0), ''],
      ['Score 50+', at(50), 's50'], ['Score 70+', at(70), 's70'], ['Score 90+', at(90), 's90'],
      ['Close to a big one', near, 'near']
    ];
    $('stats').innerHTML = tiles.map(function (t) {
      return '<div class="stat ' + t[2] + '"><div class="v">' + esc(t[1]) + '</div><div class="l">' + esc(t[0]) + '</div></div>';
    }).join('');
  }

  var KIND_ICON = { score: '★', days: '📅', hours: '⏱', tier: '💎' };

  function renderWatch() {
    var items = [];
    (S.rows || []).forEach(function (r) { r.ms.forEach(function (m) { items.push({ m: m, c: r.c }); }); });
    if (S.filters.kind !== 'all') items = items.filter(function (i) { return i.m.kind === S.filters.kind; });
    items.sort(function (a, b) { return a.m.pri - b.m.pri; });
    var hit = items.filter(function (i) { return i.m.state === 'hit'; });
    var about = items.filter(function (i) { return i.m.state === 'about'; });
    var card = function (i) {
      return '<button class="mcard ' + i.m.state + (i.m.big ? ' big' : '') + '" data-open="' + esc(i.c.user) + '">' +
        '<span class="ico">' + KIND_ICON[i.m.kind] + '</span>' +
        '<span class="mt"><b>' + esc(i.c.user) + '</b><small>' + esc(i.m.title) + '</small></span>' +
        ((S.viewing === '*' || S.viewing === 'OTHER') && i.c.manager ? '<em>' + esc(titleList(i.c.manager)) + '</em>' : '') + '</button>';
    };
    var col = function (head, cls, list, empty) {
      return '<div class="wcol ' + cls + '"><h3>' + head + ' <span>' + list.length + '</span></h3>' +
        (list.length ? list.slice(0, 60).map(card).join('') : '<p class="none">' + empty + '</p>') + '</div>';
    };
    $('watchBody').innerHTML =
      col('🎉 Just hit', 'hitcol', hit, 'Nothing new since the last data update.') +
      col('🔥 About to hit', 'aboutcol', about, 'Nobody is close right now.');
  }

  // The bar is a 0-100 score track split into the real reward tiers; the fill takes the colour of the
  // highest tier actually reached, and each tick says what it unlocks.
  var TIER_NAME = { 30: 'Rewards', 50: 'Score 50', 70: 'Cash Bonus', 90: 'Rank Boost' };
  function scoreZone(score) { return score >= 90 ? 'z90' : score >= 70 ? 'z70' : score >= 50 ? 'z50' : score >= 30 ? 'z30' : 'z0'; }
  function scoreBar(score) {
    var ticks = ALL_SCORES.map(function (t) {
      return '<i class="tick' + (score >= t ? ' pass' : '') + (BIG_SCORES.indexOf(t) >= 0 ? ' bigt' : '') + '" style="left:' + t + '%" title="' + t + ' · ' + TIER_NAME[t] + '"><u>' + t + '</u></i>';
    }).join('');
    return '<div class="sbar" title="Score ' + score + '"><div class="sfill ' + scoreZone(score) + '" style="width:' + Math.min(100, score) + '%"></div>' + ticks + '</div>';
  }
  function miniBar(v, goal) {
    var p = goal > 0 ? Math.min(100, (v / goal) * 100) : 0;
    return '<span class="mbar"><i style="width:' + p.toFixed(0) + '%"></i></span>';
  }

  function renderRoster() {
    var f = S.filters;
    var rows = (S.rows || []).filter(function (r) {
      if (f.q && r.c.user.toLowerCase().indexOf(f.q) < 0) return false;
      if (f.recruited && !isRecruit(r.c)) return false;
      return true;
    });
    var nextGap = function (r) { var m = r.ms.filter(function (x) { return x.kind === 'score' && x.state === 'about'; })[0]; return m ? m.gap : 999; };
    var sorters = {
      close: function (a, b) { return nextGap(a) - nextGap(b) || b.c.score - a.c.score; },
      score: function (a, b) { return b.c.score - a.c.score; },
      dia: function (a, b) { return b.c.diamonds - a.c.diamonds; },
      name: function (a, b) { return a.c.user.localeCompare(b.c.user); }
    };
    rows.sort(sorters[f.sort] || sorters.close);
    $('rosterCount').textContent = rows.length;
    $('roster').innerHTML = rows.length ? rows.map(function (r) {
      var c = r.c, top = bestMilestone(r.ms);
      var rec = isRecruit(c);
      return '<button class="ccard' + (c.active ? '' : ' off') + '" data-open="' + esc(c.user) + '">' +
        '<div class="top"><span class="av">' + esc(c.user.charAt(0).toUpperCase()) + '</span>' +
        '<span class="nm"><b>' + esc(c.user) + '</b><small>' + (S.viewing === '*' || S.viewing === 'OTHER' || c.managers.length > 1 ? esc(titleList(c.manager)) + ' · ' : '') + 'Lv ' + c.level + ' · Tier ' + c.tier + '</small></span>' +
        '<span class="sc">' + c.score + '</span></div>' + scoreBar(c.score) +
        '<div class="mini"><span>Days ' + c.days + '/' + c.daysGoal + miniBar(c.days, c.daysGoal) + '</span>' +
        '<span>Hrs ' + c.hours + '/' + c.hrsGoal + miniBar(c.hours, c.hrsGoal) + '</span>' +
        '<span>💎 ' + short(c.diamonds) + miniBar(c.diamonds, c.tierGoal) + '</span></div>' +
        '<div class="tags">' + (rec ? '<span class="tag rec">Recruited</span>' : '') + (c.active ? '' : '<span class="tag">Inactive</span>') +
        (top ? '<span class="tag ' + top.state + '">' + esc(top.title) + '</span>' : '') + '</div></button>';
    }).join('') : '<div class="empty"><p>No creators match.</p></div>';
  }

  /* ───────────── Modal ───────────── */
  function openModal(user) {
    var r = S.byUser[user.toLowerCase()]; if (!r) return;
    var c = r.c;
    var lines = r.ms.length ? r.ms.map(function (m) {
      return '<li class="' + m.state + '">' + KIND_ICON[m.kind] + ' ' + esc(m.title) + '</li>';
    }).join('') : '<li class="none">No milestones close right now.</li>';
    var nextTarget = ALL_SCORES.filter(function (t) { return c.score < t; })[0];
    $('modal').innerHTML =
      '<button class="x" data-close aria-label="Close">×</button>' +
      '<h2>' + esc(c.user) + '</h2><p class="sub">' + esc(titleList(c.manager) || 'Unassigned') +
      (isRecruit(c) ? ' · recruited' : '') + (c.active ? '' : ' · inactive') + '</p>' +
      '<div class="big-score"><span>' + c.score + '</span><small>' + (nextTarget ? (nextTarget - c.score) + ' to ' + nextTarget : 'Top tier — 90+') + '</small></div>' +
      scoreBar(c.score) +
      '<ul class="mlist">' + lines + '</ul>' +
      '<div class="grid2"><div><small>Live days</small><b>' + c.days + ' / ' + c.daysGoal + '</b></div>' +
      '<div><small>Hours</small><b>' + c.hours + ' / ' + c.hrsGoal + '</b></div>' +
      '<div><small>Diamonds (month)</small><b>' + fmt(c.diamonds) + '</b></div>' +
      '<div><small>Tier</small><b>' + c.tier + (c.tierStatus ? ' · ' + esc(c.tierStatus) : '') + '</b></div>' +
      '<div><small>To tier goal</small><b>' + (c.tierLeft > 0 ? fmt(c.tierLeft) : 'Reached') + '</b></div>' +
      '<div><small>Level</small><b>' + c.level + '</b></div></div>' +
      (c.link && /^https:\/\/www\.tiktok\.com\//.test(c.link) ? '<a class="go" target="_blank" rel="noopener" href="' + esc(c.link) + '">Open TikTok ↗</a>' : '') +
      '<div class="addrw"><button type="button" class="go" id="rwOpen">+ Add Reward</button>' +
      '<form id="rwForm" hidden><input id="rwText" maxlength="120" placeholder="Reward (e.g. $50 bonus, free sample box)" required>' +
      '<textarea id="rwNote" maxlength="400" rows="2" placeholder="Note (optional)"></textarea>' +
      '<button type="submit" class="go" id="rwSend">Send to Info + Levi</button><p id="rwMsg" class="sub"></p></form></div>';
    $('modalBg').classList.add('open');
    $('rwOpen').onclick = function () { this.hidden = true; $('rwForm').hidden = false; $('rwText').focus(); };
    $('rwForm').onsubmit = function (e) { e.preventDefault(); sendReward(c); };
  }
  var REWARD_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwBvwG6c9gomANeR3UhdqYA7u-USn3JD5mxksNSbeJ73sTBSQ7wcBWNwd0WIBIQm7Na2w/exec';
  var REWARD_WEBHOOK_SECRET = 'acc3b343-ea30-459e-9123-da3d3f600ca5'; // public client secret, notify-only email
  function sendReward(c) {
    var btn = $('rwSend'), msg = $('rwMsg');
    btn.disabled = true; msg.textContent = 'Sending…';
    fetch(REWARD_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'reward', secret: REWARD_WEBHOOK_SECRET, creatorName: c.user,
        reward: $('rwText').value.trim(), note: $('rwNote').value.trim(), addedBy: viewLabel(S.viewing) })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'failed');
      msg.textContent = 'Sent ✓'; $('rwText').value = ''; $('rwNote').value = ''; btn.disabled = false;
    }).catch(function (err) { msg.textContent = 'Failed to send (' + err.message + ') — try again'; btn.disabled = false; });
  }
  function closeModal() { $('modalBg').classList.remove('open'); }

  /* ───────────── Popups (toasts) ───────────── */
  function showToasts() {
    var picks = [];
    (S.rows || []).forEach(function (r) {
      r.ms.forEach(function (m) { if (m.big) picks.push({ m: m, c: r.c }); });
    });
    picks.sort(function (a, b) { return (a.m.state === 'hit' ? 0 : 1) - (b.m.state === 'hit' ? 0 : 1) || a.m.pri - b.m.pri; });
    var shown = picks.slice(0, 4);
    shown.forEach(function (p, i) { setTimeout(function () { toast(p); }, 600 + i * 900); });
    if (picks.length > shown.length) {
      setTimeout(function () { toast({ more: picks.length - shown.length }); }, 600 + shown.length * 900);
    }
  }
  function toast(p) {
    var host = $('toasts'), t = document.createElement('div');
    if (p.more) {
      t.className = 'toast about';
      t.innerHTML = '<div class="tb"><b>+' + p.more + ' more big milestones</b><small>See Milestone Watch below</small></div><button class="tx" aria-label="Dismiss">×</button>';
    } else {
      t.className = 'toast ' + p.m.state;
      t.innerHTML = '<div class="tb"><b>' + (p.m.state === 'hit' ? '🎉 ' : '🔥 ') + esc(p.c.user) + '</b><small>' + esc(p.m.title) + '</small></div>' +
        '<button class="tv" data-open="' + esc(p.c.user) + '">View</button><button class="tx" aria-label="Dismiss">×</button>';
    }
    var kill = function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 250); };
    t.querySelector('.tx').onclick = kill;
    var timer = setTimeout(kill, 11000);
    t.addEventListener('mouseenter', function () { clearTimeout(timer); });
    host.appendChild(t);
  }

  root.ManagerHub.init = init;
})(typeof window !== 'undefined' ? window : globalThis);
