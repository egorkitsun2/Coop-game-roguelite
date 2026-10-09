# 🏛️ Архитектура и разделение зон разработки (Roguelite Duo)

Этот документ регламентирует распределение обязанностей и структуру проекта для команды из двух человек, чтобы исключить **Git Merge Conflicts** при параллельной разработке.

---

## 👥 Разделение ролей и зон ответственности

| Параметр | Разработчик А (Engine / Data / Logic) | Разработчик Б (Gameplay / Visuals / UI) |
| :--- | :--- | :--- |
| **Главная цель** | Чистая логика, математика, стейт игры, сохранения | Сочность картинки, управление, анимации, интерфейсы |
| **Зависимость от Phaser** | **Минимальная / Отсутствует** (чистый TypeScript) | **Высокая** (Phaser GameObjects, Tweens, Particles, Scenes) |
| **Его рабочая директория** | `src/core/` | `src/presentation/` и `public/assets/` |
| **Тестируемость** | Юнит-тесты формул и стейта без браузера | Визуальное тестирование в браузере |

---

## 🌳 Дерево структуры проекта

```
Coop-game-roguelite/
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── ARCHITECTURE.md                  <-- Правила взаимодействия
├── plan.md                          <-- Пошаговый план спринтов
│
├── public/                          <-- [ЗОНА ДЕВ Б: Ресурсы и Графика]
│   └── assets/
│       ├── audio/                   (Музыка и звуковые эффекты)
│       ├── sprites/                 (Спрайты персонажей, врагов, снарядов)
│       ├── tilesets/                (Тайлы комнат и уровней)
│       └── ui/                      (Иконки, кнопки, плашки)
│
└── src/
    ├── main.ts                      <-- Точка входа Phaser
    │
    ├── contracts/                   <-- [ОБЩАЯ ЗОНА: Контракты и Типы] (Меняется ТОЛЬКО по согласованию!)
    │   ├── types.ts                 (Интерфейсы статов, урона, лута, сохранений)
    │   ├── events.ts                (Перечисление и типы событий шины)
    │   └── assetKeys.ts             (Константы ключей спрайтов, звуков и сцен)
    │
    ├── core/                        <-- [ЗОНА ДЕВ А: Engine / Logic / Data] (Чистый TypeScript!)
    │   ├── eventBus.ts              (Центральная типизированная шина событий)
    │   ├── stats/                   (CharacterStats, модификаторы, баффы)
    │   ├── combat/                  (DamageCalculator, формулы критов и брони)
    │   ├── loot/                    (LootManager, шансы дропа, формулы золота)
    │   ├── progression/             (MetaUpgradeManager, дерево магазина)
    │   ├── save/                    (SaveManager, сериализация LocalStorage)
    │   └── procedural/              (Генерация комнат, спавн волн)
    │
    ├── presentation/                <-- [ЗОНА ДЕВ Б: Gameplay / Visuals / UX]
    │   ├── scenes/                  (BootScene, MainMenuScene, GameScene, ShopScene)
    │   ├── entities/                (PlayerView, EnemyView, ProjectileView)
    │   ├── input/                   (InputManager - WASD, Pointer, Gamepad)
    │   ├── ui/                      (HUDView, HealthBar, DamageNumbers, ShopUI)
    │   ├── fx/                      (JuiceEffects, ScreenShake, Particles)
    │   └── animations/              (AnimationController, атласы спрайтов)
    │
    └── config/                      <-- [Общие конфигурации]
        ├── gameConfig.ts            (Разрешение экрана, физика Arcade)
        └── balanceConfig.ts         (Базовые числовые коэффициенты баланса)
```

---

## ⚡ Как избежать Merge Conflicts: Паттерн "Event-Driven & Data-View"

Главная причина конфликтов в геймдеве — когда два разработчика пишут в один и тот же файл `GameScene.ts` или `Player.ts`. 

В нашей архитектуре это исключено:
1. **Разработчик А никогда не трогает Phaser-сцены и спрайты.** Он пишет чистые классы (`CharacterStats`, `DamageCalculator`, `SaveManager`).
2. **Разработчик Б никогда не пишет математику и структуры сейвов в коде сцены.** Он берет готовый класс Дев А или подписывается на события.
3. **Общение через шину событий (`GameEventBus`):**
   - Например, враг получает урон:
     1. Дев Б фиксирует коллизию в физике и вызывает расчет: `DamageCalculator.calculate(...)`.
     2. Дев А (или ядро) эмитит событие: `eventBus.emit(GameEventType.DAMAGE_DEALT, { ... })`.
     3. Дев Б не пишет логику подсчета урона — его модуль `JuiceEffects` просто слушает событие и трясет экран + выводит цифры урона.
     4. Его же `HUDView` слушает `GOLD_UPDATED` и плавно накручивает счетчик золота.

---

## 🌿 Git Workflow (Правила работы с ветками)

1. **Ветка `main`** — всегда стабильная и рабочая сборка. Прямые коммиты в `main` запрещены.
2. **Формат веток**:
   - Для Дев А: `feat/engine-stats`, `feat/core-save-system`, `feat/damage-calc`
   - Для Дев Б: `feat/player-wasd-movement`, `feat/hud-ui`, `feat/visual-juice`
3. **Перед слиянием**:
   - `git checkout main`
   - `git pull`
   - `git checkout feat/my-feature`
   - `git merge main` (или `rebase`)
   - Проверить сборку `npm run build`
   - Создать Pull Request / слить в `main`.

---

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск локального dev-сервера
npm run dev

# Проверка сборки типов и бандла
npm run build
```
