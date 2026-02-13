#!/usr/bin/env node
/**
 * Generates 96x96 autotile PNG sprites in /tileArt/
 * Each texture is a 3x3 grid of 32x32 sub-tiles (corners, edges, center).
 * Uses raw PNG encoding (no external deps) with procedural texturing.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

const TILE = 32;          // individual sub-tile size
const GRID = 3;            // 3x3 sub-tile grid
const SIZE = TILE * GRID;  // 96 - full texture size

// Tile definitions: name → { color, pattern }
const TILES = {
  grass:         { color: [74, 124, 63],  pattern: 'grass' },
  dirt:          { color: [139, 105, 20], pattern: 'noise' },
  sand:          { color: [194, 178, 128], pattern: 'dots' },
  stone:         { color: [128, 128, 128], pattern: 'cracks' },
  water:         { color: [41, 128, 185], pattern: 'waves' },
  deep_water:    { color: [26, 82, 118],  pattern: 'waves' },
  path:          { color: [160, 137, 110], pattern: 'noise' },
  flower_grass:  { color: [93, 168, 78],  pattern: 'flowers' },
  farmland:      { color: [107, 66, 38],  pattern: 'rows' },
  dark_grass:    { color: [45, 90, 30],   pattern: 'grass' },
  mushroom:      { color: [61, 46, 30],   pattern: 'mushroom' },
  dense_bush:    { color: [26, 61, 12],   pattern: 'bush' },
  mud:           { color: [92, 64, 51],   pattern: 'noise' },
  bog:           { color: [59, 83, 35],   pattern: 'swamp' },
  marsh_water:   { color: [74, 103, 65],  pattern: 'waves' },
  snow:          { color: [240, 240, 240], pattern: 'snow' },
  ice:           { color: [176, 224, 230], pattern: 'ice' },
  gravel:        { color: [160, 160, 160], pattern: 'gravel' },
  cliff:         { color: [85, 85, 85],   pattern: 'cracks' },
  ash:           { color: [58, 58, 58],   pattern: 'noise' },
  lava:          { color: [255, 69, 0],   pattern: 'lava' },
  obsidian:      { color: [26, 26, 46],   pattern: 'shiny' },
  charred_stone: { color: [42, 42, 42],   pattern: 'cracks' },
};

// Simple seeded pseudo-random
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function clamp(v, lo = 0, hi = 255) { return Math.max(lo, Math.min(hi, Math.round(v))); }

/**
 * Fill a 32x32 sub-tile region within the full pixel buffer.
 * @param {Uint8Array} pixels - Full 96x96 RGBA buffer
 * @param {number} imgWidth - Full image width (96)
 * @param {number} ox - X pixel offset of this sub-tile
 * @param {number} oy - Y pixel offset of this sub-tile
 * @param {number} ts - Sub-tile size (32)
 * @param {number[]} base - [r, g, b] base color
 * @param {string} pattern - Pattern name
 * @param {function} rng - Seeded random function
 */
