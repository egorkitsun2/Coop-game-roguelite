import { BalanceConfig } from '@config/balanceConfig';
import { GameEventType } from '@contracts/events';
import { eventBus } from '../eventBus';

export type BossType = 'beetle' | 'moth' | 'rat';

/**
 * Чистая логика состояния босса.
 * (Зона ответственности: Разработчик А)
 */
export class BossState {
  public x: number;
  public y: number;
  public readonly type: BossType;
  public readonly label: string;
  public readonly radius: number;
  public hp: number;
  public readonly maxHp: number;
  public readonly speed: number;
  public readonly damage: number;
  public readonly attackCooldown: number;
  public attackTimer: number = 0;
  public flashTimer: number = 0;
  public isDead: boolean = false;

  public readonly id: string;

  constructor(x: number, y: number, type: BossType) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.id = `boss_${type}`;

    const cfg = BalanceConfig.boss[type];
    this.label = cfg.label;
    this.radius = cfg.radius;
    this.maxHp = cfg.maxHp;
    this.hp = cfg.maxHp;
    this.speed = cfg.speed;
    this.damage = cfg.damage;
    this.attackCooldown = cfg.attackCooldown;
  }

  public update(dt: number, playerX: number, playerY: number, playerRadius: number): void {
    if (this.isDead) return;

    if (this.attackTimer > 0) this.attackTimer = Math.max(0, this.attackTimer - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.radius + playerRadius) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  }

  public tryAttackPlayer(playerX: number, playerY: number, playerRadius: number): boolean {
    if (this.isDead || this.attackTimer > 0) return false;

    const dist = Math.hypot(playerX - this.x, playerY - this.y);
    if (dist < this.radius + playerRadius) {
      this.attackTimer = this.attackCooldown;
      return true;
    }
    return false;
  }

  public takeDamage(amount: number): void {
    if (this.isDead) return;

    this.hp -= amount;
    this.flashTimer = 0.15;

    eventBus.emit(GameEventType.DAMAGE_DEALT, {
      targetId: this.id,
      sourceId: 'player',
      x: this.x,
      y: this.y,
      result: {
        rawDamage: amount,
        finalDamage: amount,
        isCrit: false,
        isFatal: this.hp <= 0,
        targetRemainingHp: Math.max(0, this.hp),
      },
    });

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      eventBus.emit(GameEventType.ENTITY_DIED, {
        entityId: this.id,
        isPlayer: false,
        x: this.x,
        y: this.y,
      });
    }
  }

  public get hpPercent(): number {
    return Math.max(0, this.hp / this.maxHp);
  }
}
