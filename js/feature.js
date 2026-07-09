/* feature.js — the arsenal tests itself: a Gherkin feature file that types,
   runs its assertions, passes, rests, and starts the next scenario.
   Reduced motion (or no JS): the full file is printed statically. */
(function () {
  const LP = window.LP;
  const body = document.getElementById('ff-body');
  const status = document.getElementById('ff-status');
  const box = document.getElementById('feature-file');
  if (!body || !box) return;

  /* [text, type] — type: k keyword line, s step, a assertion (earns a ✓), 0 blank */
  const SCENARIOS = [
    [
      ['Feature: Quality Multiplier', 'k'],
      ['', 0],
      ['  Scenario: A team needs a quality standard', 'k'],
      ['    Given seven years of financial-grade systems', 's'],
      ['    And a stack of Cucumber, Playwright and Java', 's'],
      ['    When an epic lands on the board', 's'],
      ['    Then the tests write themselves', 'a'],
      ['    And the standard survives handover', 'a'],
    ],
    [
      ['  Scenario: Production stays boring', 'k'],
      ['    Given the Orchestra is on duty', 's'],
      ['    And every merge passes the reviewer gate', 's'],
      ['    When Friday deploy meets Monday audit', 's'],
      ['    Then nothing interesting happens', 'a'],
    ],
    [
      ['  Scenario: The knowledge outlives the meeting', 'k'],
      ['    Given a pattern worth keeping', 's'],
      ['    When it is taught instead of hoarded', 's'],
      ['    Then the team runs it without him in the room', 'a'],
    ],
  ];

  /* static fallback: the HTML already carries the printed file */
  if (LP.reduced) {
    if (status) { status.textContent = '✓ ALL SCENARIOS PASSED'; status.classList.add('pass'); }
    return;
  }
  body.textContent = '';   // the live version types it from nothing

  /* ---- breathing height: the box always follows its content on a slow lerp,
     so the page below glides — down as lines type, up when the file clears.
     The CSS min-height is the floor it can never sink beneath. ---- */
  let hCur = -1, floorH = 0, padB = 0;
  function measureStatic() {
    const cs = getComputedStyle(body);
    floorH = parseFloat(cs.minHeight) || 0;
    padB = parseFloat(cs.paddingBottom) || 0;
  }
  measureStatic();
  addEventListener('resize', measureStatic, { passive: true });

  function breathe(dt) {
    const last = body.lastElementChild;
    const content = last
      ? last.getBoundingClientRect().bottom - body.getBoundingClientRect().top + padB
      : 0;
    const target = Math.max(content, floorH);
    if (hCur < 0) hCur = Math.max(body.offsetHeight, floorH);
    hCur += (target - hCur) * Math.min(1, dt * 1.55);
    if (Math.abs(target - hCur) < .5) hCur = target;
    body.style.height = hCur.toFixed(1) + 'px';
  }

  const mk = (cls) => { const d = document.createElement('div'); d.className = 'ff-line ' + cls; body.appendChild(d); return d; };
  const CLS = { k: 'ff-k', s: 'ff-s', a: 'ff-s', 0: 'ff-s' };

  let si = 0, li = 0, ci = 0, line = null, waitT = 0, passed = 0;
  let mode = 'type';           // type → tick → rest → clear

  function setStatus(txt, pass) {
    if (!status) return;
    status.textContent = txt;
    status.classList.toggle('pass', !!pass);
  }

  let acc = 0;
  LP.on((t, dt) => {
    const r = box.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || document.hidden) return;

    breathe(dt);

    acc += dt;
    const scenario = SCENARIOS[si];

    if (mode === 'type') {
      if (acc < 0.016) return;               // ~2 chars/frame max
      acc = 0;
      const [text, kind] = scenario[li];
      if (!line) line = mk(CLS[kind] || 'ff-s');
      for (let n = 0; n < 2 && ci < text.length; n++) line.textContent = text.slice(0, ++ci);
      if (ci >= text.length) {
        line = null; ci = 0; li++;
        if (li >= scenario.length) { mode = 'tick'; li = 0; waitT = 0; setStatus('● EXECUTING'); }
      }
    }
    else if (mode === 'tick') {
      waitT += dt;
      if (waitT < 0.5) return;
      waitT = 0;
      // stamp the next un-ticked assertion
      const kids = body.children;
      let base = kids.length - scenario.length;
      let done = true;
      for (let i = 0; i < scenario.length; i++) {
        if (scenario[i][1] === 'a' && !kids[base + i].querySelector('b')) {
          const b = document.createElement('b');
          b.textContent = '   ✓ ' + (0.008 + Math.random() * 0.09).toFixed(3) + 's';
          kids[base + i].appendChild(b);
          passed++;
          done = false;
          break;
        }
      }
      if (done) { mode = 'rest'; waitT = 0; setStatus('✓ ' + passed + ' PASSING', true); }
    }
    else if (mode === 'rest') {
      waitT += dt;
      if (waitT < 2.6) return;
      waitT = 0;
      si++;
      if (si >= SCENARIOS.length) {           // full run done: clear; breathe() exhales the box down
        si = 0; passed = 0;
        body.textContent = '';
        setStatus('● RUNNING');
        mode = 'collapse';
      } else {
        mk('ff-s');                            // blank spacer line
        setStatus('● RUNNING');
        mode = 'type';
      }
    }
    else if (mode === 'collapse') {           // let the page glide up before typing again
      waitT += dt;
      if (waitT < 1.9) return;
      waitT = 0;
      mode = 'type';
    }
  });
})();
