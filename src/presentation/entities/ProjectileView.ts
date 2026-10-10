import Phaser from 'phaser';
import { TextureKeys } from '@contracts/assetKeys';

/**
 * Визуальный компонент снаряда (камень из рогатки).
 * Летит со скоростью 650 пикс/сек, наносит урон с учетом натяжения рогатки.
 * (Зона ответственности: Разработчик Б)
 */
export class ProjectileView extends Phaser.Physics.Arcade.Sprite {
  public damage: number = 5;
  private speed: number = 650;
  private maxLifeTime: number = 2000; // 2 секунды время жизни
  private spawnTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.PROJECTILE);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(9);
    this.setSize(10, 10);
  }

  public fire(targetX: number, targetY: number, speed?: number, damage?: number): void {
    if (speed !== undefined) this.speed = speed;
    if (damage !== undefined) this.damage = damage;

    this.spawnTime = this.scene.time.now;
    this.setActive(true);
    this.setVisible(true);

    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.setRotation(angle);

    const vx = Math.cos(angle) * this.speed;
    const vy = Math.sin(angle) * this.speed;
    this.setVelocity(vx, vy);

    this.scene.time.delayedCall(this.maxLifeTime, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  public update(time?: number, _delta?: number): void {
    if (!this.active) return;

    const now = time ?? this.scene?.time?.now ?? 0;
    if (this.spawnTime > 0 && now - this.spawnTime > this.maxLifeTime) {
      this.destroy();
      return;
    }

    const worldBounds = this.scene.physics?.world?.bounds;
    if (
      worldBounds &&
      (this.x < 0 || this.y < 0 || this.x > worldBounds.width || this.y > worldBounds.height)
    ) {
      this.destroy();
    }
  }
}
