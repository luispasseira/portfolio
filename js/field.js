/* field.js — hero: raymarched volumetric fBm nebula, WebGL1, half-res.
   Two lights (signal / ember), cursor gravity on the density domain,
   film grain + vignette. Falls back silently to the CSS poster. */
(function () {
  const LP = window.LP;
  const canvas = document.getElementById('field');
  if (!canvas || LP.reduced) { if (canvas) canvas.remove(); return; }

  const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, alpha: false });
  if (!gl) { canvas.remove(); return; }

  const VERT = `
attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

  const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;   /* -1..1, aspect corrected */
uniform float u_steps;
uniform float u_warm;    /* 0 night → 1 golden hour, from Porto local time */
/* ═══ [3D-2 nebula-dolly] BEGIN uniform — revert: LP.flags.nebulaDolly=false ═══ */
uniform float u_dolly;   /* 0 at page top → ~1.15 as the hero leaves */
/* ═══ [3D-2] END uniform ═══ */

float hash(vec3 p){
  p = fract(p*0.3183099 + .1);
  p *= 17.0;
  return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x);
  f = f*f*(3.0-2.0*f);
  return mix(
    mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
        mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
        mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){
  float a = .5, r = 0.;
  for(int i=0;i<4;i++){ r += a*noise(p); p = p*2.03 + vec3(1.7); a *= .5; }
  return r;
}

void main(){
  vec2 uv = (gl_FragCoord.xy*2.0 - u_res) / u_res.y;

  vec3 ro = vec3(0.0, 0.0, -2.6);
  /* ═══ [3D-2 nebula-dolly] BEGIN camera — scrolling pushes the lens into
     the volume so the wisps slide past with real parallax ═══ */
  ro.z += u_dolly * 1.9;
  /* ═══ [3D-2] END camera ═══ */
  vec3 rd = normalize(vec3(uv, 1.55));

  /* lights */
  float tt = u_time*0.07;
  vec3 L1 = vec3(-0.9 + 0.5*sin(tt),      0.45*cos(tt*0.8),  0.6);   /* signal */
  vec3 L2 = vec3( 1.0 - 0.4*sin(tt*0.7), -0.35,              1.5);   /* ember  */
  vec3 C1 = vec3(0.337, 0.878, 0.784);
  vec3 C2 = vec3(0.910, 0.639, 0.239);

  vec3 mpos = vec3(u_mouse*1.15, 0.9);

  vec3 col = vec3(0.0);
  float T = 1.0;
  /* ═══ [3D-2 nebula-dolly] march starts nearer the lens as we dolly in,
     so wisps wash past the camera instead of popping ═══ */
  float t = 0.9 - u_dolly * 0.5;
  float stepLen = 2.6 / u_steps;

  for (int i=0; i<48; i++){
    if (float(i) >= u_steps || T < 0.02) break;
    vec3 p = ro + rd*t;

    /* cursor gravity: pull the sample domain toward the pointer */
    vec3 dm = mpos - p;
    float md = length(dm);
    vec3 q = p*0.62 + vec3(0.0, u_time*0.016, u_time*0.03);
    q += (dm/max(md,.2)) * 0.34 * exp(-md*md*0.9);

    float w = fbm(q*1.35 + vec3(0.0, -u_time*0.02, 0.0));
    float d = fbm(q + w*1.15);
    float slab = smoothstep(2.6, 1.0, abs(p.z - 0.9) + 0.6*abs(p.y));
    /* composed, not generated: density biased into a diagonal sweep behind the name */
    float band = exp(-pow(dot(p.xy, vec2(-0.382, 0.924)) - 0.10, 2.0) * 1.15);
    float den = smoothstep(0.44, 0.78, d) * slab * (0.30 + 0.85*band);

    if (den > 0.003){
      float a1 = exp(-length(p - L1)*1.15);
      float a2 = exp(-length(p - L2)*1.05);
      vec3 lit = C1*a1*(1.9 - 0.6*u_warm) + C2*a2*(1.2 + 1.3*u_warm) + vec3(0.10,0.115,0.16)*0.35;
      col += T * den * lit * stepLen * 1.9;
      T   *= exp(-den * stepLen * 3.1);
    }
    t += stepLen;
  }

  /* sparse dust behind the fog — depth-scale contrast */
  vec2 cell = floor(gl_FragCoord.xy / 2.0);
  float star = hash(vec3(cell, 7.0));
  if (star > 0.9992) {
    float tw = 0.55 + 0.45*sin(u_time*2.4 + star*90.0);
    col += vec3(0.55, 0.58, 0.60) * tw * T * 0.5;
  }

  /* tonemap, vignette, grain */
  col = col / (1.0 + col);
  col = pow(col, vec3(0.92));
  float vig = smoothstep(1.65, 0.35, length(uv*vec2(0.82,1.0)));
  col *= mix(0.55, 1.0, vig);
  col += (hash(vec3(gl_FragCoord.xy, fract(u_time)*100.0)) - 0.5) * 0.035;
  col = max(col, 0.0);
  col += vec3(0.0196, 0.0235, 0.039) * (1.0 - vig) * 0.6;   /* lift toward void */

  gl_FragColor = vec4(col, 1.0);
}`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.remove(); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = n => gl.getUniformLocation(prog, n);
  const uRes = U('u_res'), uTime = U('u_time'), uMouse = U('u_mouse'), uSteps = U('u_steps'), uWarm = U('u_warm');
  /* ═══ [3D-2 nebula-dolly] BEGIN JS — revert: LP.flags.nebulaDolly=false ═══ */
  const uDolly = U('u_dolly');
  const dollyOn = (LP.flags && LP.flags.nebulaDolly) ? 1 : 0;
  /* ═══ [3D-2] END JS ═══ */

  /* the nebula lives on Porto time: golden around dawn (~7h) and dusk (~19.5h),
     cool teal in the dead of night */
  function warmth() {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      const g = t => +(parts.find(p => p.type === t) || {}).value || 0;
      const hr = g('hour') + g('minute') / 60;
      const peak = c => Math.exp(-Math.pow(hr - c, 2) / 3.4);
      return Math.min(1, peak(7.2) + peak(19.6));
    } catch (e) { return 0.3; }
  }
  let warm = warmth();
  setInterval(() => { warm = warmth(); }, 60000);
  let warmOverride = null;                    // the command palette can force a time of day
  LP.setWarm = v => { warmOverride = (typeof v === 'number') ? Math.max(0, Math.min(1, v)) : null; };

  /* adaptive quality: three rungs, hysteresis, never oscillates */
  const RUNGS = [
    { res: 0.5,  stepMul: 1.0 },
    { res: 0.4,  stepMul: 0.62 },
    { res: 0.33, stepMul: 0.45 },
  ];
  let rung = 0, ema = 1 / 60, slow = 0, fast = 0;

  let w = 0, h = 0;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const scale = dpr * RUNGS[rung].res;
    w = Math.max(2, Math.round(canvas.clientWidth * scale));
    h = Math.max(2, Math.round(canvas.clientHeight * scale));
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  size();
  addEventListener('resize', size, { passive: true });

  let mx = 0, my = 0;
  const steps = () => Math.round((innerWidth < 900 ? 26 : 44) * RUNGS[rung].stepMul);

  LP.on((t, dt) => {
    if (LP.scrollY > LP.vh * 1.15) return;          // hero off screen: do nothing
    if (document.hidden) return;

    ema += (dt - ema) * 0.06;
    if (ema > 0.023) { if (++slow > 45 && rung < RUNGS.length - 1) { rung++; slow = 0; fast = 0; ema = 1 / 60; size(); } }
    else slow = 0;
    if (ema < 0.011) { if (++fast > 360 && rung > 0) { rung--; fast = 0; slow = 0; ema = 1 / 60; size(); } }
    else fast = 0;

    const aspect = w / h;
    const tx = (LP.mouse.x * 2 - 1) * aspect * 0.62;
    const ty = -(LP.mouse.y * 2 - 1) * 0.62;
    mx += (tx - mx) * Math.min(1, dt * 2.2);        // slow, gravitational
    my += (ty - my) * Math.min(1, dt * 2.2);
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1f(uSteps, steps());
    gl.uniform1f(uWarm, warmOverride === null ? warm : warmOverride);
    /* ═══ [3D-2 nebula-dolly] per-frame camera position from scroll ═══ */
    gl.uniform1f(uDolly, dollyOn * Math.max(0, Math.min(1.15, LP.scrollY / LP.vh)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });

  canvas.addEventListener('webglcontextlost', () => canvas.remove());
})();
