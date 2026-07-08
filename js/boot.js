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
  function tick(t) {
    const dt = Math.min((t - last) / 1000, .05);
    last = t;
    LP._subs.forEach(fn => fn(t / 1000, dt));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

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
