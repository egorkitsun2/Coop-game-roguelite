import { BalanceConfig } from '@config/balanceConfig';
import { GameEventType } from '@contracts/events';
import { eventBus } from './eventBus';
import { PlayerState } from './entities/PlayerState';
import { EnemyState } from './entities/EnemyState';
import { BossState, BossType } from './entities/BossState';
import { ProjectileState } from './entities/ProjectileState';
import { CrateState } from './entities/CrateState';
import { PotionState } from './entities/PotionState';
import { WaveSpawner } from './procedural/WaveSpawner';

export type GamePhase =
  | 'playing'
  | 'wave_complete'   // пауза, ждём выбор апгрейда
  | 'boss_reward'     // пауза, ждём выбор апгрейда после босса
  | 'finale'          // победа — крыса убита
  | 'game_over';      // игрок умер

/**
 * Главный оркестратор игровой логики.
 * Phaser-сцена (Разработчик Б) вызывает update() каждый кадр
 * и читает публичные поля для отрисовки.
 *
 * GameWorld не знает о Phaser, DOM, Canvas.
 * (Зона ответственности: Разработчик А)
 */
export class GameWorld {
  // -----------------------------------------------
  // ПУБЛИЧНОЕ СОСТОЯНИЕ (читает Phaser-сцена)
  // -----------------------------------------------
  public readonly player: PlayerState;
  public enemies: EnemyState[] = [];
  public boss: BossState | null = null;
  public projectiles: ProjectileState[] = [];
  public crates: CrateState[] = [];
  public potions: PotionState[] = [];
  public phase: GamePhase = 'playing';

  public readonly waveSpawner: WaveSpawner;

  private readonly arenaW: number;
  private readonly arenaH: number;
  private projIdCounter = 0;
  private potionIdCounter = 0;
  private crateIdCounter = 0;

  // -----------------------------------------------
  // КОЛБЭКИ → Phaser-сцена подписывается на них
  // -----------------------------------------------
  public onWaveComplete: ((wave: number) => void) | null = null;
  public onBossDefeated: ((bossType: BossType) => void) | null = null;
  public onFinale: (() => void) | null = null;
  public onGameOver: (() => void) | null = null;

  constructor() {
    this.arenaW = BalanceConfig.arena.width;
    this.arenaH = BalanceConfig.arena.height;

    this.player = new PlayerState(this.arenaW / 2, this.arenaH / 2);
    this.waveSpawner = new WaveSpawner(this.arenaW, this.arenaH);

    this._spawnInitialCrates();
    this._launchWave(); // первая волна
  }

  // -----------------------------------------------
  // ГЛАВНЫЙ UPDATE — вызывается Phaser каждый кадр
  // -----------------------------------------------
  public update(dt: number, input: IFrameInput): void {
    if (this.phase !== 'playing') return;

    // 1. Игрок
    this._updatePlayer(dt, input);

    // 2. Снаряды
    this._updateProjectiles(dt);

    // 3. Зелья (анимация)
    this.potions.forEach(p => p.update(dt));

    // 4. Враги
    this._updateEnemies(dt);

    // 5. Босс
    this._updateBoss(dt);

    // 6. Коллизии снарядов с врагами / боссом / ящиками
    this._resolveProjectileCollisions();

    // 7. Коллизии игрока с зельями
    this._resolvePlayerPotionPickup();

    // 8. Проверка конца волны
    this._checkWaveEnd();
  }

  // -----------------------------------------------
  // ВВОД ОТ PHASER-СЦЕНЫ
  // -----------------------------------------------

  /** Phaser-сцена вызывает после выбора апгрейда */
  public applyUpgrade(type: 'damage' | 'attack_speed' | 'dash_cooldown'): void {
    if (this.phase !== 'wave_complete' && this.phase !== 'boss_reward') return;

    switch (type) {
      case 'damage':        this.player.upgradeDamage(); break;
      case 'attack_speed':  this.player.upgradeAttackSpeed(); break;
      case 'dash_cooldown': this.player.upgradeDashCooldown(); break;
    }

    this.phase = 'playing';
    this._launchWave();
  }

