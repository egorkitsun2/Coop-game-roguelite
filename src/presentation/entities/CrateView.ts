import Phaser from 'phaser';
import { TextureKeys } from '@contracts/assetKeys';
import { BalanceConfig } from '@config/balanceConfig';

/**
 * Разрушаемый ящик (Crate) из demo.html.
 * При разрушении имеет 15% шанс заспавнить лечебное зелье.
 * (Зона ответственности: Разработчик Б)
 */
export class CrateView extends Phaser.Physics.Arcade.Sprite {
  public id: string;
  public hp: number = BalanceConfig.loot.crateHp;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.CRATE);

    this.id = `crate_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setImmovable(true);
      this.setSize(28, 28);
    }

    this.setDepth(7);
  }

  public takeDamage(amount: number = 1): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      return true; // Разрушен
    }
    return false;
  }
}
