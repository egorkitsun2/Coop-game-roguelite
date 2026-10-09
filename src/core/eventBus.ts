import { GameEventType, GameEventPayloads } from '@contracts/events';

type Callback<T extends GameEventType> = (payload: GameEventPayloads[T]) => void;

/**
 * Централизованная строго-типизированная шина событий.
 * Позволяет ядру игры (Core) уведомлять презентацию (Visual) без прямой зависимости от Phaser!
 */
export class GameEventBus {
  private static instance: GameEventBus;
  private listeners: Map<GameEventType, Set<Callback<any>>> = new Map();

  private constructor() {}

  public static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  public on<T extends GameEventType>(event: T, callback: Callback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off<T extends GameEventType>(event: T, callback: Callback<T>): void {
    const list = this.listeners.get(event);
    if (list) {
      list.delete(callback);
    }
  }

  public emit<T extends GameEventType>(event: T, payload: GameEventPayloads[T]): void {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in event listener for [${event}]:`, err);
        }
      });
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = GameEventBus.getInstance();
