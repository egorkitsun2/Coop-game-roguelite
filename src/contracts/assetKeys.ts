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
  CARROT: 'player_carrot_sprite',
  ENEMY_BASIC: 'enemy_basic_sprite',
  CATERPILLAR: 'caterpillar_sprite',
  PROJECTILE: 'projectile_sprite',
  COIN: 'coin_sprite',
  TILES: 'dungeon_tiles',
  CRATE: 'crate_sprite',
  POTION: 'potion_sprite',
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

export const AnimationKeys = {
  CARROT_WALK_DOWN: 'carrot_walk_down',
  CARROT_WALK_UP: 'carrot_walk_up',
  CARROT_WALK_LEFT: 'carrot_walk_left',
  CARROT_WALK_RIGHT: 'carrot_walk_right',
  CARROT_IDLE: 'carrot_idle',
  CATERPILLAR_WALK_DOWN: 'caterpillar_walk_down',
  CATERPILLAR_WALK_UP: 'caterpillar_walk_up',
  CATERPILLAR_WALK_LEFT: 'caterpillar_walk_left',
  CATERPILLAR_WALK_RIGHT: 'caterpillar_walk_right',
} as const;

