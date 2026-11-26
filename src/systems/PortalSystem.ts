import * as THREE from 'three';
import type { System } from '../core/System';
import type { Player } from '../player/Player';
import type { Renderer } from '../engine/Renderer';
import { Q } from '../engine/Quality';

/**
 * A doorway that shows (and leads to) another place. While `active`, the scene is rendered into a target from a
 * virtual camera = `map` × player camera, and a plane filling the doorway shows it in screen space — the real scene,
 * lights and all. Crossing the plane moves the player through `map` (`crossed`), so there is no visible cut.
 */
export class PortalSystem implements System {
  readonly map: THREE.Matrix4;
  private readonly cam = new THREE.PerspectiveCamera();
  private readonly target: THREE.WebGLRenderTarget;
  private readonly plane: THREE.Mesh;
  private readonly size = new THREE.Vector2();
  private readonly rtSize = new THREE.Vector2();

  /**
   * @param plane  doorway rectangle in world space: centre, width (along the wall), height, normal pointing *through* it
   * @param isOpen portal works while this holds (e.g. the door leaf is open and the player is on this side)
   * @param onCross after the player has been moved through
   */
  constructor(
    private readonly renderer: Renderer,
    private readonly player: Player,
    scene: THREE.Scene,
    map: THREE.Matrix4,
    private readonly yaw: number,
    private readonly door: { centre: THREE.Vector3; width: number; height: number; normal: THREE.Vector3 },
    private readonly isOpen: () => boolean,
    private readonly onCross: () => void,
  ) {
    this.map = map;
    this.cam.matrixAutoUpdate = false;
    this.cam.matrixWorldAutoUpdate = false;
    renderer.renderer.getDrawingBufferSize(this.size);
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const mat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: this.target.texture }, uSize: { value: this.size } },
      vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tMap; uniform vec2 uSize; void main(){ gl_FragColor = texture2D(tMap, gl_FragCoord.xy / uSize); }',
      toneMapped: false,
    });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(door.width, door.height), mat);
    this.plane.position.copy(door.centre);
    this.plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), door.normal.clone().negate()); // faces the viewer
    this.plane.visible = false;
    scene.add(this.plane);
    renderer.beforeRender.push(() => this.render(scene));
  }

  get active() { return this.plane.visible; }

  /** where the virtual camera is (the player's eye carried through the portal), or null when closed */
  viewPoint(): THREE.Vector3 | null { return this.plane.visible ? this.player.eyePos().applyMatrix4(this.map) : null; }

  update() {
    this.plane.visible = this.isOpen();
    if (!this.plane.visible) return;
    // crossed the doorway plane?
    const p = this.player.eyePos().sub(this.door.centre);
    if (p.dot(this.door.normal) > -0.02) {
      this.player.transport(this.map, this.yaw);
      this.plane.visible = false;
      this.onCross();
    }
  }

  private render(scene: THREE.Scene) {
    if (!this.plane.visible) return;
    const r = this.renderer.renderer, main = this.player.camera;
    r.getDrawingBufferSize(this.size);
    this.rtSize.copy(this.size).multiplyScalar(Q.portalScale).round();
    if (this.target.width !== this.rtSize.x || this.target.height !== this.rtSize.y) this.target.setSize(this.rtSize.x, this.rtSize.y);
    main.updateMatrixWorld();
    this.cam.projectionMatrix.copy(main.projectionMatrix);
    this.cam.projectionMatrixInverse.copy(main.projectionMatrixInverse);
    this.cam.matrixWorld.multiplyMatrices(this.map, main.matrixWorld);
    this.cam.matrixWorldInverse.copy(this.cam.matrixWorld).invert();
    const shadows = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false; // reuse this frame's shadow maps
    this.plane.visible = false;
    r.setRenderTarget(this.target);
    r.render(scene, this.cam);
    r.setRenderTarget(null);
    this.plane.visible = true;
    r.shadowMap.autoUpdate = shadows;
  }
}
