import type { Input } from '../engine/Input';
import type { Player } from '../player/Player';
import type { UI } from '../ui/UI';
import type { System } from '../core/System';
import type { Interactable } from '../gameplay/Interactable';

const REACH = 1.5, AIM_DOT = 0.82;

/** Look-at + E interaction. The first registered interactable in reach and aimed at wins. */
export class InteractionSystem implements System {
  private readonly items: Interactable[] = [];

  constructor(private readonly player: Player, private readonly input: Input, private readonly ui: UI) {}

  add(...items: Interactable[]) { this.items.push(...items); return this; }

  update(dt: number) {
    for (const it of this.items) it.update?.(dt);
    if (this.player.control < 1) { this.ui.prompt(''); return; }
    const eye = this.player.eyePos(), fwd = this.player.forward();
    const target = this.items.find((it) => {
      const p = it.focusPoint();
      if (!p) return false;
      const to = p.clone().sub(eye);
      return to.length() < REACH && to.normalize().dot(fwd) > AIM_DOT;
    });
    this.ui.prompt(target?.prompt ?? '');
    if (target && this.input.hit('KeyE')) target.use();
  }
}
