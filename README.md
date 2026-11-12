# Mini Games 🎮

Основное приложение: https://vvl-code.github.io/catalog/

Общая коллекция 12 бесплатных игр, которая работает как Telegram Mini App и устанавливаемая на iPhone PWA. Без рекламы, платных API и собственного сервера.

## Структура

- / — Mini Games: главная страница, манифест, единый Service Worker
- /blocks/ — «Блоки», ранее отдельная игра
- /match3/ — «Три в ряд»
- /solitaire/ — «Косынка»
- /arcade/?game=... — остальные девять игр: «5 букв», «Сапёр», 2048, «Змейка», «Судоку», «Реверси», «Шашки», «Шахматы», «Пинбол»

## Развёртывание

GitHub Pages → Settings → Pages → Deploy from a branch → main → /(root). Публичный адрес: https://vvl-code.github.io/catalog/.

В Telegram для бота https://t.me/vvl_my_games_bot URL кнопки меню и Main Mini App: https://vvl-code.github.io/catalog/.

На iPhone откройте каталог в Safari, затем «Поделиться» → «На экран Домой» → «Добавить». После успешной установки офлайн-кеша игры доступны без соединения с сетью. Отдельно устанавливать «Блоки» не нужно.

Рекорды и прогресс сохраняются локально в контексте браузера (localStorage), без синхронизации между Safari и Telegram.

## Разработка и тесты

Без сборщика, runtime-зависимостей и backend: HTML5, CSS, JavaScript ES modules, Canvas, Service Worker.

- npm test — модульные тесты правил, включая шахматы.
- GitHub Actions — проверки синтаксиса, Playwright-тесты 12 игр на мобильных разрешениях, скриншоты.

Репозиторий `vvl-code/blocks` пока оставлен как резервная копия миграции, но активное приложение — `vvl-code/catalog`.
