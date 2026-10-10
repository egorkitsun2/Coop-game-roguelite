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
    this.scene.start(SceneKeys.MAIN_MENU);
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

    // Снаряд (Золотой сияющий круг из demo.html)
    const projGraphics = this.make.graphics({ x: 0, y: 0 });
    projGraphics.fillStyle(0xd69e2e, 0.4);
    projGraphics.fillCircle(10, 10, 10);
    projGraphics.fillStyle(0xecc94b, 1);
    projGraphics.fillCircle(10, 10, 6);
    projGraphics.generateTexture(TextureKeys.PROJECTILE, 20, 20);

    // Ящик (Деревянный ящик с диагональным крестом из demo.html)
    const crateGraphics = this.make.graphics({ x: 0, y: 0 });
    crateGraphics.fillStyle(0x8b5a2b, 1);
    crateGraphics.fillRect(2, 2, 28, 28);
    crateGraphics.lineStyle(2, 0x5c3a1e, 1);
    crateGraphics.strokeRect(2, 2, 28, 28);
    crateGraphics.beginPath();
    crateGraphics.moveTo(2, 2);
    crateGraphics.lineTo(30, 30);
    crateGraphics.moveTo(30, 2);
    crateGraphics.lineTo(2, 30);
    crateGraphics.strokePath();
    crateGraphics.generateTexture(TextureKeys.CRATE, 32, 32);

    // Зелье лечения (Красная склянка с горлышком и сиянием из demo.html)
    const potGraphics = this.make.graphics({ x: 0, y: 0 });
    potGraphics.fillStyle(0xe53e3e, 0.35);
    potGraphics.fillCircle(14, 16, 12);
    potGraphics.fillStyle(0xe53e3e, 1);
    potGraphics.fillCircle(14, 16, 8);
    potGraphics.fillStyle(0xcbd5e0, 1);
    potGraphics.fillRect(11, 4, 6, 6);
    potGraphics.generateTexture(TextureKeys.POTION, 28, 30);
  }
}
