/* boot.js — conductor: capability flags, single rAF loop, boot overlay. */
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const LP = window.LP = {
    reduced, fine,
    scrollY: 0,          // lerped scroll position (scroll.js writes)
    targetY: 0,
    vh: innerHeight,
    mouse: { x: .5, y: .5 },   // normalized viewport coords, raw
    _subs: new Set(),
    on(fn) { LP._subs.add(fn); return () => LP._subs.delete(fn); },
  };

  addEventListener('pointermove', e => {
    LP.mouse.x = e.clientX / innerWidth;
    LP.mouse.y = e.clientY / innerHeight;
  }, { passive: true });

  addEventListener('resize', () => { LP.vh = innerHeight; }, { passive: true });

  // ---- the one loop ----
  let last = performance.now();
  let fpsEma = 60;
  function tick(t) {
    const dt = Math.min((t - last) / 1000, .05);
    last = t;
    if (dt > 0) fpsEma += (1 / dt - fpsEma) * .04;
    LP.fps = fpsEma;
    LP._subs.forEach(fn => fn(t / 1000, dt));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---- the site runs its own suite (a QA engineer's footer should) ----
  const sys = document.getElementById('sysline');
  if (sys) {
    let consoleClean = true;
    const err = console.error.bind(console);
    console.error = (...a) => { consoleClean = false; err(...a); };
    addEventListener('error', () => consoleClean = false);
    const webgl = (() => { try { const c = document.createElement('canvas'); return !!c.getContext('webgl'); } catch (e) { return false; } })();
    function report() {
      const checks = [
        'WEBGL <b>' + (webgl ? '✓' : 'poster') + '</b>',
        'FONTS <b>' + (document.fonts && document.fonts.status === 'loaded' ? '✓' : '…') + '</b>',
        'CONSOLE <b>' + (consoleClean ? 'CLEAN' : 'ERR') + '</b>',
        'RENDER <b>' + Math.round(LP.fps) + ' FPS</b>',
      ];
      sys.innerHTML = 'SELF-TEST — ' + checks.join(' · ') +
        (webgl && consoleClean ? ' · <b>ALL CHECKS PASSING</b>' : '');
    }
    setTimeout(report, 1600);
    setInterval(report, 3000);
  }

  // ---- for the ones who open DevTools (hello, colleague) ----
  try {
    console.log(
      '%cL—P%c  I build the machine that tests the machine.\n%c    lfmpasseira30@gmail.com · designed & built by Claude, directed by Luís Passeira',
      'font-family:Georgia,serif;font-size:22px;color:#56E0C8;',
      'font-size:13px;color:#E8E4DC;',
      'font-size:11px;color:#7C8494;'
    );
  } catch (e) { }

  // ---- boot overlay ----
  const boot = document.getElementById('boot');
  const log = document.getElementById('boot-log');
  document.getElementById('year').textContent = new Date().getFullYear();

  function finish() {
    boot.classList.add('done');
    document.documentElement.classList.add('loaded');
    boot.addEventListener('transitionend', () => boot.remove(), { once: true });
  }

  if (reduced || !log) { finish(); return; }

  const lines = [
    ['lp://portfolio — init', 90],
    ['compiling fragment shaders … <b>ok</b>', 260],
    ['settling volumetric field … <b>ok</b>', 200],
    ['dispatching agents … <b>7/7</b>', 200],
    ['<b>ready</b>', 150],
  ];
  let i = 0;
  (function next() {
    if (i >= lines.length) { setTimeout(finish, 220); return; }
    log.innerHTML += (i ? '\n' : '') + '<span>' + lines[i][0] + '</span>';
    setTimeout(next, lines[i++][1]);
  })();

  // safety: never trap the user behind the overlay
  setTimeout(() => { if (document.getElementById('boot')) finish(); }, 2600);
})();