function applyPattern(pixels, imgWidth, ox, oy, ts, base, pattern, rng) {
  const [br, bg, bb] = base;

  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      const i = ((oy + y) * imgWidth + (ox + x)) * 4;
      let r = br, g = bg, b = bb, a = 255;

      switch (pattern) {
        case 'grass': {
          const n = (rng() - 0.5) * 30;
          r += n * 0.5; g += n; b += n * 0.3;
          if (rng() < 0.08) { g += 30 + rng() * 20; }
          if (rng() < 0.04) { r -= 15; g -= 15; b -= 10; }
          break;
        }
        case 'noise': {
          const n = (rng() - 0.5) * 40;
          r += n; g += n; b += n;
          break;
        }
        case 'dots': {
          const n = (rng() - 0.5) * 20;
          r += n; g += n; b += n;
          if (rng() < 0.03) { r += 20; g += 15; b += 5; }
          break;
        }
        case 'cracks': {
          const n = (rng() - 0.5) * 25;
          r += n; g += n; b += n;
          if ((x === 8 || x === 24) && y > 4 && y < 28 && rng() < 0.6) {
            r -= 30; g -= 30; b -= 30;
          }
          if ((y === 12 || y === 20) && x > 2 && x < 30 && rng() < 0.5) {
            r -= 25; g -= 25; b -= 25;
          }
          break;
        }
        case 'waves': {
          const wave = Math.sin((x + y * 0.5) * 0.4) * 15;
          r += wave * 0.3; g += wave * 0.5; b += wave;
          const n = (rng() - 0.5) * 10;
          r += n; g += n; b += n;
          if (Math.abs(Math.sin((x + y * 0.3) * 0.6)) > 0.9) {
            r += 15; g += 20; b += 30;
          }
          break;
        }
        case 'flowers': {
          const n = (rng() - 0.5) * 25;
          r += n * 0.5; g += n; b += n * 0.3;
          if (rng() < 0.05) {
            const flowerType = Math.floor(rng() * 4);
            if (flowerType === 0) { r = 220; g = 60; b = 60; }
            else if (flowerType === 1) { r = 240; g = 220; b = 50; }
            else if (flowerType === 2) { r = 240; g = 240; b = 240; }
            else { r = 180; g = 80; b = 200; }
          }
          break;
        }
        case 'rows': {
          const n = (rng() - 0.5) * 20;
          r += n; g += n; b += n;
          if (y % 6 < 2) { r -= 15; g -= 10; b -= 8; }
          break;
        }
        case 'mushroom': {
          const n = (rng() - 0.5) * 25;
          r += n; g += n; b += n;
          if (rng() < 0.03) { r += 50; g += 20; b -= 10; }
          if (rng() < 0.02) { r += 30; g += 40; b += 10; }
          break;
        }
        case 'bush': {
          const n = (rng() - 0.5) * 30;
          r += n * 0.3; g += n; b += n * 0.2;
          if (rng() < 0.1) { g += 25 + rng() * 15; }
          if (rng() < 0.06) { r -= 5; g -= 20; b -= 5; }
          break;
        }
        case 'swamp': {
          const n = (rng() - 0.5) * 25;
          r += n * 0.5; g += n; b += n * 0.3;
          if (rng() < 0.08) { r -= 10; g += 10; b -= 5; }
          if (rng() < 0.02) { r += 20; g += 25; b += 15; }
          break;
        }
        case 'snow': {
          const n = (rng() - 0.5) * 15;
          r += n; g += n; b += n;
          if (rng() < 0.04) { r = 255; g = 255; b = 255; }
          if (rng() < 0.03) { r -= 20; g -= 20; b -= 15; }
          break;
        }
        case 'ice': {
          const n = (rng() - 0.5) * 18;
          r += n * 0.5; g += n * 0.8; b += n;
          if ((x + y) % 11 === 0 && rng() < 0.7) { r -= 20; g -= 10; b += 10; }
          if (rng() < 0.03) { r += 30; g += 30; b += 30; }
          break;
        }
        case 'gravel': {
          const n = (rng() - 0.5) * 40;
          r += n; g += n; b += n;
          if (rng() < 0.06) { r += 25; g += 25; b += 25; }
          if (rng() < 0.06) { r -= 25; g -= 25; b -= 25; }
          break;
        }
        case 'lava': {
          const n = (rng() - 0.5) * 20;
          r += n; g += n * 2; b += n;
          const glow = Math.sin((x * 0.5 + y * 0.3) * 0.8) * 20;
          r += glow; g += glow * 1.5;
          if (rng() < 0.05) { r = 255; g = clamp(180 + rng() * 75); b = 0; }
          if (rng() < 0.04) { r = 80; g = 20; b = 0; }
          break;
        }
        case 'shiny': {
          const n = (rng() - 0.5) * 12;
          r += n; g += n; b += n * 2;
          if (rng() < 0.03) { r += 40; g += 30; b += 60; }
          break;
        }
      }

      pixels[i]     = clamp(r);
      pixels[i + 1] = clamp(g);
      pixels[i + 2] = clamp(b);
      pixels[i + 3] = a;
    }
  }
}

