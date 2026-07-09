/* console.js — the Control Room. Closed, the Orchestra section is untouched.
   Open, visitors dispatch a real CSD epic: the existing graph runs it while
   the trace pane types each agent's work, stage-synced with the packet. */
(function () {
  const LP = window.LP;
  const toggle = document.getElementById('cr-toggle');
  const body = document.getElementById('cr-body');
  const epicsEl = document.getElementById('cr-epics');
  const trace = document.getElementById('cr-trace');
  const label = document.getElementById('cr-epic-label');
  if (!toggle || !body || !LP.orchestra) return;   // reduced motion: graph API absent, control stays hidden

  toggle.hidden = false;

  /* hand-authored trace per epic: what each agent actually produces */
  const T = {
    'partial settlement splits': {
      code: 'CSD-2141',
      analyst: ['AC-1  a partially matched instruction settles the available quantity', 'AC-2  the residual re-enters the settlement queue unaltered', 'AC-3  penalties accrue only on the unsettled remainder'],
      planner: ['SC-01 split at 60/40 across two settlement cycles  [P1]', 'SC-02 residual carries original trade reference  [P1]', 'data: ISIN PTAAA0AM0009 · qty 1_000_000 · T2S sandbox'],
      implementer: ['Scenario: Partial settlement leaves a clean residual', '  Given an instruction for 1,000,000 units partially matched at 600,000', '  When the settlement cycle executes', '  Then 600,000 settle and 400,000 requeue', '@Step("the settlement cycle executes")', 'public void executeCycle() { t2s.runCycle(SANDBOX); }'],
      fail: ['expected residual 400,000 but was 0 — residual dropped on cycle close', 'patch: carry unsettledQty into requeue() before cycle teardown'],
      verdict: ['review: patch respects the team pattern (no state in steps) ✓', 'merged. suite green — 14 scenarios, 0 flakes'],
    },
    'corporate-action entitlement calc': {
      code: 'CSD-1987',
      analyst: ['AC-1  entitlements derive from settled positions at record date', 'AC-2  fractional entitlements round per issuer terms', 'AC-3  pending transactions produce market claims'],
      planner: ['SC-01 cash dividend on settled position  [P1]', 'SC-02 pending buy at record date → market claim  [P1]', 'data: dividend 0.031 EUR/unit · record date T+0'],
      implementer: ['Scenario: Pending trade at record date raises a claim', '  Given a buy of 50,000 units pending at record date', '  When entitlements are calculated', '  Then a market claim is raised for the buyer', '@Step("entitlements are calculated")', 'public void calcEntitlements() { ca.runRecordDate(); }'],
      fail: ['claim raised for seller, not buyer — direction inverted on pending buys', 'patch: claim.direction = tx.side.beneficiary() in ClaimBuilder'],
      verdict: ['review: naming matches the CA domain glossary ✓', 'merged. suite green — 9 scenarios, 0 flakes'],
    },
    'ISIN issuance validation': {
      code: 'CSD-2210',
      analyst: ['AC-1  a new ISIN must satisfy the ISO 6166 check digit', 'AC-2  duplicates are rejected with the existing reference', 'AC-3  the CFI code must exist before activation'],
      planner: ['SC-01 valid issuance end-to-end  [P1]', 'SC-02 check-digit tampering rejected  [P1]', 'SC-03 duplicate returns the original ISIN  [P2]'],
      implementer: ['Scenario: Tampered check digit is rejected', '  Given an ISIN request with check digit forced to 7', '  When the issuance is submitted', '  Then it is rejected with ISO6166_CHECK_FAILED', '@Step("the issuance is submitted")', 'public void submit() { nna.issue(request); }'],
      fail: ['expected ISO6166_CHECK_FAILED but issuance succeeded — validator skipped on manual channel', 'patch: route manual channel through IsinValidator.chain()'],
      verdict: ['review: validator now single-sourced ✓ pattern preserved', 'merged. suite green — 11 scenarios, 0 flakes'],
    },
    'T2S instruction matching': {
      code: 'CSD-2055',
      analyst: ['AC-1  instructions match on the T2S mandatory field set', 'AC-2  tolerance on settlement amount is 25 EUR', 'AC-3  unmatched instructions age into CANCELLED at T+20'],
      planner: ['SC-01 exact match settles same cycle  [P1]', 'SC-02 amount inside tolerance matches  [P1]', 'SC-03 aged unmatched cancels at T+20  [P2]'],
      implementer: ['Scenario: Amount within tolerance still matches', '  Given two instructions differing by 24.99 EUR', '  When T2S matching runs', '  Then the instructions match', '@Step("T2S matching runs")', 'public void match() { t2s.matchCycle(); }'],
      fail: ['no match — tolerance compared in cents against a EUR constant', 'patch: normalise both sides to minor units before compare'],
      verdict: ['review: money handling via Amount type, no raw doubles ✓', 'merged. suite green — 12 scenarios, 0 flakes'],
    },
    'custody position reconciliation': {
      code: 'CSD-2302',
      analyst: ['AC-1  end-of-day positions reconcile against T2S balances', 'AC-2  every break gets a classified reason code', 'AC-3  unresolved breaks escalate before next-day open'],
      planner: ['SC-01 clean day reconciles to zero breaks  [P1]', 'SC-02 injected 1-unit drift is detected and classified  [P1]', 'data: 3 accounts · 40k positions · drift on account 2'],
      implementer: ['Scenario: A one-unit drift is caught and classified', '  Given account CSD-ACC-002 drifts by 1 unit intraday', '  When end-of-day reconciliation runs', '  Then one break is reported with reason POSITION_DRIFT', '@Step("end-of-day reconciliation runs")', 'public void reconcile() { recon.runEod(); }'],
      fail: ['break detected but reason UNKNOWN — classifier missed the drift window', 'patch: widen drift window to include intraday movements'],
      verdict: ['review: classifier table-driven, matches the standard ✓', 'merged. suite green — 8 scenarios, 0 flakes'],
    },
    'cross-CSD realignment': {
      code: 'CSD-2418',
      analyst: ['AC-1  positions move between CSDs without settlement impact', 'AC-2  the investor CSD link must be verified before movement', 'AC-3  realignment is atomic — no partial state survives failure'],
      planner: ['SC-01 realignment across a verified link  [P1]', 'SC-02 link outage mid-transfer rolls back atomically  [P1]', 'data: issuer CSD PT ↔ investor CSD DE · 250k units'],
      implementer: ['Scenario: Link outage rolls back the realignment', '  Given a realignment of 250,000 units in flight', '  When the CSD link drops mid-transfer', '  Then both legs roll back and positions are unchanged', '@Step("the CSD link drops mid-transfer")', 'public void dropLink() { links.sever(DE); }'],
      fail: ['issuer leg rolled back, investor leg retained ghost units — non-atomic', 'patch: wrap both legs in RealignmentSaga with compensation'],
      verdict: ['review: saga pattern per the team playbook ✓', 'merged. suite green — 7 scenarios, 0 flakes'],
    },
    'DvP vs FoP instruction flows': {
      code: 'CSD-2093',
      analyst: ['AC-1  DvP settles securities and cash as one atomic unit', 'AC-2  FoP settles securities with no cash leg at all', 'AC-3  a DvP with no cash account fails before matching'],
      planner: ['SC-01 DvP happy path, both legs settle  [P1]', 'SC-02 FoP produces zero cash movements  [P1]', 'SC-03 DvP without cash account rejected early  [P2]'],
      implementer: ['Scenario: FoP never touches the cash leg', '  Given a free-of-payment delivery of 10,000 units', '  When settlement executes', '  Then securities move and the cash ledger is untouched', '@Step("settlement executes")', 'public void settle() { t2s.settle(instruction); }'],
      fail: ['cash ledger shows a zero-amount entry — FoP wrote a phantom cash leg', 'patch: guard cash-leg creation on paymentType != FOP'],
      verdict: ['review: guard at the boundary, not in the ledger ✓', 'merged. suite green — 10 scenarios, 0 flakes'],
    },
  };
  /* epics without authored traces fall back to the first */
  const contentFor = e => T[e] || T[Object.keys(T)[0]];

  /* ---- drawer ---- */
  let open = false;
  toggle.addEventListener('click', () => {
    open = !open;
    body.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.querySelector('.cr-arrow').textContent = open ? '▾' : '▸';
  });

  /* ---- epic chips (only epics with an authored trace) ---- */
  let selected = null, armed = false;
  Object.keys(T).forEach(name => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cr-chip mono';
    b.textContent = name;
    b.addEventListener('click', () => {
      [...epicsEl.children].forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      selected = name;
      armed = true;
      LP.orchestra.dispatch(name);
      trace.textContent = '';
      queueLines([['> “' + name + '” queued — fast-forwarding current run…', 'tr-dim']]);
      label.textContent = contentFor(name).code + ' · ' + name;
    });
    epicsEl.appendChild(b);
  });

  /* ---- typing engine (feature.js pattern) ---- */
  const queue = [];   // [text, cls]
  let line = null, ci = 0, acc = 0;
  function queueLines(lines) { lines.forEach(l => queue.push(l)); }
  LP.on((t, dt) => {
    if (!queue.length || document.hidden) return;
    acc += dt;
    if (acc < 0.012) return;
    acc = 0;
    const [text, cls] = queue[0];
    if (!line) {
      line = document.createElement('div');
      line.className = 'tr-line ' + (cls || '');
      trace.appendChild(line);
      trace.scrollTop = trace.scrollHeight;
    }
    for (let n = 0; n < 3 && ci < text.length; n++) line.textContent = text.slice(0, ++ci);
    if (ci >= text.length) { queue.shift(); line = null; ci = 0; trace.scrollTop = trace.scrollHeight; }
  });

  /* ---- stage-synced narration for the dispatched epic ---- */
  LP.orchestra.onStage((stage, epic, manual) => {
    if (!armed || !manual || epic !== selected) return;
    const c = contentFor(epic);
    const H = (s, cls) => queueLines([['', ''], [s, cls || 'tr-h']]);
    if (stage === 'dispatch') { trace.textContent = ''; queue.length = 0; line = null; ci = 0;
      queueLines([['> orchestrator: epic ' + c.code + ' “' + epic + '” accepted', 'tr-h']]); }
    if (stage === 'analyst') { H('[ANALYST] acceptance criteria'); queueLines(c.analyst.map(l => ['  ' + l, ''])); }
    if (stage === 'planner') { H('[PLANNER] strategy'); queueLines(c.planner.map(l => ['  ' + l, ''])); }
    if (stage === 'implementer') { H('[IMPLEMENTER] emitting suite'); queueLines(c.implementer.map(l => ['  ' + l, 'tr-code'])); }
    if (stage === 'runner') { H('[RUNNER] executing'); queueLines([['  mvn verify -pl settlement-e2e …', 'tr-code']]); }
    if (stage === 'triage') { H('[TRIAGE] RED', 'tr-fail'); queueLines([['  ' + c.fail[0], 'tr-fail'], ['  ' + c.fail[1], '']]); }
    if (stage === 'rerun') { queueLines([['  re-running suite…', 'tr-dim']]); }
    if (stage === 'reviewer') { H('[REVIEWER] gate', 'tr-ok'); queueLines(c.verdict.map(l => ['  ' + l, 'tr-ok'])); }
    if (stage === 'done') {
      queueLines([['', ''], ['> ' + c.code + ' merged. the orchestrator thanks you for conducting.', 'tr-h']]);
      armed = false;
    }
  });
})();
