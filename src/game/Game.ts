import * as THREE from 'three';
import { Renderer } from '../engine/Renderer';
import { Physics } from '../engine/Physics';
import { Assets } from '../engine/Assets';
import { Input } from '../engine/Input';
import { AudioSys } from '../engine/Audio';
import { Q } from '../engine/Quality';
import type { System } from '../core/System';
import { DIV_Z, PLAYER_START } from '../data/layout';
import { SOUNDS, EMITTERS } from '../data/audio';
import { ROACHES, ROACH_MODELS } from '../data/creatures';
import { Level } from '../world/Level';
import { furnish, type Furnished } from '../world/Furnish';
import { buildHouseDoors, type HouseDoors } from '../world/HouseDoors';
import { bakeProbes } from '../world/Probes';
import { Drips } from '../world/Atmosphere';
import { Cockroaches } from '../world/Cockroaches';
import { sharedUniforms } from '../world/Materials';
import { Player } from '../player/Player';
import { Hands } from '../player/Hands';
import { UI } from '../ui/UI';
import { DoorInteraction, shutAndLock } from '../gameplay/DoorInteraction';
import { TriggerZone } from '../gameplay/TriggerZone';
import { InteractionSystem } from '../systems/InteractionSystem';
import { TriggerSystem } from '../systems/TriggerSystem';
import { LightingSystem } from '../systems/LightingSystem';
import { FanSystem } from '../systems/FanSystem';
import { AmbienceSystem } from '../systems/AmbienceSystem';
import { IntroSequence } from '../sequences/IntroSequence';

const FAR_AWAY = new THREE.Vector3(0, -100, 0);

/**
 * Composition root: loads and wires the world, gameplay and systems, then runs the frame loop.
 * Behaviour lives in systems / gameplay objects; this class only decides what exists and in which order it ticks.
 */
