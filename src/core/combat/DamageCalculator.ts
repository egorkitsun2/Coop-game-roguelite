import { ICharacterStats, IDamageResult } from '@contracts/types';

/**
 * Чистая математическая логика расчета повреждений.
 * (Зона ответственности: Разработчик А)
 */
export class DamageCalculator {
  public static calculate(
    attackerStats: ICharacterStats,
    defenderStats: ICharacterStats
  ): IDamageResult {
    const isCrit = Math.random() < attackerStats.critChance;
    const baseDamage = isCrit
      ? attackerStats.damage * attackerStats.critMultiplier
      : attackerStats.damage;

    // Формула снижения урона броней: урон * 100 / (100 + броня)
    const effectiveDefense = Math.max(0, defenderStats.defense);
    const mitigationRatio = 100 / (100 + effectiveDefense);
    const calculatedDamage = Math.round(baseDamage * mitigationRatio);
    const finalDamage = Math.max(1, calculatedDamage);

    defenderStats.currentHp = Math.max(0, defenderStats.currentHp - finalDamage);
    const isFatal = defenderStats.currentHp <= 0;

    return {
      rawDamage: Math.round(baseDamage),
      finalDamage,
      isCrit,
      isFatal,
      targetRemainingHp: defenderStats.currentHp,
    };
  }
}
