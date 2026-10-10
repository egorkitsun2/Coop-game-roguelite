/**
 * Баланс игры — все числовые константы в одном месте.
 * Зона ответственности: Разработчик А (редактируется по согласованию).
 */
export const BalanceConfig = {
  player: {
    radius: 18,                 // px — хитбокс (уменьшается после победы над Плодожоркой)
    baseSpeed: 240,             // px/s
    dashSpeed: 820,             // px/s во время рывка
    dashDuration: 0.18,         // с — длина рывка
    dashCooldown: 2.5,          // с — кулдаун рывка
    dashCooldownMin: 0.5,       // с — минимальный порог (апгрейд)
    maxHp: 100,
    baseDamage: 5,
    maxChargeTime: 1.5,         // с — полное натяжение рогатки
    maxChargTimeMin: 0.35,      // с — минимум после апгрейдов
    minDmgMult: 1.0,
    maxDmgMult: 2.5,
    projectileSpeed: 650,       // px/s
    projectileLifetime: 2.0,    // с
  },

  enemy: {
    baseHp: 30,
    baseSpeed: 125,             // px/s (строго < скорости игрока 240)
    baseDamage: 10,
    attackCooldown: 1.0,        // с
    radius: 16,                 // px
  },

  boss: {
    beetle: {
      label: '🐞 Колорадский жук',
      radius: 36,
      maxHp: 200,
      speed: 75,
      damage: 15,
      attackCooldown: 1.5,
      color: '#d69e2e',
      strokeColor: '#b7791f',
      // Награда: щитовые заряды
      shieldChargesReward: 3,
    },
    moth: {
      label: '🦋 Яблонная плодожорка',
      radius: 30,
      maxHp: 300,
      speed: 90,
      damage: 12,
      attackCooldown: 1.2,
      color: '#805ad5',
      strokeColor: '#553c9a',
      // Награда: уменьшение хитбокса
      hitboxScaleReward: 0.7,
      hitboxMin: 8,
    },
    rat: {
      label: '🐀 Крыса',
      radius: 40,
      maxHp: 450,
      speed: 110,
      damage: 20,
      attackCooldown: 1.0,
      color: '#718096',
      strokeColor: '#4a5568',
      // Награда: финал игры
    },
  },

  upgrades: {
    damageBonus: 3,             // +3 к базовому урону
    attackSpeedMult: 1.3,       // натяжение рогатки в 1.3x быстрее
    dashCooldownReduction: 0.5, // -0.5с кулдауна рывка
  },

  potion: {
    dropChance: 0.15,           // 15% шанс выпадения из ящика
    instantHeal: 20,            // мгновенный хил
    regenDuration: 10,          // с — длительность регенерации
    regenTickInterval: 1.0,     // с — интервал тика
    regenHpPerTick: 1,          // HP за тик
  },

  wave: {
    initialEnemyCount: 3,       // враги на волне 1
    enemyCountFormula: (wave: number) => 2 + wave * 2, // враги на волне N
    bossWaveInterval: 3,        // каждые N волн — босс
  },

  arena: {
    width: 960,
    height: 540,
    gridSize: 40,
    gridColor: '#1a2230',
  },
} as const;
