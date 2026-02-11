import { readFile, writeFile, access, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SAVE_DIR = join(__dirname, '..', '..', 'saves', 'accounts');

export default class AccountRepository {
  constructor() {
    this.ready = false;
  }

  async init() {
    try {
      await mkdir(SAVE_DIR, { recursive: true });
      this.ready = true;
    } catch (err) {
      console.error('[AccountRepo] Failed to create save directory:', err.message);
    }
  }

  getPath(username) {
    const safe = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return join(SAVE_DIR, `${safe}.json`);
  }

  async exists(username) {
    try {
      await access(this.getPath(username));
      return true;
    } catch {
      return false;
    }
  }

  async load(username) {
    try {
      const data = await readFile(this.getPath(username), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async save(username, data) {
    try {
      await writeFile(this.getPath(username), JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`[AccountRepo] Failed to save ${username}:`, err.message);
      return false;
    }
  }
}
