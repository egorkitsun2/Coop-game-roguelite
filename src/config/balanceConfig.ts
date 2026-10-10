/**
 * Баланс и числовые конфигурации, вынесенные из demo.html.
 * Все геймплейные константы — в одном месте.
 * (Общая зона: согласуется между Дев А и Дев Б)
 */

export const WeaponType = {
  SLINGSHOT: 0, // Рогатка (Дальний бой)
  STICK: 1,     // Палка (Ближний бой)
} as const;

export type WeaponTypeValue = (typeof WeaponType)[keyof typeof WeaponType];

export const BalanceConfig = {
  player: {
    radius: 18,
    baseSpeed: 240,            // пикселей в секунду
    baseDamage: 5,             // базовый урон одного камня
    maxHp: 100,

    // Рывок (Dash)
    dashSpeed: 820,            // скорость рывка (пикс/сек)
    dashDuration: 180,         // длительность рывка (мс)
    dashCooldown: 2500,        // кулдаун рывка (мс)

    // Рогатка (Дальний бой)
    maxChargeTime: 1500,       // полное натяжение (мс)
    minDmgMult: 1.0,           // мин. множитель урона
    maxDmgMult: 2.5,           // макс. множитель при полном натяжении
    projectileSpeed: 650,      // скорость полёта камня (пикс/сек)

    // Блок палкой
    blockSpeedPenalty: 0.5,    // скорость при блоке = 50%
  },

  enemy: {
    caterpillar: {
      hp: 5,
      speed: 65,
      radius: 24,
      contactDamage: 5,
      contactCooldown: 800,    // мс
    },
  },

  loot: {
    crateHp: 1,
    potionDropChance: 0.15,    // 15% из ящика
    potionInstantHeal: 20,     // мгновенный хил
    potionRegenDuration: 10,   // секунды регенерации
    potionRegenPerSecond: 1,   // HP/сек
  },

  arena: {
    gridSize: 40,
    gridColor: '#1a2230',
  },
} as const;
