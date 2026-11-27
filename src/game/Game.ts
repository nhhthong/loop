import * as THREE from 'three';
import { Renderer } from '../engine/Renderer';
import { Physics } from '../engine/Physics';
import { Assets } from '../engine/Assets';
import { Input } from '../engine/Input';
import { AudioSys } from '../engine/Audio';
import { Q } from '../engine/Quality';
import { FrameGovernor } from '../engine/FrameGovernor';
import { Stats } from '../ui/Stats';
import type { System } from '../core/System';
import { DIV_Z, PLAYER_START, STAIRWELL, STAIR_BOTTOM_Y, PORTAL, portalMatrix } from '../data/layout';
import { SOUNDS, EMITTERS } from '../data/audio';
import { ROACHES, ROACH_MODELS } from '../data/creatures';
import { Level } from '../world/Level';
import { furnish, type Furnished } from '../world/Furnish';
import { buildHouseDoors, type HouseDoors } from '../world/HouseDoors';
import { Door } from '../world/Door';
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
import { MenuScene } from '../sequences/MenuScene';
import { BathDoorSequence } from '../sequences/BathDoorSequence';
import { ToiletKnockSequence } from '../sequences/ToiletKnockSequence';
import { BrokenLightsSystem } from '../systems/BrokenLightsSystem';
import { PortalSystem } from '../systems/PortalSystem';
import { ZoneVisibility } from '../systems/ZoneVisibility';
import { PendantSystem } from '../systems/PendantSystem';
import { WaterSystem } from '../systems/WaterSystem';
import { LoopDirector } from '../systems/LoopDirector';
import { loopEvents } from '../gameplay/loops';

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
  director!: LoopDirector;
  portal!: PortalSystem;
  knockScene!: ToiletKnockSequence;
  /** basement door (kept for dev scripts) */
  get door() { return this.doors.basement; }
  private lighting!: LightingSystem;
  private systems: System[] = [];
  private governor!: FrameGovernor;
  private stats: Stats | null = null;
  private clock = new THREE.Clock();
  private time = 0;
  /** loading → menu (live backdrop) → game */
  private mode: 'loading' | 'menu' | 'game' = 'loading';
  private menu!: MenuScene;
  private menuSystems: System[] = [];
  private paused = false;
  private held = false;

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
    this.governor = new FrameGovernor(this.renderer);
    if (new URLSearchParams(location.search).has('stats')) this.stats = new Stats(this.renderer.renderer, this.scene, this.governor);

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
    this.startEmitters();

    this.wire(roaches, drips);
    // probes are baked after the lighting exists, with the lamps around each probe lit (see LightingSystem.focusPool)
    bakeProbes(this.renderer.renderer, this.scene, this.level.corridorMeshes, (pos) => this.lighting.focusPool(pos));
    this.lighting.focusPool(null);

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

    const triggers = new TriggerSystem(P);
    const interaction = new InteractionSystem(P, this.input, this.ui);
    const bathScene = new BathDoorSequence(P, D.bath, audio, this.ui, () => {
      D.bath.locked = true;
      interaction.add(new DoorInteraction(D.bath, audio));
    });
    const knockScene = this.knockScene = new ToiletKnockSequence(P, D.bath, audio);
    const brokenLights = new BrokenLightsSystem(P, audio, this.scene);
    const lighting = this.lighting = new LightingSystem(this.furn.lamps, P, this.scene, () => this.intro.active);
    this.director = new LoopDirector(loopEvents({ audio, props: this.furn.props, doors: D, lamps: this.furn.lamps, triggers, lighting, brokenLights, bathScene, knockScene }));

    triggers.add(
      // the basement door swings shut behind the player once they are inside and locks (every pass); a pass via
      // the stairwell starts the next loop
      new TriggerZone((p) => p.z < DIV_Z - 1.4 && p.x < STAIRWELL.x0, () => { shutAndLock(D.basement, audio); this.director.enteredHouse(); }, { when: () => D.basement.isOpen && !D.basement.locked }),
      // door 9 shuts and locks behind the player once they are on the stair (every pass)
      new TriggerZone((p) => p.x > STAIRWELL.flightX - 0.2, () => shutAndLock(D.store, audio), { when: () => D.store.isOpen }),
    );
    interaction.add(
      new DoorInteraction(D.basement, audio),
      new DoorInteraction(D.store, audio),
      new DoorInteraction(D.front, audio),
      // the stair-bottom door is the basement door seen through the portal: both leaves swing together
      new DoorInteraction(D.stairBottom, audio, () => { D.basement.locked = false; D.basement.open(); }),
    );
    // through the stair-bottom door: R1 from the basement doorway
    this.portal = new PortalSystem(this.renderer, P, this.scene, portalMatrix(), PORTAL.yaw,
      { centre: new THREE.Vector3(STAIRWELL.doorX + STAIRWELL.doorT / 2, STAIR_BOTTOM_Y + 1.05, (STAIRWELL.z0 + STAIRWELL.z1) / 2), width: 0.9, height: 2.1, normal: new THREE.Vector3(1, 0, 0) },
      () => D.stairBottom.isOpen && P.position.x > STAIRWELL.x0,
      () => { D.stairBottom.swingShut(0.01); this.director.portalCrossed(); }); // shut it again for the next pass
    // light leaking under the basement door goes out while it is open
    for (const l of this.furn.lamps) if (l.tag === 'leak') l.driver = () => (D.basement.isOpen ? 0 : 1);

    lighting.extraFocus.push(() => this.portal.viewPoint()); // pooled lights must also light what the portal shows
    // basement ↔ house culling: hide what cannot be seen through the shut door wall
    const merged = new Set<THREE.Object3D>([...this.level.corridorMeshes, ...this.level.roomMeshes, this.level.stairwell]);
    const zones = new ZoneVisibility(P, () => D.basement.ajar)
      .add(this.level.group.children.filter((c) => !(c as THREE.Light).isLight && !merged.has(c)))
      .add(roaches.objects);
    zones.onShow = () => lighting.invalidateShadows();
    // moving shadow casters: shadow maps are cached and refreshed only when one of these moves near a light
    lighting.addCasters(() => D.all.filter((d): d is Door => d instanceof Door).map((d) => d.pivot));
    lighting.addCasters(() => (this.furn.fan ? [this.furn.fan.blades ?? this.furn.fan.root] : []));
    lighting.addCasters(() => roaches.objects);
    const fan = new FanSystem(this.furn.fan), pendants = new PendantSystem(this.furn.lamps), water = new WaterSystem(this.level.flowing);
    this.menu = new MenuScene(P, this.renderer, this.ui, this.furn.lamps.find((l) => l.id === 'floorLamp'), () => this.start());
    // the menu backdrop only needs the scene to look alive: camera drift, lights, fan, swaying bulb, water
    this.menuSystems = [this.menu, lighting, fan, pendants, water];
    this.systems = [
      this.intro,
      bathScene,
      knockScene,
      P,
      { update: (dt) => this.physics.step(dt) },
      this.portal,
      zones,
      triggers,
      interaction,
      ...D.all,
      this.hands,
      drips,
      // roaches only react once the player can move (they keep crawling around the waking player)
      { update: (dt) => roaches.update(dt, P.control > 0.5 ? P.position : FAR_AWAY) },
      brokenLights,
      lighting,
      // the stairwell can only be seen from the east hall or through open door 9: skip drawing it elsewhere
      { update: () => { this.level.stairwell.visible = P.position.x > 7 || D.store.isOpen; } },
      fan,
      pendants,
      water,
      this.ambience,
    ];
  }

  /** After loading: show the live 3D menu backdrop. */
  showMenu() {
    this.mode = 'menu';
    this.menu.enter();
    this.clock.start();
    this.loop();
  }

  /** Start pressed: the backdrop's lights cut out, then the wake-up intro begins. */
  leaveMenu() {
    this.audio.resume(); // inside the click (autoplay policy)
    this.menu.exit();
  }

  private start() {
    if (this.mode === 'game') return;
    this.mode = 'game';
    this.player.teleport(PLAYER_START);
    this.audio.resume();
    this.ambience.start();
    this.intro.start();
  }

  /** Dev helpers (used by automated screenshots). */
  debugView(x: number, z: number, yaw: number, pitch: number, eye = 1.62, y = 0) {
    this.menu.finishNow();
    this.intro.stop();
    this.ui.setLids(1);
    this.renderer.setBlur(0);
    this.renderer.vignette.darkness = 0.55;
    this.renderer.exposure.brightness = 0;
    this.player.eye = eye;
    this.player.camera.fov = 70; this.player.camera.updateProjectionMatrix();
    this.hands.setVisible(false);
    this.player.teleport(new THREE.Vector3(x, y, z));
    this.player.yaw = yaw; this.player.pitch = pitch;
    this.player.control = 1;
  }
  debugIntro(t: number) { this.menu.finishNow(); this.intro.seek(t); }

  /**
   * Test hooks (e2e): with the game paused, `debugAdvance` runs the simulation in fixed steps without rendering —
   * the same systems, triggers and sequences as real play, only no frames drawn (rendering is what makes headless
   * runs slow). `debugRender` draws one frame for a screenshot.
   */
  /** Stop the real-time loop for tests (independent of pause / pointer lock). */
  debugHold(on = true) { this.held = on; }
  debugAdvance(seconds: number, dt = 1 / 30) { for (let t = 0; t < seconds; t += dt) { this.step(dt); this.input.endFrame(); } }
  debugRender() { this.renderer.render(0); }
  debugPress(code: string) { this.input.press(code); }
  /** Move the player without touching control/camera state (so running sequences are not disturbed). */
  debugTeleport(x: number, z: number, yaw: number, y = 0) { this.player.teleport(new THREE.Vector3(x, y, z)); this.player.yaw = yaw; }

  setPaused(p: boolean) { this.paused = p; if (!p) this.clock.getDelta(); }

  /** One simulation step (all ticking systems of the current mode). */
  private step(dt: number) {
    this.time += dt;
    sharedUniforms.uTime.value = this.time;
    for (const s of this.mode === 'menu' ? this.menuSystems : this.systems) s.update(dt);
  }

  private loop = (now = performance.now()) => {
    requestAnimationFrame(this.loop);
    if (!this.governor.tick(now)) return; // frame cap (mobile)
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    if (this.held) return; // tests drive time and input (debugAdvance); a held frame must not clear injected key presses
    if (this.mode === 'loading' || this.paused) { this.input.endFrame(); return; }
    this.step(dt);
    this.stats?.begin();
    this.renderer.render(dt);
    this.stats?.end();
    this.input.endFrame();
  };
}
