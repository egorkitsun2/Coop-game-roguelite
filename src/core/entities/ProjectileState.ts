import { BalanceConfig } from '@config/balanceConfig';

/**
 * Чистая логика снаряда (камень рогатки).
 * Хранит позицию и вектор движения — без Canvas.
 * (Зона ответственности: Разработчик А)
 */
export class ProjectileState {
  public x: number;
  public y: number;
  public readonly vx: number;
  public readonly vy: number;
  public readonly damage: number;
  public readonly radius: number = 5;
  public isDead: boolean = false;
  private lifeTime: number;

  public readonly id: string;

  constructor(
    id: string,
    originX: number,
    originY: number,
    targetX: number,
    targetY: number,
    damage: number,
  ) {
    this.id = id;
    this.x = originX;
    this.y = originY;
    this.damage = damage;
    this.lifeTime = BalanceConfig.player.projectileLifetime;

    const dx = targetX - originX;
    const dy = targetY - originY;
    const len = Math.hypot(dx, dy) || 1;
    const speed = BalanceConfig.player.projectileSpeed;

    this.vx = (dx / len) * speed;
    this.vy = (dy / len) * speed;
  }

  public update(dt: number, arenaWidth: number, arenaHeight: number): void {
    if (this.isDead) return;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifeTime -= dt;

    if (
      this.lifeTime <= 0 ||
      this.x < 0 || this.x > arenaWidth ||
      this.y < 0 || this.y > arenaHeight
    ) {
      this.isDead = true;
    }
  }

  /** Проверить коллизию с круглым объектом */
  public collidesWithCircle(cx: number, cy: number, cRadius: number): boolean {
    return Math.hypot(this.x - cx, this.y - cy) < this.radius + cRadius;
  }
}