/**
 * Apply darkening to open edges of a sub-tile to create terrain borders.
 * @param {Uint8Array} pixels - Full pixel buffer
 * @param {number} imgWidth - Full image width (96)
 * @param {number} ox - X pixel offset of this sub-tile
 * @param {number} oy - Y pixel offset of this sub-tile
 * @param {number} ts - Sub-tile size (32)
 * @param {number} col - Sub-tile column (0-2)
 * @param {number} row - Sub-tile row (0-2)
 */
function applyEdgeDarkening(pixels, imgWidth, ox, oy, ts, col, row) {
  const openTop    = (row === 0);
  const openBottom = (row === 2);
  const openLeft   = (col === 0);
  const openRight  = (col === 2);

  if (!openTop && !openBottom && !openLeft && !openRight) return;

  const BORDER = 4;
  const DARKEN = 0.70;
  const OUTLINE_DARKEN = 0.55;

  for (let y = 0; y < ts; y++) {
    for (let x = 0; x < ts; x++) {
      let minDist = ts;
      if (openTop)    minDist = Math.min(minDist, y);
      if (openBottom) minDist = Math.min(minDist, ts - 1 - y);
      if (openLeft)   minDist = Math.min(minDist, x);
      if (openRight)  minDist = Math.min(minDist, ts - 1 - x);

      if (minDist < BORDER) {
        const t = 1.0 - (minDist / BORDER);
        let factor = 1.0 - t * (1.0 - DARKEN);
        if (minDist === 0) factor = OUTLINE_DARKEN;

        const i = ((oy + y) * imgWidth + (ox + x)) * 4;
        pixels[i]     = Math.round(pixels[i]     * factor);
        pixels[i + 1] = Math.round(pixels[i + 1] * factor);
        pixels[i + 2] = Math.round(pixels[i + 2] * factor);
      }
    }
  }
}

function encodePNG(pixels, width, height) {
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const srcI = (y * width + x) * 4;
      const dstI = rowOffset + 1 + x * 4;
      rawData[dstI]     = pixels[srcI];
      rawData[dstI + 1] = pixels[srcI + 1];
      rawData[dstI + 2] = pixels[srcI + 2];
      rawData[dstI + 3] = pixels[srcI + 3];
    }
  }

  const compressed = deflateSync(rawData);

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = createChunk('IHDR', (() => {
    const d = Buffer.alloc(13);
    d.writeUInt32BE(width, 0);
    d.writeUInt32BE(height, 4);
    d[8] = 8;   // bit depth
    d[9] = 6;   // color type: RGBA
    d[10] = 0;  // compression
    d[11] = 0;  // filter
    d[12] = 0;  // interlace
    return d;
  })());

  // IDAT
  const idat = createChunk('IDAT', compressed);

  // IEND
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([len, typeB, data, crc]);
}

// CRC32 for PNG
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crc32Table[(c ^ buf[i]) & 0xFF];
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const crc32Table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crc32Table[n] = c;
}

// --- Generate all autotile textures ---
const outDir = new URL('../tileArt/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

let count = 0;
for (const [name, def] of Object.entries(TILES)) {
  const pixels = new Uint8Array(SIZE * SIZE * 4);

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const seed = name.length * 1337 + name.charCodeAt(0) * 7 + row * 3 + col;
      const rng = mulberry32(seed);

      const ox = col * TILE;
      const oy = row * TILE;

      applyPattern(pixels, SIZE, ox, oy, TILE, def.color, def.pattern, rng);
      applyEdgeDarkening(pixels, SIZE, ox, oy, TILE, col, row);
    }
  }

  const png = encodePNG(pixels, SIZE, SIZE);
  writeFileSync(`${outDir}${name}.png`, png);
  count++;
}

console.log(`Generated ${count} autotile sprites (${SIZE}x${SIZE}) in ${outDir}`);
