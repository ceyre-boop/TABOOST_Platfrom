/**
 * Lifetime tab for the "My Performance" chart (creator-dashboard.html + dash.html).
 *
 * Reads data/LIFETIME.csv in the browser: col A = UID, col B = username, then one
 * column per month ("Nov 2021", "Dec 2021", ...). Whatever month columns exist are
 * used, nothing is hardcoded, so a fresh CSV each month just works.
 * Blank cell = not in the agency that month.
 *
 * Usage: LifetimeChart.attach({ uid, currentDiamonds }) after the page chart has rendered.
 * Safe to call repeatedly (the host page re-renders its chart on some toggles).
 */
(function () {
  'use strict';

  var CSV_URL = 'data/LIFETIME.csv';
  var csvPromise = null;
  var state = { uid: null, currentDiamonds: 0, active: false, chart: null };

  function loadCsv() {
    if (!csvPromise) {
      csvPromise = fetch(CSV_URL + '?v=' + Date.now())
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .catch(function (e) { console.warn('Lifetime CSV unavailable:', e); return ''; });
    }
    return csvPromise;
  }

  // Minimal CSV line parser (quotes, doubled quotes, commas inside quotes).
  function parseLine(line) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) {
        if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }

  function toNum(s) {
    s = (s || '').replace(/[",\s]/g, '');
    if (s === '') return null;
    var n = Number(s);
    return isNaN(n) ? null : n;
  }

  // Returns { months, values } from the creator's first non-blank month, or null.
  function lookup(text, uid) {
    if (!text || !uid) return null;
    var lines = text.split(/\r?\n/);
    var months = parseLine(lines[0] || '').slice(2).map(function (m) { return m.trim(); });
    while (months.length && !months[months.length - 1]) months.pop(); // ignore trailing empty header columns
    var row = null;
    for (var i = 1; i < lines.length; i++) {
      if (lines[i].indexOf(uid) === 0) {
        var cells = parseLine(lines[i]);
        if (cells[0].trim() === uid) { row = cells; break; }
      }
    }
    if (!row) return null;
    var vals = months.map(function (_, k) { return toNum(row[k + 2]); });
    var first = vals.findIndex(function (v) { return v != null; });
    if (first < 0) return null;
    return { months: months.slice(first), values: vals.slice(first) };
  }

  function shortMonth(m) {
    var p = m.split(' ');
    return p.length === 2 ? p[0].slice(0, 3) + " '" + p[1].slice(2) : m;
  }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function ensureDom(section) {
    var tabs = section.querySelector('.chart-tabs');
    var container = section.querySelector('.chart-container');
    if (!tabs || !container) return false;

    tabs.querySelectorAll('[data-period="history"]').forEach(function (b) { b.textContent = '6-Month'; });
    if (!tabs.querySelector('[data-period="lifetime"]')) {
      var b = document.createElement('button');
      b.className = 'chart-tab';
      b.dataset.period = 'lifetime';
      b.textContent = 'Lifetime';
      tabs.appendChild(b);
    }
    if (!tabs.dataset.ltBound) {
      tabs.dataset.ltBound = '1';
      tabs.addEventListener('click', function (e) {
        var t = e.target.closest('.chart-tab');
        if (!t) return;
        if (t.dataset.period === 'lifetime') showLifetime(section);
        else hideLifetime(section);
      }, true);
    }
    if (!container.querySelector('#lifetimeWrap')) {
      var w = document.createElement('div');
      w.id = 'lifetimeWrap';
      w.style.cssText = 'display:none;position:absolute;inset:0;padding:8px;';
      w.innerHTML = '<canvas id="lifetimeChart"></canvas>' +
        '<div id="lifetimeEmpty" style="display:none;height:100%;align-items:center;justify-content:center;color:#888;font-size:15px;">No lifetime history yet</div>';
      container.appendChild(w);
    }
    if (!section.querySelector('#lifetimeInsights')) {
      var ins = document.createElement('div');
      ins.className = 'chart-insights';
      ins.id = 'lifetimeInsights';
      ins.style.display = 'none';
      section.appendChild(ins);
    }
    return true;
  }

  function hideLifetime(section) {
    state.active = false;
    var wrap = section.querySelector('#lifetimeWrap');
    if (wrap) wrap.style.display = 'none';
    var ins = section.querySelector('#lifetimeInsights');
    if (ins) ins.style.display = 'none';
    var main = section.querySelector('#performanceChart');
    if (main) main.style.visibility = '';
    var mainIns = section.querySelector('#chartInsights');
    if (mainIns) mainIns.style.display = '';
    section.querySelectorAll('.chart-tab[data-period="lifetime"]').forEach(function (t) { t.classList.remove('active'); });
    if (window.Chart && main && Chart.getChart) {
      var c = Chart.getChart(main);
      if (c) c.resize();
    }
  }

  async function showLifetime(section) {
    state.active = true;
    section.classList.remove('at-unicorn'); // Lifetime always uses TABOOST colors
    var h2 = section.querySelector(".section-header h2");
    if (h2 && section.dataset.origH2) h2.innerHTML = section.dataset.origH2; // drop the All-Time title styling
    section.querySelectorAll('.chart-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.period === 'lifetime');
    });
    var main = section.querySelector('#performanceChart');
    if (main) main.style.visibility = 'hidden';
    var mainIns = section.querySelector('#chartInsights');
    if (mainIns) mainIns.style.display = 'none';
    var wrap = section.querySelector('#lifetimeWrap');
    var ins = section.querySelector('#lifetimeInsights');
    var empty = section.querySelector('#lifetimeEmpty');
    var canvas = section.querySelector('#lifetimeChart');
    wrap.style.display = 'block';
    ins.style.display = '';

    var data = lookup(await loadCsv(), state.uid);
    if (!state.active) return; // user switched away while loading
    if (state.chart) { state.chart.destroy(); state.chart = null; }

    if (!data) {
      canvas.style.display = 'none';
      empty.style.display = 'flex';
      ins.innerHTML = '';
      return;
    }
    canvas.style.display = '';
    empty.style.display = 'none';

    var labels = data.months.map(shortMonth);
    var values = data.values.slice();
    // Add the live month when the CSV doesn't cover it yet
    var now = new Date();
    var curKey = shortMonth(now.toLocaleString('en-US', { month: 'short' }) + ' ' + now.getFullYear());
    if (labels[labels.length - 1] !== curKey && state.currentDiamonds > 0) {
      labels.push(curKey + ' (so far)');
      values.push(state.currentDiamonds);
    }

    var total = 0, best = -1, bestIdx = -1;
    // Total = completed months from the CSV only (the live "so far" point is excluded)
    values.forEach(function (v, i) { if (v == null) return; if (i < data.values.length) total += v; if (v > best) { best = v; bestIdx = i; } });

    var red = cssVar('--taboost-red', '#FF0055');
    var gold = cssVar('--taboost-gold', '#ffd700');
    var isMobile = window.innerWidth < 768;
    var ctx = canvas.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0, 'rgba(255,0,85,0.35)');
    grad.addColorStop(1, 'rgba(255,0,85,0)');
    var dense = values.length > 36;

    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Diamonds',
          data: values,
          borderColor: red,
          backgroundColor: grad,
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          spanGaps: false,
          pointHoverRadius: 5,
          pointBackgroundColor: values.map(function (_, i) { return i === bestIdx ? gold : red; }),
          pointRadius: values.map(function (_, i) { return i === bestIdx ? 6 : (dense ? 0 : 3); })
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a1a', borderColor: '#333', borderWidth: 1,
            callbacks: { label: function (c) { return c.parsed.y == null ? '' : fmt(c.parsed.y) + ' diamonds'; } }
          }
        },
        scales: {
          x: { ticks: { color: '#888', maxRotation: 60, autoSkip: true, font: { size: isMobile ? 8 : 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { beginAtZero: true, ticks: { color: '#888', font: { size: isMobile ? 8 : 10 }, callback: function (v) { return v >= 1e6 ? (v / 1e6) + 'M' : v >= 1e3 ? (v / 1e3) + 'K' : v; } }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });

    ins.innerHTML =
      '<div class="insight-item"><i class="fas fa-gem"></i><span>' + fmt(total) + ' lifetime diamonds</span></div>' +
      '<div class="insight-item positive"><i class="fas fa-trophy"></i><span>Best month: ' + labels[bestIdx] + ' · ' + fmt(best) + ' diamonds</span></div>';
  }

  window.LifetimeChart = {
    attach: function (opts) {
      opts = opts || {};
      var canvas = document.getElementById('performanceChart');
      var section = canvas && canvas.closest('.section-card');
      if (!section) return;
      var uid = opts.uid ? String(opts.uid) : null;
      var uidChanged = state.uid !== uid;
      state.uid = uid;
      state.currentDiamonds = opts.currentDiamonds || 0;
      if (!ensureDom(section)) return;
      if (state.active && !uidChanged) showLifetime(section); // host re-rendered: keep Lifetime showing
    }
  };
})();
