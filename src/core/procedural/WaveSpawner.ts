import { BalanceConfig } from '@config/balanceConfig';
import { EnemyState } from '../entities/EnemyState';
import { BossState, BossType } from '../entities/BossState';

export type WaveResult =
  | { kind: 'normal'; enemies: EnemyState[] }
  | { kind: 'boss'; boss: BossState };

/**
 * Управляет генерацией волн врагов и боссов.
 * Чистая логика — не знает о Phaser.
 * (Зона ответственности: Разработчик А)
 */
export class WaveSpawner {
  public currentWave: number = 1;
  public isWaveActive: boolean = false;

  private readonly arenaWidth: number;
  private readonly arenaHeight: number;
  private idCounter: number = 0;

  constructor(arenaWidth: number, arenaHeight: number) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
  }

  /**
   * Запустить следующую волну.
   * Волны кратные 3 — босс-волны.
   */
  public startNextWave(): WaveResult {
    this.isWaveActive = true;
    const wave = this.currentWave;

    if (wave % BalanceConfig.wave.bossWaveInterval === 0) {
      const bossType = this._getBossTypeForWave(wave);
      const cx = this.arenaWidth / 2;
      const cy = this.arenaHeight / 2;
      const boss = new BossState(cx, cy, bossType);
      return { kind: 'boss', boss };
    }

    const count = wave === 1
      ? BalanceConfig.wave.initialEnemyCount
      : BalanceConfig.wave.enemyCountFormula(wave);

    const enemies = this._spawnEnemies(count);
    return { kind: 'normal', enemies };
  }

  /**
   * Вызывать каждый кадр — возвращает true если волна завершена.
   * @param activeEnemies — количество живых врагов (0 = волна окончена)
   * @param bossAlive — жив ли босс
   */
  public checkWaveComplete(activeEnemies: number, bossAlive: boolean): boolean {
    if (!this.isWaveActive) return false;
    if (bossAlive) return false;
    if (activeEnemies > 0) return false;

    this.isWaveActive = false;
    this.currentWave++;
    return true;
  }

  private _getBossTypeForWave(wave: number): BossType {
    if (wave % 9 === 0) return 'rat';
    if (wave % 6 === 0) return 'moth';
    return 'beetle';
  }

  private _spawnEnemies(count: number): EnemyState[] {
    const enemies: EnemyState[] = [];
    const { arenaWidth: w, arenaHeight: h } = this;

    for (let i = 0; i < count; i++) {
      const { x, y } = this._randomEdgePosition(w, h);
      const id = `enemy_${++this.idCounter}`;
      enemies.push(new EnemyState(x, y, id));
    }

    return enemies;
  }

  private _randomEdgePosition(w: number, h: number): { x: number; y: number } {
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0: return { x: 60 + Math.random() * (w - 120), y: 24 };           // верх
      case 1: return { x: 60 + Math.random() * (w - 120), y: h - 24 };       // низ
      case 2: return { x: 24, y: 60 + Math.random() * (h - 120) };            // лево
      default: return { x: w - 24, y: 60 + Math.random() * (h - 120) };      // право
    }
  }
}
