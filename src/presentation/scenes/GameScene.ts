import Phaser from 'phaser';
import { SceneKeys } from '@contracts/assetKeys';
import { GameEventType } from '@contracts/events';
import { CharacterStats } from '@core/stats/CharacterStats';
import { DamageCalculator } from '@core/combat/DamageCalculator';
import { SaveManager } from '@core/save/SaveManager';
import { eventBus } from '@core/eventBus';
import { InputManager } from '../input/InputManager';
import { PlayerView } from '../entities/PlayerView';
import { EnemyView } from '../entities/EnemyView';
import { ProjectileView } from '../entities/ProjectileView';
import { CrateView } from '../entities/CrateView';
import { PotionView } from '../entities/PotionView';
import { HUDView } from '../ui/HUDView';
import { JuiceEffects } from '../fx/JuiceEffects';

/**
 * Основная игровая арена:
 *  - Арена с сеткой (Grid 40px)
 *  - Разрушаемые ящики (CrateView) с шансом 15% на дроп зелья (PotionView)
 *  - Зелья лечения: мгновенно +20 HP и регенерация 10 секунд
 *  - Оружие: Рогатка (натяжение ПКМ) и Палка (блок ПКМ)
 *  - Рывок морковки по пробелу
 *  - Враги (гусеницы), преследующие игрока, спавн волнами и по клавише C
 * (Зона ответственности: Разработчик Б)
 */
export class GameScene extends Phaser.Scene {
  private player!: PlayerView;
  private inputManager!: InputManager;
  private hud!: HUDView;
  private juice!: JuiceEffects;

  // Физические группы
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private crates!: Phaser.Physics.Arcade.StaticGroup;
  private potions!: Phaser.Physics.Arcade.Group;

  // Волны врагов
  private spawnTimer!: Phaser.Time.TimerEvent;
  private waveNumber: number = 0;
  private enemiesPerWave: number = 3;

  // Счетчики забега
  private runGold: number = 0;
  private runKills: number = 0;
  private isGameOver: boolean = false;

  constructor() {
    super(SceneKeys.GAME);
  }

  public create(): void {
    const { width, height } = this.scale;
    this.isGameOver = false;
    this.runGold = 0;
    this.runKills = 0;
    this.waveNumber = 0;

    eventBus.clear();

    // 1. Сетка фона арены (Grid 40px из демо)
    this.add.grid(width / 2, height / 2, width, height, 40, 40, 0x141a23, 1, 0x1a2230, 1).setDepth(0);

    // 2. Ввод и эффекты
    this.inputManager = new InputManager(this);
    this.juice = new JuiceEffects(this);

    // 3. Модель игрока (Базовые статы из ТЗ Basic: 100 HP, урон 5, скорость 240)
    const playerStats = new CharacterStats({
      maxHp: 100,
      currentHp: 100,
      damage: 5,
      defense: 0,
      moveSpeed: 240,
    });

    // 4. Визуальный игрок (Морковка)
    this.player = new PlayerView(this, width / 2, height / 2, playerStats, this.inputManager);

    // 5. Физические группы
    this.enemies = this.physics.add.group({
      classType: EnemyView,
      runChildUpdate: true,
    });

    this.projectiles = this.physics.add.group({
      classType: ProjectileView,
      runChildUpdate: true,
    });

    this.crates = this.physics.add.staticGroup({
      classType: CrateView,
    });

    this.potions = this.physics.add.group({
      classType: PotionView,
      runChildUpdate: true,
    });

    // 6. Расстановка стартовых ящиков (позиции точно из demo.html)
    this.spawnInitialCrates();

    // 7. Стартовые гусеницы (как в демо)
    this.spawnEnemy(160, 200);
    this.spawnEnemy(800, 220);
    this.spawnEnemy(480, 420);

    // 8. Коллизии
    // Снаряд vs Враги
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.onProjectileHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // Снаряд vs Ящики
    this.physics.add.overlap(
      this.projectiles,
      this.crates,
      this.onProjectileHitCrate as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // Враг vs Игрок (контактный урон)
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onEnemyHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // Игрок vs Зелья (подбор)
    this.physics.add.overlap(
      this.player,
      this.potions,
      this.onPlayerPickPotion as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // 9. HUD (синхронизируется с HTML в index.html)
    this.hud = new HUDView(this);
    const saveData = SaveManager.load();
    eventBus.emit(GameEventType.GOLD_UPDATED, {
      totalGold: saveData.totalGold,
      delta: 0,
    });

    // 10. Спавн волн
    this.spawnTimer = this.time.addEvent({
      delay: 8000,
      callback: this.spawnWave,
      callbackScope: this,
      loop: true,
    });

    eventBus.emit(GameEventType.RUN_STARTED, {
      runId: `run_${Date.now().toString(36)}`,
    });
  }

  public update(time: number, delta: number): void {
    if (this.isGameOver) return;

    // Спавн гусеницы по клавише C
    if (this.inputManager.consumeSpawnEnemy()) {
      this.spawnWaveEnemy();
    }

    // Обновление игрока
    if (this.player && this.player.active) {
      this.player.update(time, delta);

      // Проверка выстрела из рогатки
      if (this.player.pendingShot) {
        const shot = this.player.pendingShot;
        this.player.pendingShot = null;

        const proj = new ProjectileView(this, shot.x, shot.y);
        this.projectiles.add(proj);
        proj.fire(shot.targetX, shot.targetY, shot.speed, shot.damage);
      }

      // Обновление HUD
      this.hud.updateHp(this.player.stats.currentHp, this.player.stats.maxHp, this.player.regenDuration);
      this.hud.updateDash(this.player.dashCooldownTimer, PlayerView.DASH_COOLDOWN);
      this.hud.updateWeaponStatus(
        this.player.currentWeapon,
        this.player.chargeTime,
        PlayerView.MAX_CHARGE_TIME,
        this.player.stats.damage,
        this.player.isBlocking
      );
    }

    // Цель преследования для гусениц
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as EnemyView;
      if (enemy.active && this.player && this.player.active) {
        enemy.setTarget(this.player.x, this.player.y);
      }
    });
  }

