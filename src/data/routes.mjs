// Точки маршрутів поза атласом (назви — у src/i18n/<мова>.mjs → stops).
// map: "funchal" — на карті ці точки зводяться до однієї позначки Фуншала.
export const stops = {
  funchal:   { lat: 32.6496, lon: -16.9086 },
  fnc:       { lat: 32.6979, lon: -16.7745 },
  base:      { lat: 32.6496, lon: -16.9086, map: "funchal" },
  marina:    { lat: 32.6455, lon: -16.9095, map: "funchal" },
  plaza:     { lat: 32.6450, lon: -16.9140, map: "funchal" },
  mercado:   { lat: 32.6495, lon: -16.9050, map: "funchal" },
  machico:   { lat: 32.7180, lon: -16.7670 },
  teixeira:  { lat: 32.7672, lon: -16.9122 },
  queimadas: { lat: 32.7838, lon: -16.9047 },
  rabacal:   { lat: 32.7560, lon: -17.1340 },
  girao_sea: { lat: 32.6330, lon: -17.0000 },
  garajau:   { lat: 32.6370, lon: -16.8520 }
};

// Маршрути: km — орієнтовний пробіг дня; s — [точка, час дня]. Опис кожної зупинки — у мовних пакетах (routes.<id>.plan[день].s[n]).
export const routes = [
  { id: "classic", plan: [
    { km: 25,  s: [["fnc", "arr"], ["base", "day"], ["oldtown", "eve"]] },
    { km: 130, s: [["arieiro", "dawn"], ["balcoes", "morn"], ["santana", "noon"], ["lourenco", "aft"], ["machico", "dusk"]] },
    { km: 180, s: [["camara", "morn"], ["girao", "morn"], ["veu", "noon"], ["seixal", "noon"], ["moniz", "noon"], ["janela", "aft"], ["fanal", "aft"], ["pargo", "dusk"]] },
    { km: 15,  s: [["mercado", "morn"], ["monte", "morn"], ["girao_sea", "aft"], ["plaza", "eve"]] },
    { km: 20,  s: [["base", "morn"], ["fnc", "day"]] } ] },
  { id: "peaks", plan: [
    { km: 25,  s: [["fnc", "arr"], ["base", "day"], ["oldtown", "eve"]] },
    { km: 70,  s: [["arieiro", "dawn"], ["ruivo", "morn"], ["teixeira", "noon"], ["santana", "aft"]] },
    { km: 90,  s: [["queimadas", "morn"], ["caldeirao", "noon"], ["balcoes", "aft"]] },
    { km: 160, s: [["rabacal", "morn"], ["fanal", "aft"], ["pargo", "dusk"]] },
    { km: 70,  s: [["lourenco", "morn"], ["machico", "noon"], ["girao_sea", "dusk"]] },
    { km: 25,  s: [["mercado", "morn"], ["fnc", "day"]] } ] },
  { id: "ocean", plan: [
    { km: 25,  s: [["fnc", "arr"], ["base", "day"], ["marina", "dusk"]] },
    { km: 5,   s: [["marina", "morn"], ["girao_sea", "morn"], ["garajau", "noon"], ["base", "eve"]] },
    { km: 25,  s: [["mercado", "morn"], ["monte", "noon"], ["botanico", "aft"], ["camara", "dusk"]] },
    { km: 150, s: [["veu", "morn"], ["seixal", "morn"], ["moniz", "noon"], ["fanal", "aft"]] },
    { km: 20,  s: [["base", "morn"], ["fnc", "day"]] } ] },
  { id: "team", plan: [
    { km: 25,  s: [["fnc", "arr"], ["base", "day"], ["oldtown", "eve"]] },
    { km: 130, s: [["arieiro", "dawn"], ["santana", "morn"], ["lourenco", "aft"], ["machico", "dusk"]] },
    { km: 15,  s: [["girao_sea", "morn"], ["monte", "noon"], ["plaza", "eve"]] },
    { km: 20,  s: [["mercado", "morn"], ["fnc", "day"]] } ] }
];
