import Phaser from 'phaser';

/**
 * Менеджер пользовательского ввода (WASD + Мышь + ПКМ + Dash + смена оружия).
 * Перенесено из demo.html:
 *  - Блокировка контекстного меню браузера на ПКМ
 *  - Отслеживание удержания и отпускания ПКМ (натяжение рогатки / блок палкой)
 *  - Space — Dash (рывок)
 *  - 1 / 2 — переключение оружия
 *  - C — вызов тестовой гусеницы
 * (Зона ответственности: Разработчик Б)
 */
export class InputManager {
  private keys: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    digit1: Phaser.Input.Keyboard.Key;
    digit2: Phaser.Input.Keyboard.Key;
    c: Phaser.Input.Keyboard.Key;
  };

  private scene: Phaser.Scene;
  private dashRequested: boolean = false;
  private spawnEnemyRequested: boolean = false;
  private rmbDown: boolean = false;
  private rmbReleased: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const keyboard = scene.input.keyboard!;

    this.keys = {
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      digit1: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      digit2: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      c: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
    };

    // Отключение контекстного меню браузера при клике ПКМ
    const canvas = scene.game.canvas;
    canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });

    // Обработка мыши (ПКМ)
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.rmbDown = true;
      }
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2) {
        this.rmbDown = false;
        this.rmbReleased = true;
      }
    });

    // Space для Dash
    this.keys.space.on('down', () => {
      this.dashRequested = true;
    });

    // C для спавна гусеницы
    this.keys.c.on('down', () => {
      this.spawnEnemyRequested = true;
    });
  }

  public getMovementVector(): Phaser.Math.Vector2 {
    const vector = new Phaser.Math.Vector2(0, 0);

    if (this.keys.a.isDown) vector.x -= 1;
    if (this.keys.d.isDown) vector.x += 1;
    if (this.keys.w.isDown) vector.y -= 1;
    if (this.keys.s.isDown) vector.y += 1;

    if (vector.lengthSq() > 0) {
      vector.normalize();
    }
    return vector;
  }

  public consumeDash(): boolean {
    const requested = this.dashRequested;
    this.dashRequested = false;
    return requested;
  }

  public isRmbDown(): boolean {
    return this.rmbDown;
  }

  public consumeRmbRelease(): boolean {
    const released = this.rmbReleased;
    this.rmbReleased = false;
    return released;
  }

  public isWeapon1Pressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.digit1);
  }

  public isWeapon2Pressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.digit2);
  }

  public consumeSpawnEnemy(): boolean {
    const requested = this.spawnEnemyRequested;
    this.spawnEnemyRequested = false;
    return requested;
  }

  public getPointerWorldPosition(): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;
    return new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
  }
}
