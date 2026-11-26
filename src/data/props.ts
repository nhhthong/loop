import type { PropSpec } from '../world/Props';
import { CORRIDOR } from './layout';

const F = '/models/furniture/', D = '/models/decor/', A = '/models/architecture/', H = '/models/hallway/', M = '/models/modern/';

/**
 * Interior dressing (layout in data/layout.ts; built by world/Furnish.ts). Model front = +Z unless noted. Wall yaw:
 * west wall (room +x) 90 · east wall (room −x) −90 · north wall (room +z) 0 · south wall (room −z) 180.
 * Natively +X-facing models (portrait, clock, credenza): west 0 · north −90 · south 90.
 * Sconce's room side is −Z: west −90 · east 90 · north 180 · south 0.
 */
export const PROPS: PropSpec[] = [
  // ---- R1, first thing seen after opening the door: small wooden cabinet (east wall) with the digital clock (23:59), plant beside it
  { name: 'clockCabinet', url: H + 'wooden_side_table.glb', pos: [0.77, 0, 1.75], rot: -90, h: 0.78, collide: true, age: 0.05 },
  { name: 'doorPlant', url: M + 'plant_snake.glb', pos: [0.76, 0, 1.05], rot: 45, h: 0.75, collide: true, age: 0 },
  { name: 'sconceE', url: F + 'antique_wall_sconce.glb', pos: [-0.86, 1.95, 1.6], rot: -90, h: 0.45, floor: false, age: 0.1, shadow: false },
  // ---- R1 entrance leg: umbrella stand, dresser + mirror, frame (west); planter with plants + sconce (east, procedural box)
  { name: 'umbrella', url: H + 'umbrella_stand.glb', pos: [-0.78, 0, -0.4], rot: 0, h: 0.72, collide: true, age: 0.05 },
  { name: 'dresserA', url: H + 'wooden_side_table.glb', pos: [-0.77, 0, -1.65], rot: 90, h: 0.78, collide: true, age: 0.05 },
  { name: 'mirror', url: H + 'wall_mirror.glb', pos: [-0.985, 1.55, -1.65], rot: 90, h: 0.85, floor: false, age: 0 },
  { name: 'photoA1', url: H + 'vintage_framed_photos.glb', pos: [-0.985, 1.6, -2.8], rot: 90, h: 0.3, floor: false, only: /^pictureFrame3Large/, age: 0.05 },
  { name: 'snake1', url: M + 'plant_snake.glb', pos: [0.8, 0.45, -0.95], rot: 0, h: 0.6, age: 0 },
  { name: 'monsteraP', url: D + 'monstera_potted.glb', pos: [0.8, 0.45, -1.75], rot: 160, h: 1.0, age: 0 },
  { name: 'snake2', url: M + 'plant_snake.glb', pos: [0.8, 0.45, -2.55], rot: 90, h: 0.55, age: 0 },
  { name: 'sconceP', url: F + 'antique_wall_sconce.glb', pos: [0.86, 1.95, -1.75], rot: 90, h: 0.45, floor: false, age: 0.1, shadow: false },
  // ---- R2 corner: frame beside the bathroom door
  { name: 'photoR2', url: H + 'vintage_framed_photos.glb', pos: [2.8, 1.6, -3.515], rot: 180, h: 0.36, floor: false, only: /^pictureFrame1Large/, age: 0.05 },
  // ---- R6 alcove by the west windows: rug, leather armchair with the teddy bear in it, floor lamp, plant
  { name: 'rug', url: D + 'persian_rug.glb', pos: [0.3, 0.004, -5.75], rot: 90, w: 2.0, shadow: false, age: 0.1 },
  { name: 'armchair', url: F + 'leather_armchair.glb', pos: [0.55, 0, -6.0], rot: 200, h: 1.05, only: /ARMCHAIR/, collide: true, age: 0.1 },
  { name: 'teddy', url: D + 'teddy_bear.glb', pos: [0.55, 0.43, -5.95], rot: 200, h: 0.3, age: 0.1 },
  { name: 'floorLamp', url: F + 'leather_armchair.glb', pos: [1.22, 0, -6.35], rot: 200, h: 1.62, only: /FLOORLAMP/, collide: true, age: 0.05, shadow: false }, // its bulb sits inside the shade
  { name: 'monsteraA', url: D + 'monstera_potted.glb', pos: [-0.66, 0, -6.3], rot: 30, h: 1.2, collide: true, age: 0 },
  // ---- flat north wall: grandfather clock (heirloom), window, then the credenza group
  { name: 'clock', url: F + 'grandfather_clock.glb', pos: [1.95, 0, -5.33], rot: -90, h: 2.1, collide: true, age: 0.1 },
  { name: 'console', url: M + 'console_table.glb', pos: [4.5, 0, -5.27], rot: -90, h: 0.7, collide: true, age: 0.05 },
  { name: 'lampL', url: F + 'table_lamp_fabric.glb', pos: [3.97, 0.7, -5.32], rot: 0, h: 0.6, age: 0, shadow: false },
  { name: 'lampR', url: F + 'table_lamp_fabric.glb', pos: [5.03, 0.7, -5.32], rot: 0, h: 0.6, age: 0, shadow: false },
  { name: 'phone', url: F + 'rotary_telephone.glb', pos: [4.5, 0.7, -5.22], rot: 20, w: 0.25, age: 0.1 },
  { name: 'painting', url: F + 'landscape_oil_painting.glb', pos: [4.5, 1.72, -5.485], rot: 0, h: 0.7, floor: false, age: 0.05 },
  // ---- RN nook beside the stairs: coat rack + small wooden cabinet
  { name: 'coatRack', url: H + 'wooden_coat_rack.glb', pos: [5.15, 0, -1.6], rot: 0, h: 1.8, only: /^Object_4$/, collide: true, age: 0.05 },
  { name: 'dresserN', url: H + 'wooden_side_table.glb', pos: [5.95, 0, -1.5], rot: 180, h: 0.78, collide: true, age: 0.05 },
  // ---- R8 passage to the front doors: runner, sconces both sides, frames
  { name: 'runner', url: H + 'persian_runner_rug.glb', pos: [6.2, 0.004, -7.6], rot: 0, w: 2.2, shadow: false, age: 0.05 },
  { name: 'sconce8a', url: F + 'antique_wall_sconce.glb', pos: [5.74, 1.9, -7.0], rot: -90, h: 0.45, floor: false, age: 0.1, shadow: false },
  { name: 'sconce8b', url: F + 'antique_wall_sconce.glb', pos: [6.66, 1.9, -8.4], rot: 90, h: 0.45, floor: false, age: 0.1, shadow: false },
  { name: 'photo8a', url: H + 'vintage_framed_photos.glb', pos: [5.615, 1.6, -8.4], rot: 90, h: 0.26, floor: false, only: /^pictureFrame2Large/, age: 0.05 },
  { name: 'photo8b', url: H + 'vintage_framed_photos.glb', pos: [6.785, 1.6, -7.0], rot: -90, h: 0.2, floor: false, only: /^pictureFrame2_/, age: 0.05 },
  // ---- RE east hall toward door 9: bookcase (south), portrait (heirloom) + small photos (north)
  { name: 'bookcase', url: F + 'antique_bookcase.glb', pos: [8.3, 0, -3.68], rot: 180, h: 1.9, collide: true, age: 0.1 },
  { name: 'portrait', url: F + 'oil_portrait_gilt_frame.glb', pos: [8.6, 1.7, -5.485], rot: -90, h: 0.75, floor: false, age: 0.1 },
  { name: 'photoE1', url: H + 'vintage_framed_photos.glb', pos: [9.45, 1.62, -5.485], rot: 0, h: 0.18, floor: false, only: /^pictureFrame1_/, age: 0.05 },
  { name: 'photoE2', url: H + 'vintage_framed_photos.glb', pos: [9.45, 1.38, -5.485], rot: 0, h: 0.16, floor: false, only: /^pictureFrame3_/, age: 0.05 },
  // ---- Corridor (wet concrete, unchanged)
  { name: 'cageLamp', url: A + 'caged_industrial_lamp.glb', pos: [0, CORRIDOR.h - 0.16, CORRIDOR.z0 + 4.63], rot: 0, h: 0.32, floor: false, age: 0.4, shadow: false },
  { name: 'switch', url: A + 'vintage_light_switch.glb', pos: [0.52, 1.3, CORRIDOR.z0 + 0.43], rot: -90, h: 0.085, floor: false, only: /^Object_4$/, age: 0.4 },
];
