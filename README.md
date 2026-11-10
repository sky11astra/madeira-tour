# Madeira Tour — сайт турів на Мадейру

Сайт онлайн: **https://sky11astra.github.io/madeira-tour/**

Статичний сайт без фреймворків, 6 мов:
`/` — українська, `/en/` — English, `/de/` — Deutsch, `/pl/` — Polski, `/fr/` — Français, `/ru/` — Русский.

## Як оновити сайт в інтернеті
`npm run deploy` — збирає сайт і викладає папку `dist/` у гілку `gh-pages` (звідти його показує GitHub Pages). Зміни з'являються онлайн приблизно за хвилину.

Головний екран: 3D-глобус із 49 фото найкрасивіших місць Мадейри на зоряному небі. Його можна крутити мишею або пальцем у будь-який бік на 360°; коли його не чіпають, він повільно обертається сам.

Жива вода: на фото басейну хвилі, сонячні відблиски й сплески малює WebGL (`src/water.js`). Контури води на фото задані в `WATER` у `build.mjs`. Якщо браузер не вміє WebGL2 або в системі вимкнено анімацію, показується звичайне фото.

## Перед публікацією — заповнити `src/config.mjs`
- `siteUrl` — справжній домен (для Google, соцмереж, sitemap).
- `contacts` — WhatsApp, телефон, email, Telegram (зараз там заглушки).
- `formEndpoint` — необов'язково: адреса сервісу форм (Formspree, Web3Forms). Без нього заявка йде у WhatsApp / email / Telegram з готовим текстом.

Після змін: `npm run build` (або `node build.mjs`). Якщо змінили фото апартаментів — спершу `npm run images`.

## Структура
- `src/i18n/<мова>.mjs` — усі тексти однією мовою: секції, FAQ, 21 місце (`spots`), маршрути (`trips`), назви зупинок.
- `src/data/places.mjs` — 21 місце: координати, регіон, головне фото.
- `src/data/more.json` — додаткові фото місць для глобуса (разом 49).
- `src/data/routes.mjs` — 4 маршрути по днях (точки й час дня).
- `src/data/photos.json` — фото з Wikimedia Commons: автор, ліцензія, посилання.
- `src/data/geo.json` — контур острова з OpenStreetMap для карти маршрутів.
- `assets/apartments/` — оригінали фото апартаментів; `npm run images` робить з них WebP.
- `src/styles.css`, `src/app.js`, `src/template.mjs`, `build.mjs` — дизайн, логіка, HTML, збірка.

Щоб додати мову: скопіюйте `src/i18n/en.mjs` у новий файл, перекладіть і додайте мову в `langs` у `src/config.mjs`.

## SEO / GEO
- Окрема сторінка на кожну мову з `hreflang`, canonical, Open Graph, geo-мета (Funchal, PT-30).
- Schema.org JSON-LD: TravelAgency, TouristDestination з 21 атракцією, 4 TouristTrip, FAQPage.
- `robots.txt` (відкритий для Google і AI-пошуку), `sitemap.xml` з усіма мовами, `llms.txt` — стислий опис для ChatGPT, Perplexity, Claude.
- Увесь текст є в HTML одразу.

## Фото
Фото локацій — Wikimedia Commons (CC BY / CC BY-SA, одне — public domain), автори вказані в перегляді фото та у футері («Автори фото»).
Сайт віддає їх зі своєї папки у форматі WebP (280–1280 px):
- `npm run photos` — завантажує оригінали в `assets/photos/` (не в git, ~22 МБ);
- `npm run images` — робить з них WebP у `dist/img/photos/` і список `src/data/photo-files.json`;
- `npm run all` — усе разом плюс збірка сайту. Якщо WebP немає, сайт бере фото з Wikimedia.
