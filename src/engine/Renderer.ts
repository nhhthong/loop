import * as THREE from 'three';
import {
  Effect,
  EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, NoiseEffect, ToneMappingEffect,
  ToneMappingMode, ChromaticAberrationEffect, SMAAEffect, BlendFunction, DepthOfFieldEffect, BrightnessContrastEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { Q } from './Quality';

/** Desaturated, warm-grey grade with lifted-then-crushed blacks (bleach-bypass-ish). */
class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', /* glsl */`
      uniform float saturation; uniform vec3 tint; uniform float lift; uniform float gamma;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, saturation) * tint;
        c = max(c + lift * (1.0 - c), 0.0);
        c = pow(c, vec3(gamma));
        outputColor = vec4(c, inputColor.a);
      }`, {
      uniforms: new Map<string, THREE.Uniform>([
        ['saturation', new THREE.Uniform(0.22)],
        ['tint', new THREE.Uniform(new THREE.Color(1.0, 0.95, 0.86))],
        ['lift', new THREE.Uniform(-0.015)],
        ['gamma', new THREE.Uniform(1.12)],
      ]),
    });
  }
}

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
    r.shadowMap.enabled = Q.shadows || Q.shadowProxy;
    r.shadowMap.type = THREE.PCFShadowMap; // crisp, hard-edged shadows
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
    this.bloom = new BloomEffect({ intensity: 1.3, luminanceThreshold: 0.6, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.8 });
    this.chroma = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0013, 0.0013), radialModulation: true, modulationOffset: 0.3 });
    this.vignette = new VignetteEffect({ offset: 0.22, darkness: 0.85 });
    this.exposure = new BrightnessContrastEffect({ brightness: 0, contrast: 0.06 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    noise.blendMode.opacity.value = 0.2;
    const grade = new GradeEffect();

    if (Q.dof) composer.addPass(new EffectPass(camera, this.dof));
    composer.addPass(Q.bloom ? new EffectPass(camera, this.bloom, tone, grade, this.exposure, this.chroma) : new EffectPass(camera, tone, grade, this.exposure, this.chroma));
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
