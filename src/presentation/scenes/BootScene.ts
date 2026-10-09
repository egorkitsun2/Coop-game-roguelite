import Phaser from 'phaser';
import { SceneKeys, TextureKeys } from '@contracts/assetKeys';

/**
 * Стартовая сцена: прелоад текстур, звуков, генерация временных текстур-заглушек.
 * (Зона ответственности: Разработчик Б)
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  public preload(): void {
    // Временная генерация цветных квадратов для Спринта 1, пока нет спрайтов
    this.createPlaceholderGraphics();
  }

  public create(): void {
    this.scene.start(SceneKeys.MAIN_MENU);
  }

  private createPlaceholderGraphics(): void {
    // Игрок (Зеленый квадрат)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x48bb78, 1);
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.generateTexture(TextureKeys.PLAYER, 32, 32);

    // Враг (Красный квадрат)
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(0xf56565, 1);
    enemyGraphics.fillRect(0, 0, 32, 32);
    enemyGraphics.generateTexture(TextureKeys.ENEMY_BASIC, 32, 32);

    // Снаряд (Желтый круг)
    const projGraphics = this.make.graphics({ x: 0, y: 0 });
    projGraphics.fillStyle(0xf6e05e, 1);
    projGraphics.fillCircle(8, 8, 8);
    projGraphics.generateTexture(TextureKeys.PROJECTILE, 16, 16);
  }
}
