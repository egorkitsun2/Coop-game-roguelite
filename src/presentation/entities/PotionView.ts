import Phaser from 'phaser';
import { TextureKeys } from '@contracts/assetKeys';

/**
 * Предмет: Зелье Лечения (Potion).
 * Выпадает из разрушенных ящиков (шанс 15%).
 * Эффект подбора: +20 мгновенного HP + регенерация (+1 HP/сек в течение 10 сек).
 * (Зона ответственности: Разработчик Б)
 */
export class PotionView extends Phaser.Physics.Arcade.Sprite {
  private startY: number;
  private bobbleTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.POTION);

    this.startY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(7);
    this.setSize(18, 18);

    // Легкая пульсация масштаба
    scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  public update(_time?: number, delta?: number): void {
    if (!this.active) return;
    const dt = (delta ?? 16) / 1000;
    this.bobbleTimer += dt * 4;
    this.y = this.startY + Math.sin(this.bobbleTimer) * 4;
  }
}
