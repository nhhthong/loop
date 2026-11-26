import * as THREE from 'three';
import type { Physics } from '../engine/Physics';
import type { LevelMats } from './Level';
import { Door, GrandDoor, type DoorLike } from './Door';
import { DOOR, DIV_Z, STORE_DOOR, BATH_DOOR, EXIT_DOOR } from '../data/layout';

/** The house's door leaves, placed in the openings of `data/layout.ts`. */
export interface HouseDoors {
  /** basement corridor → R1 (opens once, then shuts and locks behind the player) */
  basement: Door;
  /** door 9 at the end of the east hall, down to the store: same kind of door as the basement one, shut */
  store: Door;
  /** bathroom: left ajar, opening into the dark */
  bath: Door;
  /** front entrance: grand double doors at the end of the narrow passage, locked */
  front: GrandDoor;
  all: DoorLike[];
}

export function buildHouseDoors(physics: Physics, mats: LevelMats, parent: THREE.Object3D): HouseDoors {
  const wood = mats.trim;
  const basement = new Door(physics, wood, { hinge: new THREE.Vector3(DOOR.x0 + 0.005, 0, DIV_Z - 0.05), width: DOOR.x1 - DOOR.x0, height: DOOR.h, baseYaw: 0, openSign: 1 });
  const store = new Door(physics, wood, { hinge: new THREE.Vector3(STORE_DOOR.at + 0.04, 0, STORE_DOOR.a0 + 0.005), width: STORE_DOOR.a1 - STORE_DOOR.a0, height: STORE_DOOR.y1, baseYaw: -Math.PI / 2, openSign: 1 });
  store.locked = true;
  const bath = new Door(physics, wood, { hinge: new THREE.Vector3(BATH_DOOR.a0 + 0.005, 0, -3.3), width: BATH_DOOR.a1 - BATH_DOOR.a0, height: BATH_DOOR.y1, baseYaw: 0, openSign: -1, angle: 0.6 });
  const front = new GrandDoor(physics, mats.woodFloor, EXIT_DOOR.a0, EXIT_DOOR.a1, EXIT_DOOR.y1, EXIT_DOOR.at - 0.06);
  parent.add(basement.pivot, store.pivot, bath.pivot, front.group);
  return { basement, store, bath, front, all: [basement, store, bath, front] };
}
