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
import { HUDView } from '../ui/HUDView';
import { JuiceEffects } from '../fx/JuiceEffects';

/**
 * Основная игровая сцена: забег, управление, боевой цикл.
 * Реализует полный геймплей Спринта 1-2:
 *   - WASD-передвижение морковки
 *   - Стрельба снарядами по клику/пробелу
 *   - Волны гусениц, преследующих игрока
 *   - Расчет урона, лут, золото, смерть
 * (Зона ответственности: Разработчик Б, использующий модули Разработчика А)
 */
export class GameScene extends Phaser.Scene {
  private player!: PlayerView;
  private inputManager!: InputManager;
  private hud!: HUDView;
  private juice!: JuiceEffects;

  // Группы для физики
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;

  // Стрельба
  private lastShotTime: number = 0;
  private playerStats!: CharacterStats;

  // Волны врагов
  private spawnTimer!: Phaser.Time.TimerEvent;
  private waveNumber: number = 0;
  private enemiesPerWave: number = 3;
  private enemiesAlive: number = 0;

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
    this.enemiesAlive = 0;
    this.lastShotTime = 0;

    // Очистка шины от предыдущих забегов
    eventBus.clear();

    // 1. Ввод и визуальные эффекты
    this.inputManager = new InputManager(this);
    this.juice = new JuiceEffects(this);

    // 2. Модель данных игрока (Ядро от Дев А)
    const saveData = SaveManager.load();
    this.playerStats = new CharacterStats({
      maxHp: 100,
      damage: 25,
      moveSpeed: 220,
      attackCooldown: 350,
    });
    // Будущее: применить бонусы из сейва через applyModifier

    // 3. Визуальный игрок
    this.player = new PlayerView(
      this,
      width / 2,
      height / 2,
      this.playerStats,
      this.inputManager
    );

    // 4. Физические группы
    this.enemies = this.physics.add.group({
      classType: EnemyView,
      runChildUpdate: true,
    });

    this.projectiles = this.physics.add.group({
      classType: ProjectileView,
      runChildUpdate: true,
    });

    // 5. Коллизии
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.onProjectileHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onEnemyHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // 6. HUD
    this.hud = new HUDView(this);
    this.hud.updateHp(this.playerStats.currentHp, this.playerStats.maxHp);

    // 7. Спавн первой волны через 1 секунду
    this.time.delayedCall(1000, () => this.spawnWave());

    // 8. Автоспавн волн каждые 6 секунд
    this.spawnTimer = this.time.addEvent({
      delay: 6000,
      callback: this.spawnWave,
      callbackScope: this,
      loop: true,
    });

    // 9. Регистрируем забег
    eventBus.emit(GameEventType.RUN_STARTED, {
      runId: `run_${Date.now().toString(36)}`,
    });

