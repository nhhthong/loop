import * as THREE from 'three';
import { Q } from '../engine/Quality';
import { CORRIDOR, DIV_Z } from '../data/layout';

/**
 * Bake two reflection probes (house & corridor) so wet concrete and polished wood reflect their surroundings.
 * The house probe is the scene environment; corridor meshes (and loose corridor meshes parented to the scene) get the corridor one.
 */
export function bakeProbes(renderer: THREE.WebGLRenderer, scene: THREE.Scene, corridorMeshes: THREE.Mesh[], prepare: (pos: THREE.Vector3) => void = () => {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const bake = (pos: THREE.Vector3) => {
    prepare(pos);
    const rt = new THREE.WebGLCubeRenderTarget(Q.probeSize, { type: THREE.HalfFloatType });
    const cam = new THREE.CubeCamera(0.05, 30, rt);
    cam.position.copy(pos);
    scene.add(cam);
    cam.update(renderer, scene);
    cam.removeFromParent();
    const env = pmrem.fromCubemap(rt.texture).texture;
    rt.dispose();
    return env;
  };
  const room = bake(new THREE.Vector3(2.5, 1.5, -4.5));
  const corr = bake(new THREE.Vector3(0, 1.3, CORRIDOR.z0 + 2.9));
  scene.environment = room;
  scene.environmentIntensity = 0.45; // probes add reflections, not flat fill light
  const setEnv = (m: THREE.Mesh, env: THREE.Texture) => {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mm) => { if ((mm as THREE.MeshStandardMaterial).isMeshStandardMaterial) (mm as THREE.MeshStandardMaterial).envMap = env; });
  };
  corridorMeshes.forEach((m) => setEnv(m, corr));
  scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.position.z > DIV_Z + 0.3 && o.parent === scene) setEnv(o as THREE.Mesh, corr); });
}
