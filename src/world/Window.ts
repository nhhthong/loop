import * as THREE from 'three';

/**
 * Night window: nothing but black outside. The glass keeps a faint glossy reflection of the room
 * (so it still reads as glass), no sky, no moonlight, no rain.
 */
export function buildWindow(x0: number, x1: number, y0: number, y1: number, wallZ: number) {
  const g = new THREE.Group();
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;

  // pitch-black exterior just behind the opening
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.6, h + 0.6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  back.position.set(cx, cy, wallZ - 0.4);
  g.add(back);

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0a0b0c, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.35, envMapIntensity: 0.8,
    clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false,
  });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, h - 0.08), glass);
  pane.position.set(cx, cy, wallZ - 0.075);
  pane.renderOrder = 2;
  g.add(pane);

  return { group: g };
}
