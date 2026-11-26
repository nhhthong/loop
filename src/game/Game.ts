import * as THREE from 'three';
import { Renderer } from '../engine/Renderer';
import { Physics } from '../engine/Physics';
import { Assets } from '../engine/Assets';
import { Input } from '../engine/Input';
import { AudioSys } from '../engine/Audio';
import { Level, CORRIDOR, WIN_A, WIN_B, WIN_C, DOOR, DIV_Z, STORE_DOOR, BATH_DOOR, EXIT_DOOR } from '../world/Level';
import { furnish, type Furnished } from '../world/Furnish';
import { buildWindow } from '../world/Window';
import { Door, buildGrandDoor } from '../world/Door';
import { Drips } from '../world/Atmosphere';
import { Cockroaches } from '../world/Cockroaches';
import { sharedUniforms } from '../world/Materials';
import { Player } from '../player/Player';
import { Hands } from '../player/Hands';
import { UI } from '../ui/UI';
import { Q } from '../engine/Quality';

const SOUNDS = ['breath_wake', 'clock_tick', 'cockroach_skitter', 'corridor_ambience', 'door_creak', 'door_handle', 'door_locked_1', 'door_locked_2', 'heartbeat',
  'light_buzz', 'room_ambience', 'water_drip_1', 'water_drip_2', 'wind_window', 'fan_creak',
  'step_concrete_1', 'step_concrete_2', 'step_concrete_3', 'step_concrete_4', 'step_wood_1', 'step_wood_2', 'step_wood_3', 'step_wood_4', 'step_wood_5'];