  // ─── Спавн ящиков и врагов ───

  private spawnInitialCrates(): void {
    const cratePositions = [
      { x: 180, y: 140 }, { x: 220, y: 140 }, { x: 200, y: 180 },
      { x: 740, y: 140 }, { x: 780, y: 140 },
      { x: 200, y: 380 }, { x: 760, y: 380 },
      { x: 480, y: 120 }, { x: 480, y: 420 },
    ];

    cratePositions.forEach((pos) => {
      const crate = new CrateView(this, pos.x, pos.y);
      this.crates.add(crate);
    });
  }

  private spawnEnemy(x: number, y: number): void {
    const enemy = new EnemyView(this, x, y, new CharacterStats({
      maxHp: 5,
      currentHp: 5,
      damage: 5,
      defense: 0,
      moveSpeed: 65,
    }));
    this.enemies.add(enemy);
  }

  private spawnWave(): void {
    if (this.isGameOver) return;
    this.waveNumber++;
    const count = this.enemiesPerWave + Math.floor(this.waveNumber * 0.5);
    for (let i = 0; i < count; i++) {
      this.spawnWaveEnemy();
    }
  }

  private spawnWaveEnemy(): void {
    const { width, height } = this.scale;
    const side = Phaser.Math.Between(0, 3);
    const margin = 50;
    let x = 0;
    let y = 0;

    switch (side) {
      case 0: // верх
        x = Phaser.Math.Between(margin, width - margin);
        y = -margin;
        break;
      case 1: // право
        x = width + margin;
        y = Phaser.Math.Between(margin, height - margin);
        break;
      case 2: // низ
        x = Phaser.Math.Between(margin, width - margin);
        y = height + margin;
        break;
      default: // лево
        x = -margin;
        y = Phaser.Math.Between(margin, height - margin);
        break;
    }

    const enemy = new EnemyView(this, x, y, new CharacterStats({
      maxHp: 5 + this.waveNumber,
      currentHp: 5 + this.waveNumber,
      damage: 5,
      defense: 0,
      moveSpeed: 65 + Math.min(this.waveNumber * 4, 60),
    }));
    this.enemies.add(enemy);
  }

  // ─── Коллизии ───

