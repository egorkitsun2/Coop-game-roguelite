import Phaser from 'phaser';
import { SceneKeys } from '@contracts/assetKeys';
import { GameEventType } from '@contracts/events';
import { BalanceConfig } from '@config/balanceConfig';
import { CharacterStats } from '@core/stats/CharacterStats';
import { DamageCalculator } from '@core/combat/DamageCalculator';
import { SaveManager } from '@core/save/SaveManager';
import { eventBus } from '@core/eventBus';
import { InputManager } from '../input/InputManager';
import { PlayerView, ShotEventData } from '../entities/PlayerView';
import { EnemyView } from '../entities/EnemyView';
import { ProjectileView } from '../entities/ProjectileView';
import { CrateView } from '../entities/CrateView';
import { PotionView } from '../entities/PotionView';
import { HUDView } from '../ui/HUDView';
import { JuiceEffects } from '../fx/JuiceEffects';

/**
 * Основная игровая сцена: забег, управление, боевой цикл.
 * Полная интеграция всех механик из demo.html:
 *  - Сетка арены (Grid 40px)
 *  - Разрушаемые ящики (Crates) с 15% шансом выпадения зелий
 *  - Зелья здоровья (Potions) с мгновенным лечением +20 HP и 10 сек регенерации
 *  - Натяжение рогатки (ПКМ) со скейлом урона
 *  - Блок палкой (ПКМ) со снижением входящего урона и щитом
 *  - Рывок (Dash на Space) со шлейфом
 *  - Призыв гусениц по клавише 'C'
 * (Зона ответственности: Разработчик Б, использующий модули Разработчика А)
 */
export class GameScene extends Phaser.Scene {
  private player!: PlayerView;
  private inputManager!: InputManager;
  private hud!: HUDView;
  private juice!: JuiceEffects;

  // Физические группы
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private crates!: Phaser.Physics.Arcade.Group;
  private potions!: Phaser.Physics.Arcade.Group;

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

    // Очистка шины от предыдущих забегов
    eventBus.clear();

    // 1. Отрисовка сетки арены (как в demo.html)
    this.drawArenaGrid(width, height);

    // 2. Ввод и визуальные сочные эффекты
    this.inputManager = new InputManager(this);
    this.juice = new JuiceEffects(this);

    // 3. Модель данных игрока (для демо начинаем с 50/100 HP, чтобы сразу протестировать зелье)
    const saveData = SaveManager.load();
    this.playerStats = new CharacterStats({
      maxHp: BalanceConfig.player.maxHp,
      currentHp: 50,
      damage: BalanceConfig.player.baseDamage,
      moveSpeed: BalanceConfig.player.baseSpeed,
      attackCooldown: 300,
    });

    // 4. Визуальный игрок с поддержкой оружия, dash и натяжения
    this.player = new PlayerView(
      this,
      width / 2,
      height / 2,
      this.playerStats,
      this.inputManager
    );

    // Подписка на выстрел рогатки
    this.player.onShoot = (shot: ShotEventData) => {
      this.spawnProjectile(shot);
    };

    // 5. Физические группы
    this.enemies = this.physics.add.group({
      classType: EnemyView,
      runChildUpdate: true,
    });

    this.projectiles = this.physics.add.group({
      classType: ProjectileView,
      runChildUpdate: true,
    });

    this.crates = this.physics.add.group({
      classType: CrateView,
      runChildUpdate: true,
    });

    this.potions = this.physics.add.group({
      classType: PotionView,
      runChildUpdate: true,
    });

    // 6. Спавн начальных ящиков (координаты точно из demo.html)
    this.spawnInitialCrates();

    // 7. Коллизии и оверлапы
    this.setupCollisions();

    // 8. HUD
    this.hud = new HUDView(this);
    this.hud.updateHp(this.playerStats.currentHp, this.playerStats.maxHp);

    // 9. Спавн стартовых врагов из demo.html
    this.spawnCaterpillarAt(160, 200);
    this.spawnCaterpillarAt(800, 220);
    this.spawnCaterpillarAt(480, 420);

    // 10. Автоспавн волн каждые 8 секунд
    this.spawnTimer = this.time.addEvent({
      delay: 8000,
      callback: this.spawnWave,
      callbackScope: this,
      loop: true,
    });

    // 11. Регистрация забега
    eventBus.emit(GameEventType.RUN_STARTED, {
      runId: `run_${Date.now().toString(36)}`,
    });

