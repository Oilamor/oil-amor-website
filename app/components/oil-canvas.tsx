'use client'

import { useEffect, useRef } from 'react'

/**
 * Bespoke WebGL "liquid gold / oil film" shader for the homepage hero.
 *
 * Hand-written GLSL on a single fullscreen quad — no three.js (~3KB gzipped
 * vs ~600KB). Renders an iridescent thin-film oil surface with drifting gold
 * particulate, reactive to the pointer. Performance contract:
 *  - renders at 0.5x devicePixelRatio, capped at 30fps
 *  - pauses when off-screen or the tab is hidden
 *  - renders one static frame for prefers-reduced-motion
 *  - WebGL unavailable → caller keeps the CSS gradient fallback (render nothing)
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse; // smoothed, 0..1

// ---- hash / noise ----------------------------------------------------------

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(19.7, 7.3);
    a *= 0.5;
  }
  return v;
}

// ---- thin-film iridescence palette ------------------------------------------

vec3 oilPalette(float t) {
  // deep violet -> indigo -> amber -> gold -> violetglass purple
  vec3 a = vec3(0.05, 0.02, 0.10);
  vec3 b = vec3(0.24, 0.13, 0.42);
  vec3 c = vec3(0.79, 0.64, 0.15);
  vec3 d = vec3(0.16, 0.08, 0.24);
  float x = fract(t);
  if (x < 0.33) return mix(a, b, x / 0.33);
  if (x < 0.58) return mix(b, c, (x - 0.33) / 0.25);
  if (x < 0.80) return mix(c, d, (x - 0.58) / 0.22);
  return mix(d, a, (x - 0.80) / 0.20);
}

// ---- gold dust ----------------------------------------------------------------

float dust(vec2 uv, float t) {
  vec2 g = uv * vec2(90.0, 60.0);
  g.y -= t * 1.7; // slow rise
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id);
  // only some cells have a mote, twinkling
  float on = step(0.93, h);
  float tw = 0.5 + 0.5 * sin(t * (1.5 + h * 3.0) + h * 40.0);
  float d = length(f - vec2(hash(id + 7.0) - 0.5, hash(id + 13.0) - 0.5) * 0.6);
  return on * tw * smoothstep(0.10, 0.0, d);
}

// ---- main ---------------------------------------------------------------------

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 asp = vec2(u_res.x / u_res.y, 1.0);
  vec2 p = uv * asp;

  float t = u_time * 0.05;

  // pointer parallax: subtle domain shift toward the cursor
  vec2 m = (u_mouse - 0.5) * 0.35;
  p += m * 0.15;

  // domain-warped flow — the "oil slowly moving" body (large, slow forms)
  vec2 q = vec2(fbm(p * 1.1 + vec2(t, -t * 0.7)),
                fbm(p * 1.1 + vec2(5.2 - t * 0.4, 1.3 + t * 0.5)));
  vec2 r = vec2(fbm(p * 1.1 + 2.0 * q + vec2(1.7, 9.2) + t * 0.35),
                fbm(p * 1.1 + 2.0 * q + vec2(8.3, 2.8) - t * 0.30));
  float film = fbm(p * 1.1 + 2.2 * r);

  // thin-film interference: thickness from the warped field
  float thick = film * 2.6 + t * 0.12;
  vec3 col = oilPalette(thick);

  // light welling from behind the film, following the pointer
  float glow = exp(-3.0 * length(uv - (0.5 + m * 0.55)));
  col += vec3(0.79, 0.64, 0.15) * glow * 0.30 * (0.5 + 0.5 * film);

  // caustic filaments — smoothstep pockets read reliably at any frequency
  float fil = smoothstep(0.52, 0.85, fbm(p * 2.2 + r * 1.6 - t));
  col += vec3(0.98, 0.83, 0.45) * fil * 0.5;

  // gold dust motes
  col += vec3(0.95, 0.80, 0.40) * dust(uv, u_time) * 0.75;

  // violetglass base + vignette
  col = mix(vec3(0.015, 0.010, 0.025), col, 0.9);
  col *= 1.45;
  float vig = smoothstep(1.2, 0.30, length(uv - 0.5) * 1.65);
  col *= mix(0.6, 1.0, vig);

  // gentle in-shader softening behind the copy (the hero also layers a CSS
  // copy plate, so this only needs to take the edge off the brightest gold)
  float copyZone = exp(-2.6 * length((uv - vec2(0.5, 0.62)) * vec2(1.6, 1.5)));
  col *= 1.0 - 0.4 * copyZone;

  // subtle dither to avoid banding on the dark gradients
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`

export function OilCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    let disposed = false
    let cleanupFns: Array<() => void> = []

    const init = () => {
      const gl = canvas.getContext('webgl', {
        antialias: false,
        depth: false,
        stencil: false,
      })
      if (!gl) return // caller's CSS fallback stays visible

      const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.error('[OilCanvas] shader:', gl.getShaderInfoLog(s))
          return null
        }
        return s
      }

      const vs = compile(gl.VERTEX_SHADER, VERT)
      const fs = compile(gl.FRAGMENT_SHADER, FRAG)
      if (!vs || !fs) return

      const prog = gl.createProgram()!
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('[OilCanvas] link:', gl.getProgramInfoLog(prog))
        return
      }
      gl.useProgram(prog)

      // fullscreen quad
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, 'p')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

      const uRes = gl.getUniformLocation(prog, 'u_res')
      const uTime = gl.getUniformLocation(prog, 'u_time')
      const uMouse = gl.getUniformLocation(prog, 'u_mouse')

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      let mx = 0.5
      let my = 0.5
      let smx = 0.5
      let smy = 0.5
      const onPointer = (e: PointerEvent) => {
        mx = e.clientX / window.innerWidth
        my = 1 - e.clientY / window.innerHeight
      }
      window.addEventListener('pointermove', onPointer, { passive: true })
      cleanupFns.push(() => window.removeEventListener('pointermove', onPointer))

      const resize = () => {
        const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5 // half-res
        const w = Math.max(1, Math.floor(canvas.clientWidth * scale))
        const h = Math.max(1, Math.floor(canvas.clientHeight * scale))
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
          gl.viewport(0, 0, w, h)
        }
      }
      resize()
      window.addEventListener('resize', resize)
      cleanupFns.push(() => window.removeEventListener('resize', resize))

      const frame = (now: number) => {
        smx += (mx - smx) * 0.04
        smy += (my - smy) * 0.04
        gl.uniform2f(uRes, canvas.width, canvas.height)
        gl.uniform1f(uTime, now / 1000)
        gl.uniform2f(uMouse, smx, smy)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }

      let raf = 0
      let visible = true
      let last = 0
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop)
        if (!visible || document.hidden) return
        if (now - last < 33) return // cap ~30fps
        last = now
        frame(now)
      }

      if (reduced) {
        frame(0) // one static frame, no loop
      } else {
        const io = new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting
          },
          { threshold: 0 }
        )
        io.observe(canvas)
        raf = requestAnimationFrame(loop)
        cleanupFns.push(() => io.disconnect())
      }
      cleanupFns.push(() => cancelAnimationFrame(raf))
    }

    // GPU processes can drop WebGL contexts (driver resets, memory pressure).
    // Without restore handling the hero silently goes dark — re-init on
    // context restoration, and keep the CSS fallback visible while lost.
    const onLost = (e: Event) => e.preventDefault() // allow restoration
    const onRestored = () => {
      if (!disposed) init()
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    init()

    return () => {
      disposed = true
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      cleanupFns.forEach((fn) => fn())
      cleanupFns = []
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
