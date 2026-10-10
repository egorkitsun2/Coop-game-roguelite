import Phaser from 'phaser';
import { eventBus } from '@core/eventBus';
import { GameEventType, GameEventPayloads } from '@contracts/events';
import { WEAPONS, WeaponType } from '../input/InputManager';
import { PlayerView } from '../entities/PlayerView';

/**
 * Графический интерфейс игрока (HUD).
 * Синхронизирует HTML-разметку (из demo.html) и шину событий GameEventBus:
 *  - HP шкала и цифры + таймер регенерации (+1/s: X.Xs)
 *  - Dash шкала перезарядки (READY / X.Xs)
 *  - Золото
 *  - Статус выбранного оружия (натяжение рогатки / блок палкой)
 * (Зона ответственности: Разработчик Б)
 */
export class HUDView {
  // DOM элементы интерфейса
  private hpFillEl: HTMLElement | null = null;
  private hpValueEl: HTMLElement | null = null;
  private dashFillEl: HTMLElement | null = null;
  private dashValueEl: HTMLElement | null = null;
  private goldValueEl: HTMLElement | null = null;
  private weaponNameEl: HTMLElement | null = null;
  private weaponStatusEl: HTMLElement | null = null;

  constructor(_scene: Phaser.Scene) {
    this.initDomElements();
    this.bindEvents();
  }

  private initDomElements(): void {
    this.hpFillEl = document.getElementById('hp-fill');
    this.hpValueEl = document.getElementById('hp-value');
    this.dashFillEl = document.getElementById('dash-fill');
    this.dashValueEl = document.getElementById('dash-value');
    this.goldValueEl = document.getElementById('gold-value');
    this.weaponNameEl = document.getElementById('weapon-name');
    this.weaponStatusEl = document.getElementById('weapon-status');
  }

  private bindEvents(): void {
    eventBus.on(GameEventType.GOLD_UPDATED, (payload: GameEventPayloads[GameEventType.GOLD_UPDATED]) => {
      if (this.goldValueEl) {
        this.goldValueEl.textContent = `🪙 ${payload.totalGold}`;
      }
    });

    eventBus.on(GameEventType.DAMAGE_DEALT, (payload) => {
      if (payload.targetId === 'player') {
        this.updateHp(payload.result.targetRemainingHp, 100, 0);
      }
    });
  }

  public updateHp(current: number, max: number, regenDuration: number = 0): void {
    const ratio = Math.max(0, Math.min(1, current / max));
    const percent = ratio * 100;

    if (this.hpFillEl) {
      this.hpFillEl.style.width = `${percent}%`;
    }

    if (this.hpValueEl) {
      let regenText = '';
      if (regenDuration > 0) {
        regenText = ` (+1/s: ${regenDuration.toFixed(1)}s)`;
        this.hpValueEl.style.color = '#68d391';
      } else {
        this.hpValueEl.style.color = '#e2e8f0';
      }
      this.hpValueEl.textContent = `${Math.round(current)} / ${max}${regenText}`;
    }
  }

  public updateDash(cooldownRemaining: number, maxCooldown: number): void {
    if (!this.dashFillEl || !this.dashValueEl) return;

    if (cooldownRemaining <= 0) {
      this.dashFillEl.style.width = '100%';
      this.dashValueEl.textContent = 'READY';
      this.dashValueEl.style.color = '#90cdf4';
    } else {
      const progress = ((maxCooldown - cooldownRemaining) / maxCooldown) * 100;
      this.dashFillEl.style.width = `${progress}%`;
      this.dashValueEl.textContent = `${cooldownRemaining.toFixed(1)}s`;
      this.dashValueEl.style.color = '#e2e8f0';
    }
  }

  public updateWeaponStatus(
    weapon: WeaponType,
    chargeTime: number,
    maxChargeTime: number,
    baseDamage: number,
    isBlocking: boolean
  ): void {
    if (!this.weaponNameEl || !this.weaponStatusEl) return;

    const weaponName = weapon === WEAPONS.SLINGSHOT ? 'Рогатка (1)' : 'Палка (2)';
    this.weaponNameEl.textContent = `Оружие: ${weaponName}`;

    if (weapon === WEAPONS.SLINGSHOT) {
      if (chargeTime > 0) {
        const ratio = chargeTime / maxChargeTime;
        const mult = PlayerView.MIN_DMG_MULT + (PlayerView.MAX_DMG_MULT - PlayerView.MIN_DMG_MULT) * ratio;
        const dmg = (baseDamage * mult).toFixed(1);
        this.weaponStatusEl.textContent = `Натяжение: ${Math.round(ratio * 100)}% (Урон: ${dmg})`;
        this.weaponStatusEl.style.color = '#ecc94b';
      } else {
        this.weaponStatusEl.textContent = 'Зажмите ПКМ для натяжения (стреляйте по ящикам!)';
        this.weaponStatusEl.style.color = '#a0aec0';
      }
    } else {
      if (isBlocking) {
        this.weaponStatusEl.textContent = '🛡️ БЛОК АКТИВЕН (-50% скорости, защита)';
        this.weaponStatusEl.style.color = '#63b3ed';
      } else {
        this.weaponStatusEl.textContent = 'Удерживайте ПКМ для блока';
        this.weaponStatusEl.style.color = '#a0aec0';
      }
    }
  }
}
