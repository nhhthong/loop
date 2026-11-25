import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Dev tool: grid of all models, each normalised to 1m, camera looking from +Z (front = +Z faces camera).
const files = (new URLSearchParams(location.search).get('f') ?? '').split(',').filter(Boolean);
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c') as HTMLCanvasElement, antialias: true });
r.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x303030);
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.5));
const dl = new THREE.DirectionalLight(0xffffff, 2); dl.position.set(2, 4, 5); scene.add(dl);
const cols = Math.ceil(Math.sqrt(files.length));
const cam = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 100);
const span = cols * 1.6;
cam.position.set(span / 2 - 0.8, span * 0.55, span * 1.25); cam.lookAt(span / 2 - 0.8, -span / 2 + 1, 0);
const loader = new GLTFLoader();
const info: Record<string, unknown> = {};
await Promise.all(files.map(async (f, i) => {
  const g = await loader.loadAsync(`/models/${f}.glb`);
  const box = new THREE.Box3().setFromObject(g.scene, true);
  const s = box.getSize(new THREE.Vector3());
  const k = 1 / Math.max(s.x, s.y, s.z);
  const c = box.getCenter(new THREE.Vector3());
  const holder = new THREE.Group();
  g.scene.position.sub(c); holder.add(g.scene); holder.scale.setScalar(k);
  const cell = new THREE.Group(); cell.add(holder);
  cell.position.set((i % cols) * 1.6, -Math.floor(i / cols) * 1.6, 0);
  const ax = new THREE.AxesHelper(0.7); cell.add(ax);
  scene.add(cell);
  info[f] = { size: s.toArray().map((v) => +v.toFixed(3)), anims: g.animations.map((a) => `${a.name}:${a.duration.toFixed(2)}`) };
}));
r.render(scene, cam);
(window as unknown as { __info: unknown }).__info = info;
document.title = 'ready';
