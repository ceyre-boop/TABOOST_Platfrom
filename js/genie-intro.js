/* ============================================================================
   TABOOST "Genie Reveal" intro animation.
   Plays on EVERY load (login + refresh) and can be replayed on demand via
   window.playGenieIntro() (used for agent<->creator view switches).
   Self-contained: injects its own styles, builds + removes its own overlay.
   Spec: ~/Obsidian/Obsidian/TABOOST-Intro-Animation.md
   ========================================================================== */
(function () {
  'use strict';

  var GENIE_IMG = '/images/taboost-genie.jpg';   // absolute — works from /, /uk/, /admin/
  var STYLE_ID = 'genie-intro-style';

  var CSS = '\
#genie-intro{position:fixed;inset:0;z-index:99999;background:#06060c;display:flex;align-items:center;justify-content:center;flex-direction:column;overflow:hidden;}\
#genie-intro.genie-exit{animation:genieOverlayExit .55s cubic-bezier(.55,0,1,.45) forwards;}\
@keyframes genieOverlayExit{0%{opacity:1;}100%{opacity:0;pointer-events:none;}}\
#genie-intro .genie-ring{position:absolute;border-radius:50%;border:1.5px solid rgba(255,0,68,0);pointer-events:none;animation:genieRingPop 1.5s cubic-bezier(.22,1,.36,1) forwards;}\
#genie-intro .genie-ring:nth-of-type(2){width:140px;height:140px;animation-delay:.38s;}\
#genie-intro .genie-ring:nth-of-type(3){width:260px;height:260px;animation-delay:.48s;}\
#genie-intro .genie-ring:nth-of-type(4){width:400px;height:400px;animation-delay:.56s;}\
#genie-intro .genie-ring:nth-of-type(5){width:580px;height:580px;animation-delay:.62s;}\
@keyframes genieRingPop{0%{border-color:rgba(255,0,68,0);transform:scale(.3);}30%{border-color:rgba(255,0,68,.55);transform:scale(1.05);}70%{border-color:rgba(255,0,68,.18);transform:scale(1);}100%{border-color:rgba(255,0,68,0);transform:scale(1.15);}}\
#genie-img-wrap{position:relative;z-index:2;animation:genieEntrance 1.65s cubic-bezier(.22,1,.36,1) forwards;transform-origin:center bottom;}\
@keyframes genieEntrance{0%{opacity:0;transform:scale(.12) translateY(60px);}18%{opacity:1;transform:scale(1.18) translateY(-12px);}28%{opacity:1;transform:scale(.93) translateY(4px);}40%{opacity:1;transform:scale(1.06) translateY(-6px);}52%{opacity:1;transform:scale(.98) translateY(0);}62%{opacity:1;transform:scale(1) translateY(-10px);}72%{opacity:1;transform:scale(1) translateY(0);}80%{opacity:1;transform:scale(1) translateY(-6px);}100%{opacity:0;transform:scale(9) translateY(-20px);}}\
#genie-img-wrap img{width:130px;height:130px;border-radius:28px;border:3px solid rgba(255,0,68,.8);box-shadow:0 0 0 8px rgba(255,0,68,.12),0 0 60px rgba(255,0,68,.45),0 0 120px rgba(255,0,68,.20);display:block;}\
#genie-tagline{position:absolute;bottom:38%;left:50%;transform:translateX(-50%);z-index:2;color:rgba(255,255,255,.75);font-size:13px;font-weight:500;letter-spacing:.25em;text-transform:uppercase;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;animation:genieTaglineAnim 1.65s cubic-bezier(.22,1,.36,1) forwards;}\
@keyframes genieTaglineAnim{0%{opacity:0;transform:translateX(-50%) translateY(12px);}28%{opacity:1;transform:translateX(-50%) translateY(0);}80%{opacity:1;transform:translateX(-50%) translateY(0);}100%{opacity:0;transform:translateX(-50%) translateY(-8px);}}\
#genie-logo-text{position:absolute;top:36%;left:50%;transform:translateX(-50%);z-index:2;font-size:clamp(32px,8vw,56px);font-weight:800;background:linear-gradient(135deg,#ff0044,#ff6b6b);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:4px;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;animation:genieLogoAnim 1.65s cubic-bezier(.22,1,.36,1) forwards;}\
@keyframes genieLogoAnim{0%{opacity:0;transform:translateX(-50%) scale(.7);}22%{opacity:1;transform:translateX(-50%) scale(1.05);}35%{opacity:1;transform:translateX(-50%) scale(.97);}80%{opacity:1;transform:translateX(-50%) scale(1);}100%{opacity:0;transform:translateX(-50%) scale(1.3);}}\
#genie-bg-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 60% 50% at 50% 50%,rgba(255,0,68,.16) 0%,transparent 70%);animation:genieGlow 1.65s ease-in-out forwards;}\
@keyframes genieGlow{0%{opacity:0;}30%{opacity:1;}80%{opacity:1;}100%{opacity:0;}}\
@media (prefers-reduced-motion: reduce){#genie-intro{display:none;}}';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Build the overlay, play it, then remove it. Calling again = clean replay.
  window.playGenieIntro = function playGenieIntro() {
    if (prefersReducedMotion()) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', window.playGenieIntro); return; }
    injectStyle();

    var existing = document.getElementById('genie-intro');
    if (existing) existing.remove();   // restart cleanly if one is mid-play

    var overlay = document.createElement('div');
    overlay.id = 'genie-intro';
    overlay.innerHTML =
      '<div id="genie-bg-glow"></div>' +
      '<div class="genie-ring"></div><div class="genie-ring"></div>' +
      '<div class="genie-ring"></div><div class="genie-ring"></div>' +
      '<div id="genie-logo-text">TABOOST</div>' +
      '<div id="genie-img-wrap"><img src="' + GENIE_IMG + '" alt="TABOOST Genie"></div>' +
      '<div id="genie-tagline">Your Hustle. Amplified.</div>';
    document.body.appendChild(overlay);

    setTimeout(function () {
      overlay.classList.add('genie-exit');
      setTimeout(function () { if (overlay && overlay.parentNode) overlay.remove(); }, 580);
    }, 1700);
  };

  // Auto-play on every load (login + refresh). No session guard.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.playGenieIntro);
  } else {
    window.playGenieIntro();
  }
})();