    eventBus.emit(GameEventType.GOLD_UPDATED, {
      totalGold: saveData.totalGold + this.runGold,
      delta: 0,
    });
  }

  public update(time: number, delta: number): void {
    if (this.isGameOver) return;

    // Спавн гусеницы по нажатию C (как в demo.html)
    if (this.inputManager.consumeSpawnEnemy()) {
      this.spawnCaterpillarAt();
    }

    // Обновление игрока
    if (this.player && this.player.active) {
      this.player.update(time, delta);
    }

    // Обновление целей преследования у врагов
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as EnemyView;
      if (enemy.active && this.player && this.player.active) {
        enemy.setTarget(this.player.x, this.player.y);
      }
    });

    // Обновление HUD
    if (this.hud && this.player && this.player.active) {
      this.hud.update(
        this.playerStats.currentHp,
        this.playerStats.maxHp,
        this.player.getRegenRemaining(),
        this.player.getDashCooldownRemaining(),
        this.player.getCurrentWeapon(),
        this.player.getChargeProgress(),
        this.player.isBlockingState()
      );
    }
  }

  // ─── Отрисовка фона ───

  private drawArenaGrid(width: number, height: number): void {
    const bgGraphics = this.add.graphics().setDepth(0);
    const size = BalanceConfig.arena.gridSize;

    bgGraphics.fillStyle(0x141a23, 1);
    bgGraphics.fillRect(0, 0, width, height);

    bgGraphics.lineStyle(1, 0x1a2230, 1);
    for (let x = 0; x <= width; x += size) {
      bgGraphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += size) {
      bgGraphics.lineBetween(0, y, width, y);
    }
  }

  // ─── Ящики и зелья ───

  private spawnInitialCrates(): void {
    const positions = [
      { x: 180, y: 140 }, { x: 220, y: 140 }, { x: 200, y: 180 },
      { x: 740, y: 140 }, { x: 780, y: 140 },
      { x: 200, y: 380 }, { x: 760, y: 380 },
      { x: 480, y: 120 }, { x: 480, y: 420 },
    ];
    positions.forEach((pos) => {
      const crate = new CrateView(this, pos.x, pos.y);
      this.crates.add(crate);
    });
  }

  private spawnProjectile(shot: ShotEventData): void {
    const projectile = new ProjectileView(this, shot.x, shot.y);
    this.projectiles.add(projectile);
    projectile.fire(shot.targetX, shot.targetY, shot.speed, shot.damage);
  }

  // ─── Коллизии ───

  private setupCollisions(): void {
    // 1. Снаряды vs Враги
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.onProjectileHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // 2. Снаряды vs Ящики
    this.physics.add.overlap(
      this.projectiles,
      this.crates,
      this.onProjectileHitCrate as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // 3. Игрок vs Зелья (Подбор лута)
    this.physics.add.overlap(
      this.player,
      this.potions,
      this.onPlayerPickPotion as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // 4. Враги vs Игрок (Контактный урон с учетом блока)
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onEnemyHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  private onProjectileHitEnemy(
    projectileObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const projectile = projectileObj as unknown as ProjectileView;
    const enemy = enemyObj as unknown as EnemyView;

    if (!projectile.active || !enemy.active) return;

    const damageDealt = projectile.damage;
    projectile.destroy();

    // Создаем временные характеристики для расчета с учетом натяжения
    const tempAttackerStats = this.playerStats.clone();
    tempAttackerStats.damage = damageDealt;

    const result = DamageCalculator.calculate(tempAttackerStats, enemy.stats);

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

    const isDestroyed = crate.takeDamage(1);
    if (isDestroyed) {
      // 15% шанс выпадения лечебного зелья (из demo.html)
      const dropPotion = Math.random() < BalanceConfig.loot.potionDropChance;
      if (dropPotion) {
        const potion = new PotionView(this, crateX, crateY);
        this.potions.add(potion);
      }

      eventBus.emit(GameEventType.CRATE_DESTROYED, {
        crateId: crate.id,
        x: crateX,
        y: crateY,
        droppedPotion: dropPotion,
      });

      // Анимация разлета деревянных щепок
      this.juice.showDust(crateX, crateY);
      crate.destroy();
    }
  }

  private onPlayerPickPotion(
    _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    potionObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const potion = potionObj as unknown as PotionView;
    if (!potion.active) return;

    const { x, y } = potion;
    potion.destroy();

    // Применение зелья: +20 HP мгновенно + 10 сек регенерации (+1 HP/сек)
    this.player.applyPotion();

    eventBus.emit(GameEventType.POTION_COLLECTED, {
      healAmount: BalanceConfig.loot.potionInstantHeal,
      regenDuration: BalanceConfig.loot.potionRegenDuration,
      x,
      y,
    });

    // Всплывающий зеленый текст над игроком
    const healText = this.add.text(this.player.x, this.player.y - 30, '+20 HP (Реген 10с)', {
      fontSize: '15px',
      color: '#68d391',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: healText,
      y: this.player.y - 65,
      alpha: 0,
      duration: 1000,
      ease: 'Power1',
      onComplete: () => healText.destroy(),
    });
  }

  private onEnemyHitPlayer(
    _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const enemy = enemyObj as unknown as EnemyView;

    if (!enemy.active || !this.player.active) return;
    if (!enemy.canAttack(this.time.now)) return;

    // Если активен блок щитом палки — урон полностью блокируется!
    if (this.player.isBlockingState()) {
      const blockText = this.add.text(this.player.x, this.player.y - 25, '🛡️ ЗАБЛОКИРОВАНО', {
        fontSize: '14px',
        color: '#63b3ed',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      this.tweens.add({
        targets: blockText,
        y: this.player.y - 50,
        alpha: 0,
        duration: 600,
        onComplete: () => blockText.destroy(),
      });
      return;
    }

    // Враг наносит контактный урон
    const result = DamageCalculator.calculate(enemy.stats, this.playerStats);

    eventBus.emit(GameEventType.DAMAGE_DEALT, {
      targetId: 'player',
      sourceId: enemy.id,
      x: this.player.x,
      y: this.player.y - 20,
      result,
    });

    // Вспышка на игроке
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

  // ─── Логика смерти ───

  private onEnemyKilled(enemy: EnemyView): void {
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

    const saveData = SaveManager.load();
    eventBus.emit(GameEventType.GOLD_UPDATED, {
      totalGold: saveData.totalGold + this.runGold,
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
      ease: 'Power1',
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

    SaveManager.addGold(this.runGold);
    const saveData = SaveManager.load();
    saveData.statistics.runsCount++;
    saveData.statistics.enemiesKilled += this.runKills;
    SaveManager.save(saveData);

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

    this.player.setTint(0xff0000);
    this.player.setVelocity(0, 0);
    this.juice.shakeCamera(0.02, 300);

    this.time.delayedCall(800, () => this.showGameOverScreen());
  }

  // ─── Спавн врагов ───

  private spawnCaterpillarAt(x?: number, y?: number): void {
    const { width, height } = this.scale;
    const spawnX = x ?? (Math.random() > 0.5 ? 80 : width - 80);
    const spawnY = y ?? (Math.random() * (height - 140) + 70);

    const enemy = new EnemyView(this, spawnX, spawnY);
    this.enemies.add(enemy);
    this.enemiesAlive++;
  }

  private spawnWave(): void {
    if (this.isGameOver) return;

    this.waveNumber++;
    const count = this.enemiesPerWave + Math.floor(this.waveNumber * 0.5);
    const { width, height } = this.scale;

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      const side = Phaser.Math.Between(0, 3);
      const margin = 50;

      switch (side) {
        case 0:
          x = Phaser.Math.Between(margin, width - margin);
          y = -margin;
          break;
        case 1:
          x = width + margin;
          y = Phaser.Math.Between(margin, height - margin);
          break;
        case 2:
          x = Phaser.Math.Between(margin, width - margin);
          y = height + margin;
          break;
        default:
          x = -margin;
          y = Phaser.Math.Between(margin, height - margin);
          break;
      }

      const speedBonus = Math.min(this.waveNumber * 5, 80);
      const enemy = new EnemyView(this, x, y, new CharacterStats({
        maxHp: BalanceConfig.enemy.caterpillar.hp + this.waveNumber,
        currentHp: BalanceConfig.enemy.caterpillar.hp + this.waveNumber,
        damage: BalanceConfig.enemy.caterpillar.contactDamage + Math.floor(this.waveNumber * 0.5),
        defense: 0,
        moveSpeed: BalanceConfig.enemy.caterpillar.speed + speedBonus,
      }));

      this.enemies.add(enemy);
      this.enemiesAlive++;
    }
  }

  // ─── Экран Game Over ───

  private showGameOverScreen(): void {
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(
      width / 2, height / 2,
      width, height,
      0x000000, 0.75
    ).setScrollFactor(0).setDepth(100);
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

    menuBtn.on('pointerover', () => menuBtn.setScale(1.1));
    menuBtn.on('pointerout', () => menuBtn.setScale(1.0));
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

    retryBtn.on('pointerover', () => retryBtn.setScale(1.1));
    retryBtn.on('pointerout', () => retryBtn.setScale(1.0));
    retryBtn.on('pointerdown', () => {
      eventBus.clear();
      this.scene.restart();
    });

    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 500, delay: 200 });
  }
}