  private onProjectileHitCrate(
    projectileObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    crateObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const projectile = projectileObj as unknown as ProjectileView;
    const crate = crateObj as unknown as CrateView;

    if (!projectile.active || !crate.active) return;

    const crateX = crate.x;
    const crateY = crate.y;

    projectile.destroy();
    crate.destroy();

    // Шанс 15% на дроп Зелья Лечения (из ТЗ Basic и demo.html)
    if (Math.random() < 0.15) {
      const potion = new PotionView(this, crateX, crateY);
      this.potions.add(potion);

      const dropText = this.add.text(crateX, crateY - 15, '🧪 ЗЕЛЬЕ!', {
        fontSize: '14px',
        color: '#68d391',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      this.tweens.add({
        targets: dropText,
        y: crateY - 40,
        alpha: 0,
        duration: 800,
        onComplete: () => dropText.destroy(),
      });
    }

    // Тряска и эффект разлома ящика
    this.juice.shakeCamera(0.003, 80);
  }

  private onPlayerPickPotion(
    _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    potionObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const potion = potionObj as unknown as PotionView;
    if (!potion.active || !this.player.active) return;

    const potX = potion.x;
    const potY = potion.y;
    potion.destroy();

    // Применение эффекта: +20 HP + регенерация 10 сек
    this.player.applyPotion();

    // Всплывающий текст исцеления
    const healText = this.add.text(potX, potY - 15, '+20 HP (+1/s)', {
      fontSize: '16px',
      color: '#68d391',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: healText,
      y: potY - 45,
      alpha: 0,
      duration: 800,
      onComplete: () => healText.destroy(),
    });
  }

  private onProjectileHitEnemy(
    projectileObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const projectile = projectileObj as unknown as ProjectileView;
    const enemy = enemyObj as unknown as EnemyView;

    if (!projectile.active || !enemy.active) return;

    const damageAmount = projectile.damage;
    projectile.destroy();

    // Расчет урона через ядро
    const customStats = new CharacterStats({
      ...this.player.stats,
      damage: damageAmount,
    });
    const result = DamageCalculator.calculate(customStats, enemy.stats);

    eventBus.emit(GameEventType.DAMAGE_DEALT, {
      targetId: enemy.id,
      sourceId: 'player',
      x: enemy.x,
      y: enemy.y,
      result,
    });

    enemy.playHitFeedback();

    if (result.isFatal) {
      this.onEnemyKilled(enemy);
    }
  }

  private onEnemyHitPlayer(
    _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const enemy = enemyObj as unknown as EnemyView;
    if (!enemy.active || !this.player.active) return;
    if (!enemy.canAttack(this.time.now)) return;

    // Если активен блок палкой — урон блокируется на 100%
    if (this.player.isBlocking) {
      const blockText = this.add.text(this.player.x, this.player.y - 30, '🛡️ ЗАБЛОКИРОВАНО', {
        fontSize: '14px',
        color: '#63b3ed',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      this.tweens.add({
        targets: blockText,
        y: this.player.y - 55,
        alpha: 0,
        duration: 600,
        onComplete: () => blockText.destroy(),
      });

      this.juice.shakeCamera(0.003, 80);
      return;
    }

    // Иначе игрок получает урон
    const result = DamageCalculator.calculate(enemy.stats, this.player.stats);

    eventBus.emit(GameEventType.DAMAGE_DEALT, {
      targetId: 'player',
      sourceId: enemy.id,
      x: this.player.x,
      y: this.player.y - 20,
      result,
    });

    this.player.setTint(0xff4444);
    this.time.delayedCall(120, () => {
      if (this.player && this.player.active) {
        this.player.clearTint();
      }
    });

    this.juice.shakeCamera(0.008, 100);

    if (result.isFatal) {
      this.onPlayerDied();
    }
  }

  private onEnemyKilled(enemy: EnemyView): void {
    const goldDrop = Phaser.Math.Between(1, 5);
    this.runGold += goldDrop;
    this.runKills++;

    eventBus.emit(GameEventType.ENTITY_DIED, {
      entityId: enemy.id,
      isPlayer: false,
      x: enemy.x,
      y: enemy.y,
    });

    SaveManager.addGold(goldDrop);
    const saveData = SaveManager.load();
    eventBus.emit(GameEventType.GOLD_UPDATED, {
      totalGold: saveData.totalGold,
      delta: goldDrop,
    });

    const goldText = this.add.text(enemy.x, enemy.y, `+${goldDrop} 🪙`, {
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: goldText,
      y: enemy.y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => goldText.destroy(),
    });

    enemy.destroy();
  }

  private onPlayerDied(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }

    const saveData = SaveManager.load();
    saveData.statistics.runsCount++;
    saveData.statistics.enemiesKilled += this.runKills;
    SaveManager.save(saveData);

    eventBus.emit(GameEventType.GAME_OVER, {
      score: this.runKills,
      goldEarned: this.runGold,
    });

    this.player.setTint(0xff0000);
    this.player.setVelocity(0, 0);
    this.juice.shakeCamera(0.02, 300);

    this.time.delayedCall(800, () => this.showGameOverScreen());
  }

  private showGameOverScreen(): void {
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setScrollFactor(0)
      .setDepth(100);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 400 });

    const title = this.add.text(width / 2, height / 3.5, '💀 ВЫ ПОГИБЛИ', {
      fontSize: '42px',
      color: '#e53e3e',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    const statsText = [
      `⚔️ Убито врагов: ${this.runKills}`,
      `🪙 Золото за забег: ${this.runGold}`,
      `🌊 Волна: ${this.waveNumber}`,
    ].join('\n');

    this.add.text(width / 2, height / 2.2, statsText, {
      fontSize: '20px',
      color: '#e2e8f0',
      align: 'center',
      lineSpacing: 10,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    const menuBtn = this.add.text(width / 2, height / 1.5, '🏠 В ГЛАВНОЕ МЕНЮ', {
      fontSize: '22px',
      color: '#48bb78',
      fontStyle: 'bold',
      backgroundColor: '#1a202c',
      padding: { x: 24, y: 12 },
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => {
      eventBus.clear();
      this.scene.start(SceneKeys.MAIN_MENU);
    });

    const retryBtn = this.add.text(width / 2, height / 1.25, '🔄 НАЧАТЬ ЗАНОВО', {
      fontSize: '22px',
      color: '#63b3ed',
      fontStyle: 'bold',
      backgroundColor: '#1a202c',
      padding: { x: 24, y: 12 },
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
      eventBus.clear();
      this.scene.restart();
    });

    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 500, delay: 200 });
  }
}
