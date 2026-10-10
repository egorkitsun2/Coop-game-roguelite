import Phaser from 'phaser';
import { CharacterStats } from '@core/stats/CharacterStats';
import { TextureKeys, AnimationKeys } from '@contracts/assetKeys';
import { InputManager, WEAPONS, WeaponType } from '../input/InputManager';

export interface ShotPayload {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  damage: number;
  speed: number;
}

/**
 * Визуальный компонент и контроллер игрока (Морковка).
 * Включает полную механику из демо:
 *  - Рывок (Dash) по пробелу с КД 2.5 сек, шлейфом и ускорением
 *  - Оружие: Рогатка (1) с натяжением ПКМ (урон 1.0x -> 2.5x) и Палка (2) с блоком ПКМ (-50% скорости, щит)
 *  - Лечение и регенерация от зелий (+20 HP + 1 HP/сек в течение 10 сек)
 *  - Отрисовка линии прицеливания и энергетического щита
 * (Зона ответственности: Разработчик Б)
 */
export class PlayerView extends Phaser.Physics.Arcade.Sprite {
  public stats: CharacterStats;
  private inputManager: InputManager;

  // Конфигурация механик
  public static readonly DASH_SPEED = 820;
  public static readonly DASH_DURATION = 0.18; // сек
  public static readonly DASH_COOLDOWN = 2.5; // сек
  public static readonly MAX_CHARGE_TIME = 1.5; // сек
  public static readonly MIN_DMG_MULT = 1.0;
  public static readonly MAX_DMG_MULT = 2.5;
  public static readonly PROJECTILE_SPEED = 650;

  // Оружие
  public currentWeapon: WeaponType = WEAPONS.SLINGSHOT;
  public chargeTime: number = 0;
  public isBlocking: boolean = false;

