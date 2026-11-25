import * as THREE from 'three';
import { softDot } from './Materials';
import type { AudioSys } from '../engine/Audio';
import { CORRIDOR } from './Level';

/** Water leaking from the corridor ceiling: falling drops + floor ripples + positional plinks. */
export class Drips {
  private drops: { mesh: THREE.Mesh; v: number; src: THREE.Vector3; t: number; wait: number }[] = [];
  private ripples: { mesh: THREE.Mesh; age: number }[] = [];
  private rippleMat: THREE.ShaderMaterial;

  constructor(private readonly scene: THREE.Object3D, private readonly audio: AudioSys, private readonly root: THREE.Scene) {
    const dropGeo = new THREE.SphereGeometry(0.006, 8, 6);
    dropGeo.scale(1, 2.2, 1);
    const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transmission: 0.0, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 3 });
    const sources = [[-0.35, 1.1], [0.3, 2.2], [-0.15, 3.6], [0.4, 4.7], [-0.42, 5.4], [0.1, 0.6]];
    sources.forEach(([x, z], i) => {
      const m = new THREE.Mesh(dropGeo, dropMat);
      const src = new THREE.Vector3(x, CORRIDOR.h - 0.01, z);
      m.position.copy(src);
      m.visible = false;
      scene.add(m);
      this.drops.push({ mesh: m, v: 0, src, t: 0, wait: 0.5 + i * 0.7 + Math.random() * 2 });
      // a hanging bead at each source
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), dropMat);
      bead.scale.y = 0.6; bead.position.copy(src); scene.add(bead);
    });
    this.rippleMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uAge: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec2 vUv; uniform float uAge;
        void main(){ float d = length(vUv-.5)*2.; float r = uAge*1.4;
          float ring = smoothstep(.06,.0,abs(d-r)) + smoothstep(.05,.0,abs(d-r*.6))*.5;
          gl_FragColor = vec4(vec3(.8,.85,.9), ring*(1.-uAge)*.35*step(d,1.)); }`,
    });
  }

  update(dt: number) {
    for (const d of this.drops) {
      if (!d.mesh.visible) {
        d.t += dt;
        if (d.t > d.wait) { d.mesh.visible = true; d.mesh.position.copy(d.src); d.v = 0; }
        continue;
      }
      d.v += 9.81 * dt;
      d.mesh.position.y -= d.v * dt;
      if (d.mesh.position.y <= 0.005) {
        d.mesh.visible = false; d.t = 0; d.wait = 1.2 + Math.random() * 4;
        this.spawnRipple(d.mesh.position);
        const name = Math.random() < 0.5 ? 'water_drip_1' : 'water_drip_2';
        this.audio.play3D(name, d.mesh.position.clone(), 0.5 + Math.random() * 0.3, { ref: 0.6, rate: 0.85 + Math.random() * 0.35, scene: this.root });
      }
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dt / 1.1;
      (r.mesh.material as THREE.ShaderMaterial).uniforms.uAge.value = r.age;
      if (r.age >= 1) { r.mesh.removeFromParent(); this.ripples.splice(i, 1); }
    }
  }

  private spawnRipple(p: THREE.Vector3) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), this.rippleMat.clone());
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, 0.004, p.z);
    this.scene.add(m);
    this.ripples.push({ mesh: m, age: 0 });
  }
}

/** Floating dust motes that catch the lamp light (brightness by proximity to lights). */
export class Dust {
  readonly points: THREE.Points;
  private mat: THREE.ShaderMaterial;

  constructor(parent: THREE.Object3D, box: THREE.Box3, count: number, lights: THREE.Vector3[]) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const s = box.getSize(new THREE.Vector3());
    for (let i = 0; i < count; i++) {
      pos[i * 3] = box.min.x + Math.random() * s.x;
      pos[i * 3 + 1] = box.min.y + Math.random() * s.y;
      pos[i * 3 + 2] = box.min.z + Math.random() * s.z;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const L = lights.slice(0, 4);
    while (L.length < 4) L.push(new THREE.Vector3(1e4, 1e4, 1e4));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uTex: { value: softDot() }, uL: { value: L }, uMin: { value: box.min }, uSize: { value: s } },
      vertexShader: /* glsl */`
        attribute float seed; uniform float uTime; uniform vec3 uL[4]; uniform vec3 uMin; uniform vec3 uSize;
        varying float vB;
        void main(){
          vec3 p = position;
          p += vec3(sin(uTime*.13+seed*40.)*.25, sin(uTime*.07+seed*17.)*.15 - uTime*.006, cos(uTime*.11+seed*23.)*.25);
          p = uMin + mod(p - uMin, uSize);
          float b = 0.;
          for(int i=0;i<4;i++){ float d = distance(p,uL[i]); b += 1./(1.+d*d*6.); }
          vB = b * (.5+.5*sin(uTime*1.3+seed*90.));
          vec4 mv = modelViewMatrix*vec4(p,1.);
          gl_PointSize = (2.0 + seed*3.0) * 30.0 / -mv.z;
          gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: `uniform sampler2D uTex; varying float vB;
        void main(){ float a = texture2D(uTex, gl_PointCoord).r; gl_FragColor = vec4(vec3(1.,.82,.6)*a*vB*.6, 1.); }`,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    parent.add(this.points);
  }

  update(t: number) { this.mat.uniforms.uTime.value = t; }
}
