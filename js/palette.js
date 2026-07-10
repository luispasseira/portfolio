/* palette.js — press / for the command bar. The site's terminal, promoted
   to an instrument: navigate, dispatch epics, set the sky, read the credits. */
(function () {
  const LP = window.LP;

  /* ---- shell ---- */
  const root = document.createElement('div');
  root.id = 'palette';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Command palette');
  root.innerHTML =
    '<div class="pal-card">' +
    '<input id="pal-in" class="mono" type="text" placeholder="type a command… (goto, dispatch, dawn, redlines, credits)" autocomplete="off" spellcheck="false">' +
    '<ul id="pal-list" class="mono" role="listbox"></ul>' +
    '</div>';
  document.body.appendChild(root);
  const input = root.querySelector('#pal-in');
  const list = root.querySelector('#pal-list');

  const gotoSection = id => {
    const el = document.getElementById(id);
    if (!el) return;
    const page = document.getElementById('page');
    let y = 0, n = el;
    while (n && n !== page) { y += n.offsetTop; n = n.offsetParent; }
    scrollTo(0, Math.max(0, y - 40));
  };

  const flash = msg => {
    input.value = '';
    input.placeholder = msg;
    setTimeout(close, 850);
  };

  /* ---- commands ---- */
  const CMDS = [];
  [['hero', 'the top'], ['trajectory', 'seven years, five houses'], ['work', 'the case studies'], ['orchestra', 'the agent graph'], ['human', 'the portrait'], ['arsenal', 'tools & the gherkin'], ['contact', 'say hello']]
    .forEach(([id, hint]) => CMDS.push({ k: 'goto ' + id, hint, run: () => { gotoSection(id); close(); } }));

  if (LP.orchestra) LP.orchestra.epics.slice(0, 6).forEach(name => {
    CMDS.push({
      k: 'dispatch ' + name, hint: 'run this epic through the agents',
      run: () => {
        close();
        gotoSection('orchestra');
        const body = document.getElementById('cr-body');
        const toggle = document.getElementById('cr-toggle');
        if (body && toggle && !body.classList.contains('open')) toggle.click();
        setTimeout(() => {
          const chip = [...document.querySelectorAll('.cr-chip')].find(c => c.textContent === name);
          if (chip) chip.click();
        }, 350);
      },
    });
  });

  [['dawn', 1], ['dusk', .75], ['night', 0]].forEach(([k, v]) =>
    CMDS.push({ k, hint: 'set the hero sky to ' + k, run: () => { LP.setWarm && LP.setWarm(v); gotoSection('hero'); close(); } }));
  CMDS.push({ k: 'auto sky', hint: 'hero sky follows Porto time again', run: () => { LP.setWarm && LP.setWarm(null); flash('sky follows Porto again'); } });
  CMDS.push({ k: 'redlines', hint: 'reveal the design system (or press D)', run: () => { LP.redline && LP.redline.toggle(); close(); } });
  if (!LP.reduced) CMDS.push({
    k: 'chaos', hint: 'the site debugs itself — watch',
    run: () => {
      const r = LP.chaos ? LP.chaos.run() : 'unavailable';
      if (r === true) close(); else flash(String(r));
    },
  });
  /* ═══ [3D-6 glass-panes] BEGIN palette command — revert: delete this push ═══ */
  CMDS.push({
    k: 'depth', hint: 'glass-pane 3D scrolling (experimental toggle)',
    run: () => { const on = LP.depth3d ? LP.depth3d.toggle() : false; flash(on ? 'depth on — sections on glass panes' : 'depth off'); },
  });
  /* ═══ [3D-6] END palette command ═══ */
  CMDS.push({
    k: 'copy email', hint: 'lfmpasseira30@gmail.com → clipboard',
    run: () => { try { navigator.clipboard.writeText('lfmpasseira30@gmail.com'); } catch (e) { } flash('copied ✓'); },
  });
  CMDS.push({
    k: 'credits', hint: 'who made this',
    run: () => {
      list.innerHTML = '<li class="pal-credits">Designed &amp; built end-to-end by <b>Claude (Fable 5)</b>,<br>directed by <b>Luís Passeira</b>.<br><span>Zero frameworks. Zero dependencies. Hand-written WebGL.</span></li>';
      input.value = '';
    },
  });

  /* ---- behaviour ---- */
  let open = false, sel = 0, filtered = [];

  function render() {
    const q = input.value.trim().toLowerCase();
    filtered = CMDS.filter(c => c.k.toLowerCase().includes(q));
    sel = Math.min(sel, Math.max(0, filtered.length - 1));
    list.innerHTML = filtered.map((c, i) =>
      `<li role="option" aria-selected="${i === sel}" class="${i === sel ? 'sel' : ''}" data-i="${i}"><span>${c.k}</span><em>${c.hint}</em></li>`).join('')
      || '<li class="pal-none">no such command — try “goto orchestra”</li>';
  }

  function openPal() {
    open = true;
    root.classList.add('show');
    input.value = ''; sel = 0;
    input.placeholder = 'type a command… (goto, dispatch, dawn, redlines, credits)';
    render();
    setTimeout(() => input.focus(), 30);
  }
  function close() {
    open = false;
    root.classList.remove('show');
    input.blur();
  }

  input.addEventListener('input', () => { sel = 0; render(); });
  list.addEventListener('click', e => {
    const li = e.target.closest('li[data-i]');
    if (li) filtered[+li.dataset.i].run();
  });
  root.addEventListener('click', e => { if (e.target === root) close(); });

  addEventListener('keydown', e => {
    if (!open) {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        openPal();
      }
      return;
    }
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, filtered.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
    else if (e.key === 'Enter') { if (filtered[sel]) filtered[sel].run(); }
  });

  /* ---- footer hints double as touch buttons ---- */
  const hints = document.getElementById('try-hints');
  if (hints) {
    hints.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'palette') openPal();
      if (b.dataset.act === 'redlines' && LP.redline) LP.redline.toggle();
      if (b.dataset.act === 'ctrlroom') {
        gotoSection('orchestra');
        const body = document.getElementById('cr-body');
        const toggle = document.getElementById('cr-toggle');
        if (body && toggle && !body.classList.contains('open')) toggle.click();
      }
    });
  }
})();
