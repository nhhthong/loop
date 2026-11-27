import * as THREE from 'three';
import type { Player } from '../player/Player';
import type { System } from '../core/System';
import { DIV_Z } from '../data/layout';

/**
 * Basement ↔ house culling. The two halves are separated by the door wall, so while the basement door is shut the
 * half the player is not in cannot be seen — yet frustum culling still draws everything inside the view cone *behind*
 * the wall (props, roaches, lamp glows). Those objects are hidden here; both halves show while the door is ajar.
 * Objects containing lights are never hidden (a changed light count would recompile every shader).
 */
export class ZoneVisibility implements System {
  private readonly corridor: THREE.Object3D[] = [];
  private readonly house: THREE.Object3D[] = [];
  private shown = { corridor: true, house: true };
  /** called when a half becomes visible again (its cached shadow maps may be stale) */
  onShow: () => void = () => {};

  /** `ajar`: the basement door is open or still swinging shut. */
  constructor(private readonly player: Player, private readonly ajar: () => boolean) {}

  /** Sort objects into basement / house by where they stand (bounding-box centre, door wall at `DIV_Z`). */
  add(objs: THREE.Object3D[]) {
    const box = new THREE.Box3(), c = new THREE.Vector3();
    for (const o of objs) {
      let hasLight = false;
      o.traverse((x) => { if ((x as THREE.Light).isLight) hasLight = true; });
      if (hasLight || box.setFromObject(o).isEmpty()) continue;
      const zone = box.getCenter(c).z > DIV_Z ? 'corridor' : 'house';
      (zone === 'corridor' ? this.corridor : this.house).push(o);
      o.visible = this.shown[zone]; // objects added later (stage 2) follow the current state
    }
    return this;
  }

  update() {
    const inCorridor = this.player.position.z > DIV_Z, open = this.ajar();
    this.set('corridor', this.corridor, inCorridor || open);
    this.set('house', this.house, !inCorridor || open);
  }

  private set(zone: 'corridor' | 'house', objs: THREE.Object3D[], visible: boolean) {
    if (this.shown[zone] === visible) return;
    this.shown[zone] = visible;
    for (const o of objs) o.visible = visible;
    if (visible) this.onShow();
  }
}
