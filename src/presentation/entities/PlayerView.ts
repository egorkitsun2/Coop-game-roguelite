import Phaser from 'phaser';
import { CharacterStats } from '@core/stats/CharacterStats';
import { TextureKeys, AnimationKeys } from '@contracts/assetKeys';
import { InputManager } from '../input/InputManager';

/**
 * Визуальный компонент игрока в мире Phaser (спрайт, физическое тело, рендеринг).
 * (Зона ответственности: Разработчик Б)
 */
export class PlayerView extends Phaser.Physics.Arcade.Sprite {
  public stats: CharacterStats;
  private inputManager: InputManager;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: CharacterStats, inputManager: InputManager) {
    super(scene, x, y, TextureKeys.CARROT);

    this.stats = stats;
    this.inputManager = inputManager;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(10);
    this.setScale(0.6);
    this.setSize(44, 70);
    this.setOffset(42, 35);
  }

  public update(_time?: number, _delta?: number): void {
    const moveDir = this.inputManager.getMovementVector();
    this.setVelocity(
      moveDir.x * this.stats.moveSpeed,
      moveDir.y * this.stats.moveSpeed
    );

    const isMoving = moveDir.x !== 0 || moveDir.y !== 0;
    if (isMoving) {
      if (Math.abs(moveDir.x) > Math.abs(moveDir.y)) {
        this.play(moveDir.x > 0 ? AnimationKeys.CARROT_WALK_RIGHT : AnimationKeys.CARROT_WALK_LEFT, true);
      } else {
        this.play(moveDir.y > 0 ? AnimationKeys.CARROT_WALK_DOWN : AnimationKeys.CARROT_WALK_UP, true);
      }
    } else {
      if (this.anims.isPlaying) {
        this.stop();
      }
      // Когда персонаж стоит — смотрим в сторону прицела мыши
      const pointerPos = this.inputManager.getPointerWorldPosition();
      const dx = pointerPos.x - this.x;
      const dy = pointerPos.y - this.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        this.setFrame(dx > 0 ? 24 : 16);
      } else {
        this.setFrame(dy > 0 ? 0 : 8);
      }
    }
  }
}