const ease = (x: number) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a));

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
  door!: Door;
  furn!: Furnished;
  drips!: Drips;
  roaches!: Cockroaches;
  private clock = new THREE.Clock();
  private time = 0;
  private introT = -1;
  private running = false;
  private paused = false;
  private ambC: THREE.Audio | null = null;
  private ambR: THREE.Audio | null = null;
  private doorT = -1;
  storeDoor!: Door;
  exitDoor!: THREE.Group;
  private exitHandle = new THREE.Vector3();
  private exitShake = 0;
  private bulbOut = 0;
  private shadowProxy: THREE.PointLight | null = null;
  private proxyFor = -1;
  private readonly farAway = new THREE.Vector3(0, -100, 0);

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
    this.player = new Player(this.physics, this.input, this.audio, this.scene, new THREE.Vector3(0.05, 0, CORRIDOR.z0 + 5.33));
    this.player.camera.add(this.audio.listener);
    this.renderer = new Renderer(this.canvas, this.scene, this.player.camera);
    this.assets.anisotropy = Math.min(Q.anisotropy, this.renderer.renderer.capabilities.getMaxAnisotropy());

    total = 4;
    this.level = await new Level(this.physics, this.assets).build();
    this.scene.add(this.level.group);
    tick('level');

    // windows (west and north walls): built facing +z at the origin, then placed/turned
    [WIN_A, WIN_B, WIN_C].forEach((o) => {
      const w = buildWindow(-(o.a1 - o.a0) / 2, (o.a1 - o.a0) / 2, o.y0, o.y1, 0);
      if (o.along === 'z') w.group.position.set(o.at, 0, (o.a0 + o.a1) / 2);
      else w.group.position.set((o.a0 + o.a1) / 2, 0, o.at);
      w.group.rotation.y = o.along === 'z' ? Math.PI / 2 : 0;
      this.scene.add(w.group);
    });

    const wood = this.level.mats.trim;
    this.door = new Door(this.physics, wood, { hinge: new THREE.Vector3(DOOR.x0 + 0.005, 0, DIV_Z - 0.05), width: DOOR.x1 - DOOR.x0, height: DOOR.h, baseYaw: 0, openSign: 1 });
    // door 9 at the end of the east hall: down to the store, same kind of door as the one from the basement — shut
    const storeDoor = this.storeDoor = new Door(this.physics, wood, { hinge: new THREE.Vector3(STORE_DOOR.at + 0.04, 0, STORE_DOOR.a0 + 0.005), width: STORE_DOOR.a1 - STORE_DOOR.a0, height: STORE_DOOR.y1, baseYaw: -Math.PI / 2, openSign: 1 });
    // bathroom: left ajar, opening into the dark
    const bathDoor = new Door(this.physics, wood, { hinge: new THREE.Vector3(BATH_DOOR.a0 + 0.005, 0, -3.3), width: BATH_DOOR.a1 - BATH_DOOR.a0, height: BATH_DOOR.y1, baseYaw: 0, openSign: -1, angle: 0.6 });
    // the front entrance: grand double doors at the end of the narrow passage (locked)
    const exit = this.exitDoor = buildGrandDoor(this.physics, this.level.mats.woodFloor, EXIT_DOOR.a0, EXIT_DOOR.a1, EXIT_DOOR.y1, EXIT_DOOR.at - 0.06);
    this.exitHandle.set((EXIT_DOOR.a0 + EXIT_DOOR.a1) / 2, 1.0, EXIT_DOOR.at);
    this.scene.add(this.door.pivot, storeDoor.pivot, bathDoor.pivot, exit);

    const [furn] = await Promise.all([
      furnish(this.assets, this.physics, this.level.group),
      this.audio.preload(SOUNDS),
    ]);
    this.furn = furn;
    tick('props');

    if (Q.shadowProxy) {
      const pl = new THREE.PointLight(0xffffff, 0, 6, 2);
      pl.castShadow = true;
      pl.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
      pl.shadow.bias = -0.0015;
      pl.shadow.normalBias = 0.03;
      pl.shadow.camera.near = 0.05;
      this.scene.add(pl);
      this.shadowProxy = pl;
    }

    // ambient fill so nothing is pure black
    this.scene.add(new THREE.HemisphereLight(0x383a34, 0x12100c, 0.1));

    // hands + roaches
    const [arms, roachA, roachB] = await Promise.all([
      this.assets.model('/models/hands_bugs/male_hand_scan.glb'),
      this.assets.model('/models/hands_bugs/american_cockroach_walk.glb'),
      this.assets.model('/models/hands_bugs/cockroach_xcellf.glb'),
    ]);
    this.hands = new Hands();
    if (arms) await this.hands.load(arms, this.player.camera);
    this.roaches = new Cockroaches(this.scene, this.audio);
    const cbox = new THREE.Box3(new THREE.Vector3(CORRIDOR.x0, 0, CORRIDOR.z0 + 0.18), new THREE.Vector3(CORRIDOR.x1, CORRIDOR.h, CORRIDOR.z1 - 0.1));
    // a few start inside the wake-up view (floor ahead, both walls) so they're seen while looking at the hand
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const introStarts = [
      { p: V(CORRIDOR.x0, 0.7, CORRIDOR.z0 + 4.23), n: V(1, 0, 0) }, { p: V(CORRIDOR.x0, 0.42, CORRIDOR.z0 + 3.83), n: V(1, 0, 0) },
      { p: V(-0.25, 0, CORRIDOR.z0 + 3.58), n: V(0, 1, 0) }, { p: V(0.05, 0, CORRIDOR.z0 + 3.18), n: V(0, 1, 0) },
    ];
    if (roachA) this.roaches.spawn(roachA, 4, cbox, ['x', 'y'], 0.05, 0, introStarts);
    if (roachA) this.roaches.spawn(roachA, 3, cbox, ['x', 'y'], 0.042);
    if (roachB) this.roaches.spawn(roachB, 3, cbox, ['x', 'y'], 0.036);
    if (roachA) this.roaches.spawn(roachA, 2, new THREE.Box3(new THREE.Vector3(-0.95, 0, -3.4), new THREE.Vector3(0.95, 3, -0.3)), ['x'], 0.045);
    tick('creatures');

    this.drips = new Drips(this.scene, this.audio, this.scene);
    if (this.furn.fan) this.audio.play3D('fan_creak', this.furn.fan.root, 0.55, { loop: true, ref: 1.6 });

    this.bakeProbes();
    // positional loops
    const clock = this.furn.props.get('clock');
    if (clock) this.audio.play3D('clock_tick', clock, 0.45, { loop: true, ref: 0.8 });
    const cage = this.furn.props.get('cageLamp');
    if (cage) this.audio.play3D('light_buzz', cage, 0.12, { loop: true, ref: 0.5 });
    this.audio.play3D('wind_window', new THREE.Vector3(WIN_A.at - 0.3, 1.8, (WIN_A.a0 + WIN_A.a1) / 2), 0.35, { loop: true, ref: 1.2, scene: this.scene });
    this.audio.play3D('wind_window', new THREE.Vector3(WIN_B.at - 0.3, 1.8, (WIN_B.a0 + WIN_B.a1) / 2), 0.25, { loop: true, ref: 1.2, scene: this.scene, rate: 0.9 });

    // warm-up: compile shaders & first frames before the curtain lifts
    this.renderer.renderer.compile(this.scene, this.player.camera);
    tick('ready');
    onProgress(1, '');
  }

  /** Bake two reflection probes (corridor & room) so wet concrete and polished wood reflect their surroundings. */
  private bakeProbes() {
    const r = this.renderer.renderer;
    const pmrem = new THREE.PMREMGenerator(r);
    const bake = (pos: THREE.Vector3) => {
      const rt = new THREE.WebGLCubeRenderTarget(Q.probeSize, { type: THREE.HalfFloatType });
      const cam = new THREE.CubeCamera(0.05, 30, rt);
      cam.position.copy(pos);
      this.scene.add(cam);
      this.hands.rig.visible = false;
      cam.update(r, this.scene);
      cam.removeFromParent();
      const env = pmrem.fromCubemap(rt.texture).texture;
      rt.dispose();
      return env;
    };
    const room = bake(new THREE.Vector3(2.5, 1.5, -4.5));
    const corr = bake(new THREE.Vector3(0, 1.3, CORRIDOR.z0 + 2.9));
    this.scene.environment = room;
    this.scene.environmentIntensity = 0.45; // probes add reflections, not flat fill light
    const setEnv = (m: THREE.Mesh, env: THREE.Texture) => {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mm) => { if ((mm as THREE.MeshStandardMaterial).isMeshStandardMaterial) (mm as THREE.MeshStandardMaterial).envMap = env; });
    };
    this.level.corridorMeshes.forEach((m) => setEnv(m, corr));
    this.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.position.z > DIV_Z + 0.3 && o.parent === this.scene) setEnv(o as THREE.Mesh, corr); });
  }

  start() {
    this.running = true;
    this.audio.resume();
    this.introT = 0;
    this.ambC = this.audio.play2D('corridor_ambience', 0.0, true);
    this.ambR = this.audio.play2D('room_ambience', 0.0, true);
    this.audio.play2D('heartbeat', 0.5, false, 1.0);
    this.player.control = 0;
    this.player.eye = 0.78;
    this.player.pitch = -0.26;
    this.player.yaw = 0.12;
    this.player.camera.fov = 40;
    this.player.camera.updateProjectionMatrix();
    this.renderer.setBlur(1);
    this.ui.setLids(0);
    this.clock.start();
    this.loop();
  }

  /** Dev helpers (used by automated screenshots). */
  debugView(x: number, z: number, yaw: number, pitch: number, eye = 1.62) {
    this.introT = -1;
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
  debugIntro(t: number) { this.introT = t; }

  setPaused(p: boolean) { this.paused = p; if (!p) this.clock.getDelta(); }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    if (!this.running || this.paused) { this.input.endFrame(); return; }
    this.time += dt;
    sharedUniforms.uTime.value = this.time;

    if (this.introT >= 0) this.updateIntro(dt);
    this.player.update(dt);
    this.physics.step(dt);
    this.updateInteract(dt);
    this.door.update(dt);
    this.storeDoor.update(dt);
    this.hands.update(dt);
    this.drips.update(dt);
    // roaches only react once the player can move (they keep crawling around the waking player)
    this.roaches.update(dt, this.player.control > 0.5 ? this.player.position : this.farAway);
    this.updateLights(dt);
    this.updateAmbience(dt);
    this.renderer.render(dt);
    this.input.endFrame();
  };

  // ------------------------------------------------------------------ wake-up cinematic
  /**
   * Gasping awake on the corridor floor. Eyes flutter open on an extreme close-up of the right hand
   * (narrow FOV), focus pulls in, the hand turns and flexes as if unfamiliar, then drops away and the
   * view widens before the player stands. The hand stays framed so the scan's wrist cut is never seen.
   */
  private updateIntro(dt: number) {
    const t = (this.introT += dt);
    const P = this.player, H = this.hands;
    const once = (at: number) => t > at && t - dt <= at;

    // heavy breathing: gasps that slowly calm down
    const gasps: [number, number, number][] = [[0.2, 0.75, 1.08], [2.3, 0.7, 1.04], [4.5, 0.6, 1.0], [6.8, 0.5, 0.97], [9.2, 0.4, 0.94], [11.7, 0.28, 0.9]];
    for (const [at, vol, rate] of gasps) if (once(at)) this.audio.play2D('breath_wake', vol, false, rate);
    const amp = THREE.MathUtils.lerp(1, 0.25, seg(t, 0, 13));
    const breath = Math.sin((t / 2.25) * Math.PI * 2);

    // eyelids: closed → flutter → heavy blink → open
    let lid = 0;
    if (t > 1.4) lid = 0.3 * seg(t, 1.4, 2.0);
    if (t > 2.0) lid = 0.3 - 0.28 * seg(t, 2.0, 2.15);
    if (t > 2.15) lid = 0.02 + 0.55 * seg(t, 2.15, 2.9);
    if (t > 3.3) lid = 0.57 - 0.5 * seg(t, 3.3, 3.45);
    if (t > 3.45) lid = 0.07 + 0.93 * seg(t, 3.45, 4.8);
    this.ui.setLids(lid);

    // focus pulls onto the hand; slight focus "hunting" while dazed
    const blur = 1 - seg(t, 2.2, 6.8);
    this.renderer.setBlur(Math.max(0, blur + Math.sin(t * 1.9) * 0.08 * blur));
    this.renderer.vignette.darkness = 0.55 + (1 - seg(t, 2, 9)) * 0.3;
    this.renderer.exposure.brightness = -0.22 * (1 - seg(t, 1.5, 7));

    // camera: sitting slumped against the end wall, zoomed in, chest heaving
    P.camera.fov = THREE.MathUtils.lerp(40, 70, seg(t, 11.3, 13.4));
    P.camera.updateProjectionMatrix();
    P.yaw = 0.12;
    P.pitch = -0.26 + breath * 0.016 * amp + Math.sin(t * 0.7) * 0.01;

    // hand: close-up, trembling with the breath
    H.setVisible(t < 11.3);
    H.target.set(0.06, -0.095 + breath * 0.005 * amp, -0.265);
    H.target.x += Math.sin(t * 6.1) * 0.0012 * amp + Math.sin(t * 1.3) * 0.003;
    H.target.y += Math.sin(t * 7.7) * 0.001 * amp;
    H.pole.set(1, -1.2, 0.4);
    H.f.set(-0.1, 1, -0.05).normalize();
    H.b.set(0, 0.02, -1).normalize();
    // wrist: palm → back of hand → palm
    H.roll = 1.5 * seg(t, 5.4, 7.3) - 2.2 * seg(t, 7.6, 9.4) + 0.7 * seg(t, 9.6, 10.6);
    // fingers: limp → sequential flex wave → slow fist → open
    const wave = seg(t, 6.4, 6.9) * (1 - seg(t, 8.4, 8.8));
    const fist = seg(t, 8.9, 9.7) * (1 - seg(t, 10.1, 10.8));
    H.curls = [0, 1, 2, 3, 4].map((i) => {
      const limp = 0.16 + Math.min(i, 3) * 0.015 + breath * 0.02 * amp;
      const w = 0.5 * (1 + Math.sin(t * 5.2 - i * 0.9)) * 0.7;
      return Math.max(limp + wave * w, fist * (i === 4 ? 0.8 : 1.0));
    });

    // stand up
    const st = seg(t, 13, 15.2);
    P.eye = THREE.MathUtils.lerp(0.78, 1.62, st);
    if (t > 11.3) P.pitch = THREE.MathUtils.lerp(-0.26, 0, seg(t, 11.3, 15.2)) + breath * 0.01 * amp;
    if (t > 15.2) {
      this.introT = -1;
      P.control = 1;
      P.lookEnabled = true;
      this.ui.crosshair(true);
      this.ui.hint('WASD move · Mouse look · E interact · Shift run · C crouch', 7);
    }
  }

  // ------------------------------------------------------------------ interaction
  /** Only interaction: open the first door with E (no visible hand — latch, then swing). */
  private updateInteract(dt: number) {
    const P = this.player;
    if (this.doorT >= 0) {
      const t0 = this.doorT;
      this.doorT += dt;
      if (t0 < 0.25 && this.doorT >= 0.25) {
        this.door.open();
        this.audio.play3D('door_creak', this.door.handle, 0.9, { ref: 0.8, rate: 0.85 });
      }
      if (this.doorT > 0.5) this.doorT = -1;
      return;
    }
    // the door swings shut behind the player once they are inside, and is locked from then on
    if (this.door.isOpen && !this.door.locked && P.position.z < DIV_Z - 1.4) {
      this.door.close();
      this.door.locked = true;
      this.audio.play3D('door_creak', this.door.handle, 0.7, { ref: 0.8, rate: 1.1 });
      window.setTimeout(() => this.audio.play3D('door_handle', this.door.handle, 0.9, { ref: 0.8, rate: 0.8 }), 1300);
    }
    if (P.control < 1) { this.ui.prompt(''); return; }
    const eye = P.eyePos(), fwd = P.forward();
    const near = (p: THREE.Vector3) => { const to = p.clone().sub(eye); return to.length() < 1.5 && to.normalize().dot(fwd) > 0.82; };
    let target: { pos: THREE.Vector3; use: () => void } | null = null;
    if (!this.door.isOpen && near(this.door.handleWorld())) {
      target = this.door.locked
        ? { pos: this.door.handleWorld(), use: () => this.lockedRattle(this.door.handle, () => this.door.rattle()) }
        : { pos: this.door.handleWorld(), use: () => { this.doorT = 0; this.audio.play3D('door_handle', this.door.handle, 0.8, { ref: 0.6 }); } };
    } else if (near(this.storeDoor.handleWorld())) {
      target = { pos: this.storeDoor.handleWorld(), use: () => this.lockedRattle(this.storeDoor.handle, () => this.storeDoor.rattle()) };
    } else if (near(this.exitHandle)) {
      target = { pos: this.exitHandle, use: () => { this.lockedRattle(this.exitDoor, () => { this.exitShake = 0.6; }); } };
    }
    this.ui.prompt(target ? '[E]  Open door' : '');
    if (target && this.input.hit('KeyE')) target.use();
    if (this.exitShake > 0) {
      this.exitShake = Math.max(0, this.exitShake - dt);
      this.exitDoor.position.z = Math.sin(this.exitShake * 60) * 0.003 * (this.exitShake / 0.6);
    }
  }

  private lockedRattle(at: THREE.Object3D, anim: () => void) {
    anim();
    this.audio.play3D(Math.random() < 0.5 ? 'door_locked_1' : 'door_locked_2', at, 0.9, { ref: 0.8, rate: 0.95 + Math.random() * 0.1 });
  }

  // ------------------------------------------------------------------ lights
  private updateLights(dt: number) {
    const t = this.time;
    const pp = this.player.position;
    this.furn.lamps.forEach((l, i) => {
      let k = 1;
      const corridor = l.tag === 'corridor';
      if (l.flicker > 0 && !(corridor && this.introT >= 0)) { // corridor bulb holds steady while waking up
        const n = Math.sin(t * 13.1 + i * 7) * Math.sin(t * 7.3 + i) * Math.sin(t * 2.1 + i * 3);
        k = 1 - l.flicker * Math.max(0, n) * 0.6;
        if (corridor) { // corridor bulb drop-outs
          if (this.bulbOut <= 0 && Math.random() < dt * 0.25) this.bulbOut = 0.05 + Math.random() * 0.25;
          if (this.bulbOut > 0) { this.bulbOut -= dt; k *= 0.05 + Math.random() * 0.15; }
        }
      }
      if (l.tag === 'leak') k = this.door.isOpen ? 0 : 1;
      l.light.intensity = l.base * k;
      if (l.glow) l.glow.visible = k > 0.25;
      // shadows only refresh near the player
      l.light.shadow.autoUpdate = l.light.position.distanceTo(pp) < 7;
    });
    this.updateFan(dt);
    if (this.shadowProxy) this.updateShadowProxy();
  }

  /** Slow, uneven ceiling-fan spin with a slight wobble (the creak loop is positional on the fan). */
  private updateFan(dt: number) {
    const f = this.furn.fan;
    if (!f?.blades) return;
    const speed = 1.1 + Math.sin(this.time * 0.37) * 0.25 + Math.sin(this.time * 1.9) * 0.08; // rad/s
    f.blades.rotation.z += speed * dt;
    f.root.rotation.x = Math.sin(this.time * speed * 1.0) * 0.012;
    f.root.rotation.z = Math.cos(this.time * speed * 1.0) * 0.012;
  }

  /**
   * `low` quality: one shadow-casting point light stands in for the strongest lamp near the player
   * (that lamp is muted while the proxy plays its part). Constant light count → no shader recompiles.
   */
  private updateShadowProxy() {
    const proxy = this.shadowProxy!;
    const p = this.player.eyePos();
    const score = (l: THREE.Light) => l.intensity / (1 + l.position.distanceToSquared(p));
    let best = this.proxyFor, bestScore = best >= 0 ? score(this.furn.lamps[best].light) * 1.3 : 0; // hysteresis
    this.furn.lamps.forEach((l, i) => {
      if (l.tag === 'leak' || l.base <= 0) return;
      const sc = score(l.light);
      if (sc > bestScore) { best = i; bestScore = sc; }
    });
    this.proxyFor = best;
    if (best < 0) { proxy.intensity = 0; return; }
    const src = this.furn.lamps[best].light;
    proxy.position.copy(src.position);
    proxy.color.copy(src.color);
    proxy.distance = src.distance;
    proxy.decay = src.decay;
    proxy.intensity = src.intensity;
    src.intensity = 0;
  }

  private updateAmbience(dt: number) {
    const z = this.player.position.z;
    const inRoom = THREE.MathUtils.clamp(0.5 - (z - DIV_Z) / 1.5, 0, 1);
    const fade = this.introT >= 0 ? seg(this.introT, 1.5, 6) : 1;
    if (this.ambC) this.ambC.setVolume(THREE.MathUtils.lerp(this.ambC.getVolume(), 0.5 * (1 - inRoom * 0.8) * fade, dt * 2));
    if (this.ambR) this.ambR.setVolume(THREE.MathUtils.lerp(this.ambR.getVolume(), 0.45 * (0.2 + inRoom * 0.8) * fade, dt * 2));
  }
}
