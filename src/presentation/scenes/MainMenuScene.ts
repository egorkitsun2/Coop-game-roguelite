import Phaser from 'phaser';
import { SceneKeys } from '@contracts/assetKeys';
import { SaveManager } from '@core/save/SaveManager';

/**
 * Главное меню / Хаб игры (Спринт 3).
 * (Зона ответственности: Разработчик Б)
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.MAIN_MENU);
  }

  public create(): void {
    const { width, height } = this.scale;
    const saveData = SaveManager.load();

    this.add.text(width / 2, height / 3, '⚔️ COOP ROGUELITE ⚔️', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2.2, `🪙 Сохраненное золото: ${saveData.totalGold}`, {
      fontSize: '20px',
      color: '#ffd700',
    }).setOrigin(0.5);

    const startBtn = this.add.text(width / 2, height / 1.7, '▶ НАЧАТЬ ЗАБЕГ', {
      fontSize: '24px',
      color: '#48bb78',
      fontStyle: 'bold',
      backgroundColor: '#1a202c',
      padding: { x: 20, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => {
      this.scene.start(SceneKeys.GAME);
    });

    startBtn.on('pointerover', () => startBtn.setScale(1.1));
    startBtn.on('pointerout', () => startBtn.setScale(1.0));
  }
}
