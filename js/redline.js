/* redline.js — press D and the design system reveals itself: annotation
   chips on the key decisions, gutter hairlines, and a token legend.
   Press D again and it vanishes without residue. */
(function () {
  const LP = window.LP;
  const page = document.getElementById('page');
  if (!page) return;

  const TARGETS = [
    ['#hero h1', () => 'Fraunces variable · ' + Math.round(parseFloat(getComputedStyle(document.querySelector('#hero h1')).fontSize)) + 'px · opsz 144 · SOFT/WONK axes'],
    ['#trajectory .kicker', () => '--signal #56E0C8 · JetBrains Mono · tracking .14em'],
    ['.manifesto-line', () => 'wght 330→640, scrubbed by scroll'],
    ['.case-feature', () => '--obsidian surface · radius 6 · 1px --hair · 3° pointer tilt'],
    ['#stage', () => 'canvas 2D · additive glow sprites · packet state machine'],
    ['.plate', () => 'WebGL — 4×4 Bayer dither · duotone ink/bone · cursor displacement'],
    ['.feature-file', () => 'self-typing Gherkin · height on a lerp'],
    ['.contact-mail', () => 'SOFT 0→100 on hover — the serif exhales'],
  ];

  let layer = null, legend = null, on = false;

  function build() {
    const pr = page.getBoundingClientRect();
    layer = document.createElement('div');
    layer.id = 'redline';
    layer.setAttribute('aria-hidden', 'true');

    // gutter hairlines at the content edges
    const probe = document.querySelector('section');
    const gutter = parseFloat(getComputedStyle(probe).paddingLeft) || 0;
    ['left', 'right'].forEach(side => {
      const g = document.createElement('i');
      g.className = 'rl-gutter';
      g.style[side] = gutter + 'px';
      layer.appendChild(g);
    });

    TARGETS.forEach(([sel, text]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const box = document.createElement('i');
      box.className = 'rl-box';
      box.style.cssText = `left:${r.left - pr.left - 6}px;top:${r.top - pr.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px;`;
      const chip = document.createElement('b');
      chip.className = 'rl-chip';
      chip.textContent = text();
      chip.style.cssText = `left:${r.left - pr.left - 6}px;top:${r.top - pr.top - 30}px;`;
      layer.append(box, chip);
    });
    page.appendChild(layer);

    // legend rides fixed on the real viewport (outside the transformed page)
    legend = document.createElement('aside');
    legend.id = 'rl-legend';
    legend.setAttribute('aria-hidden', 'true');
    legend.innerHTML =
      '<p class="rl-t">OBSIDIAN &amp; SIGNAL — DESIGN TOKENS</p>' +
      [['--void', '#05060A'], ['--obsidian', '#0B0E14'], ['--bone', '#E8E4DC'], ['--mute', '#9BA1AE'], ['--signal', '#56E0C8'], ['--ember', '#E8A33D']]
        .map(([n, c]) => `<span class="rl-tok"><i style="background:${c}"></i>${n} ${c}</span>`).join('') +
      '<p class="rl-t rl-t2">Fraunces · Inter Tight · JetBrains Mono</p>' +
      '<p class="rl-t rl-t2">ease — cubic-bezier(.22,.9,.28,1) <svg viewBox="0 0 40 20" width="40" height="20"><path d="M2,18 C10.8,2 13.2,2 38,2" fill="none" stroke="#56E0C8" stroke-width="1.5"/></svg></p>' +
      '<p class="rl-t rl-t2">press D to close</p>';
    document.body.appendChild(legend);
  }

  function teardown() {
    if (layer) layer.remove();
    if (legend) legend.remove();
    layer = legend = null;
  }

  function toggle() {
    on = !on;
    document.documentElement.classList.toggle('redline', on);
    on ? build() : teardown();
  }
  LP.redline = { toggle };

  addEventListener('keydown', e => {
    if (e.key !== 'd' && e.key !== 'D') return;
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    toggle();
  });
})();
