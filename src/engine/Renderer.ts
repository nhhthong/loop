import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, NoiseEffect, ToneMappingEffect,
  ToneMappingMode, ChromaticAberrationEffect, SMAAEffect, BlendFunction, DepthOfFieldEffect, BrightnessContrastEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { Q } from './Quality';

/** Renderer + cinematic post stack (AO → DOF → bloom → tonemap → grain/vignette/CA). */
export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  readonly dof: DepthOfFieldEffect;
  readonly vignette: VignetteEffect;
  readonly chroma: ChromaticAberrationEffect;
  readonly exposure: BrightnessContrastEffect;
  readonly ao: N8AOPostPass;
  private readonly bloom: BloomEffect;

  constructor(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const r = new THREE.WebGLRenderer({
      canvas, antialias: false, stencil: false, depth: true, powerPreference: 'high-performance',
    });
    r.setPixelRatio(Q.pixelRatio);
    r.setSize(window.innerWidth, window.innerHeight);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping; // done in post
    r.shadowMap.enabled = Q.shadows;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;

    const composer = new EffectComposer(r, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    composer.addPass(new RenderPass(scene, camera));

    const ao = new N8AOPostPass(scene, camera, window.innerWidth, window.innerHeight);
    ao.configuration.aoRadius = 0.6;
    ao.configuration.distanceFalloff = 0.4;
    ao.configuration.intensity = 3.2;
    ao.configuration.halfRes = true;
    ao.configuration.denoiseSamples = 8;
    ao.configuration.color = new THREE.Color(0, 0, 0);
    ao.setQualityMode(Q.aoQuality);
    if (Q.ao) composer.addPass(ao);
    this.ao = ao;

    this.dof = new DepthOfFieldEffect(camera, { focusDistance: 0.02, focalLength: 0.05, bokehScale: 0, height: 480 });
    this.bloom = new BloomEffect({ intensity: 0.9, luminanceThreshold: 0.75, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.75 });
    this.chroma = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0006, 0.0006), radialModulation: true, modulationOffset: 0.3 });
    this.vignette = new VignetteEffect({ offset: 0.28, darkness: 0.72 });
    this.exposure = new BrightnessContrastEffect({ brightness: 0, contrast: 0.06 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    noise.blendMode.opacity.value = 0.12;

    if (Q.dof) composer.addPass(new EffectPass(camera, this.dof));
    composer.addPass(Q.bloom ? new EffectPass(camera, this.bloom, tone, this.exposure, this.chroma) : new EffectPass(camera, tone, this.exposure));
    composer.addPass(Q.smaa ? new EffectPass(camera, this.vignette, noise, new SMAAEffect()) : new EffectPass(camera, this.vignette, noise));
    this.composer = composer;

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      r.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /** 0 = sharp, 1 = very blurry (used for the wake-up). */
  setBlur(amount: number) {
    this.dof.bokehScale = amount * 9;
    this.dof.cocMaterial.focusDistance = 0.0;
    this.dof.cocMaterial.focalLength = THREE.MathUtils.lerp(0.4, 0.004, amount);
  }

  render(dt: number) {
    this.composer.render(dt);
  }
}
