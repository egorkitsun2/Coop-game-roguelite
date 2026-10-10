import { BalanceConfig } from '@config/balanceConfig';
import { GameEventType } from '@contracts/events';
import { eventBus } from '../eventBus';

export type WeaponType = 'slingshot' | 'stick';

export interface IPlayerUpgrades {
  damageBonus: number;
  chargeTimeMultiplier: number; // < 1 = быстрее
  dashCooldown: number;
}

/**
 * Чистая логика состояния игрока.
 * Не знает ничего о Phaser, Canvas или DOM.
 * (Зона ответственности: Разработчик А)
 */
export class PlayerState {
  // Позиция (управляется Phaser-сценой через applyMovement)
  public x: number;
  public y: number;
  public radius: number;

  // HP
  public hp: number;
  public readonly maxHp: number;
  public isDead: boolean = false;

  // Урон и оружие
  public baseDamage: number;
  public currentWeapon: WeaponType = 'slingshot';
  public chargeTime: number = 0;      // текущее натяжение (сек)
  public maxChargeTime: number;
  public isBlocking: boolean = false;

  // Рывок
  public dashCooldown: number;
  public dashCooldownTimer: number = 0;
  public isDashing: boolean = false;
  public dashDurationTimer: number = 0;

  // Щитовые заряды (награда: Жук)
  public shieldCharges: number = 0;

  // Регенерация (зелье)
  public regenDuration: number = 0;
  public regenTickTimer: number = 0;

  // Ориентация
  public rotation: number = 0;        // угол в радианах (к курсору мыши)

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = BalanceConfig.player.radius;
    this.maxHp = BalanceConfig.player.maxHp;
    this.hp = this.maxHp;
    this.baseDamage = BalanceConfig.player.baseDamage;
    this.maxChargeTime = BalanceConfig.player.maxChargeTime;
    this.dashCooldown = BalanceConfig.player.dashCooldown;
  }

  // -----------------------------------------------
  // АПГРЕЙДЫ
  // -----------------------------------------------

  public upgradeDamage(amount = BalanceConfig.upgrades.damageBonus): void {
    this.baseDamage += amount;
  }

  public upgradeAttackSpeed(mult = BalanceConfig.upgrades.attackSpeedMult): void {
    this.maxChargeTime = Math.max(
      BalanceConfig.player.maxChargTimeMin,
      this.maxChargeTime / mult,
    );
  }

  public upgradeDashCooldown(reduction = BalanceConfig.upgrades.dashCooldownReduction): void {
    this.dashCooldown = Math.max(
      BalanceConfig.player.dashCooldownMin,
      this.dashCooldown - reduction,
    );
  }

  /** Награда за Плодожорку: постоянное уменьшение хитбокса */
  public shrinkHitbox(scale = BalanceConfig.boss.moth.hitboxScaleReward): void {
    this.radius = Math.max(
      BalanceConfig.boss.moth.hitboxMin,
      Math.round(this.radius * scale),
    );
  }

  // -----------------------------------------------
  // УРОН / ЩИТ
  // -----------------------------------------------

  /**
   * Принять урон. Приоритет:
   * 1. Щитовые заряды (поглощают удар полностью)
   * 2. Блок палкой (снижает на 70%)
   * 3. Прямое снятие HP
   */
  public takeDamage(amount: number): void {
    if (this.isDead) return;

    if (this.shieldCharges > 0) {
      this.shieldCharges--;
      return;
    }

    if (this.isBlocking) {
      amount = Math.round(amount * 0.3);
    }

    this.hp = Math.max(0, this.hp - amount);

    eventBus.emit(GameEventType.DAMAGE_DEALT, {
      targetId: 'player',
      sourceId: 'enemy',
      x: this.x,
      y: this.y,
      result: {
        rawDamage: amount,
        finalDamage: amount,
        isCrit: false,
        isFatal: this.hp <= 0,
        targetRemainingHp: this.hp,
      },
    });

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      eventBus.emit(GameEventType.ENTITY_DIED, {
        entityId: 'player',
        isPlayer: true,
        x: this.x,
        y: this.y,
      });
    }
  }

  // -----------------------------------------------
  // ЛЕЧЕНИЕ / ЗЕЛЬЕ
  // -----------------------------------------------

  public heal(amount: number): void {
    if (this.isDead) return;
    const prev = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const actual = this.hp - prev;
    if (actual > 0) {
      eventBus.emit(GameEventType.PLAYER_HEALED, {
        amount: actual,
        currentHp: this.hp,
        maxHp: this.maxHp,
      });
    }
  }

  /** Применить подбор зелья: мгновенный хил + регенерация */
  public applyPotion(): void {
    if (this.isDead) return;
    this.heal(BalanceConfig.potion.instantHeal);
    this.regenDuration = BalanceConfig.potion.regenDuration;
    this.regenTickTimer = BalanceConfig.potion.regenTickInterval;
  }

  // -----------------------------------------------
  // UPDATE (чистая логика, вызывается из GameLoop)
  // -----------------------------------------------

  /**
   * Обновить таймеры игрока за кадр.
   * @param dt — delta time в секундах
   */
  public updateTimers(dt: number): void {
    if (this.isDead) return;

    // Кулдаун рывка
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
    }

    // Рывок
    if (this.isDashing) {
      this.dashDurationTimer -= dt;
      if (this.dashDurationTimer <= 0) {
        this.isDashing = false;
      }
    }

    // Регенерация от зелья
    if (this.regenDuration > 0) {
      this.regenDuration = Math.max(0, this.regenDuration - dt);
      this.regenTickTimer -= dt;
      if (this.regenTickTimer <= 0) {
        this.heal(BalanceConfig.potion.regenHpPerTick);
        this.regenTickTimer += BalanceConfig.potion.regenTickInterval;
      }
    }
  }

  public canDash(): boolean {
    return !this.isDashing && this.dashCooldownTimer <= 0;
  }

  public startDash(): void {
    this.isDashing = true;
    this.dashDurationTimer = BalanceConfig.player.dashDuration;
    this.dashCooldownTimer = this.dashCooldown;
  }

  public switchWeapon(weapon: WeaponType): void {
    if (this.currentWeapon !== weapon) {
      this.currentWeapon = weapon;
      this.chargeTime = 0;
      this.isBlocking = false;
    }
  }

  /** Рассчитать урон текущего выстрела исходя из уровня натяжения */
  public calcShotDamage(): number {
    const { minDmgMult, maxDmgMult } = BalanceConfig.player;
    const progress = this.chargeTime / this.maxChargeTime;
    const mult = minDmgMult + (maxDmgMult - minDmgMult) * progress;
    return Math.round(this.baseDamage * mult);
  }

  public reset(): void {
    this.x = BalanceConfig.arena.width / 2;
    this.y = BalanceConfig.arena.height / 2;
    this.radius = BalanceConfig.player.radius;
    this.hp = this.maxHp;
    this.isDead = false;
    this.shieldCharges = 0;
    this.chargeTime = 0;
    this.isBlocking = false;
    this.isDashing = false;
    this.dashDurationTimer = 0;
    this.dashCooldownTimer = 0;
    this.regenDuration = 0;
    this.regenTickTimer = 0;
    this.baseDamage = BalanceConfig.player.baseDamage;
    this.maxChargeTime = BalanceConfig.player.maxChargeTime;
    this.dashCooldown = BalanceConfig.player.dashCooldown;
    this.currentWeapon = 'slingshot';
  }
}
