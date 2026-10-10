/**
 * Шина событий: Контракты событий.
 * Дев А (Логика) эмитит события при изменении данных.
 * Дев Б (Визуал) подписывается и проигрывает анимации, звуки, UI.
 */
import { IDamageResult, ILootDrop } from './types';

export enum GameEventType {
  // Игрок & Враги
  DAMAGE_DEALT = 'DAMAGE_DEALT',
  ENTITY_DIED = 'ENTITY_DIED',
  PLAYER_HEALED = 'PLAYER_HEALED',
  
  // Экономика и прогрессия
  GOLD_UPDATED = 'GOLD_UPDATED',
  LOOT_DROPPED = 'LOOT_DROPPED',
  UPGRADE_PURCHASED = 'UPGRADE_PURCHASED',

  // Механики из demo (ящики, зелья, оружие)
  POTION_COLLECTED = 'POTION_COLLECTED',
  CRATE_DESTROYED = 'CRATE_DESTROYED',
  WEAPON_CHANGED = 'WEAPON_CHANGED',

  // Стейт игры
  GAME_OVER = 'GAME_OVER',
  RUN_STARTED = 'RUN_STARTED',
  ROOM_CLEARED = 'ROOM_CLEARED',
}

export interface GameEventPayloads {
  [GameEventType.DAMAGE_DEALT]: {
    targetId: string;
    sourceId: string;
    x: number;
    y: number;
    result: IDamageResult;
  };
  [GameEventType.ENTITY_DIED]: {
    entityId: string;
    isPlayer: boolean;
    x: number;
    y: number;
  };
  [GameEventType.PLAYER_HEALED]: {
    amount: number;
    currentHp: number;
    maxHp: number;
  };
  [GameEventType.GOLD_UPDATED]: {
    totalGold: number;
    delta: number;
  };
  [GameEventType.LOOT_DROPPED]: {
    x: number;
    y: number;
    loot: ILootDrop;
  };
  [GameEventType.UPGRADE_PURCHASED]: {
    upgradeId: string;
    newLevel: number;
  };
  [GameEventType.POTION_COLLECTED]: {
    healAmount: number;
    regenDuration: number;
    x: number;
    y: number;
  };
  [GameEventType.CRATE_DESTROYED]: {
    crateId: string;
    x: number;
    y: number;
    droppedPotion: boolean;
  };
  [GameEventType.WEAPON_CHANGED]: {
    weaponType: number;
  };
  [GameEventType.GAME_OVER]: {
    score: number;
    goldEarned: number;
  };
  [GameEventType.RUN_STARTED]: {
    runId: string;
  };
  [GameEventType.ROOM_CLEARED]: {
    roomId: string;
  };
}