  /** Рестарт после смерти или победы */
  public restart(): void {
    this.player.reset();
    this.enemies = [];
    this.boss = null;
    this.projectiles = [];
    this.potions = [];
    this.crates = [];

    // Пересоздаём спавнер
    Object.assign(this.waveSpawner, new WaveSpawner(this.arenaW, this.arenaH));

    this._spawnInitialCrates();
    this.phase = 'playing';
    this._launchWave();
  }

  // -----------------------------------------------
  // ВНУТРЕННИЕ МЕТОДЫ
  // -----------------------------------------------

  private _updatePlayer(dt: number, input: IFrameInput): void {
    const p = this.player;
    p.updateTimers(dt);

    // Прицеливание
    const dx = input.mouseX - p.x;
    const dy = input.mouseY - p.y;
    p.rotation = Math.atan2(dy, dx);

    // Смена оружия
    if (input.weapon1) p.switchWeapon('slingshot');
    if (input.weapon2) p.switchWeapon('stick');

    // Оружие
    if (p.currentWeapon === 'slingshot') {
      p.isBlocking = false;
      if (input.rmbDown) {
        p.chargeTime = Math.min(p.maxChargeTime, p.chargeTime + dt);
      } else if (input.rmbReleased && p.chargeTime > 0) {
        const dmg = p.calcShotDamage();
        this._fireProjectile(p.x, p.y, input.mouseX, input.mouseY, dmg);
        p.chargeTime = 0;
      }
    } else {
      p.chargeTime = 0;
      p.isBlocking = input.rmbDown;
    }

    // Движение
    let mx = 0, my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;

    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; }

    const speedMod = p.isBlocking ? 0.5 : 1.0;

    if (input.dash && p.canDash()) {
      p.startDash();
      const dirX = mx || Math.cos(p.rotation);
      const dirY = my || Math.sin(p.rotation);
      Object.assign(p, {
        _dashVx: dirX * BalanceConfig.player.dashSpeed,
        _dashVy: dirY * BalanceConfig.player.dashSpeed,
      });
    }

    if (p.isDashing) {
      // Скорость рывка хранится как временное поле — Phaser может переопределить
      const vx = (p as any)._dashVx ?? 0;
      const vy = (p as any)._dashVy ?? 0;
      p.x += vx * dt;
      p.y += vy * dt;
    } else {
      p.x += mx * BalanceConfig.player.baseSpeed * speedMod * dt;
      p.y += my * BalanceConfig.player.baseSpeed * speedMod * dt;
    }

    // Границы арены
    p.x = Math.max(p.radius, Math.min(this.arenaW - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(this.arenaH - p.radius, p.y));
  }

  private _fireProjectile(ox: number, oy: number, tx: number, ty: number, dmg: number): void {
    const id = `proj_${++this.projIdCounter}`;
    this.projectiles.push(new ProjectileState(id, ox, oy, tx, ty, dmg));
  }

