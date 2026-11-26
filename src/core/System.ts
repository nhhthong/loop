/** Anything ticked once per frame by Game, in registration order. */
export interface System {
  update(dt: number): void;
}
