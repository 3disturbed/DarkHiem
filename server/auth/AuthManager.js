import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import AccountRepository from './AccountRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SECRET_PATH = join(__dirname, '..', '..', 'saves', 'jwt_secret');

const SALT_ROUNDS = 10;
const MAX_CHARACTERS_PER_ACCOUNT = 5;

export default class AuthManager {
  constructor() {
    this.accountRepo = new AccountRepository();
    this.jwtSecret = null;
    this.tokenExpiry = '7d';
  }

  async init() {
    await this.accountRepo.init();
    this.jwtSecret = await this.loadOrCreateSecret();
    console.log('[AuthManager] Initialized');
  }

  async loadOrCreateSecret() {
    // Use env var if set (recommended for production)
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

    // Otherwise persist to file so tokens survive restarts
    try {
      const secret = await readFile(SECRET_PATH, 'utf-8');
      if (secret.trim()) return secret.trim();
    } catch {}

    const secret = crypto.randomBytes(32).toString('hex');
    try {
      await mkdir(dirname(SECRET_PATH), { recursive: true });
      await writeFile(SECRET_PATH, secret, 'utf-8');
    } catch (err) {
      console.warn('[AuthManager] Could not persist JWT secret:', err.message);
    }
    return secret;
  }

  async register(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    // Validate username
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return { success: false, error: 'Username must be 3-20 characters' };
    }
    if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
      return { success: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
    }

    // Validate password
    if (password.length < 4 || password.length > 128) {
      return { success: false, error: 'Password must be 4-128 characters' };
    }

    // Check if account exists
    if (await this.accountRepo.exists(cleanUsername)) {
      return { success: false, error: 'Username already taken' };
    }

    // Hash password and create account
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const account = {
      username: cleanUsername,
      passwordHash,
      createdAt: Date.now(),
      characters: [],
    };

    const saved = await this.accountRepo.save(cleanUsername, account);
    if (!saved) {
      return { success: false, error: 'Failed to create account' };
    }

    console.log(`[AuthManager] Account created: ${cleanUsername}`);
    const token = this.createToken(cleanUsername);
    return { success: true, token, username: cleanUsername, characters: [] };
  }

  async login(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    const cleanUsername = username.trim().toLowerCase();
    const account = await this.accountRepo.load(cleanUsername);
    if (!account) {
      return { success: false, error: 'Invalid username or password' };
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
      return { success: false, error: 'Invalid username or password' };
    }

    console.log(`[AuthManager] Login: ${cleanUsername}`);
    const token = this.createToken(cleanUsername);
    return {
      success: true,
      token,
      username: cleanUsername,
      characters: account.characters || [],
    };
  }

  async createCharacter(username, name, color) {
    if (!name || !name.trim()) {
      return { success: false, error: 'Character name is required' };
    }

    const cleanName = name.trim();
    if (cleanName.length < 1 || cleanName.length > 16) {
      return { success: false, error: 'Character name must be 1-16 characters' };
    }

    const account = await this.accountRepo.load(username);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    if (account.characters.length >= MAX_CHARACTERS_PER_ACCOUNT) {
      return { success: false, error: `Maximum ${MAX_CHARACTERS_PER_ACCOUNT} characters per account` };
    }

    const character = {
      id: uuidv4(),
      name: cleanName,
      color: color || '#e74c3c',
      createdAt: Date.now(),
    };

    account.characters.push(character);
    await this.accountRepo.save(username, account);

    console.log(`[AuthManager] Character created: ${cleanName} for ${username}`);
    return { success: true, character, characters: account.characters };
  }

  async deleteCharacter(username, characterId) {
    const account = await this.accountRepo.load(username);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    const idx = account.characters.findIndex(c => c.id === characterId);
    if (idx === -1) {
      return { success: false, error: 'Character not found' };
    }

    account.characters.splice(idx, 1);
    await this.accountRepo.save(username, account);

    console.log(`[AuthManager] Character deleted: ${characterId} for ${username}`);
    return { success: true, characters: account.characters };
  }

  async getCharacters(username) {
    const account = await this.accountRepo.load(username);
    if (!account) return [];
    return account.characters || [];
  }

  createToken(username) {
    return jwt.sign({ username }, this.jwtSecret, { expiresIn: this.tokenExpiry });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch {
      return null;
    }
  }
}
