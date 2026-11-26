import type * as THREE from 'three';
import type { AudioSys } from '../engine/Audio';
import type { TriggerSystem } from '../systems/TriggerSystem';
import type { BathDoorSequence } from '../sequences/BathDoorSequence';
import { TriggerZone } from './TriggerZone';

/** Handles the per-loop events may act on (no special cases inside systems). */
export interface LoopContext {
  audio: AudioSys;
  props: Map<string, THREE.Object3D>;
  triggers: TriggerSystem;
  bathScene: BathDoorSequence;
}

/** What changes in each loop (loop 1 = the house as first seen). Door 9 stays locked after the first pass. */
export const loopEvents = (c: LoopContext): Record<number, () => void> => ({
  2: () => {
    // the old radio on the console starts crackling
    const radio = c.props.get('radio');
    if (radio) c.audio.play3D('radio_static', radio, 0.55, { loop: true, ref: 0.9 });
    // walking along R2 past the ajar bathroom door: it closes by itself
    c.triggers.add(new TriggerZone((p) => p.x > 0.9 && p.x < 3.4 && p.z < -3.5 && p.z > -5.5, () => c.bathScene.start(), { once: true }));
  },
});
