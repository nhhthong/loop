/**
 * Graphics presets. Chosen via `?q=low|medium|high|mobile`; touch devices always get the fixed `mobile` profile;
 * desktop uses the last menu choice (localStorage), else low (fastest first load; Medium/High in the menu).
 * `low` is light enough for software rendering (headless screenshots): one proxy shadow, no AO/DOF/bloom, 1K textures.
 */
import { IS_TOUCH } from './Input';

export type QualityLevel = 'low' | 'medium' | 'high' | 'mobile';

export interface QualitySettings {
  level: QualityLevel;
  pixelRatio: number;
  shadows: boolean;
  /** low only: a single shadow-casting light that follows the strongest lamp near the player */
  shadowProxy: boolean;
  shadowMap: number;
  ao: boolean;
  aoQuality: 'Performance' | 'Low' | 'Medium';
  dof: boolean;
  bloom: boolean;
  smaa: boolean;
  /** Poly Haven texture folder suffix: '' = 2K, '/1k' = 1K */
  texDir: string;
  probeSize: number;
  anisotropy: number;
  /** >0: only this many scene point lights, fed by the most relevant lamps each frame (LightingSystem); 0 = every lamp is a light */
  lightPool: number;
  /** cheaper wet-surface noise (fewer fbm octaves) */
  wetLite: boolean;
  /** frame cap (fps); 0 = uncapped */
  fpsCap: number;
  /** adaptive pixel-ratio range [min, max] (FrameGovernor); min = max = fixed */
  scaleRange: [number, number];
  /** portal render target size relative to the drawing buffer */
  portalScale: number;
  /** max shadow maps re-rendered per frame (shadow cache, LightingSystem) */
  shadowBudget: number;
}

const DESKTOP = { lightPool: 0, wetLite: false, fpsCap: 0, portalScale: 1, shadowBudget: 3 } as const;
const fixed = (pr: number): [number, number] => [pr, pr];
const MOBILE_PR = Math.min(window.devicePixelRatio, 2);

const PRESETS: Record<QualityLevel, Omit<QualitySettings, 'level'>> = {
  low: { pixelRatio: 0.75, shadows: false, shadowProxy: true, shadowMap: 512, ao: false, aoQuality: 'Performance', dof: false, bloom: false, smaa: false, texDir: '/1k', probeSize: 64, anisotropy: 1, ...DESKTOP, lightPool: 8, scaleRange: fixed(0.75) },
  medium: { pixelRatio: Math.min(window.devicePixelRatio, 1.5), shadows: true, shadowProxy: false, shadowMap: 512, ao: true, aoQuality: 'Low', dof: true, bloom: true, smaa: true, texDir: '', probeSize: 128, anisotropy: 4, ...DESKTOP, scaleRange: fixed(Math.min(window.devicePixelRatio, 1.5)) },
  high: { pixelRatio: Math.min(window.devicePixelRatio, 2), shadows: true, shadowProxy: false, shadowMap: 1024, ao: true, aoQuality: 'Medium', dof: true, bloom: true, smaa: true, texDir: '', probeSize: 256, anisotropy: 16, ...DESKTOP, scaleRange: fixed(Math.min(window.devicePixelRatio, 2)) },
  // phones/tablets: one fixed profile tuned for a stable 30 fps — no shadows or heavy post, pooled lights, adaptive resolution
  mobile: {
    pixelRatio: MOBILE_PR * 0.8, shadows: false, shadowProxy: false, shadowMap: 512, ao: false, aoQuality: 'Performance', dof: false, bloom: false, smaa: false,
    texDir: '/512', probeSize: 64, anisotropy: 1, lightPool: 5, wetLite: true, fpsCap: 30, scaleRange: [MOBILE_PR * 0.6, MOBILE_PR], portalScale: 0.5, shadowBudget: 0,
  },
};

const KEY = 'loop.quality';

function pick(): QualityLevel {
  const isLevel = (v: string | null): v is QualityLevel => v === 'low' || v === 'medium' || v === 'high' || v === 'mobile';
  const url = new URLSearchParams(location.search).get('q');
  if (isLevel(url)) return url;
  if (IS_TOUCH) return 'mobile';
  try { const s = localStorage.getItem(KEY); if (isLevel(s)) return s; } catch { /* storage blocked */ }
  return 'low';
}

const level = pick();
export const Q: QualitySettings = { level, ...PRESETS[level] };

/** Persist a new level and reload (renderer setup is fixed at boot). */
export function setQuality(l: QualityLevel) {
  try { localStorage.setItem(KEY, l); } catch { /* storage blocked */ }
  const u = new URL(location.href);
  u.searchParams.set('q', l);
  location.href = u.toString();
}
