import { WIN_A, WIN_B, type Surface } from './layout';

/** Every sound file the game uses (`/audio/<id>.mp3`). Single source of truth: preloaded at boot, `SoundId` types every call. */
export const SOUNDS = [
  'breath_wake', 'clock_tick', 'cockroach_skitter', 'corridor_ambience', 'door_creak', 'door_handle', 'door_locked_1', 'door_locked_2', 'heartbeat',
  'light_buzz', 'room_ambience', 'water_drip_1', 'water_drip_2', 'wind_window', 'fan_creak',
  'step_concrete_1', 'step_concrete_2', 'step_concrete_3', 'step_concrete_4', 'step_wood_1', 'step_wood_2', 'step_wood_3', 'step_wood_4', 'step_wood_5',
] as const;
export type SoundId = (typeof SOUNDS)[number];

export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

export const FOOTSTEPS: Record<Surface, { sounds: readonly SoundId[]; volume: number }> = {
  concrete: { sounds: ['step_concrete_1', 'step_concrete_2', 'step_concrete_3', 'step_concrete_4'], volume: 0.35 },
  wood: { sounds: ['step_wood_1', 'step_wood_2', 'step_wood_3', 'step_wood_4', 'step_wood_5'], volume: 0.45 },
};
export const DOOR_LOCKED: readonly SoundId[] = ['door_locked_1', 'door_locked_2'];
export const WATER_DRIP: readonly SoundId[] = ['water_drip_1', 'water_drip_2'];

/**
 * Looping positional sounds placed at load. `at` = a named prop / fixture (the sound follows it) or a world point.
 */
export interface EmitterSpec { sound: SoundId; at: string | [number, number, number]; volume: number; ref: number; rate?: number }
export const EMITTERS: EmitterSpec[] = [
  { sound: 'fan_creak', at: 'ceilingFan', volume: 0.55, ref: 1.6 },
  { sound: 'clock_tick', at: 'clock', volume: 0.45, ref: 0.8 },
  { sound: 'light_buzz', at: 'cageLamp', volume: 0.12, ref: 0.5 },
  { sound: 'wind_window', at: [WIN_A.at - 0.3, 1.8, (WIN_A.a0 + WIN_A.a1) / 2], volume: 0.35, ref: 1.2 },
  { sound: 'wind_window', at: [WIN_B.at - 0.3, 1.8, (WIN_B.a0 + WIN_B.a1) / 2], volume: 0.25, ref: 1.2, rate: 0.9 },
];
