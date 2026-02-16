export const TILE_SIZE = 32;
export const TEXTURE_SIZE = 96; // 3x3 autotile texture (3 * TILE_SIZE)
export const CHUNK_SIZE = 16;
export const CHUNK_PIXEL_SIZE = TILE_SIZE * CHUNK_SIZE; // 512
export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE; // 50ms
export const MAX_PLAYERS = 100;
export const VIEW_DISTANCE = 3; // chunks around player

export const PLAYER_SPEED = 160; // pixels per second
export const PLAYER_SIZE = 24; // collision box
export const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1',
  '#e84393', '#00cec9', '#fdcb6e', '#6c5ce7',
  '#fab1a0', '#74b9ff', '#55efc4', '#ffeaa7'
];

// Town
export const TOWN_WALL_RADIUS = 2400; // pixels from town center
export const TOWN_GATE_WIDTH = 96;    // pixels wide per gate opening

export const CAMERA_MIN_ZOOM = 0.5;
export const CAMERA_MAX_ZOOM = 4.0;
export const CAMERA_DEFAULT_ZOOM = 2.0;
export const CAMERA_LERP_SPEED = 0.15;
export const CAMERA_ZOOM_SPEED = 0.1;

export const INPUT_DEADZONE = 0.15;
export const TOUCH_MIN_TARGET = 44; // minimum tap target px

export const HORSE_SPEED_MULTIPLIER = 1.8; // 1.8x player speed when mounted
