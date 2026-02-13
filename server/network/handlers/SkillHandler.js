import { MSG } from '../../../shared/MessageTypes.js';
import { SKILL_DB, DASH_CONFIG } from '../../../shared/SkillTypes.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import SkillComponent from '../../ecs/components/SkillComponent.js';

export default class SkillHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.SKILL_USE, (player, data) => this.handleSkillUse(player, data));
    router.register(MSG.SKILL_HOTBAR_SET, (player, data) => this.handleHotbarSet(player, data));
    router.register(MSG.DASH_USE, (player) => this.handleDashUse(player));
  }

  handleSkillUse(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const skills = entity.getComponent(SkillComponent);
    if (!skills) return;

    const slot = data?.slot;
    if (typeof slot !== 'number' || slot < 0 || slot > 4) return;

    const skillId = skills.hotbar[slot];
    if (!skillId) return;

    const result = this.gameServer.skillExecutor.execute(
      entity, skillId, this.gameServer.entityManager
    );

    // Send result to player
    player.emit(MSG.SKILL_RESULT, result);

    // Send updated cooldowns
    if (result.success) {
      const def = SKILL_DB[skillId];
      player.emit(MSG.SKILL_COOLDOWN, {
        skillId,
        remaining: def ? def.cooldown : 0,
        total: def ? def.cooldown : 0,
      });
    }
  }

  handleDashUse(player) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const result = this.gameServer.skillExecutor.executeDashStandalone(entity);
    player.emit(MSG.SKILL_RESULT, result);

    if (result.success) {
      player.emit(MSG.DASH_COOLDOWN, {
        remaining: DASH_CONFIG.cooldown,
        total: DASH_CONFIG.cooldown,
      });
    }
  }

  handleHotbarSet(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const skills = entity.getComponent(SkillComponent);
    if (!skills) return;

    const { slot, skillId } = data || {};
    if (typeof slot !== 'number' || slot < 0 || slot > 4) return;

    // skillId can be null (to clear a slot) or a valid learned skill
    if (skillId != null && !skills.hasSkill(skillId)) return;

    skills.setHotbar(slot, skillId);

    player.emit(MSG.SKILL_UPDATE, {
      learnedSkills: [...skills.learnedSkills],
      hotbar: skills.hotbar,
      cooldowns: skills.cooldowns,
    });
  }
}
