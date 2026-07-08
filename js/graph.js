/* graph.js — THE ORCHESTRA. Live agent-graph: packets of work travel the
   pipeline, the triage loop visibly cycles ember until it earns signal,
   telemetry ticks. Canvas 2D + additive glow sprites; DOM buttons overlay
   the nodes for hover/focus contract cards. Static SVG remains the
   fallback for reduced-motion / no-JS. */
(function () {
  const LP = window.LP;
  const stage = document.getElementById('stage');
  if (!stage || LP.reduced) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'graph-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const COL = {
    signal: '#56E0C8', ember: '#E8A33D', bone: '#E8E4DC',
    mute: 'rgba(155,161,174,.55)', hair: 'rgba(35,41,54,1)',
  };

  /* ---------- data ---------- */
  const NODES = {
    hub:  { label: 'ORCHESTRATOR', sub: 'dispatch · arbitrate', hubby: true,
            card: 'Receives the epic. Decomposes it, dispatches the agents, arbitrates retries, owns the definition of done.' },
    ana:  { label: 'ANALYST', sub: 'epic → intent',
            card: 'Reads epics and features; extracts testable intent and acceptance criteria into a coverage map.' },
    pla:  { label: 'PLANNER', sub: 'intent → strategy',
            card: 'Turns coverage into strategy: scenarios, priorities, data needs — the edges worth paying for.' },
    imp:  { label: 'IMPLEMENTER', sub: 'strategy → code',
            card: 'Writes the code: Gherkin features, Java step definitions, Playwright specs — inside the team’s Maven structure and patterns.' },
    run:  { label: 'RUNNER', sub: 'execute suites',
            card: 'Executes the suites; captures traces, artifacts and telemetry for every run.' },
    tri:  { label: 'TRIAGE ⟳', sub: 'fail → repair → rerun', loop: true,
            card: 'The loop. Diagnoses the failure, patches, re-runs — stubbornly — until green or escalation.' },
    rev:  { label: 'REVIEWER', sub: 'gate: merge / reject',
            card: 'The gate. Reviews the diff against the standards; approves, or sends it back with reasons.' },
  };
  const WIDE = { hub: [.50, .17], ana: [.11, .55], pla: [.285, .70], imp: [.462, .55], run: [.64, .70], tri: [.787, .46], rev: [.90, .70] };
  const TALL = { hub: [.50, .06], ana: [.28, .19], pla: [.72, .31], imp: [.28, .43], run: [.72, .55], tri: [.26, .66], rev: [.50, .82] };

  const PIPE = [['hub','ana'],['ana','pla'],['pla','imp'],['imp','run'],['run','tri'],['tri','run'],['run','rev'],['rev','hub']];

  /* ---------- DOM: swap static → live ---------- */
  stage.classList.add('live');
  stage.appendChild(canvas);

  const card = document.createElement('div');
  card.className = 'gcard';
  card.setAttribute('role', 'status');
  stage.appendChild(card);

  const btns = {};
  for (const id in NODES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gnode' + (NODES[id].hubby ? ' hub' : '') + (NODES[id].loop ? ' loop' : '');
    b.innerHTML = NODES[id].label + '<small>' + NODES[id].sub + '</small>';
    b.addEventListener('pointerenter', () => showCard(id));
    b.addEventListener('focus', () => showCard(id));
    b.addEventListener('pointerleave', hideCard);
    b.addEventListener('blur', hideCard);
    stage.appendChild(b);
    btns[id] = b;
  }
  let cardTimer;
  function showCard(id) {
    clearTimeout(cardTimer);
    card.innerHTML = '<span class="mono">' + NODES[id].label + '</span>' + NODES[id].card;
    const n = pos[id];
    const left = Math.min(Math.max(n.x - 120, 10), stage.clientWidth - 260);
    const above = n.y > stage.clientHeight * .5;
    card.style.left = left + 'px';
    card.style.top = above ? '' : (n.y + 46) + 'px';
    card.style.bottom = above ? (stage.clientHeight - n.y + 40) + 'px' : '';
    card.classList.add('show');
    NODES[id]._hot = 1;
  }
  function hideCard() { cardTimer = setTimeout(() => card.classList.remove('show'), 120); }

  /* ---------- geometry ---------- */
  let W = 0, H = 0, dpr = 1;
  const pos = {};   // id -> {x,y} css px
  function layout() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const L = (W > 760 ? WIDE : TALL);
    for (const id in L) {
      pos[id] = { x: L[id][0] * W, y: L[id][1] * H };
      btns[id].style.left = (L[id][0] * 100) + '%';
      btns[id].style.top = (L[id][1] * 100) + '%';
    }
  }
  layout();
  new ResizeObserver(layout).observe(stage);

  /* curve for an edge: quadratic with a perpendicular bow */
  function curve(a, b, bow) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { cx: mx - dy / len * bow, cy: my + dx / len * bow };
  }
  function pointOn(a, b, bow, t) {
    const c = curve(a, b, bow);
    const u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * c.cx + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.cy + t * t * b.y,
    };
  }
  const BOW = { 'run>tri': -34, 'tri>run': -34, 'rev>hub': 90, 'hub>ana': 40 };
  const bowOf = (f, t) => BOW[f + '>' + t] !== undefined ? BOW[f + '>' + t] : 18;

  /* ---------- glow sprite ---------- */
  function sprite(r, g, b) {
    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const c = s.getContext('2d');
    const grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(.35, `rgba(${r},${g},${b},.35)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
    return s;
  }
  const SP = { signal: sprite(86, 224, 200), ember: sprite(232, 163, 61), bone: sprite(232, 228, 220) };

  /* ---------- telemetry ---------- */
  const T = id => document.getElementById(id);
  const tel = { epics: T('t-epics'), plans: T('t-plans'), runs: T('t-runs'), fails: T('t-fails'), green: T('t-green') };
  const count = { epics: 0, plans: 0, runs: 0, fails: 0, green: 0 };
  function bump(k, n) { count[k] += (n || 1); if (tel[k]) tel[k].textContent = count[k]; }

  /* ---------- the score: a repeating dispatch cycle ---------- */
  const act = {};             // node activity 0..1
  for (const id in NODES) act[id] = 0;

  const statusEl = document.getElementById('statusline');
  let legs = [];
  function compose() {
    const loops = 1 + (Math.random() < .45 ? 1 : 0);   // 1–2 triage cycles
    const epic = count.epics + 1;
    const L = [];
    const leg = (f, t, col, dur, onA, m, fail) => L.push({ f, t, col, dur, onA, m, fail });
    const hold = (n, dur, m, fail) => L.push({ holdAt: n, dur, m, fail });
    leg('hub', 'ana', 'signal', 1.5, () => { act.ana = 1; bump('epics'); }, '> dispatch: epic #' + epic + ' → analyst');
    hold('ana', .6, '> analyst: extracting testable intent…');
    leg('ana', 'pla', 'bone', 1.25, () => { act.pla = 1; bump('plans', 2 + Math.floor(Math.random() * 5)); }, '> coverage map → planner');
    hold('pla', .6, '> planner: composing strategy, pricing the edge cases…');
    leg('pla', 'imp', 'bone', 1.25, () => { act.imp = 1; }, '> strategy → implementer');
    hold('imp', .8, '> implementer: writing gherkin + java steps + playwright specs…');
    leg('imp', 'run', 'bone', 1.25, () => { act.run = 1; bump('runs'); }, '> suite → runner');
    hold('run', .65, '> runner: executing suite…');
    for (let i = 0; i < loops; i++) {
      leg('run', 'tri', 'ember', .95, () => { act.tri = 1; bump('fails'); }, '> RED — assertion failed → triage', true);
      hold('tri', .6, '> triage: diagnosing… patch attempt #' + (i + 1), true);
      leg('tri', 'run', 'ember', .95, () => { act.run = 1; bump('runs'); }, '> patched → re-run', true);
      hold('run', .6, '> runner: executing suite…');
    }
    leg('run', 'rev', 'signal', 1.2, () => { act.rev = 1; }, '> GREEN — suite passing → reviewer');
    hold('rev', .75, '> reviewer: diff vs standards…');
    leg('rev', 'hub', 'signal', 1.6, () => { act.hub = 1; bump('green'); }, '> approved. merged — reporting to orchestrator');
    hold('hub', .9, '> idle — awaiting next epic…');
    return L;
  }

  let li = 0, lt = 0, spoke = null;
  const trail = [];
  function step(dt) {
    if (!legs.length) { legs = compose(); li = 0; lt = 0; }
    const leg = legs[li];
    if (leg !== spoke) {
      spoke = leg;
      if (statusEl && leg.m) {
        statusEl.textContent = leg.m;
        statusEl.classList.toggle('fail', !!leg.fail);
      }
    }
    lt += dt / leg.dur;
    let p = null, col = leg.col || 'signal';
    if (leg.holdAt) {
      p = pos[leg.holdAt];
    } else {
      const e = Math.min(1, lt);
      const ease = e < .5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
      p = pointOn(pos[leg.f], pos[leg.t], bowOf(leg.f, leg.t), ease);
    }
    if (lt >= 1) {
      if (leg.onA) leg.onA();
      li++; lt = 0;
      if (li >= legs.length) { legs = []; }
    }
    if (p && !leg.holdAt) {
      trail.push({ x: p.x, y: p.y, col, a: 1 });
      if (trail.length > 26) trail.shift();
    }
    trail.forEach(s => s.a -= dt * 2.2);
    for (let i = trail.length - 1; i >= 0; i--) if (trail[i].a <= 0) trail.splice(i, 1);
    return { p, col, moving: !leg.holdAt };
  }

  /* ---------- draw ---------- */
  function draw(t, packet) {
    ctx.clearRect(0, 0, W, H);

    /* spokes */
    ctx.save();
    ctx.strokeStyle = COL.hair;
    ctx.setLineDash([2, 7]);
    ctx.lineWidth = 1;
    for (const id of ['ana', 'pla', 'imp', 'run', 'rev']) {
      ctx.beginPath();
      ctx.moveTo(pos.hub.x, pos.hub.y);
      ctx.lineTo(pos[id].x, pos[id].y);
      ctx.stroke();
    }
    ctx.restore();

    /* pipeline edges */
    for (const [f, g] of PIPE) {
      const loopEdge = (f === 'run' && g === 'tri') || (f === 'tri' && g === 'run');
      const c = curve(pos[f], pos[g], bowOf(f, g));
      ctx.beginPath();
      ctx.moveTo(pos[f].x, pos[f].y);
      ctx.quadraticCurveTo(c.cx, c.cy, pos[g].x, pos[g].y);
      ctx.strokeStyle = loopEdge ? 'rgba(232,163,61,.34)' : 'rgba(155,161,174,.22)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    /* packet trail + head (additive) */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of trail) {
      const sz = 22 * s.a;
      ctx.globalAlpha = s.a * .5;
      ctx.drawImage(SP[s.col], s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
    if (packet.p) {
      ctx.globalAlpha = 1;
      const pulse = packet.moving ? 30 : 24 + 6 * Math.sin(t * 6);
      ctx.drawImage(SP[packet.col], packet.p.x - pulse / 2, packet.p.y - pulse / 2, pulse, pulse);
      ctx.fillStyle = COL.bone;
      ctx.beginPath();
      ctx.arc(packet.p.x, packet.p.y, 2.4, 0, 7);
      ctx.fill();
    }

    /* nodes */
    for (const id in NODES) {
      const n = pos[id], a = act[id];
      const hot = NODES[id]._hot ? (NODES[id]._hot = Math.max(0, NODES[id]._hot - .016), NODES[id]._hot) : 0;
      const base = NODES[id].hubby ? 'signal' : NODES[id].loop ? 'ember' : 'bone';
      const glow = (NODES[id].hubby ? 46 + 8 * Math.sin(t * 2.1) : 30) * (0.55 + a * .8 + hot * .6);
      ctx.globalAlpha = .5 + a * .5;
      ctx.drawImage(SP[base], n.x - glow / 2, n.y - glow / 2, glow, glow);
      ctx.globalAlpha = 1;
      ctx.fillStyle = base === 'signal' ? COL.signal : base === 'ember' ? COL.ember : COL.bone;
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODES[id].hubby ? 6.5 : 4, 0, 7);
      ctx.fill();
      /* orbit ring on the hub */
      if (NODES[id].hubby) {
        ctx.strokeStyle = 'rgba(86,224,200,.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 13 + 2.5 * Math.sin(t * 2.1), 0, 7);
        ctx.stroke();
      }
    }
    ctx.restore();

    /* activity decay */
    for (const id in act) act[id] = Math.max(0, act[id] - 0.012);
  }

  /* parallax tilt toward the cursor */
  let tiltX = 0, tiltY = 0;
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    tiltX = ((e.clientY - r.top) / r.height - .5) * -3.2;
    tiltY = ((e.clientX - r.left) / r.width - .5) * 4.2;
  });
  stage.addEventListener('pointerleave', () => { tiltX = 0; tiltY = 0; });
  let cTiltX = 0, cTiltY = 0;
  stage.style.transformStyle = 'preserve-3d';
  stage.style.perspective = '900px';

  LP.on((t, dt) => {
    const r = stage.getBoundingClientRect();
    if (r.bottom < -80 || r.top > innerHeight + 80 || document.hidden) return;
    cTiltX += (tiltX - cTiltX) * Math.min(1, dt * 4);
    cTiltY += (tiltY - cTiltY) * Math.min(1, dt * 4);
    stage.style.transform = `rotateX(${cTiltX.toFixed(3)}deg) rotateY(${cTiltY.toFixed(3)}deg)`;
    draw(t, step(dt));
  });
})();
