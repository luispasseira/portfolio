/* cursor.js — dot + lagging ring; ring warms on interactive targets. */
(function () {
  const LP = window.LP;
  if (!LP.fine || LP.reduced) return;
  const root = document.getElementById('cursor');
  if (!root) return;
  document.documentElement.classList.add('js-cursor');

  const dot = root.querySelector('i');
  const ring = root.querySelector('b');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, seen = false;

  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    if (!seen) { rx = x; ry = y; seen = true; root.style.opacity = 1; }
    const hot = !!e.target.closest('a,button,.gnode');
    root.classList.toggle('hot', hot);
  }, { passive: true });
  root.style.opacity = 0;
  root.style.transition = 'opacity .4s';

  LP.on((t, dt) => {
    rx += (x - rx) * Math.min(1, dt * 11);
    ry += (y - ry) * Math.min(1, dt * 11);
    dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
  });
})();
