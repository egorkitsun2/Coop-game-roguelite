import Phaser from 'phaser';
import { eventBus } from '@core/eventBus';
import { GameEventType, GameEventPayloads } from '@contracts/events';

/**
 * Графический интерфейс игрока (HUD): здоровье, золото, патроны.
 * Слушает события из GameEventBus и анимирует изменения.
 * (Зона ответственности: Разработчик Б)
 */
export class HUDView {
  private scene: Phaser.Scene;
  private goldText!: Phaser.GameObjects.Text;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
    this.bindEvents();
  }

  private create(): void {
    // HP Bar
    this.hpBarBg = this.scene.add.rectangle(20, 20, 200, 20, 0x333333).setOrigin(0, 0).setScrollFactor(0).setDepth(50);
    this.hpBarFill = this.scene.add.rectangle(20, 20, 200, 20, 0xe53e3e).setOrigin(0, 0).setScrollFactor(0).setDepth(51);

    // Золото
    this.goldText = this.scene.add.text(20, 50, '🪙 Gold: 0', {
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setScrollFactor(0);
  }

  private bindEvents(): void {
    eventBus.on(GameEventType.GOLD_UPDATED, (payload: GameEventPayloads[GameEventType.GOLD_UPDATED]) => {
      this.goldText.setText(`🪙 Gold: ${payload.totalGold}`);
      // Сочная микро-анимация масштаба
      this.scene.tweens.add({
        targets: this.goldText,
        scale: 1.2,
        duration: 100,
        yoyo: true,
      });
    });

    eventBus.on(GameEventType.DAMAGE_DEALT, (payload) => {
      // Если урон нанесен игроку - обновляем полоску HP
      if (payload.targetId === 'player') {
        const ratio = Math.max(0, payload.result.targetRemainingHp / 100);
        this.hpBarFill.width = 200 * ratio;
      }
    });
  }

  public updateHp(current: number, max: number): void {
    const ratio = Math.max(0, current / max);
    this.hpBarFill.width = this.hpBarBg.width * ratio;
  }
}
