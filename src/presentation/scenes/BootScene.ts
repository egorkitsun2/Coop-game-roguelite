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

    // Загрузка спрайтшита гусеницы (7 кадров x 4 направления, размер кадра 160x160)
    this.load.spritesheet(TextureKeys.CATERPILLAR, 'assets/sprites/caterpillar.png', {
      frameWidth: 160,
      frameHeight: 160,
    });
  }

  public create(): void {
    this.createCaterpillarAnimations();
    this.scene.start(SceneKeys.MAIN_MENU);
  }

  private createCaterpillarAnimations(): void {
    this.anims.create({
      key: 'caterpillar_walk_down',
      frames: this.anims.generateFrameNumbers(TextureKeys.CATERPILLAR, { start: 0, end: 6 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'caterpillar_walk_up',
      frames: this.anims.generateFrameNumbers(TextureKeys.CATERPILLAR, { start: 7, end: 13 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'caterpillar_walk_left',
      frames: this.anims.generateFrameNumbers(TextureKeys.CATERPILLAR, { start: 14, end: 20 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'caterpillar_walk_right',
      frames: this.anims.generateFrameNumbers(TextureKeys.CATERPILLAR, { start: 21, end: 27 }),
      frameRate: 10,
      repeat: -1,
    });
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
