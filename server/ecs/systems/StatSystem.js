import System from '../System.js';
import StatsComponent from '../components/StatsComponent.js';
import EquipmentComponent from '../components/EquipmentComponent.js';
import HealthComponent from '../components/HealthComponent.js';
import CombatComponent from '../components/CombatComponent.js';
import StatusEffectComponent from '../components/StatusEffectComponent.js';
import {
  deriveMaxHp, deriveDamageBonus, deriveArmor,
  deriveAttackSpeedMod, deriveCritChance, deriveCritMultiplier,
} from '../../../shared/StatTypes.js';

export default class StatSystem extends System {
  constructor() {
    super(8); // before movement(10) and combat(15)
  }

  update(dt, entityManager, context) {
    const entities = entityManager.query([StatsComponent]);

    for (const entity of entities) {
      const stats = entity.getComponent(StatsComponent);
      const health = entity.getComponent(HealthComponent);
      const combat = entity.getComponent(CombatComponent);
      const equip = entity.getComponent(EquipmentComponent);

      if (!health || !combat) continue;

      // Recalculate equipment bonuses
      if (equip) {
        stats.recalcEquipBonuses(equip.slots);
      }

      // Derive max HP from Vitality
      const newMaxHp = deriveMaxHp(stats.getTotal('vit'));
      if (health.max !== newMaxHp) {
        const ratio = health.max > 0 ? health.current / health.max : 1;
        health.max = newMaxHp;
        health.current = Math.round(ratio * newMaxHp);
      }

      // Derive combat stats
      const totalStr = stats.getTotal('str');
      const totalDex = stats.getTotal('dex');
      const totalEnd = stats.getTotal('end');
      const totalLck = stats.getTotal('lck');

      const weaponBase = stats.getWeaponBaseDamage();
      combat.damage = Math.round(weaponBase + deriveDamageBonus(totalStr));
      combat.attackSpeed = Math.max(0.5, 1.5 * deriveAttackSpeedMod(totalDex));
      combat.armor = Math.round(deriveArmor(totalEnd) + stats.getTotalArmor());
      combat.critChance = Math.min(0.5, deriveCritChance(totalDex, totalLck));
      combat.critMultiplier = deriveCritMultiplier(totalLck);

      // Apply status effect modifiers (War Cry, Iron Skin, Berserker Rage, etc.)
      const se = entity.getComponent(StatusEffectComponent);
      if (se) {
        combat.damage = Math.round(combat.damage * se.getDamageMod());
        combat.armor = Math.round((combat.armor + se.getArmorFlat()) * se.getArmorMod());
        combat.attackSpeed = Math.max(0.3, combat.attackSpeed * se.getAttackSpeedMod());
      }
    }
  }
}
