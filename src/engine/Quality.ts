/**
 * Graphics presets. Chosen via `?q=low|medium|high`, else the last menu choice (localStorage), else medium.
 * `low` is light enough for software rendering (headless screenshots): no shadows, no AO/DOF/bloom, 1K textures.
 */
export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualitySettings {
  level: QualityLevel;
  pixelRatio: number;
  shadows: boolean;
  shadowMap: number;
  ao: boolean;
  aoQuality: 'Performance' | 'Low' | 'Medium';
  dof: boolean;
  bloom: boolean;
  smaa: boolean;
  /** Poly Haven texture folder suffix: '' = 2K, '/1k' = 1K */
  texDir: string;
  probeSize: number;
  dust: number;
  anisotropy: number;
}

const PRESETS: Record<QualityLevel, Omit<QualitySettings, 'level'>> = {
  low: { pixelRatio: 0.6, shadows: false, shadowMap: 256, ao: false, aoQuality: 'Performance', dof: false, bloom: false, smaa: false, texDir: '/1k', probeSize: 64, dust: 300, anisotropy: 1 },
  medium: { pixelRatio: 1, shadows: true, shadowMap: 512, ao: true, aoQuality: 'Low', dof: true, bloom: true, smaa: true, texDir: '', probeSize: 128, dust: 900, anisotropy: 4 },
  high: { pixelRatio: Math.min(window.devicePixelRatio, 2), shadows: true, shadowMap: 1024, ao: true, aoQuality: 'Medium', dof: true, bloom: true, smaa: true, texDir: '', probeSize: 256, dust: 1400, anisotropy: 16 },
};

const KEY = 'loop.quality';

function pick(): QualityLevel {
  const isLevel = (v: string | null): v is QualityLevel => v === 'low' || v === 'medium' || v === 'high';
  const url = new URLSearchParams(location.search).get('q');
  if (isLevel(url)) return url;
  try { const s = localStorage.getItem(KEY); if (isLevel(s)) return s; } catch { /* storage blocked */ }
  return 'medium';
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
