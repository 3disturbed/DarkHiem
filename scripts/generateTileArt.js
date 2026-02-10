#!/usr/bin/env node
/**
 * Generates placeholder 32x32 PNG tile sprites in /tileArt/
 * Uses raw PNG encoding (no external deps) with procedural texturing.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

const SIZE = 32;

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

function applyPattern(pixels, base, pattern, rng) {
  const [br, bg, bb] = base;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      let r = br, g = bg, b = bb, a = 255;

      switch (pattern) {
        case 'grass': {
          const n = (rng() - 0.5) * 30;
          r += n * 0.5; g += n; b += n * 0.3;
          // Grass blade highlights
          if (rng() < 0.08) { g += 30 + rng() * 20; }
          // Dark spots
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
          if (rng() < 0.03) { r += 20; g += 15; b += 5; } // light specks
          break;
        }
        case 'cracks': {
          const n = (rng() - 0.5) * 25;
          r += n; g += n; b += n;
          // Horizontal/vertical crack lines
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
          // Wave highlight
          if (Math.abs(Math.sin((x + y * 0.3) * 0.6)) > 0.9) {
            r += 15; g += 20; b += 30;
          }
          break;
        }
        case 'flowers': {
          const n = (rng() - 0.5) * 25;
          r += n * 0.5; g += n; b += n * 0.3;
          // Flower dots (red, yellow, white, purple)
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
          // Tilled rows
          if (y % 6 < 2) { r -= 15; g -= 10; b -= 8; }
          break;
        }
        case 'mushroom': {
          const n = (rng() - 0.5) * 25;
          r += n; g += n; b += n;
          // Mushroom cap spots
          if (rng() < 0.03) { r += 50; g += 20; b -= 10; }
          // Spore dots
          if (rng() < 0.02) { r += 30; g += 40; b += 10; }
          break;
        }
        case 'bush': {
          const n = (rng() - 0.5) * 30;
          r += n * 0.3; g += n; b += n * 0.2;
          // Dense leaf clusters
          if (rng() < 0.1) { g += 25 + rng() * 15; }
          if (rng() < 0.06) { r -= 5; g -= 20; b -= 5; } // shadow
          break;
        }
        case 'swamp': {
          const n = (rng() - 0.5) * 25;
          r += n * 0.5; g += n; b += n * 0.3;
          // Murky patches
          if (rng() < 0.08) { r -= 10; g += 10; b -= 5; }
          // Bubble dots
          if (rng() < 0.02) { r += 20; g += 25; b += 15; }
          break;
        }
        case 'snow': {
          const n = (rng() - 0.5) * 15;
          r += n; g += n; b += n;
          // Sparkle highlights
          if (rng() < 0.04) { r = 255; g = 255; b = 255; }
          // Shadow dips
          if (rng() < 0.03) { r -= 20; g -= 20; b -= 15; }
          break;
        }
        case 'ice': {
          const n = (rng() - 0.5) * 18;
          r += n * 0.5; g += n * 0.8; b += n;
          // Crack lines
          if ((x + y) % 11 === 0 && rng() < 0.7) { r -= 20; g -= 10; b += 10; }
          // Shine
          if (rng() < 0.03) { r += 30; g += 30; b += 30; }
          break;
        }
        case 'gravel': {
          const n = (rng() - 0.5) * 40;
          r += n; g += n; b += n;
          // Pebble shapes (larger variation clusters)
          if (rng() < 0.06) { r += 25; g += 25; b += 25; }
          if (rng() < 0.06) { r -= 25; g -= 25; b -= 25; }
          break;
        }
        case 'lava': {
          const n = (rng() - 0.5) * 20;
          r += n; g += n * 2; b += n;
          // Hot glow veins
          const glow = Math.sin((x * 0.5 + y * 0.3) * 0.8) * 20;
          r += glow; g += glow * 1.5;
          // Bright spots
          if (rng() < 0.05) { r = 255; g = clamp(180 + rng() * 75); b = 0; }
          // Dark cooled patches
          if (rng() < 0.04) { r = 80; g = 20; b = 0; }
          break;
        }
        case 'shiny': {
          const n = (rng() - 0.5) * 12;
          r += n; g += n; b += n * 2;
          // Obsidian reflection spots
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

function encodePNG(pixels) {
  // Build raw scanline data (filter byte 0 + RGBA for each row)
  const rawData = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    const rowOffset = y * (SIZE * 4 + 1);
    rawData[rowOffset] = 0; // filter: none
    for (let x = 0; x < SIZE; x++) {
      const srcI = (y * SIZE + x) * 4;
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
    d.writeUInt32BE(SIZE, 0);   // width
    d.writeUInt32BE(SIZE, 4);   // height
    d[8] = 8;                   // bit depth
    d[9] = 6;                   // color type: RGBA
    d[10] = 0;                  // compression
    d[11] = 0;                  // filter
    d[12] = 0;                  // interlace
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

// --- Generate all tiles ---
const outDir = new URL('../tileArt/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

let count = 0;
for (const [name, def] of Object.entries(TILES)) {
  const rng = mulberry32(name.length * 1337 + name.charCodeAt(0) * 7);
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  applyPattern(pixels, def.color, def.pattern, rng);
  const png = encodePNG(pixels);
  writeFileSync(`${outDir}${name}.png`, png);
  count++;
}

console.log(`Generated ${count} tile sprites in ${outDir}`);
