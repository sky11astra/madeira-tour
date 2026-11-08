// ⚠️ Єдине місце, де треба вписати реальні дані перед публікацією.
export default {
  brand: "Madeira Tour",
  // Адреса сайту (без слеша в кінці) — потрібна для canonical, hreflang, sitemap і соцмереж.
  // Зараз — GitHub Pages; коли з'явиться власний домен, впишіть його сюди.
  siteUrl: "https://sky11astra.github.io/madeira-tour",
  contacts: {
    whatsapp: "351900000000",          // номер у міжнародному форматі, лише цифри
    phone: "+351 900 000 000",         // як показувати на сайті
    email: "hello@madeira-tour.example",
    telegram: "madeiratour"            // username без @
  },
  // Необов'язково: URL сервісу форм (Formspree, Web3Forms тощо). Якщо порожньо — заявка йде у WhatsApp / email.
  formEndpoint: "",
  geo: { lat: 32.6496, lon: -16.9086, region: "PT-30", place: "Funchal, Madeira" },
  founded: "2026",
  // Мови сайту: тексти в src/i18n/<code>.mjs. Перша — головна сторінка «/».
  langs: [
    { code: "uk", dir: "",    hreflang: "uk", label: "UA", name: "Українська", ogLocale: "uk_UA", locale: "uk-UA" },
    { code: "en", dir: "en/", hreflang: "en", label: "EN", name: "English",    ogLocale: "en_GB", locale: "en-GB" },
    { code: "de", dir: "de/", hreflang: "de", label: "DE", name: "Deutsch",    ogLocale: "de_DE", locale: "de-DE" },
    { code: "pl", dir: "pl/", hreflang: "pl", label: "PL", name: "Polski",     ogLocale: "pl_PL", locale: "pl-PL" },
    { code: "fr", dir: "fr/", hreflang: "fr", label: "FR", name: "Français",   ogLocale: "fr_FR", locale: "fr-FR" },
    { code: "ru", dir: "ru/", hreflang: "ru", label: "RU", name: "Русский",    ogLocale: "ru_RU", locale: "ru-RU" }
  ]
};
