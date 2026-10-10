import { BalanceConfig } from '@config/balanceConfig';
import { GameEventType } from '@contracts/events';
import { eventBus } from '../eventBus';

/**
 * Чистая логика состояния рядового врага.
 * Не знает о Phaser/Canvas.
 * (Зона ответственности: Разработчик А)
 */
export class EnemyState {
  public x: number;
  public y: number;
  public readonly radius: number;
  public hp: number;
  public readonly maxHp: number;
  public readonly speed: number;
  public readonly damage: number;
  public readonly attackCooldown: number;
  public attackTimer: number = 0;
  public flashTimer: number = 0; // для презентации: мигание при уроне
  public isDead: boolean = false;

  /** Уникальный ID для шины событий */
  public readonly id: string;

  constructor(x: number, y: number, id: string) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.radius = BalanceConfig.enemy.radius;
    this.maxHp = BalanceConfig.enemy.baseHp;
    this.hp = this.maxHp;
    this.speed = BalanceConfig.enemy.baseSpeed;
    this.damage = BalanceConfig.enemy.baseDamage;
    this.attackCooldown = BalanceConfig.enemy.attackCooldown;
  }

  /**
   * Обновить ИИ: движение по нормализованному вектору к игроку.
   * @param dt — delta time в секундах
   * @param playerX — позиция игрока X
   * @param playerY — позиция игрока Y
   * @param playerRadius — радиус хитбокса игрока
   */
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

  /**
   * Проверить касание с игроком и нанести урон (с кулдауном).
   * @returns true если атака прошла в этом кадре
   */
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
    this.flashTimer = 0.12;

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
}
