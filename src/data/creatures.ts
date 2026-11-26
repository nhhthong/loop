import * as THREE from 'three';
import { CORRIDOR } from './layout';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const ROACH_MODELS = { american: '/models/hands_bugs/american_cockroach_walk.glb', xcellf: '/models/hands_bugs/cockroach_xcellf.glb' } as const;

/** Cockroach groups: each crawls on the inner faces of `box` (walls along `climb` axes plus floor/ceiling). */
export interface RoachGroup {
  model: keyof typeof ROACH_MODELS;
  count: number;
  box: THREE.Box3;
  climb: ('x' | 'y' | 'z')[];
  length: number;
  /** fixed start positions + surface normals for the first ones */
  starts?: { p: THREE.Vector3; n: THREE.Vector3 }[];
}

const CORRIDOR_BOX = new THREE.Box3(V(CORRIDOR.x0, 0, CORRIDOR.z0 + 0.18), V(CORRIDOR.x1, CORRIDOR.h, CORRIDOR.z1 - 0.1));

export const ROACHES: RoachGroup[] = [
  // a few start inside the wake-up view (floor ahead, both walls) so they're seen while looking at the hand
  {
    model: 'american', count: 4, box: CORRIDOR_BOX, climb: ['x', 'y'], length: 0.05, starts: [
      { p: V(CORRIDOR.x0, 0.7, CORRIDOR.z0 + 4.23), n: V(1, 0, 0) }, { p: V(CORRIDOR.x0, 0.42, CORRIDOR.z0 + 3.83), n: V(1, 0, 0) },
      { p: V(-0.25, 0, CORRIDOR.z0 + 3.58), n: V(0, 1, 0) }, { p: V(0.05, 0, CORRIDOR.z0 + 3.18), n: V(0, 1, 0) },
    ],
  },
  { model: 'american', count: 3, box: CORRIDOR_BOX, climb: ['x', 'y'], length: 0.042 },
  { model: 'xcellf', count: 3, box: CORRIDOR_BOX, climb: ['x', 'y'], length: 0.036 },
  // a couple in the entrance leg of the house
  { model: 'american', count: 2, box: new THREE.Box3(V(-0.95, 0, -3.4), V(0.95, 3, -0.3)), climb: ['x'], length: 0.045 },
];
