/* Creator score nudge — a small, self-contained line under "My Creator Score":
 * "You're 3 points from Score 70 · Cash Bonus". Additive: own IDs, own styles, reads only the score.
 * Called by updateScoreAndLevels(); does nothing if #scoreNudge isn't on the page. */
(function () {
  var STEPS = { us: [[30, 'Agency Rewards'], [50, 'Stars'], [70, 'Cash Bonus'], [90, 'Rank Boost']],
                uk: [[30, 'Next-Ups'], [50, 'Stars'], [70, 'Pros'], [90, 'Masters']] };
  var css = '.score-nudge{margin:4px 0 14px;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.4;' +
    'background:rgba(255,0,85,.08);border:1px solid rgba(255,0,85,.35);color:#fff;display:flex;gap:10px;align-items:center}' +
    '.score-nudge.close{background:rgba(255,0,85,.16);border-color:#FF0055}' +
    '.score-nudge.top{background:rgba(255,215,0,.1);border-color:rgba(255,215,0,.5)}' +
    '.score-nudge b{color:#FF0055}.score-nudge.top b{color:#ffd700}';
  window.renderScoreNudge = function (score, region) {
    var el = document.getElementById('scoreNudge');
    if (!el) return;
    try {
      score = Number(score) || 0;
      var steps = STEPS[region === 'uk' ? 'uk' : 'us'];
      if (!document.getElementById('scoreNudgeStyle')) {
        var st = document.createElement('style'); st.id = 'scoreNudgeStyle'; st.textContent = css; document.head.appendChild(st);
      }
      var next = steps.filter(function (s) { return s[0] > score; })[0];
      if (!score) { el.hidden = true; return; }
      if (!next) {
        el.className = 'score-nudge top'; el.textContent = '';
        el.innerHTML = '<span>🏆</span><span><b>Score ' + score + '</b> — you\'re in the top tier. Keep it up!</span>';
      } else {
        var gap = next[0] - score, close = gap <= 5;
        el.className = 'score-nudge' + (close ? ' close' : '');
        el.innerHTML = '<span>' + (close ? '🔥' : '🎯') + '</span><span>You\'re <b>' + gap + ' point' + (gap === 1 ? '' : 's') +
          '</b> from Score ' + next[0] + ' · ' + next[1] + (close ? '. Almost there — keep going live!' : '.') + '</span>';
      }
      el.hidden = false;
    } catch (e) { el.hidden = true; }
  };
})();
