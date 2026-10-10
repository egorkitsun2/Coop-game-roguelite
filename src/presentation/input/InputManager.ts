import Phaser from 'phaser';

export const WEAPONS = {
  SLINGSHOT: 0, // Рогатка (Дальний бой)
  STICK: 1,     // Палка (Ближний бой)
} as const;

export type WeaponType = typeof WEAPONS[keyof typeof WEAPONS];

/**
 * Менеджер пользовательского ввода:
 *  - Движение WASD (с поддержкой русской раскладки ЦФЫВ)
 *  - Рывок по Space
 *  - Выбор оружия клавишами 1 и 2
 *  - ПКМ (натяжение рогатки / блок палкой) с блокировкой контекстного меню
 *  - Спавн гусеницы по клавише C (для тестов)
 * (Зона ответственности: Разработчик Б)
 */
export class InputManager {
  private scene: Phaser.Scene;

  // Клавиши
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private key1!: Phaser.Input.Keyboard.Key;
  private key2!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyC!: Phaser.Input.Keyboard.Key;

  // Поддержка русской раскладки через сырой Set
  private pressedCodes: Set<string> = new Set();

  // Состояние мыши (ПКМ)
  public rmbDown: boolean = false;
  public rmbReleased: boolean = false;
  public dashRequested: boolean = false;
  public spawnEnemyRequested: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const keyboard = scene.input.keyboard;

    if (keyboard) {
      this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.key1 = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
      this.key2 = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
      this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyC = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    }

    // Слушатели для контекстного меню и правой кнопки мыши
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        e.preventDefault();
        this.rmbDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        e.preventDefault();
        this.rmbDown = false;
        this.rmbReleased = true;
      }
    });

    window.addEventListener('keydown', (e) => {
      this.pressedCodes.add(e.code);
      if (e.code === 'Space') {
        this.dashRequested = true;
      }
      if (e.code === 'KeyC') {
        this.spawnEnemyRequested = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.pressedCodes.delete(e.code);
    });
  }

  public getMovementVector(): Phaser.Math.Vector2 {
    let dx = 0;
    let dy = 0;

    // Поддержка английской и русской раскладок
    if (this.keyW?.isDown || this.pressedCodes.has('KeyW') || this.pressedCodes.has('KeyЦ')) dy -= 1;
    if (this.keyS?.isDown || this.pressedCodes.has('KeyS') || this.pressedCodes.has('KeyЫ')) dy += 1;
    if (this.keyA?.isDown || this.pressedCodes.has('KeyA') || this.pressedCodes.has('KeyФ')) dx -= 1;
    if (this.keyD?.isDown || this.pressedCodes.has('KeyD') || this.pressedCodes.has('KeyВ')) dx += 1;

    const vector = new Phaser.Math.Vector2(dx, dy);
    if (vector.lengthSq() > 0) {
      vector.normalize();
    }
    return vector;
  }

  public getSelectedWeapon(): WeaponType | null {
    if (this.key1?.isDown || this.pressedCodes.has('Digit1')) return WEAPONS.SLINGSHOT;
    if (this.key2?.isDown || this.pressedCodes.has('Digit2')) return WEAPONS.STICK;
    return null;
  }

  public consumeDash(): boolean {
    const req = this.dashRequested || Phaser.Input.Keyboard.JustDown(this.keySpace);
    this.dashRequested = false;
    return req;
  }

  public consumeSpawnEnemy(): boolean {
    const req = this.spawnEnemyRequested || Phaser.Input.Keyboard.JustDown(this.keyC);
    this.spawnEnemyRequested = false;
    return req;
  }

  public consumeRmbRelease(): boolean {
    const rel = this.rmbReleased;
    this.rmbReleased = false;
    return rel;
  }

  public getPointerWorldPosition(): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;
    return new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
  }
}
