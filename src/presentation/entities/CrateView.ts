import Phaser from 'phaser';
import { TextureKeys } from '@contracts/assetKeys';

/**
 * Разрушаемый ящик на арене.
 * При разрушении снарядом с шансом 15% выпадает Зелье Лечения (Potion).
 * (Зона ответственности: Разработчик Б)
 */
export class CrateView extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.CRATE);

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // true = static body

    this.setDepth(6);
    this.setSize(28, 28);
  }
}
