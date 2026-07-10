/* chaos.js — the self-debug. The site seeds a few quiet defects in itself,
   then scans top-to-bottom with a visible console thinking out loud,
   pausing at each bug, diagnosing it, and easing it back to health.
   Chaos engineering as a procedure, not a fireworks show.
   Trigger: palette command "chaos". Any user input aborts gracefully. */
(function () {
  const LP = window.LP;
  if (LP.reduced) return;   // no LP.chaos → the palette hides the command

  const page = document.getElementById('page');
  const statusEl = document.getElementById('statusline');
  const sysline = document.getElementById('sysline');

  /* ---------- the bug catalog: quiet, believable, healable ---------- */
  const CATALOG = [
    {
      sel: '.plate', cls: 'bug-tilt', short: 'crooked portrait',
      chip: '✗ transform: rotate(1.7deg) — expected identity',
      think: ['> bisecting styles… transform regression isolated', '> patching transform → identity'],
    },
    {
      sel: '#trajectory .st-mark.logo-farfetch', cls: 'bug-flip', short: 'mirrored logo',
      chip: '✗ scaleX(-1) — the mark reads backwards',
      think: ['> mask matrix inverted — someone touched the transform', '> restoring orientation'],
    },
    {
      sel: '#work-title', cls: 'bug-track', short: 'tracking blowout',
      chip: '✗ letter-spacing: .32em — expected -.015em',
      think: ['> kerning table corrupted in transit', '> re-tightening tracking'],
    },
    {
      sel: '#arsenal-title', cls: 'bug-dim', short: 'burnt-out heading',
      chip: '✗ opacity: 0.3 — the sign is going out',
      think: ['> luminance drop detected — flickering neon syndrome', '> re-striking the tube'],
    },
    {
      sel: '.case-grid .case:nth-child(2)', cls: 'bug-slide', short: 'card off its seat',
      chip: '✗ translateX(22px) — escaped the grid',
      think: ['> layout drift — one card left its column', '> re-seating on the grid'],
    },
    {
      sel: '#t-green', cls: 'bug-offbyone', short: 'off-by-one',
      chip: '✗ SUITES GREEN: -1 — a negative pass count',
      think: ['> the classic. an off-by-one in the tally', '> counting again, from zero this time'],
    },
  ];

  const SECTIONS = ['hero', 'manifesto', 'trajectory', 'work', 'orchestra', 'human', 'arsenal', 'contact'];
  const SPEED = 640;              // px/s scan pace
  const LINE_F = .42;             // scanline at 42% of viewport height

  /* ---------- console + scanline (built once, reused) ---------- */
  let consoleEl = null, bodyEl = null, scanline = null;
  function buildUi() {
    if (consoleEl) return;
    consoleEl = document.createElement('aside');
    consoleEl.id = 'chaos-console';
    consoleEl.setAttribute('aria-hidden', 'true');
    consoleEl.innerHTML = '<p class="mono cc-head"><i></i>SELF-DEBUG — anomaly response</p><pre></pre>';
    document.body.appendChild(consoleEl);
    bodyEl = consoleEl.querySelector('pre');
    scanline = document.createElement('div');
    scanline.id = 'scanline';
    scanline.setAttribute('aria-hidden', 'true');
    document.body.appendChild(scanline);
  }

  /* typed console lines (same pattern as the Control Room trace) */
  const queue = [];
  let line = null, ci = 0, tAcc = 0;
  function log(text, cls) { queue.push([text, cls || '']); }
  function typeTick(dt) {
    if (!queue.length || !bodyEl) return;
    tAcc += dt;
    if (tAcc < .012) return;
    tAcc = 0;
    const [text, cls] = queue[0];
    if (!line) {
      line = document.createElement('div');
      line.className = 'cc-line ' + cls;
      bodyEl.appendChild(line);
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }
    for (let n = 0; n < 3 && ci < text.length; n++) line.textContent = text.slice(0, ++ci);
    if (ci >= text.length) { queue.shift(); line = null; ci = 0; bodyEl.scrollTop = bodyEl.scrollHeight; }
  }

  /* ---------- transient inspection marks that track their element ---------- */
  const marks = [];
  function mark(el, text, bad, life) {
    const m = document.createElement('div');
    m.className = 'scan-mark ' + (bad ? 'bad' : 'ok');
    m.innerHTML = '<span>' + text + '</span>';
    document.body.appendChild(m);
    const o = { m, el, until: performance.now() + (life || 1100) };
    marks.push(o);
    return o;
  }
  function placeMarks() {
    const now = performance.now();
    for (let i = marks.length - 1; i >= 0; i--) {
      const o = marks[i];
      if (now > o.until) { o.m.remove(); marks.splice(i, 1); continue; }
      const r = o.el.getBoundingClientRect();
      o.m.style.left = (r.left - 8) + 'px';
      o.m.style.top = (r.top - 8) + 'px';
      o.m.style.width = (r.width + 16) + 'px';
      o.m.style.height = (r.height + 16) + 'px';
    }
  }

  /* ---------- the run ---------- */
  let running = false, cooldownUntil = 0, incidentN = 0;
  let state = 'idle', target = 0, originY = 0, bugs = [], seen = null;
  let fixTimer = 0, currentBug = null, unsub = null;

  function heal(bug, instant) {
    const el = document.querySelector(bug.sel);
    if (!el) return;
    if (bug.cls === 'bug-offbyone') { el.textContent = el.dataset.orig || '0'; }
    el.classList.remove(bug.cls);
    if (instant) el.classList.remove('bug-anim');
    else setTimeout(() => el.classList.remove('bug-anim'), 1100);
  }

  function cleanup(aborted) {
    bugs.forEach(b => { if (!b.fixed) heal(b, aborted); });
    marks.forEach(o => o.m.remove());
    marks.length = 0;
    if (scanline) scanline.classList.remove('show');
    LP.tabAlert && LP.tabAlert(false);
    if (statusEl) delete statusEl.dataset.lock;
    removeEventListener('wheel', abort);
    removeEventListener('touchstart', abort);
    removeEventListener('keydown', abort);
    setTimeout(() => { consoleEl && consoleEl.classList.remove('show'); }, aborted ? 2800 : 3200);
    setTimeout(() => { if (bodyEl) bodyEl.textContent = ''; queue.length = 0; line = null; ci = 0; }, aborted ? 3600 : 4000);
    if (unsub) { unsub(); unsub = null; }
    state = 'idle';
    running = false;
    cooldownUntil = performance.now() + 60000;
  }

  function abort() {
    if (state !== 'scanning' && state !== 'fixing') return;
    state = 'resolving';
    log('> manual override — operator has the wheel', 'tr-dim');
    log('> healing remaining defects quietly… done', 'tr-ok');
    if (statusEl) { statusEl.textContent = '> self-debug aborted — defects healed off-camera'; statusEl.classList.remove('fail'); }
    cleanup(true);
  }

  function docY(el) {
    const pr = page.getBoundingClientRect();
    return el.getBoundingClientRect().top - pr.top;
  }

  function run() {
    const now = performance.now();
    if (running) return 'a scan is already in progress';
    if (now < cooldownUntil) return 'crisis fatigue — give it a minute';
    running = true;
    incidentN++;
    buildUi();
    originY = scrollY;
    seen = new Set();

    /* three random defects (targets must exist), ordered top-to-bottom */
    const pool = CATALOG.filter(b => document.querySelector(b.sel));
    bugs = pool.sort(() => Math.random() - .5).slice(0, 3)
               .map(b => Object.assign({}, b, { fixed: false, marked: false, patching: false }))
               .sort((a, b2) => docY(document.querySelector(a.sel)) - docY(document.querySelector(b2.sel)));

    consoleEl.classList.add('show');
    log('> anomaly report received — entering debug mode', 'tr-h');
    log('> seeding reproduction… 3 defects planted', 'tr-dim');
    log('> initiating full-site scan', 'tr-h');
    if (statusEl) {
      statusEl.dataset.lock = '1';
      statusEl.textContent = '⚠ SELF-DEBUG IN PROGRESS — the site is reading itself';
      statusEl.classList.add('fail');
    }
    LP.tabAlert && LP.tabAlert(true);

    setTimeout(() => {
      bugs.forEach(b => {
        const el = document.querySelector(b.sel);
        el.classList.add('bug-anim');
        if (b.cls === 'bug-offbyone') { el.dataset.orig = el.textContent; el.textContent = '-1'; }
        el.classList.add(b.cls);
      });
    }, 1200);

    setTimeout(() => {
      scanline.classList.add('show');
      target = 0;
      scrollTo(0, 0);
      state = 'scanning';
    }, 2600);

    addEventListener('wheel', abort, { passive: true });
    addEventListener('touchstart', abort, { passive: true });
    addEventListener('keydown', abort);

    unsub = LP.on((t, dt) => {
      typeTick(dt);
      placeMarks();
      if (document.hidden) return;
      const lineY = innerHeight * LINE_F;

      if (state === 'scanning') {
        target += SPEED * dt;
        const max = document.documentElement.scrollHeight - innerHeight;
        scrollTo(0, Math.min(target, max));

        /* sections announce themselves as they cross the line */
        for (const id of SECTIONS) {
          if (seen.has(id)) continue;
          const el = document.getElementById(id);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.top < lineY && r.bottom > lineY) {
            seen.add(id);
            const n = 8 + ((id.length * 7) % 17);
            mark(el, '✓ #' + id + ' — ' + n + ' assertions, ok', false, 1000);
            log('scan: #' + id + ' … ok (' + n + ' assertions)', 'tr-dim');
          }
        }

        /* a defect crosses the line: stop and think */
        for (const b of bugs) {
          if (b.fixed || b.marked) continue;
          const el = document.querySelector(b.sel);
          const r = el.getBoundingClientRect();
          if (r.top < lineY + 60 && r.bottom > 0) {
            b.marked = true;
            currentBug = b;
            b._mark = mark(el, b.chip, true, 60000);
            state = 'fixing';
            fixTimer = 0;
            log('✗ defect located — ' + b.short, 'tr-fail');
            log(b.think[0], 'tr-dim');
            break;
          }
        }

        /* insurance: anything never crossed heals at sweep end */
        if (target >= max + 600 && !bugs.every(b => b.fixed)) {
          bugs.forEach(b => { if (!b.fixed) { heal(b, false); b.fixed = true; log('✓ ' + b.short + ' — healed at sweep end', 'tr-ok'); } });
        }

        if (target >= max - 4 && bugs.every(b => b.fixed)) {
          state = 'resolving';
          log('> scan complete — 3 defects, 3 fixed, 0 regressions', 'tr-ok');
          log('> filing post-mortem…', 'tr-dim');
          if (sysline) {
            let pm = document.getElementById('postmortem');
            if (!pm) {
              pm = document.createElement('p');
              pm.id = 'postmortem';
              pm.className = 'mono sysline';
              sysline.after(pm);
            }
            pm.innerHTML = 'LAST INCIDENT: <b>INC-0' + incidentN + '</b> · ' +
              bugs.map(b => b.short).join(', ') +
              ' · ROOT CAUSE: cosmic ray · <b>WONTFIX</b>: the character it added';
          }
          if (statusEl) {
            statusEl.textContent = '> self-debug complete — all suites green again';
            statusEl.classList.remove('fail');
          }
          setTimeout(() => scrollTo(0, originY), 1400);
          setTimeout(() => cleanup(false), 2100);
        }
      }
      else if (state === 'fixing') {
        fixTimer += dt;
        if (fixTimer > 2.4 && !currentBug.patching) {
          currentBug.patching = true;
          log(currentBug.think[1], '');
          heal(currentBug, false);
          currentBug.fixed = true;
          const el = document.querySelector(currentBug.sel);
          currentBug._mark.m.remove();
          const mi = marks.indexOf(currentBug._mark);
          if (mi >= 0) marks.splice(mi, 1);
          mark(el, '✓ fixed in 0.9s', false, 1600);
          log('✓ ' + currentBug.short + ' — healed', 'tr-ok');
        }
        if (fixTimer > 4) {
          currentBug = null;
          state = 'scanning';
        }
      }
    });

    return true;
  }

  LP.chaos = { run };
})();
