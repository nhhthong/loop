import { Game } from './game/Game';
import { Q, setQuality, type QualityLevel } from './engine/Quality';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const menu = document.getElementById('menu')!;
const startBtn = document.getElementById('start') as HTMLButtonElement;
const bar = document.querySelector('#bar span') as HTMLElement;
const loadText = document.getElementById('loadtext')!;
const pause = document.getElementById('pause')!;
const credits = document.getElementById('credits')!;

document.querySelectorAll<HTMLButtonElement>('#quality button').forEach((b) => {
  b.classList.toggle('on', b.dataset.q === Q.level);
  b.addEventListener('click', () => { if (b.dataset.q !== Q.level) setQuality(b.dataset.q as QualityLevel); });
});

const game = new Game(canvas);
(window as unknown as { game: Game }).game = game;

game.load((p, label) => {
  bar.style.width = `${Math.round(p * 100)}%`;
  loadText.textContent = p >= 1 ? 'Sẵn sàng' : `Đang tải… ${label}`;
}).then(() => {
  startBtn.disabled = false;
  document.title = 'LOOP';
  (window as unknown as { __ready: boolean }).__ready = true;
}).catch((e) => {
  console.error(e);
  loadText.textContent = 'Lỗi tải: ' + (e as Error).message;
});

let started = false;
startBtn.addEventListener('click', () => {
  if (started) return;
  started = true;
  menu.classList.add('gone');
  game.input.lock();
  game.start();
});

game.input.onLockChange = (locked) => {
  if (!started) return;
  pause.classList.toggle('hidden', locked);
  game.setPaused(!locked);
};
pause.addEventListener('click', () => game.input.lock());

document.getElementById('credits-link')!.addEventListener('click', async (e) => {
  e.preventDefault();
  const groups = ['hands_bugs', 'furniture', 'decor', 'architecture', 'hallway'];
  const lines: string[] = ['3D MODELS (Sketchfab)'];
  for (const g of groups) {
    try {
      const m = await (await fetch(`/models/${g}/manifest.json`)).json() as { name: string; author: string; license_label?: string; license_slug?: string; url: string; file: string }[];
      for (const x of m) lines.push(`  "${x.name}" by ${x.author} — ${x.license_label ?? x.license_slug} — ${x.url}`);
    } catch { /* ignore */ }
  }
  lines.push('', 'SOUND (Freesound, CC0)');
  try {
    const a = await (await fetch('/audio/manifest.json')).json() as { name?: string; author?: string; url?: string; item: string }[];
    for (const x of a) if (x.name) lines.push(`  ${x.item}: "${x.name}" by ${x.author ?? '?'} ${x.url ?? ''}`);
  } catch { /* ignore */ }
  lines.push('', 'TEXTURES: Poly Haven (CC0) — polyhaven.com', '', '[click to close]');
  credits.textContent = lines.join('\n');
  credits.style.whiteSpace = 'pre-wrap';
  credits.classList.remove('hidden');
});
credits.addEventListener('click', () => credits.classList.add('hidden'));
