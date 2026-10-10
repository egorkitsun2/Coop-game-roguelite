import Phaser from 'phaser';
import { TextureKeys } from '@contracts/assetKeys';
import { BalanceConfig } from '@config/balanceConfig';

/**
 * Зелье здоровья (Potion) из demo.html.
 * Имеет плавную левитацию, при подборе восстанавливает 20 HP и запускает регенерацию.
 * (Зона ответственности: Разработчик Б)
 */
export class PotionView extends Phaser.Physics.Arcade.Sprite {
  public id: string;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.POTION);

    this.id = `potion_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setAllowGravity(false);
      this.setSize(20, 20);
    }

    this.setDepth(8);

    // Плавная анимация левитации через Tween
    scene.tweens.add({
      targets: this,
      y: y - 5,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  public getHealData(): { instantHeal: number; regenDuration: number; regenPerSecond: number } {
    return {
      instantHeal: BalanceConfig.loot.potionInstantHeal,
      regenDuration: BalanceConfig.loot.potionRegenDuration,
      regenPerSecond: BalanceConfig.loot.potionRegenPerSecond,
    };
  }
}
