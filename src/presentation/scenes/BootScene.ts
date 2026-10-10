import Phaser from 'phaser';
import { SceneKeys, TextureKeys, AnimationKeys } from '@contracts/assetKeys';

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

    // Загрузка спрайтшита морковки (8 кадров x 4 направления, размер кадра 128x128)
    this.load.spritesheet(TextureKeys.CARROT, 'assets/sprites/carrot.png', {
      frameWidth: 128,
      frameHeight: 128,
    });
  }

  public create(): void {
    this.createCaterpillarAnimations();
    this.createCarrotAnimations();
    this.scene.start(SceneKeys.GAME);
  }

  private createCarrotAnimations(): void {
    this.anims.create({
      key: AnimationKeys.CARROT_WALK_DOWN,
      frames: this.anims.generateFrameNumbers(TextureKeys.CARROT, { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: AnimationKeys.CARROT_WALK_UP,
      frames: this.anims.generateFrameNumbers(TextureKeys.CARROT, { start: 8, end: 15 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: AnimationKeys.CARROT_WALK_LEFT,
      frames: this.anims.generateFrameNumbers(TextureKeys.CARROT, { start: 16, end: 23 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: AnimationKeys.CARROT_WALK_RIGHT,
      frames: this.anims.generateFrameNumbers(TextureKeys.CARROT, { start: 24, end: 31 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: AnimationKeys.CARROT_IDLE,
      frames: [{ key: TextureKeys.CARROT, frame: 0 }],
      frameRate: 1,
    });
  }

  private createCaterpillarAnimations(): void {
    this.anims.create({
      key: AnimationKeys.CATERPILLAR_WALK_DOWN,
      frames: this.anims.generateFrameNumbers(TextureKeys.CATERPILLAR, { start: 0, end: 6 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: AnimationKeys.CATERPILLAR_WALK_UP,
      frames: this.anims.generateFrameNumbers(TextureKeys.CATERPILLAR, { start: 7, end: 13 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: AnimationKeys.CATERPILLAR_WALK_LEFT,
      frames: this.anims.generateFrameNumbers(TextureKeys.CATERPILLAR, { start: 14, end: 20 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: AnimationKeys.CATERPILLAR_WALK_RIGHT,
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

    // Разрушаемый ящик (Коричневый с окантовкой и крестом)
    const crateGraphics = this.make.graphics({ x: 0, y: 0 });
    crateGraphics.fillStyle(0x8b5a2b, 1);
    crateGraphics.fillRect(0, 0, 28, 28);
    crateGraphics.lineStyle(2, 0x5c3a1e, 1);
    crateGraphics.strokeRect(0, 0, 28, 28);
    crateGraphics.beginPath();
    crateGraphics.moveTo(0, 0);
    crateGraphics.lineTo(28, 28);
    crateGraphics.moveTo(28, 0);
    crateGraphics.lineTo(0, 28);
    crateGraphics.strokePath();
    crateGraphics.generateTexture(TextureKeys.CRATE, 28, 28);

    // Зелье лечения (Красная колба со светлым горлышком)
    const potionGraphics = this.make.graphics({ x: 0, y: 0 });
    potionGraphics.fillStyle(0xe53e3e, 1);
    potionGraphics.fillCircle(12, 14, 8);
    potionGraphics.fillStyle(0xcbd5e0, 1);
    potionGraphics.fillRect(9, 2, 6, 5);
    potionGraphics.generateTexture(TextureKeys.POTION, 24, 24);
  }
}
