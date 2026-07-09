/* cards.js — work cards tilt toward the cursor with a specular sheen.
   Pointer only sets CSS variables; the .case transition does the easing. */
(function () {
  const LP = window.LP;
  if (!LP.fine || LP.reduced) return;

  document.querySelectorAll('.case').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--ry', ((px - .5) * 3.6).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((py - .5) * -3.0).toFixed(2) + 'deg');
      card.style.setProperty('--lx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--ly', (py * 100).toFixed(1) + '%');
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
})();
