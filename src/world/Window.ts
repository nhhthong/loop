import * as THREE from 'three';
import { sharedUniforms } from './Materials';
import { Q } from '../engine/Quality';

/**
 * Night window: rain-streaked glass, a deep dark exterior with faint moonlit branches,
 * half-lowered venetian blinds, and a cold moonlight spot that throws the frame/slat shadows inside.
 */
export function buildWindow(x0: number, x1: number, y0: number, y1: number, wallZ: number, castShadow: boolean) {
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

  // --- venetian blinds, lowered about half way, slats tilted slightly open -------------------
  const slatMat = new THREE.MeshStandardMaterial({ color: 0xdcd8cf, roughness: 0.55, side: THREE.DoubleSide });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.5 });
  const bw = w - 0.06, bz = wallZ - 0.06, top = y1 - 0.04, drop = (y1 - y0) * 0.52, pitch = 0.025;
  const head = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.02, 0.04, 0.05), headMat);
  head.position.set(cx, top, bz); head.castShadow = true; g.add(head);
  const slatGeo = new THREE.BoxGeometry(bw, 0.0012, 0.025);
  const n = Math.floor(drop / pitch);
  const slats = new THREE.InstancedMesh(slatGeo, slatMat, n);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.35);
  for (let i = 0; i < n; i++) slats.setMatrixAt(i, mtx.compose(new THREE.Vector3(cx, top - 0.03 - i * pitch, bz), q, new THREE.Vector3(1, 1, 1)));
  slats.castShadow = true; slats.receiveShadow = true;
  g.add(slats);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.012, 0.028), headMat);
  rail.position.set(cx, top - 0.03 - n * pitch, bz); rail.castShadow = true; g.add(rail);
  for (const fx of [0.2, 0.8]) { // ladder cords
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, n * pitch + 0.03, 4), headMat);
    cord.position.set(x0 + 0.03 + bw * fx, top - (n * pitch + 0.03) / 2, bz); g.add(cord);
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
