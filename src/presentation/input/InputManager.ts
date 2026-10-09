import Phaser from 'phaser';

/**
 * Менеджер пользовательского ввода (WASD + мышь).
 * (Зона ответственности: Разработчик Б)
 */
export class InputManager {
  private keys: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const keyboard = scene.input.keyboard!;
    this.keys = {
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };
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

  public isAttackPressed(): boolean {
    return this.scene.input.activePointer.isDown || this.keys.space.isDown;
  }

  public getPointerWorldPosition(): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;
    return new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
  }
}
