import { Q } from './Quality';
import type { Renderer } from './Renderer';

const WINDOW = 1000; // ms of frames averaged per decision
const UP_AFTER = 3000; // ms of comfortable frames before raising resolution
const COOLDOWN = 10000; // ms without raising after a drop (avoids oscillating)
const STEP = 0.05; // pixel-ratio step, relative to the range max

/**
 * Frame pacing for constrained devices: caps the frame rate (`Q.fpsCap`) and adapts the render resolution inside
 * `Q.scaleRange` from the measured interval between rendered frames. Inert on desktop (no cap, fixed range).
 */
export class FrameGovernor {
  scale = Q.pixelRatio;
  /** mean interval between rendered frames over the last window (ms) */
  frameMs = 0;
  private last = 0;
  private sum = 0;
  private n = 0;
  private windowStart = 0;
  private goodSince = 0;
  private lastDrop = -Infinity;

  constructor(private readonly renderer: Renderer) {}

  /** Call on every rAF tick; false = skip this tick (frame cap). */
  tick(now: number): boolean {
    if (Q.fpsCap && this.last && now - this.last < 1000 / Q.fpsCap - 2) return false;
    if (this.last) { this.sum += now - this.last; this.n++; }
    this.last = now;
    if (!this.windowStart) this.windowStart = this.goodSince = now;
    if (now - this.windowStart >= WINDOW && this.n) this.decide(now);
    return true;
  }

  private decide(now: number) {
    this.frameMs = this.sum / this.n;
    this.sum = this.n = 0;
    this.windowStart = now;
    const [lo, hi] = Q.scaleRange;
    if (lo === hi) return;
    const budget = 1000 / (Q.fpsCap || 60);
    if (this.frameMs > budget * 1.12) { // missing frames → lower resolution
      this.apply(Math.max(lo, this.scale - STEP * hi));
      this.lastDrop = this.goodSince = now;
    } else if (this.frameMs > budget * 1.04) {
      this.goodSince = now;
    } else if (now - this.goodSince > UP_AFTER && now - this.lastDrop > COOLDOWN && this.scale < hi) {
      this.apply(Math.min(hi, this.scale + STEP * hi));
      this.goodSince = now;
    }
  }

  private apply(scale: number) {
    this.scale = scale;
    this.renderer.setPixelRatio(scale);
  }
}
