import type * as THREE from 'three';
import type { FrameGovernor } from '../engine/FrameGovernor';

/** `?stats` overlay: fps, frame ms, draw calls, triangles, scene lights, render scale (refreshed twice a second). */
export class Stats {
  private readonly el = document.createElement('div');
  private frames = 0;
  private since = performance.now();
  private calls = 0;
  private tris = 0;

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly scene: THREE.Scene, private readonly governor: FrameGovernor) {
    this.el.id = 'stats';
    document.body.appendChild(this.el);
    renderer.info.autoReset = false; // count every pass of the frame
  }

  /** before rendering a frame */
  begin() { this.renderer.info.reset(); }

  /** after rendering a frame */
  end() {
    this.frames++;
    this.calls = this.renderer.info.render.calls;
    this.tris = this.renderer.info.render.triangles;
    const now = performance.now();
    if (now - this.since < 500) return;
    let lights = 0;
    this.scene.traverse((o) => { if ((o as THREE.Light).isLight && o.visible) lights++; });
    const fps = (this.frames * 1000) / (now - this.since);
    this.el.textContent = `${fps.toFixed(0)} fps · ${(1000 / fps).toFixed(1)} ms · ${this.calls} calls · ${(this.tris / 1000).toFixed(0)}k tris · ${lights} lights · ×${this.governor.scale.toFixed(2)}`;
    this.frames = 0;
    this.since = now;
  }
}
