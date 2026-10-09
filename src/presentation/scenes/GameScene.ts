import Phaser from 'phaser';
import { SceneKeys } from '@contracts/assetKeys';
import { CharacterStats } from '@core/stats/CharacterStats';
import { InputManager } from '../input/InputManager';
import { PlayerView } from '../entities/PlayerView';
import { HUDView } from '../ui/HUDView';
import { JuiceEffects } from '../fx/JuiceEffects';

/**
 * Основная игровая сцена: забег, управление, боевой цикл.
 * (Зона ответственности: Разработчик Б, использующий модули Разработчика А)
 */
export class GameScene extends Phaser.Scene {
  private player!: PlayerView;
  private inputManager!: InputManager;
  private hud!: HUDView;
  private juice!: JuiceEffects;

  constructor() {
    super(SceneKeys.GAME);
  }

  public create(): void {
    const { width, height } = this.scale;

    // 1. Инициализация ввода и сочности
    this.inputManager = new InputManager(this);
    this.juice = new JuiceEffects(this);

    // 2. Инициализация модели данных игрока (Ядро от Дев А)
    const playerStats = new CharacterStats({
      maxHp: 100,
      damage: 25,
      moveSpeed: 220,
    });

    // 3. Создание визуального представления игрока (Визуал от Дев Б)
    this.player = new PlayerView(
      this,
      width / 2,
      height / 2,
      playerStats,
      this.inputManager
    );

    // 4. Инициализация HUD
    this.hud = new HUDView(this);
    this.hud.updateHp(playerStats.currentHp, playerStats.maxHp);
  }

  public update(): void {
    if (this.player) {
      this.player.update();
    }
  }
}
