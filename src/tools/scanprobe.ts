import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// Ortho render of the hand scan, normalised: wrist bottom at y=0, palm facing +Z, metres. Grid every 1cm.
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c') as HTMLCanvasElement, antialias: true });
const W = 1000, H = 1100; r.setSize(W, H);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x202020);
scene.add(new THREE.AmbientLight(0xffffff, 2.5));
const g = await new GLTFLoader().loadAsync('/models/hands_bugs/male_hand_scan.glb');
const mesh = g.scene.getObjectByProperty('isMesh', true) as THREE.Mesh;
g.scene.updateMatrixWorld(true);
const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
geo.computeBoundingBox();
const bb = geo.boundingBox!;
const k = 0.205 / (bb.max.y - bb.min.y);
geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2); geo.scale(k, k, k);
geo.computeBoundingBox();
const m = new THREE.Mesh(geo, mesh.material); scene.add(m);
const view = new URLSearchParams(location.search).get('v') ?? 'front';
const cam = new THREE.OrthographicCamera(-0.1, 0.1, 0.21, -0.01, -1, 1);
if (view === 'side') { cam.position.set(1, 0, 0); cam.lookAt(0, 0, 0); cam.left = -0.1; cam.right = 0.1; cam.updateProjectionMatrix(); }
else cam.position.set(0, 0, 0.5);
const grid = new THREE.Group();
const lm = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.35 });
const lm5 = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 });
for (let i = -10; i <= 10; i++) grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i / 100, -0.01, 0.3), new THREE.Vector3(i / 100, 0.21, 0.3)]), i % 5 ? lm : lm5));
for (let j = -1; j <= 21; j++) grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.1, j / 100, 0.3), new THREE.Vector3(0.1, j / 100, 0.3)]), j % 5 ? lm : lm5));
if (view === 'side') grid.rotation.y = Math.PI / 2;
scene.add(grid);
// optional joints overlay ?j=x,y;x,y...
const j = new URLSearchParams(location.search).get('j');
if (j) for (const pt of j.split(';')) { const [x, y] = pt.split(',').map(Number); const s = new THREE.Mesh(new THREE.SphereGeometry(0.0025), new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false })); s.position.set(x, y, 0.2); scene.add(s); }
r.render(scene, cam);
(window as any).__info = { bb: [geo.boundingBox!.min.toArray(), geo.boundingBox!.max.toArray()], k };
document.title = 'ready';
