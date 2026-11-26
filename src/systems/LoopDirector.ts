/**
 * Counts passes through the house. A pass ends when the player has gone down the stairwell behind door 9 and
 * steps back into R1 (the basement door shuts behind them): the loop index advances and that loop's events run.
 * Per-loop content lives in one table (`gameplay/loops.ts`); the director knows nothing about it.
 */
export class LoopDirector {
  loop = 1;
  private crossing = false;

  constructor(private readonly events: Record<number, () => void>) {}

  /** the player went through the stairwell portal */
  portalCrossed() { this.crossing = true; }

  /** the basement door shut behind the player in R1 */
  enteredHouse() {
    if (!this.crossing) return;
    this.crossing = false;
    this.loop++;
    this.events[this.loop]?.();
  }
}
