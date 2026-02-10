import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export default class ChunkStore {
  constructor(savePath) {
    this.savePath = savePath;
    this.ready = false;
  }

  async init() {
    if (!existsSync(this.savePath)) {
      await mkdir(this.savePath, { recursive: true });
    }
    this.ready = true;
  }

  getFilePath(chunkX, chunkY) {
    return join(this.savePath, `chunk_${chunkX}_${chunkY}.json`);
  }

  async load(chunkX, chunkY) {
    const filePath = this.getFilePath(chunkX, chunkY);
    if (!existsSync(filePath)) return null;

    try {
      const raw = await readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[ChunkStore] Failed to load ${filePath}: ${err.message}`);
      return null;
    }
  }

  async save(chunkData) {
    if (!this.ready) return;
    const filePath = this.getFilePath(chunkData.chunkX, chunkData.chunkY);
    try {
      await writeFile(filePath, JSON.stringify(chunkData), 'utf-8');
    } catch (err) {
      console.warn(`[ChunkStore] Failed to save ${filePath}: ${err.message}`);
    }
  }

  async exists(chunkX, chunkY) {
    return existsSync(this.getFilePath(chunkX, chunkY));
  }
}
