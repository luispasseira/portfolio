/* clock.js — Porto time, ticking. */
(function () {
  const els = [document.getElementById('clock'), document.getElementById('hero-clock')].filter(Boolean);
  const tzEls = [document.getElementById('clock-tz'), document.getElementById('hero-tz')].filter(Boolean);
  if (!els.length) return;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZoneName: 'short',
  });
  function tick() {
    const parts = fmt.formatToParts(new Date());
    const get = t => (parts.find(p => p.type === t) || {}).value || '';
    const s = get('hour') + ':' + get('minute') + ':' + get('second');
    els.forEach(e => e.textContent = s);
    const tz = get('timeZoneName');
    if (tz) tzEls.forEach(e => e.textContent = tz);
  }
  tick();
  setInterval(tick, 1000);
})();