    // Начальное обновление золота в HUD
    eventBus.emit(GameEventType.GOLD_UPDATED, {
      totalGold: saveData.totalGold + this.runGold,
      delta: 0,
    });
  }

  public update(time: number, _delta: number): void {
    if (this.isGameOver) return;

    // Обновление игрока
    if (this.player && this.player.active) {
      this.player.update(time, _delta);
    }

    // Обновление целей врагов (преследование игрока)
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as EnemyView;
      if (enemy.active && this.player && this.player.active) {
        enemy.setTarget(this.player.x, this.player.y);
      }
    });

    // Стрельба
    if (this.inputManager.isAttackPressed() && this.player.active) {
      this.tryShoot(time);
    }
  }

  // ─── Стрельба ───

  private tryShoot(currentTime: number): void {
    if (currentTime - this.lastShotTime < this.playerStats.attackCooldown) return;
    this.lastShotTime = currentTime;

    const pointerPos = this.inputManager.getPointerWorldPosition();
    const projectile = new ProjectileView(this, this.player.x, this.player.y);
    this.projectiles.add(projectile);
    projectile.fire(pointerPos.x, pointerPos.y);
  }

  // ─── Коллизии ───

  private onProjectileHitEnemy(
    projectileObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const projectile = projectileObj as unknown as ProjectileView;
    const enemy = enemyObj as unknown as EnemyView;

    if (!projectile.active || !enemy.active) return;

    // Уничтожаем снаряд
    projectile.destroy();

    // Расчет урона (Ядро от Дев А)
    const result = DamageCalculator.calculate(this.playerStats, enemy.stats);

    // Событие урона -> JuiceEffects покажет цифры + тряску камеры
    eventBus.emit(GameEventType.DAMAGE_DEALT, {
      targetId: enemy.id,
      sourceId: 'player',
      x: enemy.x,
      y: enemy.y,
      result,
    });

    // Визуальная обратная связь на враге
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

    // Враг наносит урон игроку
    const result = DamageCalculator.calculate(enemy.stats, this.playerStats);

    // Событие урона
    eventBus.emit(GameEventType.DAMAGE_DEALT, {
      targetId: 'player',
      sourceId: enemy.id,
      x: this.player.x,
      y: this.player.y - 20,
      result,
    });

    // Обновляем HP-бар
    this.hud.updateHp(this.playerStats.currentHp, this.playerStats.maxHp);

    // Вспышка на игроке
    this.player.setTint(0xff4444);
    this.time.delayedCall(120, () => {
      if (this.player && this.player.active) {
        this.player.clearTint();
      }
    });

    // Тряска при ударе по игроку
    this.juice.shakeCamera(0.008, 100);

    if (result.isFatal) {
      this.onPlayerDied();
    }
  }

  // ─── Логика смерти ───

  private onEnemyKilled(enemy: EnemyView): void {
    // Лут: случайное золото 1-5
    const goldDrop = Phaser.Math.Between(1, 5);
    this.runGold += goldDrop;
    this.runKills++;
    this.enemiesAlive--;

    eventBus.emit(GameEventType.ENTITY_DIED, {
      entityId: enemy.id,
      isPlayer: false,
      x: enemy.x,
      y: enemy.y,
    });

    eventBus.emit(GameEventType.LOOT_DROPPED, {
      x: enemy.x,
      y: enemy.y,
      loot: { gold: goldDrop, exp: 10 },
    });

    // Обновляем золото в HUD
    const saveData = SaveManager.load();
    eventBus.emit(GameEventType.GOLD_UPDATED, {
      totalGold: saveData.totalGold + this.runGold,
      delta: goldDrop,
    });

    // Показать "+N gold" над трупом
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
      ease: 'Power1',
      onComplete: () => goldText.destroy(),
    });

    // Уничтожаем врага
    enemy.destroy();
  }

  private onPlayerDied(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Остановка спавна
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }

    // Сохраняем заработанное золото
    SaveManager.addGold(this.runGold);
    const saveData = SaveManager.load();
    saveData.statistics.runsCount++;
    saveData.statistics.enemiesKilled += this.runKills;
    SaveManager.save(saveData);

    // Событие гейм-овера
    eventBus.emit(GameEventType.GAME_OVER, {
      score: this.runKills,
      goldEarned: this.runGold,
    });

    eventBus.emit(GameEventType.ENTITY_DIED, {
      entityId: 'player',
      isPlayer: true,
      x: this.player.x,
      y: this.player.y,
    });

    // Анимация смерти
    this.player.setTint(0xff0000);
    this.player.setVelocity(0, 0);
    this.juice.shakeCamera(0.02, 300);

    // Показать экран смерти
    this.time.delayedCall(800, () => this.showGameOverScreen());
  }

  // ─── Спавн врагов ───

  private spawnWave(): void {
    if (this.isGameOver) return;

    this.waveNumber++;
    const count = this.enemiesPerWave + Math.floor(this.waveNumber * 0.5);
    const { width, height } = this.scale;

    for (let i = 0; i < count; i++) {
      // Спавн за пределами экрана со случайной стороны
      let x: number, y: number;
      const side = Phaser.Math.Between(0, 3);
      const margin = 50;

      switch (side) {
        case 0: // сверху
          x = Phaser.Math.Between(margin, width - margin);
          y = -margin;
          break;
        case 1: // справа
          x = width + margin;
          y = Phaser.Math.Between(margin, height - margin);
          break;
        case 2: // снизу
          x = Phaser.Math.Between(margin, width - margin);
          y = height + margin;
          break;
        default: // слева
          x = -margin;
          y = Phaser.Math.Between(margin, height - margin);
          break;
      }

      // Скорость врагов растет с волнами
      const speedBonus = Math.min(this.waveNumber * 5, 80);
      const enemy = new EnemyView(this, x, y, new CharacterStats({
        maxHp: 4 + this.waveNumber,
        currentHp: 4 + this.waveNumber,
        damage: 5 + Math.floor(this.waveNumber * 0.5),
        defense: 0,
        moveSpeed: 75 + speedBonus,
      }));

      this.enemies.add(enemy);
      this.enemiesAlive++;
    }
  }

  // ─── Экран Game Over ───

  private showGameOverScreen(): void {
    const { width, height } = this.scale;

    // Затемнение
    const overlay = this.add.rectangle(
      width / 2, height / 2,
      width, height,
      0x000000, 0.75
    ).setScrollFactor(0).setDepth(100);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 400 });

    // Заголовок
    const title = this.add.text(width / 2, height / 3.5, '💀 ВЫ ПОГИБЛИ', {
      fontSize: '42px',
      color: '#e53e3e',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // Статистика
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

    // Кнопка "В меню"
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

    menuBtn.on('pointerover', () => menuBtn.setScale(1.1));
    menuBtn.on('pointerout', () => menuBtn.setScale(1.0));
    menuBtn.on('pointerdown', () => {
      eventBus.clear();
      this.scene.start(SceneKeys.MAIN_MENU);
    });

    // Кнопка "Заново"
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

    retryBtn.on('pointerover', () => retryBtn.setScale(1.1));
    retryBtn.on('pointerout', () => retryBtn.setScale(1.0));
    retryBtn.on('pointerdown', () => {
      eventBus.clear();
      this.scene.restart();
    });

    // Анимация появления
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 500, delay: 200 });
  }
}
