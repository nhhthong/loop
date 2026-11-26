import type { Player } from '../player/Player';
import type { System } from '../core/System';
import type { TriggerZone } from '../gameplay/TriggerZone';

/** Feeds the player's position to every trigger zone. */
export class TriggerSystem implements System {
  private readonly zones: TriggerZone[] = [];

  constructor(private readonly player: Player) {}

  add(...zones: TriggerZone[]) { this.zones.push(...zones); return this; }

  update() {
    const p = this.player.position;
    for (const z of this.zones) z.update(p);
  }
}