  // Рывок
  public isDashing: boolean = false;
  public dashDurationTimer: number = 0;
  public dashCooldownTimer: number = 0;
  private dashVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);

  // Регенерация от зелья
  public regenDuration: number = 0;
  private regenTickTimer: number = 0;

  // Визуальные оверлеи
  private aimLineGraphics: Phaser.GameObjects.Graphics;
  private shieldGraphics: Phaser.GameObjects.Graphics;
  private shadowGraphics: Phaser.GameObjects.Graphics;

  // Очередь на выстрел для сцены
  public pendingShot: ShotPayload | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: CharacterStats, inputManager: InputManager) {
    super(scene, x, y, TextureKeys.CARROT);

    this.stats = stats;
    this.inputManager = inputManager;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(10);
    this.setScale(0.6);
    this.setSize(44, 70);
    this.setOffset(42, 35);

    // Графика тени, линии прицеливания и щита
    this.shadowGraphics = scene.add.graphics().setDepth(5);
    this.aimLineGraphics = scene.add.graphics().setDepth(9);
    this.shieldGraphics = scene.add.graphics().setDepth(11);
  }

  public heal(amount: number): void {
    this.stats.currentHp = Math.min(this.stats.maxHp, this.stats.currentHp + amount);
  }

  public applyPotion(): void {
    // 1. Мгновенное лечение +20 HP
    this.heal(20);

    // 2. Сброс/запуск таймера регенерации на 10 сек
    this.regenDuration = 10.0;
    this.regenTickTimer = 1.0;
  }

  public canDash(): boolean {
    return !this.isDashing && this.dashCooldownTimer <= 0;
  }

  public startDash(moveDir: Phaser.Math.Vector2, pointerPos: Phaser.Math.Vector2): void {
    this.isDashing = true;
    this.dashDurationTimer = PlayerView.DASH_DURATION;
    this.dashCooldownTimer = PlayerView.DASH_COOLDOWN;

    let dirX = moveDir.x;
    let dirY = moveDir.y;

    if (dirX === 0 && dirY === 0) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, pointerPos.x, pointerPos.y);
      dirX = Math.cos(angle);
      dirY = Math.sin(angle);
    }

    this.dashVelocity.set(dirX * PlayerView.DASH_SPEED, dirY * PlayerView.DASH_SPEED);
  }

  public update(_time?: number, delta?: number): void {
    if (!this.active) return;
    const dt = (delta ?? 16) / 1000;

    const pointerPos = this.inputManager.getPointerWorldPosition();

    // 1. Смена оружия
    const weaponSwitch = this.inputManager.getSelectedWeapon();
    if (weaponSwitch !== null && weaponSwitch !== this.currentWeapon) {
      this.currentWeapon = weaponSwitch;
      this.chargeTime = 0;
      this.isBlocking = false;
    }

    // 2. Кулдаун рывка
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
    }

    // 3. Регенерация (+1 HP в секунду)
    if (this.regenDuration > 0) {
      this.regenDuration = Math.max(0, this.regenDuration - dt);
      this.regenTickTimer -= dt;
      if (this.regenTickTimer <= 0) {
        this.heal(1);
        this.regenTickTimer += 1.0;
      }
    }

    // 4. Оружие по ПКМ
    this.updateWeapon(dt, pointerPos);

    // 5. Ввод движения и рывок
    const moveDir = this.inputManager.getMovementVector();
    if (this.inputManager.consumeDash() && this.canDash()) {
      this.startDash(moveDir, pointerPos);
    }

    // 6. Скорость перемещения
    if (this.isDashing) {
      this.setVelocity(this.dashVelocity.x, this.dashVelocity.y);
      this.dashDurationTimer -= dt;
      if (this.dashDurationTimer <= 0) {
        this.isDashing = false;
      }
      this.spawnGhostTrail();
    } else {
      const speedModifier = this.isBlocking ? 0.5 : 1.0;
      this.setVelocity(
        moveDir.x * this.stats.moveSpeed * speedModifier,
        moveDir.y * this.stats.moveSpeed * speedModifier
      );
    }

    // 7. Анимация спрайта
    this.updateAnimations(moveDir, pointerPos);

    // 8. Визуальные эффекты (тень, линия прицела, щит, подсветка)
    this.renderVisuals(pointerPos);
  }

  private updateWeapon(dt: number, pointerPos: Phaser.Math.Vector2): void {
    if (this.currentWeapon === WEAPONS.SLINGSHOT) {
      this.isBlocking = false;

      if (this.inputManager.rmbDown) {
        // Натяжение рогатки
        this.chargeTime = Math.min(PlayerView.MAX_CHARGE_TIME, this.chargeTime + dt);
      } else if (this.inputManager.consumeRmbRelease()) {
        // Выстрел снарядом
        const progress = this.chargeTime / PlayerView.MAX_CHARGE_TIME;
        const mult = PlayerView.MIN_DMG_MULT + (PlayerView.MAX_DMG_MULT - PlayerView.MIN_DMG_MULT) * progress;
        const finalDamage = Math.round(this.stats.damage * mult);

        this.pendingShot = {
          x: this.x,
          y: this.y,
          targetX: pointerPos.x,
          targetY: pointerPos.y,
          damage: finalDamage,
          speed: PlayerView.PROJECTILE_SPEED,
        };

        this.chargeTime = 0;
      }
    } else if (this.currentWeapon === WEAPONS.STICK) {
      this.chargeTime = 0;
      this.isBlocking = this.inputManager.rmbDown;
    }
  }

  private updateAnimations(moveDir: Phaser.Math.Vector2, pointerPos: Phaser.Math.Vector2): void {
    const isMoving = (moveDir.x !== 0 || moveDir.y !== 0) || this.isDashing;

    if (isMoving) {
      if (Math.abs(moveDir.x) > Math.abs(moveDir.y)) {
        this.play(moveDir.x > 0 ? AnimationKeys.CARROT_WALK_RIGHT : AnimationKeys.CARROT_WALK_LEFT, true);
      } else {
        this.play(moveDir.y > 0 ? AnimationKeys.CARROT_WALK_DOWN : AnimationKeys.CARROT_WALK_UP, true);
      }
    } else {
      if (this.anims.isPlaying) {
        this.stop();
      }
      const dx = pointerPos.x - this.x;
      const dy = pointerPos.y - this.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        this.setFrame(dx > 0 ? 24 : 16);
      } else {
        this.setFrame(dy > 0 ? 0 : 8);
      }
    }

    // Тинт состояний
    if (this.isDashing) {
      this.setTint(0x90cdf4);
    } else if (this.isBlocking) {
      this.setTint(0x63b3ed);
    } else if (this.regenDuration > 0) {
      this.setTint(0x68d391);
    } else {
      this.clearTint();
    }
  }

  private spawnGhostTrail(): void {
    const ghost = this.scene.add.sprite(this.x, this.y, this.texture.key, this.frame.name);
    ghost.setScale(this.scaleX, this.scaleY);
    ghost.setDepth(this.depth - 1);
    ghost.setTint(0x63b3ed);
    ghost.setAlpha(0.6);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 200,
      onComplete: () => ghost.destroy(),
    });
  }

  private renderVisuals(pointerPos: Phaser.Math.Vector2): void {
    // Тень под персонажем
    this.shadowGraphics.clear();
    this.shadowGraphics.fillStyle(0x000000, 0.45);
    this.shadowGraphics.fillEllipse(this.x, this.y + 16, 28, 12);

    // Линия прицеливания рогатки
    this.aimLineGraphics.clear();
    if (this.currentWeapon === WEAPONS.SLINGSHOT) {
      const color = this.chargeTime > 0 ? 0xecc94b : 0x718096;
      const alpha = this.chargeTime > 0 ? 0.8 : 0.3;
      this.aimLineGraphics.lineStyle(1.5, color, alpha);
      this.aimLineGraphics.lineBetween(this.x, this.y, pointerPos.x, pointerPos.y);
    }

    // Энергетический щит палки
    this.shieldGraphics.clear();
    if (this.isBlocking) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, pointerPos.x, pointerPos.y);
      this.shieldGraphics.lineStyle(4, 0x63b3ed, 0.9);
      this.shieldGraphics.beginPath();
      this.shieldGraphics.arc(this.x, this.y, 30, angle - 0.9, angle + 0.9);
      this.shieldGraphics.strokePath();
    }
  }

  public destroy(fromScene?: boolean): void {
    this.shadowGraphics.destroy();
    this.aimLineGraphics.destroy();
    this.shieldGraphics.destroy();
    super.destroy(fromScene);
  }
}
