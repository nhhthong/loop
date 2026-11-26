import { Game } from './game/Game';
import { assetUrl } from './engine/Assets';
import { Q, setQuality, type QualityLevel } from './engine/Quality';
import { IS_TOUCH } from './engine/Input';
import { TouchControls } from './ui/TouchControls';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const menu = document.getElementById('menu')!;
const startBtn = document.getElementById('start') as HTMLButtonElement;
const bar = document.querySelector('#bar span') as HTMLElement;
const loadText = document.getElementById('loadtext')!;
const pause = document.getElementById('pause')!;
const credits = document.getElementById('credits')!;

document.getElementById('quality')!.classList.toggle('hidden', Q.level === 'mobile'); // one fixed profile on phones
document.querySelectorAll<HTMLButtonElement>('#quality button').forEach((b) => {
  b.classList.toggle('on', b.dataset.q === Q.level);
  b.addEventListener('click', () => { if (b.dataset.q !== Q.level) setQuality(b.dataset.q as QualityLevel); });
});

const game = new Game(canvas);
(window as unknown as { game: Game }).game = game;

game.load((p, label) => {
  bar.style.width = `${Math.round(p * 100)}%`;
  loadText.textContent = p >= 1 ? 'Ready' : `Loading… ${label}`;
}).then(() => {
  startBtn.disabled = false;
  document.title = 'LOOP';
  (window as unknown as { __ready: boolean }).__ready = true;
}).catch((e) => {
  console.error(e);
  loadText.textContent = 'Failed to load: ' + (e as Error).message;
});

let started = false;
// touch devices: on-screen controls, fullscreen landscape, explicit pause (no pointer lock)
const touch = IS_TOUCH ? new TouchControls(game.input) : null;
document.body.classList.toggle('touch', IS_TOUCH);
const setPausedUI = (p: boolean) => {
  pause.classList.toggle('hidden', !p);
  touch?.show(!p);
  game.setPaused(p);
};

startBtn.addEventListener('click', () => {
  if (started) return;
  started = true;
  menu.classList.add('gone');
  if (touch) {
    void document.documentElement.requestFullscreen?.().then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape')).catch(() => {});
    touch.show(true);
  } else game.input.lock();
  game.start();
});

if (touch) {
  touch.onPause = () => setPausedUI(true);
  document.addEventListener('visibilitychange', () => { if (started && document.hidden) setPausedUI(true); });
  pause.addEventListener('click', () => setPausedUI(false));
} else {
  game.input.onLockChange = (locked) => { if (started) setPausedUI(!locked); };
  pause.addEventListener('click', () => game.input.lock());
}

document.getElementById('credits-link')!.addEventListener('click', async (e) => {
  e.preventDefault();
  const groups = ['hands_bugs', 'furniture', 'decor', 'architecture', 'hallway', 'modern', 'house'];
  const lines: string[] = ['3D MODELS (Sketchfab)'];
  for (const g of groups) {
    try {
      const m = await (await fetch(assetUrl(`/models/${g}/manifest.json`))).json() as { name: string; author: string; license_label?: string; license_slug?: string; url: string; file: string }[];
      for (const x of m) lines.push(`  "${x.name}" by ${x.author} — ${x.license_label ?? x.license_slug} — ${x.url}`);
    } catch { /* ignore */ }
  }
  lines.push('', 'SOUND (Freesound, CC0)');
  try {
    const a = await (await fetch(assetUrl('/audio/manifest.json'))).json() as { name?: string; author?: string; url?: string; item: string }[];
    for (const x of a) if (x.name) lines.push(`  ${x.item}: "${x.name}" by ${x.author ?? '?'} ${x.url ?? ''}`);
  } catch { /* ignore */ }
  lines.push('', 'TEXTURES: Poly Haven (CC0) — polyhaven.com', '', '[click to close]');
  credits.textContent = lines.join('\n');
  credits.style.whiteSpace = 'pre-wrap';
  credits.classList.remove('hidden');
});
credits.addEventListener('click', () => credits.classList.add('hidden'));
