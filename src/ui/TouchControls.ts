import type { Input } from '../engine/Input';

const STICK_R = 56; // px: knob travel radius
const LOOK_GAIN = 1.6; // touch px → mouse px (look sensitivity)

/**
 * Minimal on-screen controls for touch devices: left virtual stick (move), drag anywhere else to look,
 * an E button (interact) and a pause button. Feeds `Input` only; knows nothing about the game.
 */
export class TouchControls {
  readonly root = document.createElement('div');
  onPause: () => void = () => {};
  private stickId = -1;
  private lookId = -1;
  private lookX = 0;
  private lookY = 0;
  private cx = 0;
  private cy = 0;

  constructor(private readonly input: Input) {
    this.root.id = 'touch';
    this.root.innerHTML = `
      <div id="t-look"></div>
      <div id="t-stick"><div id="t-knob"></div></div>
      <button id="t-use" aria-label="Interact">E</button>
      <button id="t-pause" aria-label="Pause"><span></span><span></span></button>`;
    document.body.appendChild(this.root);
    const $ = (id: string) => this.root.querySelector<HTMLElement>(id)!;
    const stick = $('#t-stick'), knob = $('#t-knob'), look = $('#t-look');

    stick.addEventListener('pointerdown', (e) => {
      if (this.stickId >= 0) return;
      this.stickId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      const r = stick.getBoundingClientRect();
      this.cx = r.left + r.width / 2; this.cy = r.top + r.height / 2;
      this.moveStick(e, knob);
    });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === this.stickId) this.moveStick(e, knob); });
    const endStick = (e: PointerEvent) => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = -1;
      this.input.moveX = this.input.moveY = 0;
      knob.style.transform = '';
    };
    stick.addEventListener('pointerup', endStick);
    stick.addEventListener('pointercancel', endStick);

    look.addEventListener('pointerdown', (e) => {
      if (this.lookId >= 0) return;
      this.lookId = e.pointerId;
      look.setPointerCapture(e.pointerId);
      this.lookX = e.clientX; this.lookY = e.clientY;
    });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.input.look((e.clientX - this.lookX) * LOOK_GAIN, (e.clientY - this.lookY) * LOOK_GAIN);
      this.lookX = e.clientX; this.lookY = e.clientY;
    });
    const endLook = (e: PointerEvent) => { if (e.pointerId === this.lookId) this.lookId = -1; };
    look.addEventListener('pointerup', endLook);
    look.addEventListener('pointercancel', endLook);

    $('#t-use').addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.press('KeyE'); });
    // on click (after release), so the tap that pauses doesn't also land on the pause overlay and resume
    $('#t-pause').addEventListener('click', () => this.onPause());
  }

  show(v: boolean) { this.root.classList.toggle('on', v); }

  private moveStick(e: PointerEvent, knob: HTMLElement) {
    let dx = e.clientX - this.cx, dy = e.clientY - this.cy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.input.moveX = dx / STICK_R;
    this.input.moveY = dy / STICK_R;
  }
}
