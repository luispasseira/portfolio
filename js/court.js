/* court.js — the same six people, the same job. The Leixões formation
   (captain playing opposite — the finisher) morphs into a delivery team:
   the lead connected to everyone, everyone sending through the quality
   gate. The net never moves; it just changes its name. */
(function () {
  const LP = window.LP;
  const fig = document.getElementById('court');
  const svg = document.getElementById('court-svg');
  if (!fig || !svg) return;

  if (LP.reduced) { fig.classList.add('static'); return; }
  fig.classList.add('live');

  const $ = id => svg.querySelector(id);
  const bound = $('#c-bound'), ghosts = $('#c-ghosts'), net = $('#c-net'),
        netLabel = $('#c-netlabel'), path = $('#c-path'), pt = $('#c-pt'),
        ok = $('#c-ok'), lead = $('#c-lead'), ball = $('#c-ball');
  const dots = [...svg.querySelectorAll('.c-dot')];
  const spokes = [...svg.querySelectorAll('#c-spokes line')];
  const sends = [...svg.querySelectorAll('#c-sends line')];
  const spokesG = $('#c-spokes'), sendsG = $('#c-sends');

  /* keyframes: A = court, B = workflow */
  const A = {
    dots: [[170, 90], [170, 165], [170, 240], [340, 165], [340, 240]],
    lead: [340, 90],                                   // the opposite, front row
    net: 430,
    path: [[170, 165], [340, 165], [340, 90], [560, 170]],  // receive → set → finish
    boundO: 1, ghostO: .24, ptO: 1, okO: 0, linkO: 0,
    label: 'NET',
  };
  const B = {
    dots: [[430, 60], [430, 112], [430, 165], [430, 218], [430, 270]],
    lead: [150, 165],
    net: 680,
    path: [[150, 165], [430, 165], [640, 167], [845, 170]],
    boundO: 0, ghostO: 0, ptO: 0, okO: 1, linkO: 1,
    label: 'QUALITY GATE',
  };
  const CONVERGE = [845, 170];   // where every send-line meets, past the gate

  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);

  function apply(t) {
    const leadX = lerp(A.lead[0], B.lead[0], t), leadY = lerp(A.lead[1], B.lead[1], t);
    dots.forEach((d, i) => {
      const x = lerp(A.dots[i][0], B.dots[i][0], t), y = lerp(A.dots[i][1], B.dots[i][1], t);
      d.setAttribute('cx', x.toFixed(1)); d.setAttribute('cy', y.toFixed(1));
      // the lead reaches everyone…
      spokes[i].setAttribute('x1', leadX.toFixed(1)); spokes[i].setAttribute('y1', leadY.toFixed(1));
      spokes[i].setAttribute('x2', x.toFixed(1)); spokes[i].setAttribute('y2', y.toFixed(1));
      // …and everyone sends into the gate
      sends[i].setAttribute('x1', x.toFixed(1)); sends[i].setAttribute('y1', y.toFixed(1));
      sends[i].setAttribute('x2', CONVERGE[0]); sends[i].setAttribute('y2', CONVERGE[1]);
    });
    lead.setAttribute('cx', leadX.toFixed(1)); lead.setAttribute('cy', leadY.toFixed(1));
    const nx = lerp(A.net, B.net, t).toFixed(1);
    net.setAttribute('x1', nx); net.setAttribute('x2', nx);
    netLabel.setAttribute('x', nx);
    if (t < .5 && netLabel.textContent !== A.label) netLabel.textContent = A.label;
    if (t >= .5 && netLabel.textContent !== B.label) netLabel.textContent = B.label;
    const pts = A.path.map((p, i) => [lerp(p[0], B.path[i][0], t), lerp(p[1], B.path[i][1], t)]);
    path.setAttribute('d', 'M ' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L '));
    bound.setAttribute('opacity', lerp(A.boundO, B.boundO, t).toFixed(2));
    ghosts.setAttribute('opacity', lerp(A.ghostO, B.ghostO, t).toFixed(2));
    pt.setAttribute('opacity', lerp(A.ptO, B.ptO, t).toFixed(2));
    ok.setAttribute('opacity', lerp(A.okO, B.okO, t).toFixed(2));
    const linkO = lerp(A.linkO, B.linkO, t).toFixed(2);
    spokesG.setAttribute('opacity', linkO);
    sendsG.setAttribute('opacity', linkO * .9);
  }
  apply(0);

  const PHASES = [['holdA', 4], ['toB', 1.5], ['holdB', 4.5], ['toA', 1.5]];
  let pi = 0, pt_ = 0, ballT = 0;

  LP.on((t, dt) => {
    const r = fig.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || document.hidden) return;

    const [phase, dur] = PHASES[pi];
    pt_ += dt / dur;
    let m = phase === 'holdA' ? 0 : phase === 'holdB' ? 1
          : phase === 'toB' ? ease(Math.min(1, pt_)) : 1 - ease(Math.min(1, pt_));
    apply(m);
    if (phase === 'toB' && pt_ >= .5) fig.classList.add('stateB');
    if (phase === 'toA' && pt_ >= .5) fig.classList.remove('stateB');
    if (pt_ >= 1) { pt_ = 0; pi = (pi + 1) % PHASES.length; }

    ballT += dt / 2.6;
    if (ballT >= 1) ballT = 0;
    const len = path.getTotalLength();
    if (len > 0) {
      const p = path.getPointAtLength(len * ease(ballT));
      ball.setAttribute('cx', p.x.toFixed(1));
      ball.setAttribute('cy', p.y.toFixed(1));
      ball.setAttribute('opacity', (ballT < .04 || ballT > .96) ? 0 : .85);
    }
  });
})();
