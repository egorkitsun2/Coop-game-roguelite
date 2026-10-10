import { IEnemyData } from '@contracts/types';
import { TextureKeys } from '@contracts/assetKeys';
import { CharacterStats } from './CharacterStats';

export type EnemyType = 'slime' | 'skeleton_runner' | 'brute';

export const ENEMY_TEMPLATES: Record<EnemyType, IEnemyData> = {
  slime: {
    id: 'slime',
    name: 'Зеленый слизень',
    stats: {
      maxHp: 40,
      currentHp: 40,
      damage: 8,
      defense: 0,
      moveSpeed: 80,
      critChance: 0.0,
      critMultiplier: 1.0,
      attackRange: 30,
      attackCooldown: 1000,
    },
    goldReward: 2,
    expReward: 5,
    spriteKey: TextureKeys.ENEMY_BASIC,
  },
  skeleton_runner: {
    id: 'skeleton_runner',
    name: 'Быстрый скелет',
    stats: {
      maxHp: 25,
      currentHp: 25,
      damage: 12,
      defense: 2,
      moveSpeed: 160,
      critChance: 0.1,
      critMultiplier: 1.5,
      attackRange: 35,
      attackCooldown: 800,
    },
    goldReward: 5,
    expReward: 10,
    spriteKey: TextureKeys.ENEMY_BASIC,
  },
  brute: {
    id: 'brute',
    name: 'Громила',
    stats: {
      maxHp: 120,
      currentHp: 120,
      damage: 25,
      defense: 10,
      moveSpeed: 60,
      critChance: 0.05,
      critMultiplier: 1.8,
      attackRange: 50,
      attackCooldown: 1500,
    },
    goldReward: 15,
    expReward: 30,
    spriteKey: TextureKeys.ENEMY_BASIC,
  },
};

/**
 * Фабрика для создания новых экземпляров врагов для спавна.
 * (Зона ответственности: Разработчик А)
 */
export class EnemyFactory {
  public static create(type: EnemyType): { data: IEnemyData; stats: CharacterStats } {
    const template = ENEMY_TEMPLATES[type];
    return {
      data: { ...template },
      stats: new CharacterStats(template.stats),
    };
  }
}
