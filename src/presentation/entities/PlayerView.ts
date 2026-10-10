import Phaser from 'phaser';
import { CharacterStats } from '@core/stats/CharacterStats';
import { TextureKeys, AnimationKeys } from '@contracts/assetKeys';
import { WeaponType, WeaponTypeValue, BalanceConfig } from '@config/balanceConfig';
import { InputManager } from '../input/InputManager';

export interface ShotEventData {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
}

/**
 * Визуальный компонент игрока в мире Phaser (спрайт, физика, состояния).
 * Полностью реализует механики из demo.html:
 *  - Рывок (Dash) на Space с кулдауном и шлейфом
 *  - Переключение оружия: 1 (Рогатка) / 2 (Палка)
 *  - Натяжение рогатки на ПКМ с увеличением урона (1.0x -> 2.5x)
 *  - Блок палкой на ПКМ (снижение скорости на 50% + энергощит)
 *  - Регенерация от зелья (+1 HP/сек в течение 10 сек)
 * (Зона ответственности: Разработчик Б)
 */
export class PlayerView extends Phaser.Physics.Arcade.Sprite {
  public stats: CharacterStats;
  private inputManager: InputManager;

  // Оружие
  private currentWeapon: WeaponTypeValue = WeaponType.SLINGSHOT;
  private chargeTime: number = 0; // в секундах
  private isBlocking: boolean = false;

