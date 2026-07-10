/* ═══ [3D-5 elevation-map] — the site as an isometric blueprint tower.
   Fixed bottom-left on wide screens: each section is an extruded slab,
   the one under your eyes glows signal, clicking a slab navigates.
   REVERT: set LP.flags.elevationMap = false in boot.js, or delete this
   file + its <script> tag in index.html + the [3D-5] block in layout.css. ═══ */
(function () {
  const LP = window.LP;
  if (!LP.flags || !LP.flags.elevationMap || LP.reduced) return;

  const page = document.getElementById('page');
  const SECTIONS = [
    ['hero', 'HERO'], ['manifesto', 'MANIFESTO'], ['trajectory', 'TRAJECTORY'],
    ['work', 'WORK'], ['orchestra', 'ORCHESTRA'], ['human', 'HUMAN'],
    ['arsenal', 'ARSENAL'], ['contact', 'CONTACT'],
  ];

  /* iso geometry: a slab is a diamond top face + two extruded sides */
  const W2 = 30, D2 = 13;          // half-width / half-depth of the diamond
  const TOWER_H = 150;             // total extrusion budget, split by real heights

  const nav = document.createElement('div');
  nav.id = 'elevmap';
  nav.setAttribute('aria-hidden', 'true');
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const chip = document.createElement('span');
  chip.className = 'em-chip mono';
  nav.append(svg, chip);
  document.body.appendChild(nav);

  const slabs = [];   // {id, gEl, topEl}

  function build() {
    svg.textContent = '';
    slabs.length = 0;
    const pr = page.getBoundingClientRect();
    const heights = SECTIONS.map(([id]) => {
      const el = document.getElementById(id);
      return el ? el.getBoundingClientRect().height : 0;
    });
    const total = heights.reduce((a, b) => a + b, 0) || 1;

    const width = (W2 + D2) * 2 + 16;
    let y = 12;                      // top slab (hero) starts here
    const parts = [];
    SECTIONS.forEach(([id, label], i) => {
      const dz = Math.max(7, heights[i] / total * TOWER_H);
      parts.push({ id, label, y, dz });
      y += dz + 3;                   // 3px seam between slabs
    });
    svg.setAttribute('width', width);
    svg.setAttribute('height', y + D2 * 2 + 12);
    svg.setAttribute('viewBox', `0 0 ${width} ${y + D2 * 2 + 12}`);

    const cx = width / 2;
    parts.forEach(p => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'em-slab');
      g.dataset.id = p.id;
      g.dataset.label = p.label;
      const yT = p.y, yB = p.y + p.dz;
      /* left + right extruded faces, then the diamond top (painted last) */
      const mk = (d, cls) => {
        const el = document.createElementNS(NS, 'path');
        el.setAttribute('d', d);
        el.setAttribute('class', cls);
        g.appendChild(el);
        return el;
      };
      mk(`M ${cx - W2 - D2} ${yT + D2} L ${cx - W2 - D2} ${yB + D2} L ${cx} ${yB + D2 * 2} L ${cx} ${yT + D2 * 2} Z`, 'em-left');
      mk(`M ${cx + W2 + D2} ${yT + D2} L ${cx + W2 + D2} ${yB + D2} L ${cx} ${yB + D2 * 2} L ${cx} ${yT + D2 * 2} Z`, 'em-right');
      const top = mk(`M ${cx} ${yT} L ${cx + W2 + D2} ${yT + D2} L ${cx} ${yT + D2 * 2} L ${cx - W2 - D2} ${yT + D2} Z`, 'em-top');
      g.addEventListener('click', () => goto(p.id));
      g.addEventListener('pointerenter', e => { chip.textContent = p.label; chip.classList.add('show'); chip.style.top = (yT + D2) + 'px'; });
      g.addEventListener('pointerleave', () => chip.classList.remove('show'));
      svg.appendChild(g);
      slabs.push({ id: p.id, g, top });
    });
  }

  function goto(id) {
    const el = document.getElementById(id);
    if (!el) return;
    let y = 0, n = el;
    while (n && n !== page) { y += n.offsetTop; n = n.offsetParent; }
    scrollTo(0, Math.max(0, y - 40));
  }

  /* section ranges for the active glow */
  let ranges = [];
  function measure() {
    ranges = SECTIONS.map(([id]) => {
      const el = document.getElementById(id);
      if (!el) return [0, 0];
      let y = 0, n = el;
      while (n && n !== page) { y += n.offsetTop; n = n.offsetParent; }
      return [y, y + el.offsetHeight];
    });
  }

  build(); measure();
  addEventListener('resize', () => { build(); measure(); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { build(); measure(); });
  let roT = 0;
  new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(() => { build(); measure(); }, 400); }).observe(page);

  let activeI = -1;
  LP.on(() => {
    if (document.hidden) return;
    const eye = LP.scrollY + innerHeight * .45;
    let i = ranges.findIndex(([a, b]) => eye >= a && eye < b);
    if (i === -1) i = eye < (ranges[0] ? ranges[0][0] : 0) ? 0 : SECTIONS.length - 1;
    if (i !== activeI) {
      activeI = i;
      slabs.forEach((s, k) => s.g.classList.toggle('active', k === i));
    }
  });
})();
