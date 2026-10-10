/**
 * Логика разрушаемого ящика.
 * (Зона ответственности: Разработчик А)
 */
export class CrateState {
  public readonly x: number;
  public readonly y: number;
  public readonly radius: number = 16;
  public isDead: boolean = false;

  public readonly id: string;

  constructor(id: string, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
  }

  public collidesWithCircle(cx: number, cy: number, cRadius: number): boolean {
    return Math.hypot(this.x - cx, this.y - cy) < this.radius + cRadius;
  }
}
