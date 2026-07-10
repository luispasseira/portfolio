/* ═══ [3D-6 glass-panes] — experimental whole-page depth. Each section
   sits on its own glass plane; the one under your eyes is at z 0, the
   others recede a breath (max ~45px) behind it, eased per frame.
   Default OFF — toggle live with the palette command "depth".
   REVERT: set LP.flags.depthPanes = false (default) and never toggle it;
   or delete this file + its <script> tag + the [3D-6] block in layout.css
   + the [3D-6] palette command. ═══ */
(function () {
  const LP = window.LP;
  if (LP.reduced || !LP.fine) return;   // desktop smooth-path only

  const page = document.getElementById('page');
  const secs = [...document.querySelectorAll('main section')];
  if (!page || !secs.length) return;

  let active = false;
  const zs = secs.map(() => 0);       // eased current z per section
  let tops = [];

  function measure() {
    tops = secs.map(s => {
      let y = 0, n = s;
      while (n && n !== page) { y += n.offsetTop; n = n.offsetParent; }
      return y + s.offsetHeight / 2;   // section centre in document space
    });
  }
  measure();
  addEventListener('resize', measure, { passive: true });

  LP.depth3d = {
    toggle() {
      active = !active;
      document.documentElement.classList.toggle('depth3d', active);
      if (active) { measure(); secs.forEach(s => s.style.willChange = 'transform'); }
      else secs.forEach((s, i) => { s.style.willChange = ''; s.style.transform = ''; zs[i] = 0; });
      return active;
    },
    get active() { return active; },
  };
  if (LP.flags && LP.flags.depthPanes) LP.depth3d.toggle();

  LP.on((t, dt) => {
    if (!active || document.hidden) return;
    const eye = LP.scrollY + innerHeight / 2;
    secs.forEach((s, i) => {
      const dist = Math.min(Math.abs(tops[i] - eye), 900);
      const zT = -dist * 0.05;         // max recession ≈ 45px — a breath, not a tunnel
      zs[i] += (zT - zs[i]) * Math.min(1, dt * 5);
      s.style.transform = `translateZ(${zs[i].toFixed(2)}px)`;
    });
  });
})();
