import Phaser from 'phaser';
import { CharacterStats } from '@core/stats/CharacterStats';
import { TextureKeys } from '@contracts/assetKeys';
import { InputManager } from '../input/InputManager';

/**
 * Визуальный компонент игрока в мире Phaser (спрайт, физическое тело, рендеринг).
 * (Зона ответственности: Разработчик Б)
 */
export class PlayerView extends Phaser.Physics.Arcade.Sprite {
  public stats: CharacterStats;
  private inputManager: InputManager;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: CharacterStats, inputManager: InputManager) {
    super(scene, x, y, TextureKeys.PLAYER);

    this.stats = stats;
    this.inputManager = inputManager;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(10);
  }

  public update(): void {
    const moveDir = this.inputManager.getMovementVector();
    this.setVelocity(
      moveDir.x * this.stats.moveSpeed,
      moveDir.y * this.stats.moveSpeed
    );

    // Поворот в сторону мыши
    const pointerPos = this.inputManager.getPointerWorldPosition();
    const angle = Phaser.Math.Angle.Between(this.x, this.y, pointerPos.x, pointerPos.y);
    this.setRotation(angle);
  }
}
