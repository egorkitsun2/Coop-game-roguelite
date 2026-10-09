import { ICharacterStats } from '@contracts/types';

/**
 * Базовый класс для расчета и модификации характеристик персонажей/врагов.
 * (Зона ответственности: Разработчик А)
 */
export class CharacterStats implements ICharacterStats {
  public maxHp: number;
  public currentHp: number;
  public damage: number;
  public defense: number;
  public moveSpeed: number;
  public critChance: number;
  public critMultiplier: number;
  public attackRange: number;
  public attackCooldown: number;

  constructor(initial: Partial<ICharacterStats> = {}) {
    this.maxHp = initial.maxHp ?? 100;
    this.currentHp = initial.currentHp ?? this.maxHp;
    this.damage = initial.damage ?? 15;
    this.defense = initial.defense ?? 0;
    this.moveSpeed = initial.moveSpeed ?? 200;
    this.critChance = initial.critChance ?? 0.05;
    this.critMultiplier = initial.critMultiplier ?? 1.5;
    this.attackRange = initial.attackRange ?? 150;
    this.attackCooldown = initial.attackCooldown ?? 500;
  }

  public heal(amount: number): number {
    const prev = this.currentHp;
    this.currentHp = Math.min(this.maxHp, this.currentHp + Math.max(0, amount));
    return this.currentHp - prev;
  }

  public applyModifier(bonuses: Partial<ICharacterStats>): void {
    if (bonuses.maxHp) {
      this.maxHp += bonuses.maxHp;
      this.currentHp += bonuses.maxHp;
    }
    if (bonuses.damage) this.damage += bonuses.damage;
    if (bonuses.defense) this.defense += bonuses.defense;
    if (bonuses.moveSpeed) this.moveSpeed += bonuses.moveSpeed;
    if (bonuses.critChance) this.critChance = Math.min(1.0, this.critChance + bonuses.critChance);
    if (bonuses.critMultiplier) this.critMultiplier += bonuses.critMultiplier;
    if (bonuses.attackCooldown) this.attackCooldown = Math.max(100, this.attackCooldown - bonuses.attackCooldown);
  }

  public clone(): CharacterStats {
    return new CharacterStats({
      maxHp: this.maxHp,
      currentHp: this.currentHp,
      damage: this.damage,
      defense: this.defense,
      moveSpeed: this.moveSpeed,
      critChance: this.critChance,
      critMultiplier: this.critMultiplier,
      attackRange: this.attackRange,
      attackCooldown: this.attackCooldown,
    });
  }
}
