/** Timeline helpers for scripted sequences (time in seconds). */

/** smoothstep on 0..1 */
export const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** eased 0→1 progress of `t` through the segment [a, b] */
export const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a));
/** true on the single frame where `t` crosses `at` (previous time = t − dt) */
export const crossed = (t: number, dt: number, at: number) => t > at && t - dt <= at;
