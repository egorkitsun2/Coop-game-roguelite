/**
 * Ключи ресурсов (спрайты, звуки, анимации).
 * Дев Б регистрирует ассеты, Дев А и Б обращаются по константам, избегая опечаток.
 */

export const SceneKeys = {
  BOOT: 'BootScene',
  MAIN_MENU: 'MainMenuScene',
  GAME: 'GameScene',
  UPGRADE_SHOP: 'UpgradeShopScene',
  GAME_OVER: 'GameOverScene',
} as const;

export const TextureKeys = {
  PLAYER: 'player_sprite',
  ENEMY_BASIC: 'enemy_basic_sprite',
  CATERPILLAR: 'caterpillar_sprite',
  PROJECTILE: 'projectile_sprite',
  COIN: 'coin_sprite',
  TILES: 'dungeon_tiles',
} as const;

export const AudioKeys = {
  BGM_MAIN: 'bgm_main',
  BGM_BATTLE: 'bgm_battle',
  SFX_ATTACK: 'sfx_attack',
  SFX_HIT: 'sfx_hit',
  SFX_COIN: 'sfx_coin',
  SFX_DEATH: 'sfx_death',
  SFX_UPGRADE: 'sfx_upgrade',
} as const;
