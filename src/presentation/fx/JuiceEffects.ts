import Phaser from 'phaser';
import { eventBus } from '@core/eventBus';
import { GameEventType } from '@contracts/events';

/**
 * Менеджер визуальных сочностей (Juice): Screen Shake, всплывающие цифры урона, частицы.
 * (Зона ответственности: Разработчик Б)
 */
export class JuiceEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bindEvents();
  }

  private bindEvents(): void {
    eventBus.on(GameEventType.DAMAGE_DEALT, (payload) => {
      this.showDamageNumber(payload.x, payload.y, payload.result.finalDamage, payload.result.isCrit);
      
      if (payload.result.isCrit) {
        this.shakeCamera(0.01, 120);
      }
    });
  }

  public showDamageNumber(x: number, y: number, amount: number, isCrit: boolean): void {
    const color = isCrit ? '#ff3333' : '#ffffff';
    const text = this.scene.add.text(x, y - 10, `${amount}${isCrit ? '!' : ''}`, {
      fontSize: isCrit ? '20px' : '14px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 45,
      alpha: 0,
      duration: 600,
      ease: 'Power1',
      onComplete: () => text.destroy(),
    });
  }

  public shakeCamera(intensity = 0.005, duration = 100): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  public showDust(x: number, y: number): void {
    const particles = this.scene.add.graphics();
    particles.fillStyle(0x8b5a2b, 0.8);
    for (let i = 0; i < 6; i++) {
      const px = x + Phaser.Math.Between(-12, 12);
      const py = y + Phaser.Math.Between(-12, 12);
      particles.fillCircle(px, py, Phaser.Math.Between(2, 4));
    }
    this.scene.tweens.add({
      targets: particles,
      alpha: 0,
      duration: 350,
      onComplete: () => particles.destroy(),
    });
  }
}
