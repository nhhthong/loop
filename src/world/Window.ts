import * as THREE from 'three';
import { sharedUniforms } from './Materials';
import { Q } from '../engine/Quality';

/**
 * Night window: rain-streaked glass, a deep dark exterior with faint moonlit branches,
 * heavy velvet curtains, and a cold moonlight spot that throws the mullion shadows inside.
 */
export function buildWindow(x0: number, x1: number, y0: number, y1: number, wallZ: number, castShadow: boolean, curtainMat: THREE.Material) {
  const g = new THREE.Group();
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;

  // --- exterior backdrop (far plane behind the glass) ----------------------------------
  const sky = new THREE.ShaderMaterial({
    uniforms: { uTime: sharedUniforms.uTime, uSeed: { value: Math.random() * 10 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; uniform float uTime; uniform float uSeed;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<6;i++){ s+=a*n(p); p*=2.1; a*=.5; } return s; }
      void main(){
        vec2 uv = vUv;
        vec3 col = mix(vec3(0.006,0.008,0.014), vec3(0.025,0.035,0.06), uv.y);
        // moon glow from upper left
        float d = length((uv - vec2(0.25 + uSeed*0.02, 0.85)) * vec2(1.6,1.));
        col += vec3(0.12,0.15,0.22) * exp(-d*5.0) * 0.6;
        // drifting clouds
        float c = fbm(uv*vec2(3.,2.) + vec2(uTime*0.006, 0.) + uSeed);
        col *= 0.6 + 0.6*c;
        // swaying tree branches silhouette
        float sway = sin(uTime*0.6 + uv.y*3.)*0.01;
        float br = fbm(vec2((uv.x+sway)*6.0, uv.y*3.0) + uSeed*3.);
        float branches = smoothstep(.58,.62, br) * smoothstep(0.2, 0.9, uv.y + 0.2*fbm(uv*4.));
        col = mix(col, vec3(0.002), branches*0.95);
        // occasional far lightning
        float flash = step(0.996, fract(sin(floor(uTime*2.0)*91.7+uSeed)*4375.5)) * 0.25;
        col += vec3(0.5,0.55,0.7)*flash*(1.-branches);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w * 3, h * 2.2), sky);
  back.position.set(cx, cy, wallZ - 1.6);
  g.add(back);

  // --- glass with rain droplets / rivulets ---------------------------------------------
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x9aa8b5, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.18, envMapIntensity: 1.4,
    clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false,
  });
  glass.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = sharedUniforms.uTime;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        float rh(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
        float rain(vec2 uv){
          vec2 g = uv*vec2(18.,10.); vec2 id = floor(g); vec2 f = fract(g)-.5;
          float r = rh(id); float t = fract(uTime*0.12*(0.5+r) + r);
          vec2 p = vec2((r-.5)*.6, .5 - t*1.2);
          float drop = smoothstep(.09,.03,length((f-p)*vec2(1.,.7)));
          float trail = smoothstep(.03,.0,abs(f.x-p.x)) * step(p.y,f.y) * smoothstep(.5,.0,f.y-p.y) * .5;
          float stat = smoothstep(.06,.0,length(f-vec2(rh(id+3.)-.5, rh(id+7.)-.5)*.8)) * step(.6,rh(id+11.));
          return clamp(drop+trail+stat,0.,1.);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float rw = rain(vUv);`)
      .replace('#include <opaque_fragment>', `diffuseColor.a = max(diffuseColor.a, rw*0.55);
        outgoingLight += vec3(0.05,0.06,0.08)*rw;
        #include <opaque_fragment>`);
  };
  glass.defines = { USE_UV: '' };
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, h - 0.08), glass);
  pane.position.set(cx, cy, wallZ - 0.17);
  pane.renderOrder = 2;
  g.add(pane);

  // --- curtains (velvet drapes with folds) ----------------------------------------------
  const makeCurtain = (side: -1 | 1) => {
    const cw = 0.55, ch = 2.75;
    const geo = new THREE.PlaneGeometry(cw, ch, 48, 24);
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const t = (y + ch / 2) / ch; // 0 bottom → 1 top
      const folds = Math.sin(x * 38 + Math.sin(y * 1.3) * 0.6) * 0.035 * (0.6 + 0.4 * (1 - t))
        + Math.sin(x * 13) * 0.02;
      p.setZ(i, folds);
      // gathered toward the wall at the bottom (tie-back look)
      p.setX(i, x * (0.75 + 0.25 * t) + side * (1 - t) * 0.03);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, curtainMat);
    m.position.set(side < 0 ? x0 - 0.12 : x1 + 0.12, 2.82 - ch / 2, wallZ + 0.1);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  g.add(makeCurtain(-1), makeCurtain(1));
  // brass curtain rod
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a6a34, metalness: 1, roughness: 0.38 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, w + 0.9, 12), brass);
  rod.rotation.z = Math.PI / 2; rod.position.set(cx, 2.84, wallZ + 0.12); rod.castShadow = true;
  g.add(rod);
  for (const s of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), brass);
    fin.position.set(cx + s * (w / 2 + 0.45), 2.84, wallZ + 0.12); g.add(fin);
  }

  // --- moonlight ------------------------------------------------------------------------
  const moon = new THREE.SpotLight(0x8ea6d8, 6, 9, 0.5, 0.6, 1.2);
  moon.position.set(cx - 0.9, cy + 1.6, wallZ - 2.2);
  moon.target.position.set(cx + 0.3, 0, wallZ + 2.0);
  moon.castShadow = castShadow && Q.shadows;
  moon.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.02;
  moon.shadow.radius = 4;
  g.add(moon, moon.target);

  // faint god-ray shaft (additive, soft)
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: sharedUniforms.uTime },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      void main(){ float edge = smoothstep(0.,.35,vUv.x)*smoothstep(1.,.65,vUv.x);
        float len = smoothstep(0.,.25,vUv.y)*smoothstep(1.,.3,vUv.y);
        float flick = .85+.15*sin(uTime*.7+vUv.y*4.);
        gl_FragColor = vec4(vec3(.33,.40,.58)*edge*len*.05*flick, 1.); }`,
  });
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.95, 3.2, 1, 1), shaftMat);
  shaft.position.set(cx + 0.15, cy - 0.5, wallZ + 1.2);
  shaft.rotation.set(-1.1, 0, 0);
  g.add(shaft);

  return { group: g, moon };
}
