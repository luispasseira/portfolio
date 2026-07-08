/* scroll.js — lerped smooth scroll on a fixed page, manual reveal engine,
   progress hairline, trajectory spine fill. Falls back to native scroll +
   IntersectionObserver when motion is reduced or the pointer is coarse. */
(function () {
  const LP = window.LP;
  const page = document.getElementById('page');
  const progress = document.getElementById('progress');
  const spine = document.querySelector('.spine');
  const rvs = Array.from(document.querySelectorAll('.rv'));
  const stations = Array.from(document.querySelectorAll('.station'));
  const mlines = Array.from(document.querySelectorAll('.manifesto-line'));

  const smooth = !LP.reduced && LP.fine;

  /* ---------- fallback path: native scroll + IO ---------- */
  if (!smooth) {
    document.documentElement.classList.add('js-scroll', 'native-scroll'); // reveal styles apply
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    rvs.forEach(el => io.observe(el));
    stations.forEach(el => io.observe(el));
    if (spine) spine.style.setProperty('--spine-fill', '100%');
    LP.on(() => {
      LP.scrollY = scrollY;
      if (progress) {
        const max = document.documentElement.scrollHeight - innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      }
    });
    return;
  }

  /* ---------- smooth path ---------- */
  document.documentElement.classList.add('js-scroll');
  const spacer = document.createElement('div');
  spacer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(spacer);

  let pageH = 0;
  const tops = new Map();   // element -> document offsetTop cache

  function measure() {
    pageH = page.scrollHeight;
    spacer.style.height = pageH + 'px';
    const walk = el => {
      let y = 0, n = el;
      while (n && n !== page) { y += n.offsetTop; n = n.offsetParent; }
      return y;
    };
    rvs.forEach(el => tops.set(el, walk(el)));
    stations.forEach(el => tops.set(el, walk(el)));
    if (spine) tops.set(spine, walk(spine));
  }
  measure();
  new ResizeObserver(measure).observe(page);
  addEventListener('resize', measure, { passive: true });
  // re-measure once fonts land (metrics shift)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  let cur = scrollY;
  LP.on((t, dt) => {
    const target = scrollY;
    cur += (target - cur) * Math.min(1, dt * 7.5);
    if (Math.abs(target - cur) < .35) cur = target;
    LP.scrollY = cur;
    page.style.transform = `translate3d(0,${-cur.toFixed(2)}px,0)`;

    if (progress) {
      const max = pageH - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, cur / max) : 0})`;
    }

    // reveals
    const line = cur + innerHeight * .86;
    tops.forEach((top, el) => {
      if (el === spine) return;
      if (top < line && !el.classList.contains('in')) el.classList.add('in');
    });

    // spine fill tracks viewport centre through the list
    if (spine) {
      const top = tops.get(spine), h = spine.offsetHeight;
      const p = Math.max(0, Math.min(1, (cur + innerHeight * .62 - top) / h));
      spine.style.setProperty('--spine-fill', (p * 100).toFixed(1) + '%');
    }

    // manifesto: letters gain mass as you scroll through them (Fraunces wght axis)
    mlines.forEach((el, i) => {
      const top = tops.get(el);
      if (top === undefined) return;
      const raw = (cur + innerHeight * .92 - top) / (innerHeight * .72);
      const p = Math.max(0, Math.min(1, (raw - i * .18) / .82));
      const e = p * p * (3 - 2 * p);                       // smoothstep
      el.style.fontWeight = Math.round(330 + 310 * e);
    });
  });

  // anchor navigation must jump the *native* scroll; the lerp does the easing
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const el = a.hash ? document.querySelector(a.hash) : null;
    if (!el) return;
    e.preventDefault();
    let y = 0, n = el;
    while (n && n !== page) { y += n.offsetTop; n = n.offsetParent; }
    scrollTo(0, Math.max(0, y - 40));
    history.pushState(null, '', a.hash);
  });
})();
