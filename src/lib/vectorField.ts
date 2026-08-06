/**
 * Демо жел/ағыс өрісі.
 *
 * MVP интернетсіз жұмыс істеуі тиіс болғандықтан, бұл модуль ECMWF/Open-Meteo
 * (жел) және Copernicus Marine (ағыс) API-ларының орнын басатын синтетикалық,
 * бірақ физикалық тұрғыдан ақылға қонымды векторлық өріс құрайды:
 * тұрақты негізгі ағын + кеңістіктік-уақыттық толқындық ауытқу.
 *
 * `Live Data` режимі іске қосылғанда дәл осы интерфейспен (lat,lng,hour) нақты
 * API нәтижесін қайтаратын функциямен ауыстырылады — қалған код өзгермейді.
 */

export interface Vector2 {
  /** Шығысқа қарай жылдамдық, м/с */
  u: number;
  /** Солтүстікке қарай жылдамдық, м/с */
  v: number;
}

// Каспийдің солтүстік-шығыс бөлігінде басым ағын солтүстік-шығысқа қарай
const BASE_CURRENT: Vector2 = { u: 0.07, v: 0.1 };
// Басым жел — батыстан/оңтүстік-батыстан
const BASE_WIND: Vector2 = { u: 3.2, v: 1.4 };

function wave(x: number, freq: number, phase = 0) {
  return Math.sin(x * freq + phase);
}

export function currentVector(lat: number, lng: number, hour: number): Vector2 {
  const gyre = wave(lat, 4.5, hour * 0.05) * 0.05;
  const shear = wave(lng, 5.5, hour * 0.04 + 1.3) * 0.04;
  const tidal = wave(hour, 0.26, lat * 2) * 0.03;
  return {
    u: BASE_CURRENT.u + shear + tidal,
    v: BASE_CURRENT.v + gyre,
  };
}

export function windVector(lat: number, lng: number, hour: number): Vector2 {
  const gust = wave(hour, 0.22, lng * 3) * 1.1;
  const drift = wave(hour, 0.05) * 0.6;
  const spatial = wave(lat + lng, 3, 0) * 0.4;
  return {
    u: BASE_WIND.u + gust + spatial,
    v: BASE_WIND.v + drift,
  };
}

export function windSpeedKmh(v: Vector2): number {
  return Math.hypot(v.u, v.v) * 3.6;
}