  // Рывок (Dash)
  private isDashing: boolean = false;
  private dashDurationTimer: number = 0; // в миллисекундах
  private dashCooldownTimer: number = 0; // в миллисекундах
  private dashVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);

  // Регенерация
  private regenDuration: number = 0; // в секундах
  private regenTickTimer: number = 0; // в секундах

  // Графика шлейфа, прицела и щита
  private trailGraphics: Phaser.GameObjects.Graphics;
  private fxGraphics: Phaser.GameObjects.Graphics;
  private trails: Array<{ x: number; y: number; alpha: number }> = [];

  // Коллбек на выстрел
  public onShoot?: (data: ShotEventData) => void;

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

    // Графика для спецэффектов (шлейф рывка, линия прицела, щит блока)
    this.trailGraphics = scene.add.graphics().setDepth(8);
    this.fxGraphics = scene.add.graphics().setDepth(12);
  }

  public update(_time?: number, delta?: number): void {
    const dt = (delta ?? 16.6) / 1000; // секунды

    // 1. Смена оружия
    if (this.inputManager.isWeapon1Pressed()) this.switchWeapon(WeaponType.SLINGSHOT);
    if (this.inputManager.isWeapon2Pressed()) this.switchWeapon(WeaponType.STICK);

    // 2. Кулдаун рывка
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - (delta ?? 16.6));
    }

    // 3. Регенерация здоровья от зелья
    if (this.regenDuration > 0) {
      this.regenDuration = Math.max(0, this.regenDuration - dt);
      this.regenTickTimer -= dt;

      if (this.regenTickTimer <= 0) {
        this.stats.heal(BalanceConfig.loot.potionRegenPerSecond);
        this.regenTickTimer += 1.0;
      }
    }

    // 4. Логика оружия по ПКМ
    this.updateWeapon(dt);

    // 5. Ввод движения и Dash
    const moveDir = this.inputManager.getMovementVector();
    if (this.inputManager.consumeDash() && this.canDash()) {
      this.startDash(moveDir);
    }

    // 6. Перемещение
    const speedModifier = this.isBlocking ? BalanceConfig.player.blockSpeedPenalty : 1.0;
    if (this.isDashing) {
      this.setVelocity(this.dashVelocity.x, this.dashVelocity.y);
      this.dashDurationTimer -= (delta ?? 16.6);
      if (this.dashDurationTimer <= 0) {
        this.isDashing = false;
      }
      this.trails.push({ x: this.x, y: this.y, alpha: 0.6 });
    } else {
      this.setVelocity(
        moveDir.x * this.stats.moveSpeed * speedModifier,
        moveDir.y * this.stats.moveSpeed * speedModifier
      );
    }

    // 7. Обновление шлейфа рывка
    this.updateTrail(dt);

    // 8. Анимация спрайта Морковки
    this.updateAnimation(moveDir);

    // 9. Отрисовка прицела рогатки и щита блока
    this.drawFxGraphics();
  }

  private updateWeapon(dt: number): void {
    const pointerPos = this.inputManager.getPointerWorldPosition();

    if (this.currentWeapon === WeaponType.SLINGSHOT) {
      this.isBlocking = false;

      if (this.inputManager.isRmbDown()) {
        // Натяжение рогатки (удержание ПКМ)
        const maxChargeSec = BalanceConfig.player.maxChargeTime / 1000;
        this.chargeTime = Math.min(maxChargeSec, this.chargeTime + dt);
      } else if (this.inputManager.consumeRmbRelease()) {
        // Отпускание ПКМ -> выстрел
        const maxChargeSec = BalanceConfig.player.maxChargeTime / 1000;
        const ratio = this.chargeTime / maxChargeSec;
        const mult = BalanceConfig.player.minDmgMult + (BalanceConfig.player.maxDmgMult - BalanceConfig.player.minDmgMult) * ratio;
        const finalDamage = Math.round(BalanceConfig.player.baseDamage * mult);

        if (this.onShoot) {
          this.onShoot({
            x: this.x,
            y: this.y,
            targetX: pointerPos.x,
            targetY: pointerPos.y,
            speed: BalanceConfig.player.projectileSpeed,
            damage: finalDamage,
          });
        }

        this.chargeTime = 0;
      }
    } else if (this.currentWeapon === WeaponType.STICK) {
      this.chargeTime = 0;
      // Удержание ПКМ = блок палкой
      this.isBlocking = this.inputManager.isRmbDown();
    }
  }

  public switchWeapon(type: WeaponTypeValue): void {
    if (this.currentWeapon !== type) {
      this.currentWeapon = type;
      this.chargeTime = 0;
      this.isBlocking = false;
    }
  }

  public canDash(): boolean {
    return !this.isDashing && this.dashCooldownTimer <= 0;
  }

  public startDash(moveDir: Phaser.Math.Vector2): void {
    this.isDashing = true;
    this.dashDurationTimer = BalanceConfig.player.dashDuration;
    this.dashCooldownTimer = BalanceConfig.player.dashCooldown;

    let dirX = moveDir.x;
    let dirY = moveDir.y;

    if (dirX === 0 && dirY === 0) {
      const pointerPos = this.inputManager.getPointerWorldPosition();
      const angle = Phaser.Math.Angle.Between(this.x, this.y, pointerPos.x, pointerPos.y);
      dirX = Math.cos(angle);
      dirY = Math.sin(angle);
    }

    this.dashVelocity.set(
      dirX * BalanceConfig.player.dashSpeed,
      dirY * BalanceConfig.player.dashSpeed
    );
  }

  public applyPotion(): void {
    this.stats.heal(BalanceConfig.loot.potionInstantHeal);
    this.regenDuration = BalanceConfig.loot.potionRegenDuration;
    this.regenTickTimer = 1.0;
  }

  private updateTrail(dt: number): void {
    this.trailGraphics.clear();
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.alpha -= dt * 3.5;
      if (t.alpha <= 0) {
        this.trails.splice(i, 1);
      } else {
        this.trailGraphics.fillStyle(0x63b3ed, t.alpha * 0.4);
        this.trailGraphics.fillCircle(t.x, t.y, BalanceConfig.player.radius * 0.9);
      }
    }
  }

  private updateAnimation(moveDir: Phaser.Math.Vector2): void {
    const isMoving = (moveDir.x !== 0 || moveDir.y !== 0) || this.isDashing;

    // Спецэффекты подсветки
    if (this.isDashing) {
      this.setTint(0x90cdf4);
    } else if (this.isBlocking) {
      this.setTint(0x4299e1);
    } else if (this.regenDuration > 0) {
      this.setTint(0x68d391);
    } else {
      this.clearTint();
    }

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
      const pointerPos = this.inputManager.getPointerWorldPosition();
      const dx = pointerPos.x - this.x;
      const dy = pointerPos.y - this.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        this.setFrame(dx > 0 ? 24 : 16);
      } else {
        this.setFrame(dy > 0 ? 0 : 8);
      }
    }
  }

  private drawFxGraphics(): void {
    this.fxGraphics.clear();
    const pointerPos = this.inputManager.getPointerWorldPosition();

    // Линия прицела для Рогатки
    if (this.currentWeapon === WeaponType.SLINGSHOT) {
      const maxChargeSec = BalanceConfig.player.maxChargeTime / 1000;
      const isCharging = this.chargeTime > 0;
      const color = isCharging ? 0xecc94b : 0xa0aec0;
      const alpha = isCharging ? 0.8 : 0.25;

      this.fxGraphics.lineStyle(1.5, color, alpha);
      this.fxGraphics.lineBetween(this.x, this.y, pointerPos.x, pointerPos.y);

      // Маленький прицельный кружок на курсоре
      if (isCharging) {
        const ratio = this.chargeTime / maxChargeSec;
        this.fxGraphics.lineStyle(2, 0xecc94b, 0.9);
        this.fxGraphics.strokeCircle(pointerPos.x, pointerPos.y, 8 + ratio * 8);
      }
    }

    // Щит блока для Палки
    if (this.isBlocking) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, pointerPos.x, pointerPos.y);
      this.fxGraphics.lineStyle(4, 0x63b3ed, 0.85);
      this.fxGraphics.beginPath();
      this.fxGraphics.arc(this.x, this.y, BalanceConfig.player.radius + 14, angle - Math.PI / 3, angle + Math.PI / 3);
      this.fxGraphics.strokePath();
    }
  }

  public override destroy(fromScene?: boolean): void {
    this.trailGraphics.destroy();
    this.fxGraphics.destroy();
    super.destroy(fromScene);
  }

  // Геттеры для HUD
  public getCurrentWeapon(): WeaponTypeValue {
    return this.currentWeapon;
  }

  public getChargeProgress(): number {
    const maxChargeSec = BalanceConfig.player.maxChargeTime / 1000;
    return Math.min(1.0, this.chargeTime / maxChargeSec);
  }

  public isBlockingState(): boolean {
    return this.isBlocking;
  }

  public getDashCooldownRemaining(): number {
    return this.dashCooldownTimer;
  }

  public getRegenRemaining(): number {
    return this.regenDuration;
  }
}
