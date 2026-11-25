import * as THREE from 'three';
import type { Assets } from './Assets';

/** Thin wrapper over THREE positional audio. Sound names map to /audio/<name>.mp3. */
export class AudioSys {
  readonly listener = new THREE.AudioListener();
  private buffers = new Map<string, AudioBuffer>();

  constructor(camera: THREE.Camera, private readonly assets: Assets) {
    camera.add(this.listener);
  }

  async preload(names: string[]) {
    await Promise.all(names.map(async (n) => {
      const b = await this.assets.sound(`/audio/${n}.mp3`);
      if (b) this.buffers.set(n, b);
    }));
  }

  has(name: string) { return this.buffers.has(name); }

  resume() { if (this.listener.context.state !== 'running') void this.listener.context.resume(); }

  /** Non-positional (2D) sound. */
  play2D(name: string, volume = 1, loop = false, rate = 1): THREE.Audio | null {
    const b = this.buffers.get(name);
    if (!b) return null;
    const s = new THREE.Audio(this.listener);
    s.setBuffer(b).setLoop(loop).setVolume(volume).setPlaybackRate(rate);
    s.play();
    return s;
  }

  /** 3D sound attached to `parent` (or placed at a point). */
  play3D(name: string, at: THREE.Object3D | THREE.Vector3, volume = 1, opts: { loop?: boolean; ref?: number; rate?: number; scene?: THREE.Scene } = {}): THREE.PositionalAudio | null {
    const b = this.buffers.get(name);
    if (!b) return null;
    const s = new THREE.PositionalAudio(this.listener);
    s.setBuffer(b).setLoop(!!opts.loop).setVolume(volume).setRefDistance(opts.ref ?? 1).setRolloffFactor(1.6);
    s.setPlaybackRate(opts.rate ?? 1);
    if (at instanceof THREE.Vector3) {
      const holder = new THREE.Object3D();
      holder.position.copy(at);
      opts.scene?.add(holder);
      holder.add(s);
      if (!opts.loop) s.onEnded = () => { s.isPlaying = false; holder.removeFromParent(); };
    } else at.add(s);
    s.play();
    return s;
  }
}
