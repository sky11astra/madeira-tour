// 21 місце для сфери, атласу, карти та JSON-LD. Тексти кожною мовою — у src/i18n/<мова>.mjs → places.
// photo — ключ у photos.json (Wikimedia Commons, вільні ліцензії). region: east | funchal | west | ocean. tall — вертикальна картка.
export const places = [
  { id: "arieiro",    photo: "arieiro",    region: "east",    lat: 32.7357, lon: -16.9289 },
  { id: "ruivo",      photo: "ruivo",      region: "east",    lat: 32.7590, lon: -16.9427 },
  { id: "lourenco",   photo: "lourenco",   region: "east",    lat: 32.7442, lon: -16.7076 },
  { id: "santana",    photo: "santana",    region: "east",    lat: 32.8086, lon: -16.8812 },
  { id: "caldeirao",  photo: "caldeirao",  region: "east",    lat: 32.7750, lon: -16.9150, tall: true },
  { id: "balcoes",    photo: "balcoes",    region: "east",    lat: 32.7390, lon: -16.8840 },
  { id: "curral",     photo: "curral",     region: "east",    lat: 32.7116, lon: -16.9611 },
  { id: "oldtown",    photo: "oldtown",    region: "funchal", lat: 32.6478, lon: -16.9031 },
  { id: "monte",      photo: "monte",      region: "funchal", lat: 32.6750, lon: -16.9025 },
  { id: "botanico",   photo: "botanico",   region: "funchal", lat: 32.6622, lon: -16.8958 },
  { id: "camara",     photo: "camara",     region: "funchal", lat: 32.6480, lon: -16.9770 },
  { id: "girao",      photo: "girao",      region: "funchal", lat: 32.6560, lon: -17.0040 },
  { id: "pontasol",   photo: "pontasol",   region: "funchal", lat: 32.6800, lon: -17.1000 },
  { id: "moniz",      photo: "moniz",      region: "west",    lat: 32.8680, lon: -17.1700 },
  { id: "seixal",     photo: "seixal",     region: "west",    lat: 32.8240, lon: -17.1110 },
  { id: "veu",        photo: "veu",        region: "west",    lat: 32.8200, lon: -17.0950, tall: true },
  { id: "fanal",      photo: "fanal",      region: "west",    lat: 32.8100, lon: -17.1450 },
  { id: "janela",     photo: "janela",     region: "west",    lat: 32.8640, lon: -17.1520 },
  { id: "pargo",      photo: "pargo",      region: "west",    lat: 32.8140, lon: -17.2640 },
  { id: "desertas",   photo: "desertas",   region: "ocean",   lat: 32.5200, lon: -16.5100 },
  { id: "portosanto", photo: "portosanto", region: "ocean",   lat: 33.0500, lon: -16.3400 }
];
