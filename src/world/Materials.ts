import * as THREE from 'three';
import { Assets, loadPBR } from '../engine/Assets';
import { Q } from '../engine/Quality';

/** Shared uniforms for animated materials. */
export const sharedUniforms = { uTime: { value: 0 } };

/** Box whose UVs are in meters / tile so textures keep real-world scale on any face. */
export function worldBox(w: number, h: number, d: number, tile = 1): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // face order: +x, -x, +y, -y, +z, -z ; each 4 verts
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile);
    }
  }
  g.setAttribute('uv1', uv.clone());
  return g;
}

export interface MatOpts { tint?: number; roughness?: number; normalScale?: number; aoIntensity?: number; envIntensity?: number }

export async function pbrMaterial(assets: Assets, name: string, o: MatOpts = {}) {
  const t = await loadPBR(assets, name);
  return new THREE.MeshStandardMaterial({
    map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, aoMap: t.aoMap,
    aoMapIntensity: o.aoIntensity ?? 1, color: o.tint ?? 0xffffff, roughness: o.roughness ?? 1,
    normalScale: new THREE.Vector2(o.normalScale ?? 1, o.normalScale ?? 1), envMapIntensity: o.envIntensity ?? 1,
  });
}

const noiseGlsl = (octaves: number) => /* glsl */`
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<${octaves};i++){ s+=a*vnoise(p); p*=2.03; a*=.5; } return s; }
`;
const NOISE_GLSL = noiseGlsl(Q.wetLite ? 2 : 5);
const NOISE_GLSL_FULL = noiseGlsl(5);

/**
 * Baked fbm fields. The per-pixel fbm of `makeWet` / `makeGrime` is evaluated once at load, on the GPU with the very same GLSL,
 * into world-space half-float textures (4 fields per RGBA texture) and sampled with the same coordinates. Desktop only
 * (`Q.wetLite` keeps the 2-octave shader). Needs the renderer: `setNoiseBakeRenderer` is called by `Renderer`.
 */
let bakeRenderer: THREE.WebGLRenderer | null = null;
export function setNoiseBakeRenderer(r: THREE.WebGLRenderer) { bakeRenderer = r; }

interface BakeSpec {
  w: number; h: number;
  /** domain of the two sampled coordinates: [u0, u1, v0, v1] */
  dom: [number, number, number, number];
  /** per channel: [scale.x, scale.y, offset] — field = fbm5(vec2(u * sx, v * sy) + offset) */
  ch: [number, number, number][];
}
const WALL_DOM: [number, number, number, number] = [-12, 26, -2.5, 6.5]; // (x+z, y)
const FLOOR_DOM: [number, number, number, number] = [-2, 16.5, -10.5, 10]; // (x, z)
const BAKES = {
  wet_wall: { w: 4096, h: 768, dom: WALL_DOM, ch: [[2.2, 0, 11], [9, 0.6, 0], [1.5, 1.5, 0], [2.5, 2.5, 0]] },
  grime: { w: 4096, h: 768, dom: WALL_DOM, ch: [[6, 2, 0], [1.5, 1.5, 4], [0.9, 0.9, 17], [7, 0.35, 0]] },
  floor: { w: 2048, h: 2048, dom: FLOOR_DOM, ch: [[1.1, 1.1, 7.1], [3, 3, 0], [1.7, 1.7, 3.3]] },
} satisfies Record<string, BakeSpec>;
type BakeKind = keyof typeof BAKES;
const bakeCache = new Map<BakeKind, THREE.Texture>();

