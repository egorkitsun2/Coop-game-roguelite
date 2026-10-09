import { ISaveData } from '@contracts/types';

const SAVE_KEY = 'coop_roguelite_save_v1';

const DEFAULT_SAVE: ISaveData = {
  version: 1,
  totalGold: 0,
  upgrades: {},
  statistics: {
    runsCount: 0,
    enemiesKilled: 0,
  },
};

/**
 * Логика сохранений в LocalStorage.
 * (Зона ответственности: Разработчик А)
 */
export class SaveManager {
  private static cachedData: ISaveData | null = null;

  public static load(): ISaveData {
    if (this.cachedData) return this.cachedData;

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        this.cachedData = { ...DEFAULT_SAVE, ...JSON.parse(raw) };
        return this.cachedData!;
      }
    } catch (e) {
      console.warn('Не удалось загрузить сохранение, используется дефолтное:', e);
    }

    this.cachedData = { ...DEFAULT_SAVE };
    return this.cachedData;
  }

  public static save(data?: Partial<ISaveData>): void {
    const current = this.load();
    if (data) {
      this.cachedData = { ...current, ...data };
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.cachedData));
    } catch (e) {
      console.error('Ошибка сохранения данных:', e);
    }
  }

  public static addGold(amount: number): number {
    const data = this.load();
    data.totalGold += amount;
    this.save();
    return data.totalGold;
  }
}
