/* portrait.js — the plate: duotone ordered-dither print of the portrait,
   cursor pushes the surface, dither breathes; resolves clean when still.
   The plain <img> underneath is the permanent fallback. */
(function () {
  const LP = window.LP;
  const img = document.getElementById('portrait-img');
  const plate = document.getElementById('plate');
  if (!img || !plate || LP.reduced) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;pointer-events:none;';
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return;

  const VERT = `attribute vec2 p; varying vec2 v; void main(){ v = p*.5+.5; v.y = 1.-v.y; gl_Position = vec4(p,0.,1.); }`;
  const FRAG = `
precision mediump float;
varying vec2 v;
uniform sampler2D u_tex;
uniform float u_time, u_energy;
uniform vec2 u_mouse;

float bayer(vec2 p){
  vec2 q = floor(mod(p, 4.0));
  float i = q.x + q.y*4.0;
  float m = 0.0;
  m += step(abs(i- 0.0),.5)* 0.0 + step(abs(i- 1.0),.5)* 8.0 + step(abs(i- 2.0),.5)* 2.0 + step(abs(i- 3.0),.5)*10.0;
  m += step(abs(i- 4.0),.5)*12.0 + step(abs(i- 5.0),.5)* 4.0 + step(abs(i- 6.0),.5)*14.0 + step(abs(i- 7.0),.5)* 6.0;
  m += step(abs(i- 8.0),.5)* 3.0 + step(abs(i- 9.0),.5)*11.0 + step(abs(i-10.0),.5)* 1.0 + step(abs(i-11.0),.5)* 9.0;
  m += step(abs(i-12.0),.5)*15.0 + step(abs(i-13.0),.5)* 7.0 + step(abs(i-14.0),.5)*13.0 + step(abs(i-15.0),.5)* 5.0;
  return (m+0.5)/16.0;
}

void main(){
  vec2 uv = v;
  vec2 dm = uv - u_mouse;
  float d = length(dm);
  uv += normalize(dm + 1e-5) * 0.05 * u_energy * exp(-d*d*22.0);

  vec3 c = texture2D(u_tex, uv).rgb;
  float lum = dot(c, vec3(0.299,0.587,0.114));
  lum = smoothstep(0.06, 0.97, lum);

  /* duotone: void ink on bone paper, a signal whisper in the mids */
  vec3 ink   = vec3(0.043,0.055,0.078);
  vec3 paper = vec3(0.910,0.894,0.863);
  vec3 duo = mix(ink, paper, lum);
  duo += vec3(0.337,0.878,0.784) * smoothstep(.3,.55,lum)*(1.-smoothstep(.55,.9,lum)) * 0.05;

  float breathe = 0.5 + 0.5*sin(u_time*0.7);
  float amount = clamp(0.22 + 0.10*breathe + u_energy*0.9, 0.0, 0.85);
  float dith = step(bayer(gl_FragCoord.xy / 2.5), lum);   /* fixed grid: no re-dither pop */
  vec3 dithered = mix(ink, paper, dith);

  vec3 col = mix(duo, dithered, amount);

  /* plate vignette */
  float vig = smoothstep(0.98, 0.55, max(abs(v.x-.5), abs(v.y-.5))*2.0);
  col *= mix(0.82, 1.0, vig);
  gl_FragColor = vec4(col, 1.0);
}`;

  function sh(t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; } return o; }
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = n => gl.getUniformLocation(prog, n);

  function bind() {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    plate.appendChild(canvas);
    start();
  }
  if (img.complete && img.naturalWidth) bind(); else img.addEventListener('load', bind, { once: true });

  function start() {
    let w = 0, h = 0;
    function size() {
      canvas.style.left = img.offsetLeft + 'px';
      canvas.style.top = img.offsetTop + 'px';
      canvas.style.width = img.clientWidth + 'px';
      canvas.style.height = img.clientHeight + 'px';
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = Math.max(2, Math.round(img.clientWidth * dpr));
      h = Math.max(2, Math.round(img.clientHeight * dpr));
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    size();
    addEventListener('resize', size, { passive: true });

    /* everything the shader sees is lerped — the pointer only sets targets,
       so mid-animation hovers can never pop the surface */
    let mxT = .5, myT = .5, mx = .5, my = .5, energy = 0, energyT = 0;
    plate.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      const spd = Math.hypot(nx - mxT, ny - myT);
      energyT = Math.min(1, energyT + spd * 5 + .015);
      mxT = nx; myT = ny;
    }, { passive: true });

    const uT = U('u_time'), uE = U('u_energy'), uM = U('u_mouse');
    LP.on((t, dt) => {
      const r = canvas.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || document.hidden) return;
      energyT = Math.max(0, energyT - dt * .8);
      energy += (energyT - energy) * Math.min(1, dt * 3.2);
      mx += (mxT - mx) * Math.min(1, dt * 7);
      my += (myT - my) * Math.min(1, dt * 7);
      gl.uniform1f(uT, t);
      gl.uniform1f(uE, energy);
      gl.uniform2f(uM, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
  }
})();
