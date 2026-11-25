/** Keyboard + pointer-lock mouse input. */
export class Input {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  locked = false;
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
  endFrame() { this.pressed.clear(); this.mouseDX = 0; this.mouseDY = 0; }
}
