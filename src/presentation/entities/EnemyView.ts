import Phaser from 'phaser';
import { CharacterStats } from '@core/stats/CharacterStats';
import { TextureKeys, AnimationKeys } from '@contracts/assetKeys';

/**
 * Базовый враг (Гусеница / Личинка - умирает от одного удара согласно Basic).
 * Вид сверху (Vampire Survivors style), преследует игрока.
 * (Зона ответственности: Разработчик Б)
 */
export class EnemyView extends Phaser.Physics.Arcade.Sprite {
  public id: string;
  public stats: CharacterStats;
  private lastAttackTime: number = 0;
  private attackCooldownMs: number = 800; // Кулдаун контактного урона

  constructor(scene: Phaser.Scene, x: number, y: number, stats?: CharacterStats) {
    super(scene, x, y, TextureKeys.CATERPILLAR);

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
    this.setScale(0.5);
    this.setSize(54, 54);
  }

  private _targetX: number = 0;
  private _targetY: number = 0;

  /** Устанавливает координаты цели для преследования */
  public setTarget(targetX: number, targetY: number): void {
    this._targetX = targetX;
    this._targetY = targetY;
  }

  public update(_time?: number, _delta?: number): void {
    if (!this.active) return;

    // Движение в сторону цели (игрока)
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this._targetX, this._targetY);
    const vx = Math.cos(angle) * this.stats.moveSpeed;
    const vy = Math.sin(angle) * this.stats.moveSpeed;
    this.setVelocity(vx, vy);

    // Анимация направления гусеницы
    const dx = this._targetX - this.x;
    const dy = this._targetY - this.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.play(dx > 0 ? AnimationKeys.CATERPILLAR_WALK_RIGHT : AnimationKeys.CATERPILLAR_WALK_LEFT, true);
    } else {
      this.play(dy > 0 ? AnimationKeys.CATERPILLAR_WALK_DOWN : AnimationKeys.CATERPILLAR_WALK_UP, true);
    }
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