  private _updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, this.arenaW, this.arenaH);
      if (p.isDead) this.projectiles.splice(i, 1);
    }
  }

  private _updateEnemies(dt: number): void {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.isDead) { this.enemies.splice(i, 1); continue; }

      e.update(dt, p.x, p.y, p.radius);

      if (e.tryAttackPlayer(p.x, p.y, p.radius)) {
        p.takeDamage(e.damage);
        this._checkPlayerDeath();
      }
    }
  }

  private _updateBoss(dt: number): void {
    if (!this.boss || this.boss.isDead) return;
    const p = this.player;

    this.boss.update(dt, p.x, p.y, p.radius);

    if (this.boss.tryAttackPlayer(p.x, p.y, p.radius)) {
      p.takeDamage(this.boss.damage);
      this._checkPlayerDeath();
    }
  }

  private _resolveProjectileCollisions(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.isDead) continue;

      // vs enemies
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (e.isDead) continue;
        if (proj.collidesWithCircle(e.x, e.y, e.radius)) {
          proj.isDead = true;
          e.takeDamage(proj.damage);
          if (e.isDead) this.enemies.splice(j, 1);
          this.projectiles.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;

      // vs boss
      if (this.boss && !this.boss.isDead) {
        if (proj.collidesWithCircle(this.boss.x, this.boss.y, this.boss.radius)) {
          proj.isDead = true;
          this.boss.takeDamage(proj.damage);
          this.projectiles.splice(i, 1);
          if (this.boss.isDead) {
            this._onBossDefeated(this.boss.type);
          }
          continue;
        }
      }

      // vs crates
      for (let j = this.crates.length - 1; j >= 0; j--) {
        const crate = this.crates[j];
        if (crate.isDead) continue;
        if (proj.collidesWithCircle(crate.x, crate.y, crate.radius)) {
          proj.isDead = true;
          crate.isDead = true;
          this.crates.splice(j, 1);
          this.projectiles.splice(i, 1);
          this._tryDropPotion(crate.x, crate.y);
          break;
        }
      }
    }
  }

  private _resolvePlayerPotionPickup(): void {
    const p = this.player;
    for (let i = this.potions.length - 1; i >= 0; i--) {
      const pot = this.potions[i];
      if (pot.isDead) continue;
      if (pot.collidesWithCircle(p.x, p.y, p.radius)) {
        pot.isDead = true;
        this.potions.splice(i, 1);
        p.applyPotion();
      }
    }
  }

  private _checkWaveEnd(): void {
    const bossAlive = !!this.boss && !this.boss.isDead;
    const complete = this.waveSpawner.checkWaveComplete(this.enemies.length, bossAlive);

    if (complete) {
      this.phase = 'wave_complete';
      this.onWaveComplete?.(this.waveSpawner.currentWave);
    }
  }

  private _onBossDefeated(type: BossType): void {
    this.onBossDefeated?.(type);

    switch (type) {
      case 'beetle':
        this.player.shieldCharges = BalanceConfig.boss.beetle.shieldChargesReward;
        break;
      case 'moth':
        this.player.shrinkHitbox();
        break;
      case 'rat':
        this.phase = 'finale';
        this.onFinale?.();
        return; // финал — не показываем апгрейд
    }

    // После жука и плодожорки — обычный выбор апгрейда
    this.phase = 'boss_reward';
    this.onWaveComplete?.(this.waveSpawner.currentWave);
  }

  private _checkPlayerDeath(): void {
    if (this.player.isDead && this.phase === 'playing') {
      this.phase = 'game_over';
      eventBus.emit(GameEventType.GAME_OVER, {
        score: this.waveSpawner.currentWave,
        goldEarned: 0,
      });
      this.onGameOver?.();
    }
  }

  private _launchWave(): void {
    this.boss = null;
    const result = this.waveSpawner.startNextWave();
    if (result.kind === 'normal') {
      this.enemies = result.enemies;
    } else {
      this.enemies = [];
      this.boss = result.boss;
    }
  }

  private _tryDropPotion(x: number, y: number): void {
    if (Math.random() < BalanceConfig.potion.dropChance) {
      const id = `potion_${++this.potionIdCounter}`;
      this.potions.push(new PotionState(id, x, y));
    }
  }

  private _spawnInitialCrates(): void {
    const positions = [
      { x: 180, y: 140 }, { x: 220, y: 140 }, { x: 200, y: 180 },
      { x: 740, y: 140 }, { x: 780, y: 140 },
      { x: 200, y: 380 }, { x: 760, y: 380 },
      { x: 480, y: 120 }, { x: 480, y: 420 },
    ];
    positions.forEach(pos => {
      const id = `crate_${++this.crateIdCounter}`;
      this.crates.push(new CrateState(id, pos.x, pos.y));
    });
  }
}

/**
 * Срез ввода за один кадр — передаётся из InputManager Phaser-сцены.
 * Разработчик Б заполняет этот объект из Phaser.Input и передаёт в update().
 */
export interface IFrameInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  dash: boolean;
  weapon1: boolean;
  weapon2: boolean;
  rmbDown: boolean;
  rmbReleased: boolean;
  mouseX: number;
  mouseY: number;
}
