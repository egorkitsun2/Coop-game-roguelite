/**
 * Логика зелья лечения (pickup на полу).
 * (Зона ответственности: Разработчик А)
 */
export class PotionState {
  public readonly x: number;
  public readonly y: number;
  public readonly radius: number = 12;
  public isDead: boolean = false;

  /** Таймер для анимации левитации (только визуал — презентация читает его) */
  public bobbleTime: number = 0;

  public readonly id: string;

  constructor(id: string, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
  }

  public update(dt: number): void {
    this.bobbleTime += dt * 4;
  }

  public collidesWithCircle(cx: number, cy: number, cRadius: number): boolean {
    return Math.hypot(this.x - cx, this.y - cy) < this.radius + cRadius;
  }
}
