import Phaser from 'phaser';
import { CharacterStats } from '@core/stats/CharacterStats';
import { TextureKeys } from '@contracts/assetKeys';

/**
 * Базовый враг (Личинка - умирает от одного удара согласно Basic).
 * Вид сверху (Vampire Survivors style), преследует игрока.
 * (Зона ответственности: Разработчик Б)
 */
export class EnemyView extends Phaser.Physics.Arcade.Sprite {
  public id: string;
  public stats: CharacterStats;
  private lastAttackTime: number = 0;
  private attackCooldownMs: number = 800; // Кулдаун контактного урона

  constructor(scene: Phaser.Scene, x: number, y: number, stats?: CharacterStats) {
    super(scene, x, y, TextureKeys.ENEMY_BASIC);

    this.id = `enemy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    // Характеристики Личинки: умирает с 1 удара (HP 4)
    this.stats = stats ?? new CharacterStats({
      maxHp: 4,
      currentHp: 4,
      damage: 5,
      defense: 0,
      moveSpeed: 75,
    });

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(8);
  }

  public update(targetX: number, targetY: number): void {
    if (!this.active) return;

    // Движение в сторону цели (игрока)
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.setRotation(angle);

    const vx = Math.cos(angle) * this.stats.moveSpeed;
    const vy = Math.sin(angle) * this.stats.moveSpeed;
    this.setVelocity(vx, vy);
  }

  public canAttack(currentTime: number): boolean {
    if (currentTime - this.lastAttackTime >= this.attackCooldownMs) {
      this.lastAttackTime = currentTime;
      return true;
    }
    return false;
  }

  public playHitFeedback(): void {
    // Вспышка красным при получении урона
    this.setTint(0xff4444);
    if (this.scene && this.scene.time) {
      this.scene.time.delayedCall(120, () => {
        if (this.active) {
          this.clearTint();
        }
      });
    }
  }
}
