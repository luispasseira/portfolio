/* tab.js — the browser tab joins the system. The favicon mirrors the
   Orchestra (ember during triage, a green flash on merge), and the title
   tells the truth when you leave: the suite really does pause. */
(function () {
  const LP = window.LP;
  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;
  const originalHref = link.href;
  const baseTitle = document.title;

  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  if (!c) return;

  const COL = { void_: '#05060A', slate: '#1A1F2B', signal: '#56E0C8', ember: '#E8A33D', bone: '#E8E4DC' };
  let mode = 'flow';           // flow | triage | merge | paused
  let angle = 0, mergeT = 0, alertOn = false;

  function draw() {
    try {
      c.clearRect(0, 0, 64, 64);
      // void tile
      c.fillStyle = COL.void_;
      c.beginPath();
      if (c.roundRect) c.roundRect(2, 2, 60, 60, 14); else c.rect(2, 2, 60, 60);
      c.fill();
      // orbit ring
      c.strokeStyle = COL.slate;
      c.lineWidth = 3;
      c.beginPath(); c.arc(32, 32, 17, 0, 7); c.stroke();

      if (mode === 'paused') {
        c.fillStyle = COL.slate;
        c.fillRect(24, 22, 6, 20); c.fillRect(35, 22, 6, 20);
      } else if (alertOn) {
        // incident: pulsing ember beacon with a void exclamation
        const pulse = .7 + .3 * Math.sin(angle * 5);
        c.globalAlpha = pulse;
        c.fillStyle = COL.ember;
        c.beginPath(); c.arc(32, 32, 15, 0, 7); c.fill();
        c.globalAlpha = 1;
        c.fillStyle = COL.void_;
        c.fillRect(29, 22, 6, 13);
        c.fillRect(29, 39, 6, 6);
      } else {
        const col = mode === 'triage' ? COL.ember : mode === 'merge' ? COL.signal : COL.signal;
        // hub
        c.fillStyle = col;
        c.beginPath(); c.arc(32, 32, mode === 'merge' ? 7 + mergeT * 5 : 5, 0, 7); c.fill();
        // orbiting packet
        const px = 32 + Math.cos(angle) * 17, py = 32 + Math.sin(angle) * 17;
        c.fillStyle = mode === 'triage' ? COL.ember : COL.bone;
        c.beginPath(); c.arc(px, py, 4, 0, 7); c.fill();
      }
      link.href = cv.toDataURL('image/png');
    } catch (e) {
      link.href = originalHref;
    }
  }

  /* chaos.js can raise the alarm */
  LP.tabAlert = on => {
    alertOn = !!on;
    if (!document.hidden) document.title = alertOn ? '⚠ INCIDENT — Luís Passeira' : baseTitle;
    draw();
  };

  /* orchestra drives the mood */
  if (LP.orchestra) {
    LP.orchestra.onStage(stage => {
      if (stage === 'triage' || stage === 'rerun') mode = 'triage';
      else if (stage === 'done') { mode = 'merge'; mergeT = 1; }
      else mode = 'flow';
    });
  }

  /* foreground: gentle orbit, throttled well below frame rate */
  let acc = 0;
  LP.on((t, dt) => {
    if (document.hidden) return;
    angle += dt * 1.6;
    if (mergeT > 0) { mergeT = Math.max(0, mergeT - dt * 1.2); if (mergeT === 0 && mode === 'merge') mode = 'flow'; }
    acc += dt;
    if (acc < .35) return;
    acc = 0;
    draw();
  });

  /* background: rAF sleeps, so a slow interval owns the hidden state */
  let returnTimer = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      mode = 'paused';
      document.title = '⏸ suite paused — Luís Passeira';
      draw();
    } else {
      mode = 'flow';
      if (alertOn) { document.title = '⚠ INCIDENT — Luís Passeira'; draw(); return; }
      document.title = '▶ resuming…';
      draw();
      clearTimeout(returnTimer);
      returnTimer = setTimeout(() => { document.title = baseTitle; }, 2000);
    }
  });

  draw();
})();
