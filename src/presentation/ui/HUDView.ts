import Phaser from 'phaser';
import { eventBus } from '@core/eventBus';
import { GameEventType, GameEventPayloads } from '@contracts/events';
import { WeaponType, WeaponTypeValue, BalanceConfig } from '@config/balanceConfig';

/**
 * Графический интерфейс игрока (HUD), перенесенный из demo.html:
 *  - HP полоска со статусом регенерации (+1/s: Xs)
 *  - Dash полоска с индикатором готовности (READY / Xs)
 *  - Статус текущего оружия и действий (Натяжение %, Урон / Блок щитом)
 *  - Счетчик золота
 * (Зона ответственности: Разработчик Б)
 */
export class HUDView {
  private scene: Phaser.Scene;

  // HP Bar
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;

  // Dash Bar
  private dashBarFill!: Phaser.GameObjects.Rectangle;
  private dashText!: Phaser.GameObjects.Text;

  // Золото
  private goldText!: Phaser.GameObjects.Text;

  // Оружие и подсказка действий (в нижнем левом углу, как в demo.html)
  private weaponTitleText!: Phaser.GameObjects.Text;
  private weaponActionText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
    this.bindEvents();
  }

  private create(): void {
    const depth = 50;
    const { height } = this.scene.scale;

    // --- 1. HP BAR ---
    this.scene.add.text(20, 16, 'HP', {
      fontSize: '12px',
      color: '#fc8181',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(depth);

    this.scene.add.rectangle(70, 18, 180, 14, 0x1a202c)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x4a5568)
      .setScrollFactor(0)
      .setDepth(depth);

    this.hpBarFill = this.scene.add.rectangle(70, 18, 180, 14, 0xe53e3e)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    this.hpText = this.scene.add.text(260, 16, '100 / 100', {
      fontSize: '12px',
      color: '#e2e8f0',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(depth);

    // --- 2. DASH BAR ---
    this.scene.add.text(20, 38, 'DASH', {
      fontSize: '12px',
      color: '#90cdf4',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(depth);

    this.scene.add.rectangle(70, 40, 180, 14, 0x1a202c)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x4a5568)
      .setScrollFactor(0)
      .setDepth(depth);

    this.dashBarFill = this.scene.add.rectangle(70, 40, 180, 14, 0x3182ce)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    this.dashText = this.scene.add.text(260, 38, 'READY', {
      fontSize: '12px',
      color: '#90cdf4',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(depth);

    // --- 3. ЗОЛОТО ---
    this.goldText = this.scene.add.text(20, 64, '🪙 Gold: 0', {
      fontSize: '15px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(depth);

    // --- 4. ОРУЖИЕ И ДЕЙСТВИЯ (СНИЗУ СЛЕВА) ---
    this.weaponTitleText = this.scene.add.text(20, height - 52, 'Оружие: Рогатка (1)', {
      fontSize: '15px',
      color: '#f7fafc',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(depth);

    this.weaponActionText = this.scene.add.text(20, height - 28, 'Зажмите ПКМ для натяжения', {
      fontSize: '13px',
      color: '#a0aec0',
    }).setScrollFactor(0).setDepth(depth);

    // --- 5. ПОДСКАЗКА УПРАВЛЕНИЯ (СНИЗУ ПО ЦЕНТРУ) ---
    const hint = 'WASD: Движение | Space: Рывок | 1/2: Оружие | ПКМ: Действие | C: Враг';
    this.scene.add.text(this.scene.scale.width / 2, height - 20, hint, {
      fontSize: '12px',
      color: '#a0aec0',
      backgroundColor: '#0f141ccc',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(depth);
  }

  private bindEvents(): void {
    eventBus.on(GameEventType.GOLD_UPDATED, (payload: GameEventPayloads[GameEventType.GOLD_UPDATED]) => {
      this.goldText.setText(`🪙 Gold: ${payload.totalGold}`);
      this.scene.tweens.add({
        targets: this.goldText,
        scale: 1.15,
        duration: 80,
        yoyo: true,
      });
    });
  }

  public update(
    currentHp: number,
    maxHp: number,
    regenRemaining: number,
    dashCooldownRemaining: number,
    weaponType: WeaponTypeValue,
    chargeProgress: number,
    isBlocking: boolean
  ): void {
    // 1. HP
    const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));
    this.hpBarFill.width = 180 * hpRatio;

    if (regenRemaining > 0) {
      this.hpText.setText(`${Math.round(currentHp)} / ${maxHp} (+1/s: ${regenRemaining.toFixed(1)}s)`);
      this.hpText.setColor('#68d391');
    } else {
      this.hpText.setText(`${Math.round(currentHp)} / ${maxHp}`);
      this.hpText.setColor('#e2e8f0');
    }

    // 2. Dash Cooldown
    const totalDashCd = BalanceConfig.player.dashCooldown;
    if (dashCooldownRemaining <= 0) {
      this.dashBarFill.width = 180;
      this.dashText.setText('READY');
      this.dashText.setColor('#90cdf4');
    } else {
      const fillRatio = 1 - (dashCooldownRemaining / totalDashCd);
      this.dashBarFill.width = 180 * Math.max(0, fillRatio);
      const sec = (dashCooldownRemaining / 1000).toFixed(1);
      this.dashText.setText(`${sec}s`);
      this.dashText.setColor('#e2e8f0');
    }

    // 3. Weapon status
    if (weaponType === WeaponType.SLINGSHOT) {
      this.weaponTitleText.setText('Оружие: Рогатка (1)');
      if (chargeProgress > 0) {
        const mult = BalanceConfig.player.minDmgMult + (BalanceConfig.player.maxDmgMult - BalanceConfig.player.minDmgMult) * chargeProgress;
        const dmg = (BalanceConfig.player.baseDamage * mult).toFixed(1);
        this.weaponActionText.setText(`Натяжение: ${Math.round(chargeProgress * 100)}% (Урон: ${dmg})`);
        this.weaponActionText.setColor('#ecc94b');
      } else {
        this.weaponActionText.setText('Зажмите ПКМ для натяжения (стреляйте по ящикам!)');
        this.weaponActionText.setColor('#a0aec0');
      }
    } else {
      this.weaponTitleText.setText('Оружие: Палка (2)');
      if (isBlocking) {
        this.weaponActionText.setText('🛡️ БЛОК АКТИВЕН (скорость -50%)');
        this.weaponActionText.setColor('#63b3ed');
      } else {
        this.weaponActionText.setText('Удерживайте ПКМ для блока щитом');
        this.weaponActionText.setColor('#a0aec0');
      }
    }
  }

  public updateHp(current: number, max: number): void {
    const ratio = Math.max(0, Math.min(1, current / max));
    this.hpBarFill.width = 180 * ratio;
    this.hpText.setText(`${Math.round(current)} / ${max}`);
  }
}
