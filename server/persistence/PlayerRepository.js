import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SAVE_DIR = join(__dirname, '..', '..', 'saves', 'players');

export default class PlayerRepository {
  constructor() {
    this.ready = false;
  }

  async init() {
    try {
      await mkdir(SAVE_DIR, { recursive: true });
      this.ready = true;
    } catch (err) {
      console.error('[PlayerRepo] Failed to create save directory:', err.message);
    }
  }

  getPath(playerId) {
    // Sanitize: only allow alphanumeric + hyphens
    const safe = playerId.replace(/[^a-zA-Z0-9-]/g, '');
    return join(SAVE_DIR, `${safe}.json`);
  }

  async exists(playerId) {
    try {
      await access(this.getPath(playerId));
      return true;
    } catch {
      return false;
    }
  }

  async load(playerId) {
    try {
      const data = await readFile(this.getPath(playerId), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async save(playerId, data) {
    try {
      await writeFile(this.getPath(playerId), JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`[PlayerRepo] Failed to save ${playerId}:`, err.message);
      return false;
    }
  }

}
