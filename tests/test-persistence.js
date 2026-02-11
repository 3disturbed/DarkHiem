/**
 * Integration test for Darkheim player persistence system.
 *
 * Verifies:
 *   1. PlayerRepository init / save / load / exists
 *   2. Full save-restore round-trip (stats, inventory, equipment, health)
 *   3. Equipment serialization saves item IDs and restores to ITEM_DB entries
 *
 * Run:  node tests/test-persistence.js
 */

import PlayerRepository from '../server/persistence/PlayerRepository.js';
import EntityFactory from '../server/ecs/EntityFactory.js';
import StatsComponent from '../server/ecs/components/StatsComponent.js';
import InventoryComponent from '../server/ecs/components/InventoryComponent.js';
import EquipmentComponent from '../server/ecs/components/EquipmentComponent.js';
import HealthComponent from '../server/ecs/components/HealthComponent.js';
import { ITEM_DB } from '../shared/ItemTypes.js';

import { unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}`);
    failed++;
  }
}

function assertEq(actual, expected, label) {
  if (actual === expected) {
    console.log(`  [PASS] ${label}  (${actual})`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}  -- expected ${expected}, got ${actual}`);
    failed++;
  }
}

// Replicate the restore logic that GameServer uses when loading saved data
// onto a freshly-created entity.
function restorePlayerData(entity, savedData) {
  // --- Stats ---
  const stats = entity.getComponent(StatsComponent);
  if (savedData.stats) {
    stats.level = savedData.stats.level;
    stats.xp = savedData.stats.xp;
    stats.statPoints = savedData.stats.statPoints;
    stats.str = savedData.stats.str;
    stats.dex = savedData.stats.dex;
    stats.vit = savedData.stats.vit;
    stats.end = savedData.stats.end;
    stats.lck = savedData.stats.lck;
  }

  // --- Health ---
  const health = entity.getComponent(HealthComponent);
  if (savedData.health) {
    health.current = savedData.health.current;
    health.max = savedData.health.max;
  }

  // --- Inventory ---
  const inventory = entity.getComponent(InventoryComponent);
  if (savedData.inventory && savedData.inventory.slots) {
    inventory.slots = savedData.inventory.slots;
  }

  // --- Equipment ---
  const equipment = entity.getComponent(EquipmentComponent);
  if (savedData.equipment) {
    for (const [slotName, itemId] of Object.entries(savedData.equipment)) {
      if (itemId && ITEM_DB[itemId]) {
        equipment.slots[slotName] = ITEM_DB[itemId];
      } else {
        equipment.slots[slotName] = null;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Test 1 -- PlayerRepository basics
// ---------------------------------------------------------------------------

async function testPlayerRepository() {
  console.log('\n=== Test 1: PlayerRepository basics ===');

  const repo = new PlayerRepository();
  await repo.init();

  assert(repo.ready === true, 'repo.ready is true after init()');

  // Save some test data
  const testId = 'test-persist-unit';
  const testData = {
    version: 1,
    id: testId,
    name: 'UnitTestPlayer',
    color: '#abcdef',
    savedAt: Date.now(),
    position: { x: 42, y: 84 },
    health: { current: 50, max: 100 },
    stats: { level: 3, xp: 100, statPoints: 2, str: 6, dex: 6, vit: 5, end: 5, lck: 3 },
    inventory: { slots: [{ itemId: 'wood', count: 5 }, null] },
    equipment: { weapon: 'wooden_club', head: null, body: null, legs: null, feet: null, shield: null, ring1: null, ring2: null, tool: null },
  };

  const saveResult = await repo.save(testId, testData);
  assert(saveResult === true, 'save() returns true');

  // Load it back
  const loaded = await repo.load(testId);
  assert(loaded !== null, 'load() returns non-null for saved ID');
  assertEq(loaded.id, testId, 'loaded.id matches');
  assertEq(loaded.name, 'UnitTestPlayer', 'loaded.name matches');
  assertEq(loaded.color, '#abcdef', 'loaded.color matches');
  assertEq(loaded.position.x, 42, 'loaded.position.x matches');
  assertEq(loaded.position.y, 84, 'loaded.position.y matches');
  assertEq(loaded.health.current, 50, 'loaded.health.current matches');
  assertEq(loaded.stats.level, 3, 'loaded.stats.level matches');
  assertEq(loaded.stats.xp, 100, 'loaded.stats.xp matches');
  assertEq(loaded.stats.str, 6, 'loaded.stats.str matches');
  assertEq(loaded.inventory.slots[0].itemId, 'wood', 'loaded.inventory slot 0 itemId matches');
  assertEq(loaded.inventory.slots[0].count, 5, 'loaded.inventory slot 0 count matches');
  assertEq(loaded.equipment.weapon, 'wooden_club', 'loaded.equipment.weapon matches');
  assertEq(loaded.equipment.head, null, 'loaded.equipment.head is null');

  // exists()
  const existsTrue = await repo.exists(testId);
  assert(existsTrue === true, 'exists() returns true for saved ID');

  const existsFalse = await repo.exists('totally-unknown-id');
  assert(existsFalse === false, 'exists() returns false for unknown ID');

  // Clean up this test file
  try {
    await unlink(repo.getPath(testId));
  } catch { /* ignore */ }

  return true;
}

// ---------------------------------------------------------------------------
// Test 2 -- Full save / restore round-trip
// ---------------------------------------------------------------------------

async function testSaveRestoreRoundTrip() {
  console.log('\n=== Test 2: Save / Restore round-trip ===');

  const repo = new PlayerRepository();
  await repo.init();

  // ---- Create original entity and simulate gameplay ----
  const entity = EntityFactory.createPlayer('test-persist', 'socket1', 'TestPlayer', '#ff0000', 100, 200);

  const stats = entity.getComponent(StatsComponent);
  stats.level = 5;
  stats.xp = 500;
  stats.statPoints = 3;
  stats.str = 8;
  stats.dex = 7;

  const inv = entity.getComponent(InventoryComponent);
  inv.addItem('bone_sword', 1);
  inv.addItem('leather_scrap', 10);

  const equip = entity.getComponent(EquipmentComponent);
  const clubItem = ITEM_DB['wooden_club'];
  equip.equip(clubItem);

  const health = entity.getComponent(HealthComponent);
  health.current = 75;
  health.max = 120;

  // ---- Build save data (same structure as GameServer.savePlayer) ----
  const saveData = {
    version: 1,
    id: 'test-persist',
    name: 'TestPlayer',
    color: '#ff0000',
    savedAt: Date.now(),
    position: { x: 100, y: 200 },
    health: { current: 75, max: 120 },
    stats: {
      level: 5,
      xp: 500,
      statPoints: 3,
      str: 8,
      dex: 7,
      vit: 5,
      end: 5,
      lck: 3,
    },
    inventory: entity.getComponent(InventoryComponent).serialize(),
    equipment: entity.getComponent(EquipmentComponent).serialize(),
  };

  // Verify equipment serialization stores item IDs, not full objects
  console.log('\n  -- Equipment serialization check --');
  assertEq(saveData.equipment.weapon, 'wooden_club', 'equipment.serialize() stores weapon item ID');
  assertEq(saveData.equipment.head, null, 'equipment.serialize() stores null for empty slot');

  // ---- Save to repo ----
  await repo.save('test-persist', saveData);

  // ---- Create a fresh entity (defaults) and restore ----
  const freshEntity = EntityFactory.createPlayer('test-persist', 'socket2', 'TestPlayer', '#ff0000', 0, 0);

  // Sanity: fresh entity should have base defaults
  const freshStats = freshEntity.getComponent(StatsComponent);
  assertEq(freshStats.level, 1, 'fresh entity starts at level 1');
  assertEq(freshStats.str, 5, 'fresh entity starts with str=5');

  const freshHealth = freshEntity.getComponent(HealthComponent);
  assertEq(freshHealth.current, 100, 'fresh entity starts with current=100');

  // Load saved data and restore
  const loaded = await repo.load('test-persist');
  assert(loaded !== null, 'loaded saved data is non-null');

  restorePlayerData(freshEntity, loaded);

  // ---- Verify restored stats ----
  console.log('\n  -- Restored stats --');
  const restoredStats = freshEntity.getComponent(StatsComponent);
  assertEq(restoredStats.level, 5, 'restored level=5');
  assertEq(restoredStats.xp, 500, 'restored xp=500');
  assertEq(restoredStats.statPoints, 3, 'restored statPoints=3');
  assertEq(restoredStats.str, 8, 'restored str=8');
  assertEq(restoredStats.dex, 7, 'restored dex=7');
  assertEq(restoredStats.vit, 5, 'restored vit=5');
  assertEq(restoredStats.end, 5, 'restored end=5');
  assertEq(restoredStats.lck, 3, 'restored lck=3');

  // ---- Verify restored health ----
  console.log('\n  -- Restored health --');
  const restoredHealth = freshEntity.getComponent(HealthComponent);
  assertEq(restoredHealth.current, 75, 'restored health current=75');
  assertEq(restoredHealth.max, 120, 'restored health max=120');

  // ---- Verify restored inventory ----
  console.log('\n  -- Restored inventory --');
  const restoredInv = freshEntity.getComponent(InventoryComponent);
  const invSlots = restoredInv.slots;

  // Find bone_sword and leather_scrap in inventory
  const boneSwordSlot = invSlots.find(s => s && s.itemId === 'bone_sword');
  const leatherScrapSlot = invSlots.find(s => s && s.itemId === 'leather_scrap');

  assert(boneSwordSlot !== undefined && boneSwordSlot !== null, 'inventory contains bone_sword');
  assertEq(boneSwordSlot ? boneSwordSlot.count : -1, 1, 'bone_sword count=1');
  assert(leatherScrapSlot !== undefined && leatherScrapSlot !== null, 'inventory contains leather_scrap');
  assertEq(leatherScrapSlot ? leatherScrapSlot.count : -1, 10, 'leather_scrap count=10');

  // ---- Verify restored equipment ----
  console.log('\n  -- Restored equipment --');
  const restoredEquip = freshEntity.getComponent(EquipmentComponent);
  const restoredWeapon = restoredEquip.getEquipped('weapon');
  assert(restoredWeapon !== null, 'weapon slot is not null after restore');
  assertEq(restoredWeapon ? restoredWeapon.id : null, 'wooden_club', 'weapon slot has wooden_club');
  assertEq(restoredWeapon ? restoredWeapon.type : null, 'equipment', 'weapon slot type is equipment');
  assertEq(restoredWeapon ? restoredWeapon.statBonuses.baseDamage : -1, 8, 'weapon baseDamage=8 from ITEM_DB');
  assertEq(restoredEquip.getEquipped('head'), null, 'head slot is still null');
  assertEq(restoredEquip.getEquipped('body'), null, 'body slot is still null');

  // ---- Clean up test save file ----
  try {
    await unlink(repo.getPath('test-persist'));
  } catch { /* ignore */ }

  return true;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  console.log('Darkheim Player Persistence -- Integration Tests');

  try {
    await testPlayerRepository();
    await testSaveRestoreRoundTrip();
  } catch (err) {
    console.error('\n[FATAL] Unexpected error during tests:', err);
    process.exit(1);
  }

  console.log(`\n===================================`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`===================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
