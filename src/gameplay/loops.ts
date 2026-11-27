import type * as THREE from 'three';
import type { AudioSys } from '../engine/Audio';
import type { TriggerSystem } from '../systems/TriggerSystem';
import type { LightingSystem } from '../systems/LightingSystem';
import type { BrokenLightsSystem } from '../systems/BrokenLightsSystem';
import type { BathDoorSequence } from '../sequences/BathDoorSequence';
import type { ToiletKnockSequence } from '../sequences/ToiletKnockSequence';
import type { HouseDoors } from '../world/HouseDoors';
import type { Lamp } from '../world/Furnish';
import { STORE_DOOR } from '../data/layout';
import { TriggerZone } from './TriggerZone';

/** Handles the per-loop events may act on (no special cases inside systems). */
export interface LoopContext {
  audio: AudioSys;
  props: Map<string, THREE.Object3D>;
  doors: HouseDoors;
  lamps: Lamp[];
  triggers: TriggerSystem;
  lighting: LightingSystem;
  brokenLights: BrokenLightsSystem;
  bathScene: BathDoorSequence;
  knockScene: ToiletKnockSequence;
}

/** inside R2, between x0 and its east end */
const inR2From = (x0: number) => (p: THREE.Vector3) => p.x > x0 && p.x < 3.4 && p.z < -3.5 && p.z > -5.5;
/** in the east hall, within 2 m of door 9 */
const nearDoor9 = (p: THREE.Vector3) => p.x > STORE_DOOR.at - 2 && p.x < STORE_DOOR.at && Math.abs(p.z - (STORE_DOOR.a0 + STORE_DOOR.a1) / 2) < 1;
/** loop 3: the one lamp left burning (low, flickering) */
const DIM_LAMP = 'sconceP';

/**
 * What changes in each loop (loop 1 = the house as first seen). Each pass goes door 9 → stairwell → portal → R1;
 * door 9 shuts and locks behind the player on the stair, so a loop that continues must unlock it again.
 */
export const loopEvents = (c: LoopContext): Record<number, () => void> => {
  let radio: THREE.PositionalAudio | null = null;
  return {
    2: () => {
      // the old radio on the console starts crackling
      const prop = c.props.get('radio');
      if (prop) radio = c.audio.play3D('radio_static', prop, 0.55, { loop: true, ref: 0.9 });
      // walking along R2 past the ajar bathroom door: it closes by itself
      c.triggers.add(new TriggerZone(inR2From(0.9), () => c.bathScene.start(), { once: true }));
      c.doors.store.locked = false; // door 9 leads down again
    },
    3: () => {
      const store = c.doors.store;
      radio?.stop(); // silence where the static was
      // the wiring fails: the house lamps stutter and die, one R1 sconce keeps burning low; the bulbs at door 9 and on
      // the stair stay lit — the only light ahead, luring the player down the hall
      const house = c.lamps.filter((l) => l.tag === 'lamp' && l.id !== 'stairBulb' && l.id !== 'eastBulb');
      c.brokenLights.start(house.filter((l) => l.id !== DIM_LAMP), house.find((l) => l.id === DIM_LAMP));
      store.open(); // door 9 stands wide open at the end of the hall
      // keep door 9 lit by the mobile light pool until it slams
      let slammed = false;
      c.lighting.extraFocus.push(() => (slammed ? null : store.handleWorld()));
      // close to door 9 (the stair in view): it slams in the player's face and stays locked; then someone keeps
      // trying the bathroom handle until the player answers with E (ToiletKnockSequence)
      c.triggers.add(new TriggerZone(nearDoor9, () => {
        slammed = true;
        store.swingShut(0.18);
        store.locked = true;
        c.audio.play3D('door_slam', store.handle, 1, { ref: 3 });
        c.knockScene.start();
      }, { once: true }));
    },
  };
};
