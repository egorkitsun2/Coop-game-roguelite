/**
 * Общие типы данных (Контракты) между Engine (Разработчик А) и Visual (Разработчик Б).
 * Изменения в этом файле вносятся ТОЛЬКО по совместной договоренности!
 */

export interface ICharacterStats {
  maxHp: number;
  currentHp: number;
  damage: number;
  defense: number;
  moveSpeed: number;
  critChance: number; // 0.0 - 1.0
  critMultiplier: number; // 1.5, 2.0 etc.
  attackRange: number;
  attackCooldown: number; // в миллисекундах
}

export interface IEnemyData {
  id: string;
  name: string;
  stats: ICharacterStats;
  goldReward: number;
  expReward: number;
  spriteKey: string;
}

export interface IDamageResult {
  rawDamage: number;
  finalDamage: number;
  isCrit: boolean;
  isFatal: boolean;
  targetRemainingHp: number;
}

export interface ILootDrop {
  gold: number;
  exp: number;
  items?: string[];
}

export interface IMetaUpgrade {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  cost: number;
  statBonus: Partial<ICharacterStats>;
}

export interface ISaveData {
  version: number;
  totalGold: number;
  upgrades: Record<string, number>; // upgradeId -> level
  statistics: {
    runsCount: number;
    enemiesKilled: number;
  };
}