export class Game {
  readonly scene = new THREE.Scene();
  readonly assets = new Assets();
  readonly physics = new Physics();
  readonly input: Input;
  readonly ui = new UI();
  renderer!: Renderer;
  audio!: AudioSys;
  player!: Player;
  hands!: Hands;
  level!: Level;
  doors!: HouseDoors;
  furn!: Furnished;
  intro!: IntroSequence;
  ambience!: AmbienceSystem;
  /** basement door (kept for dev scripts) */
  get door() { return this.doors.basement; }
  private systems: System[] = [];
  private clock = new THREE.Clock();
  private time = 0;
  private running = false;
  private paused = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.input = new Input(canvas);
  }

  async load(onProgress: (p: number, label: string) => void) {
    let total = 1, done = 0;
    const tick = (label: string) => { done++; onProgress(Math.min(0.99, done / total), label); };
    this.assets.onProgress = (l, t, url) => onProgress(Math.min(0.99, l / Math.max(t, 1)), url.split('/').pop() ?? '');
    await this.physics.init();
    this.scene.background = new THREE.Color(0x000000);

    // player first (camera needed by renderer)
    this.audio = new AudioSys(new THREE.PerspectiveCamera(), this.assets);
    this.player = new Player(this.physics, this.input, this.audio, this.scene, PLAYER_START);
    this.player.camera.add(this.audio.listener);
    this.renderer = new Renderer(this.canvas, this.scene, this.player.camera);
    this.assets.anisotropy = Math.min(Q.anisotropy, this.renderer.renderer.capabilities.getMaxAnisotropy());

    total = 4;
    this.level = await new Level(this.physics, this.assets).build();
    this.scene.add(this.level.group);
    this.doors = buildHouseDoors(this.physics, this.level.mats, this.scene);
    tick('level');

    [this.furn] = await Promise.all([furnish(this.assets, this.physics, this.level.group), this.audio.preload(SOUNDS)]);
    tick('props');

    // ambient fill so nothing is pure black
    this.scene.add(new THREE.HemisphereLight(0x383a34, 0x12100c, 0.1));

    const [handScan, ...roachModels] = await Promise.all([
      this.assets.model('/models/hands_bugs/male_hand_scan.glb'),
      ...Object.values(ROACH_MODELS).map((u) => this.assets.model(u)),
    ]);
    const roachGltf = Object.fromEntries(Object.keys(ROACH_MODELS).map((k, i) => [k, roachModels[i]]));
    this.hands = new Hands();
    if (handScan) await this.hands.load(handScan, this.player.camera);
    const roaches = new Cockroaches(this.scene, this.audio);
    for (const g of ROACHES) {
      const gltf = roachGltf[g.model];
      if (gltf) roaches.spawn(gltf, g.count, g.box, g.climb, g.length, 0, g.starts);
    }
    tick('creatures');

    const drips = new Drips(this.scene, this.audio, this.scene); // before the probes: loose corridor meshes get the corridor env
    this.hands.rig.visible = false;
    bakeProbes(this.renderer.renderer, this.scene, this.level.corridorMeshes);
    this.startEmitters();

    this.wire(roaches, drips);

    // warm-up: compile shaders & first frames before the curtain lifts
    this.renderer.renderer.compile(this.scene, this.player.camera);
    tick('ready');
    onProgress(1, '');
  }

  /** Looping positional sounds from `data/audio.ts`. */
  private startEmitters() {
    for (const e of EMITTERS) {
      const opts = { loop: true, ref: e.ref, rate: e.rate };
      if (typeof e.at === 'string') {
        const o = this.furn.props.get(e.at);
        if (o) this.audio.play3D(e.sound, o, e.volume, opts);
      } else this.audio.play3D(e.sound, new THREE.Vector3(...e.at), e.volume, { ...opts, scene: this.scene });
    }
  }

  /** Gameplay rules + frame order. */
  private wire(roaches: Cockroaches, drips: Drips) {
    const { player: P, doors: D, audio } = this;
    this.ambience = new AmbienceSystem(audio, P);
    this.intro = new IntroSequence(P, this.hands, this.renderer, this.ui, audio, this.ambience);

    // the basement door swings shut behind the player once they are inside, and stays locked
    const triggers = new TriggerSystem(P).add(
      new TriggerZone((p) => p.z < DIV_Z - 1.4, () => shutAndLock(D.basement, audio), { once: true, when: () => D.basement.isOpen && !D.basement.locked }),
    );
    const interaction = new InteractionSystem(P, this.input, this.ui).add(
      new DoorInteraction(D.basement, audio),
      new DoorInteraction(D.store, audio),
      new DoorInteraction(D.front, audio),
    );
    // light leaking under the basement door goes out while it is open
    for (const l of this.furn.lamps) if (l.tag === 'leak') l.driver = () => (D.basement.isOpen ? 0 : 1);

    this.systems = [
      this.intro,
      P,
      { update: (dt) => this.physics.step(dt) },
      triggers,
      interaction,
      ...D.all,
      this.hands,
      drips,
      // roaches only react once the player can move (they keep crawling around the waking player)
      { update: (dt) => roaches.update(dt, P.control > 0.5 ? P.position : FAR_AWAY) },
      new LightingSystem(this.furn.lamps, P, this.scene, () => this.intro.active),
      new FanSystem(this.furn.fan),
      this.ambience,
    ];
  }

  start() {
    this.running = true;
    this.audio.resume();
    this.ambience.start();
    this.intro.start();
    this.clock.start();
    this.loop();
  }

  /** Dev helpers (used by automated screenshots). */
  debugView(x: number, z: number, yaw: number, pitch: number, eye = 1.62) {
    this.intro.stop();
    this.ui.setLids(1);
    this.renderer.setBlur(0);
    this.renderer.vignette.darkness = 0.55;
    this.renderer.exposure.brightness = 0;
    this.player.eye = eye;
    this.player.camera.fov = 70; this.player.camera.updateProjectionMatrix();
    this.hands.setVisible(false);
    this.player.teleport(new THREE.Vector3(x, 0, z));
    this.player.yaw = yaw; this.player.pitch = pitch;
    this.player.control = 1;
  }
  debugIntro(t: number) { this.intro.seek(t); }

  setPaused(p: boolean) { this.paused = p; if (!p) this.clock.getDelta(); }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    if (!this.running || this.paused) { this.input.endFrame(); return; }
    this.time += dt;
    sharedUniforms.uTime.value = this.time;
    for (const s of this.systems) s.update(dt);
    this.renderer.render(dt);
    this.input.endFrame();
  };
}