function bakeTexture(kind: BakeKind): THREE.Texture | null {
  if (Q.wetLite || !bakeRenderer) return null;
  const hit = bakeCache.get(kind);
  if (hit) return hit;
  const spec: BakeSpec = BAKES[kind];
  const r = bakeRenderer;
  const rt = new THREE.WebGLRenderTarget(spec.w, spec.h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const ch = [...spec.ch, [1, 1, 0], [1, 1, 0], [1, 1, 0], [1, 1, 0]].slice(0, 4);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uDom: { value: new THREE.Vector4(...spec.dom) }, uCh: { value: ch.map((c) => new THREE.Vector3(...c)) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `precision highp float; varying vec2 vUv; uniform vec4 uDom; uniform vec3 uCh[4];
      ${NOISE_GLSL_FULL}
      void main(){
        vec2 q = vec2(mix(uDom.x, uDom.y, vUv.x), mix(uDom.z, uDom.w, vUv.y));
        gl_FragColor = vec4(fbm(q*uCh[0].xy+uCh[0].z), fbm(q*uCh[1].xy+uCh[1].z), fbm(q*uCh[2].xy+uCh[2].z), fbm(q*uCh[3].xy+uCh[3].z));
      }`,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const prev = r.getRenderTarget();
  r.setRenderTarget(rt);
  r.render(scene, new THREE.OrthographicCamera());
  r.setRenderTarget(prev);
  quad.geometry.dispose(); mat.dispose();
  rt.texture.wrapS = rt.texture.wrapT = THREE.ClampToEdgeWrapping;
  bakeCache.set(kind, rt.texture);
  return rt.texture;
}

/** GLSL sampling a baked pack: `vec4 name(vec2 uv)` with uv in the same space the fields were baked in. */
const bakeSampler = (kind: BakeKind, name: string) => {
  const [u0, u1, v0, v1] = BAKES[kind].dom;
  return `uniform sampler2D uBake;\nvec4 ${name}(vec2 q){ return texture2D(uBake, (q - vec2(${u0.toFixed(1)}, ${v0.toFixed(1)})) / vec2(${(u1 - u0).toFixed(1)}, ${(v1 - v0).toFixed(1)})); }`;
};

/**
 * Wetness injection: vertical leak streaks on walls / puddles on floors, computed in world space.
 * Darkens albedo, drops roughness, and adds a slow trickle highlight on walls.
 */
export function makeWet(mat: THREE.MeshStandardMaterial, kind: 'wall' | 'floor' | 'ceiling', strength = 1) {
  const bake = bakeTexture(kind === 'wall' ? 'wet_wall' : 'floor');
  mat.onBeforeCompile = (sh) => {
    if (bake) sh.uniforms.uBake = { value: bake };
    sh.uniforms.uTime = sharedUniforms.uTime;
    sh.uniforms.uWetStrength = { value: strength };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
    const wetFn = bake
      ? (kind === 'floor'
        ? `${bakeSampler('floor', 'bk')}
           float wetMask(vec3 p){ vec4 b = bk(p.xz); float n = b.r; float edge = smoothstep(.35,.0,min(abs(p.x-0.55),abs(p.x+0.55)));
             return clamp(smoothstep(.40,.52,n) + edge*0.7*smoothstep(.3,.55,b.g) + 0.25,0.,1.); }`
        : kind === 'ceiling'
          ? `${bakeSampler('floor', 'bk')}
             float wetMask(vec3 p){ return smoothstep(.55,.75,bk(p.xz).b); }`
          : `${bakeSampler('wet_wall', 'bk')}
             float wetMask(vec3 p){
               vec2 q = vec2(p.x + p.z, p.y);
               vec4 b = bk(q);
               float col = b.r;                                       // which columns leak
               float streak = b.g;                                    // streak breakup
               float fromTop = smoothstep(0.2, 2.4, q.y + b.b*0.9);   // leaks start at the ceiling
               float base = smoothstep(.55,.0,q.y) * smoothstep(.3,.7,b.a); // rising damp
               return clamp(smoothstep(.45,.62,col) * smoothstep(.35,.6,streak) * (0.35+fromTop) + base, 0., 1.); }`)
      : kind === 'floor'
      ? `float wetMask(vec3 p){ float n = fbm(p.xz*1.1 + 7.1); float edge = smoothstep(.35,.0,min(abs(p.x-0.55),abs(p.x+0.55)));
           return clamp(smoothstep(.40,.52,n) + edge*0.7*smoothstep(.3,.55,fbm(p.xz*3.)) + 0.25,0.,1.); }`
      : kind === 'ceiling'
        ? `float wetMask(vec3 p){ return smoothstep(.55,.75,fbm(p.xz*1.7+3.3)); }`
        : `float wetMask(vec3 p){
             vec2 q = vec2(p.x + p.z, p.y);
             float col = fbm(vec2(q.x*2.2, 0.0) + 11.0);            // which columns leak
             float streak = fbm(vec2(q.x*9.0, q.y*0.6));            // streak breakup
             float fromTop = smoothstep(0.2, 2.4, q.y + fbm(q*1.5)*0.9); // leaks start at the ceiling
             float base = smoothstep(.55,.0,q.y) * smoothstep(.3,.7,fbm(q*2.5)); // rising damp
             return clamp(smoothstep(.45,.62,col) * smoothstep(.35,.6,streak) * (0.35+fromTop) + base, 0., 1.); }`;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\nuniform float uWetStrength;\n${NOISE_GLSL}\n${wetFn}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float wet = wetMask(vWPos) * uWetStrength;
        diffuseColor.rgb *= mix(1.0, ${kind === 'floor' ? '0.35' : '0.6'}, wet);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float trickle = 0.0;
        ${kind === 'wall' ? `vec2 tq = vec2((vWPos.x+vWPos.z)*14.0, vWPos.y*3.0 + uTime*0.35);
        trickle = smoothstep(.72,.95, vnoise(tq)) * wet;` : ''}
        roughnessFactor = mix(roughnessFactor, ${kind === 'floor' ? '0.02' : '0.07'}, wet) * (1.0 - trickle*0.8);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = normalize(mix(normal, normalize(vNormal), wet*${kind === 'floor' ? '0.85' : '0.4'}));`);
  };
  mat.customProgramCacheKey = () => 'wet-' + kind + (bake ? '-bk' : '');
  return mat;
}

/**
 * Light grime on painted walls: scuffs/dirt rising from the baseboard, smoky darkening near the ceiling,
 * and soft blotches — world-space, albedo + roughness only (no wetness).
 */
export function makeGrime(mat: THREE.MeshStandardMaterial, strength = 1) {
  const bake = bakeTexture('grime');
  mat.onBeforeCompile = (sh) => {
    if (bake) sh.uniforms.uBake = { value: bake };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;\n${bake ? bakeSampler('grime', 'bk') : NOISE_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 gq = vec2(vWPos.x + vWPos.z, vWPos.y);
        ${bake ? 'vec4 gb = bk(gq);' : ''}
        float low = smoothstep(0.45, 0.0, vWPos.y) * (0.4 + 0.6 * ${bake ? 'gb.r' : 'fbm(gq * vec2(6.0, 2.0))'});
        float high = smoothstep(2.3, 3.0, vWPos.y) * ${bake ? 'gb.g' : 'fbm(gq * 1.5 + 4.0)'};
        float blot = smoothstep(0.58, 0.8, ${bake ? 'gb.b' : 'fbm(gq * 0.9 + 17.0)'}) * 0.6;
        float streak = smoothstep(0.7, 0.95, ${bake ? 'gb.a' : 'fbm(vec2(gq.x * 7.0, gq.y * 0.35))'}) * smoothstep(0.2, 2.6, vWPos.y) * 0.35;
        float g = clamp((low * 0.55 + high * 0.35 + blot * 0.35 + streak) * ${strength.toFixed(2)}, 0.0, 0.6);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.78, 0.72, 0.62), g);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.85, g * 1.4);`);
  };
  mat.customProgramCacheKey = () => 'grime' + (bake ? '-bk' : '');
  return mat;
}

/** Procedural canvas texture: water stain / mold / dirt blotch with alpha. */
export function stainTexture(seed: number, kind: 'water' | 'mold' | 'dirt' | 'scuff'): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const col = kind === 'water' ? [70, 52, 30] : kind === 'mold' ? [28, 32, 20] : kind === 'dirt' ? [40, 33, 25] : [20, 16, 12];
  const blobs = kind === 'scuff' ? 60 : 30;
  for (let i = 0; i < blobs; i++) {
    const x = S / 2 + (rnd() - 0.5) * S * 0.55, y = S / 2 + (rnd() - 0.5) * S * 0.55;
    const r = S * (0.05 + rnd() * 0.2);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const a = kind === 'scuff' ? 0.06 : 0.12 + rnd() * 0.12;
    gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
    gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  if (kind === 'water') { // tide rings
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = `rgba(90,62,30,${0.15 + rnd() * 0.15})`;
      g.lineWidth = 2 + rnd() * 3;
      g.beginPath();
      const r = S * (0.2 + i * 0.06);
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
        const rr = r * (1 + (Math.sin(a * 3 + i) * 0.08 + (rnd() - 0.5) * 0.05));
        const px = S / 2 + Math.cos(a) * rr, py = S / 2 + Math.sin(a) * rr;
        a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.stroke();
    }
  }
  // soft circular falloff
  g.globalCompositeOperation = 'destination-in';
  const fall = g.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S / 2);
  fall.addColorStop(0, 'rgba(0,0,0,1)'); fall.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fall; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Flat decal quad (slightly offset from a surface). */
export function decal(tex: THREE.Texture, w: number, h: number, opacity = 1): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
    map: tex, transparent: true, opacity, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -4,
  }));
  m.receiveShadow = true;
  m.renderOrder = 1;
  return m;
}


/** Tileable normal map of elongated ripples for running water (streaks across u, flow along v). */
export function waterNormalTexture(): THREE.CanvasTexture {
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d')!, img = g.createImageData(N, N);
  const waves: [number, number, number, number][] = [[3, 1, 0.5, 0.3], [5, 2, 0.35, 1.7], [9, 3, 0.25, 2.9], [2, 5, 0.2, 4.1], [13, 4, 0.12, 0.9]];
  const h = (u: number, v: number) => waves.reduce((s, [ku, kv, a, p]) => s + a * Math.sin(2 * Math.PI * (ku * u + kv * v) + p), 0);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, e = 1 / N;
    const dx = (h(u + e, v) - h(u - e, v)) * 2.2, dy = (h(u, v + e) - h(u, v - e)) * 2.2;
    const len = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    img.data[i] = (-dx / len * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / len * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
