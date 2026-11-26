/** Touch-first device (phone/tablet): on-screen controls, no pointer lock. */
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches && 'ontouchstart' in window;

/** Keyboard + pointer-lock mouse input, plus an analog move axis and look deltas fed by touch controls. */
export class Input {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  locked = false;
  /** analog move from the touch joystick: x = strafe right, y = back (−1..1) */
  moveX = 0;
  moveY = 0;
  onLockChange: (locked: boolean) => void = () => {};

  constructor(private readonly el: HTMLElement) {
    addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el;
      this.onLockChange(this.locked);
    });
  }

  lock() { this.el.requestPointerLock?.(); }
  down(code: string) { return this.keys.has(code); }
  /** True once per key press. */
  hit(code: string) { return this.pressed.has(code); }
  /** Inject a one-frame key press (touch buttons). */
  press(code: string) { this.pressed.add(code); }
  /** Inject look movement in mouse pixels (touch drag). */
  look(dx: number, dy: number) { this.mouseDX += dx; this.mouseDY += dy; }
  endFrame() { this.pressed.clear(); this.mouseDX = 0; this.mouseDY = 0; }
}
