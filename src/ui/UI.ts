/** DOM overlay: eyelids, prompt, subtitles, hints. */
export class UI {
  private top = document.querySelector('#eyelids .top') as HTMLElement;
  private bottom = document.querySelector('#eyelids .bottom') as HTMLElement;
  private promptEl = document.getElementById('prompt')!;
  private subEl = document.getElementById('subtitle')!;
  private hintEl = document.getElementById('hint')!;
  private crossEl = document.getElementById('crosshair')!;
  private subTimer = 0;
  private hintTimer = 0;

  /** 0 = closed, 1 = fully open */
  setLids(open: number) {
    const o = Math.max(0, Math.min(1, open));
    const off = o * 62; // % each lid slides away
    this.top.style.transform = `translateY(${-off}%)`;
    this.bottom.style.transform = `translateY(${off}%)`;
    (this.top.parentElement as HTMLElement).style.display = o >= 1 ? 'none' : 'block';
  }

  prompt(text: string) {
    if (text) this.promptEl.textContent = text;
    this.promptEl.classList.toggle('on', !!text);
  }

  subtitle(text: string, seconds: number) {
    this.subEl.textContent = text;
    this.subEl.classList.add('on');
    clearTimeout(this.subTimer);
    this.subTimer = window.setTimeout(() => this.subEl.classList.remove('on'), seconds * 1000);
  }

  hint(text: string, seconds: number) {
    this.hintEl.textContent = text;
    this.hintEl.classList.add('on');
    clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => this.hintEl.classList.remove('on'), seconds * 1000);
  }

  crosshair(on: boolean) { this.crossEl.classList.toggle('on', on); }
}
