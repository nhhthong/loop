import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Q } from './Quality';

/** Root-relative asset path ('/models/x.glb') → URL under the deploy base (GitHub Pages serves the game from a sub-path). */
export const assetUrl = (path: string) => (path.startsWith('/') ? import.meta.env.BASE_URL + path.slice(1) : path);

/** Central asset cache with progress reporting. Missing files resolve to null (game keeps running). */
export class Assets {
  private readonly manager = new THREE.LoadingManager();
  private readonly gltf: GLTFLoader;
  private readonly tex: THREE.TextureLoader;
  private readonly audio: THREE.AudioLoader;
  private readonly cache = new Map<string, Promise<unknown>>();
  anisotropy = Q.anisotropy;
  onProgress: (loaded: number, total: number, url: string) => void = () => {};

  constructor() {
    this.manager.onProgress = (url, loaded, total) => this.onProgress(loaded, total, url);
    this.manager.setURLModifier(assetUrl);
    this.gltf = new GLTFLoader(this.manager);
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    this.gltf.setDRACOLoader(draco);
    this.tex = new THREE.TextureLoader(this.manager);
    this.audio = new THREE.AudioLoader(this.manager);
  }

  model(url: string): Promise<GLTF | null> {
    return this.memo(url, () => this.gltf.loadAsync(url).catch((e) => { console.warn('model missing', url, e); return null; }));
  }

  texture(url: string, srgb = false, repeat = true): Promise<THREE.Texture> {
    return this.memo(url + srgb, () => this.tex.loadAsync(url).then((t) => {
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = this.anisotropy;
      return t;
    }));
  }

  sound(url: string): Promise<AudioBuffer | null> {
    return this.memo(url, () => this.audio.loadAsync(url).catch(() => { console.warn('sound missing', url); return null; }));
  }

  private memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (!this.cache.has(key)) this.cache.set(key, fn());
    return this.cache.get(key) as Promise<T>;
  }
}

export interface PBRSet { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture; aoMap: THREE.Texture }

export async function loadPBR(assets: Assets, name: string): Promise<PBRSet> {
  const base = `/textures/${name}${Q.texDir}/`;
  const [map, normalMap, roughnessMap, aoMap] = await Promise.all([
    assets.texture(base + 'diff.jpg', true), assets.texture(base + 'nor.jpg'),
    assets.texture(base + 'rough.jpg'), assets.texture(base + 'ao.jpg'),
  ]);
  return { map, normalMap, roughnessMap, aoMap };
}
