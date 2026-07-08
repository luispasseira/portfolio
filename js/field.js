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
  float t = 0.9;
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
    float den = smoothstep(0.44, 0.78, d) * slab;

    if (den > 0.003){
      float a1 = exp(-length(p - L1)*1.15);
      float a2 = exp(-length(p - L2)*1.05);
      vec3 lit = C1*a1*1.8 + C2*a2*1.7 + vec3(0.10,0.115,0.16)*0.35;
      col += T * den * lit * stepLen * 1.9;
      T   *= exp(-den * stepLen * 3.1);
    }
    t += stepLen;
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
  const uRes = U('u_res'), uTime = U('u_time'), uMouse = U('u_mouse'), uSteps = U('u_steps');

  let w = 0, h = 0;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const scale = dpr * 0.5;                       // half-res render, CSS upscale
    w = Math.max(2, Math.round(canvas.clientWidth * scale));
    h = Math.max(2, Math.round(canvas.clientHeight * scale));
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  size();
  addEventListener('resize', size, { passive: true });

  let mx = 0, my = 0;
  const steps = () => (innerWidth < 900 ? 26 : 44);

  LP.on((t, dt) => {
    if (LP.scrollY > LP.vh * 1.15) return;          // hero off screen: do nothing
    if (document.hidden) return;
    const aspect = w / h;
    const tx = (LP.mouse.x * 2 - 1) * aspect * 0.62;
    const ty = -(LP.mouse.y * 2 - 1) * 0.62;
    mx += (tx - mx) * Math.min(1, dt * 2.2);        // slow, gravitational
    my += (ty - my) * Math.min(1, dt * 2.2);
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1f(uSteps, steps());
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });

  canvas.addEventListener('webglcontextlost', () => canvas.remove());
})();
