import type { SectorRisk, InterceptionResult, ReverseOriginResult } from "./simulation";

export function forwardActionText(
  top: SectorRisk | undefined,
  interception: InterceptionResult | null
): string {
  if (!top || top.probability < 0.05) {
    return "Ағымдағы параметрлер бойынша жағалауға айтарлықтай қауіп анықталған жоқ. Бақылауды жалғастыру ұсынылады.";
  }
  const pct = Math.round(top.probability * 100);
  const eta = top.etaHour ?? "—";
  const parts = [
    `Келесі ${eta} сағат ішінде «${top.sector.name}» секторына жету ықтималдығы — ${pct}%.`,
  ];
  if (interception) {
    parts.push(
      `Ұсынылатын тоқтату нүктесі: ${interception.point.lat.toFixed(3)}, ${interception.point.lng.toFixed(3)} (уақыт терезесі: ${interception.windowStartHour}–${interception.windowEndHour} сағат).`
    );
    parts.push(
      `Осы нүктеде ұстау, жағалауда тазалауға қарағанда есептелген аудан бойынша ~${interception.areaRatio}× тиімдірек.`
    );
  }
  parts.push(`Бақылау тобын «${top.sector.name}» секторына жіберу және ${eta ?? "келесі"} сағаттан кейін спутник суретімен қайта тексеру ұсынылады.`);
  return parts.join(" ");
}

export function reverseActionText(origin: ReverseOriginResult | null): string {
  if (!origin) return "Кері есептеу үшін жеткілікті дерек жоқ.";
  return `Ықтимал бастапқы аймақ — табылған нүктеден шамамен ${origin.distanceFromFoundKm} км ${origin.bearingLabel} бағытта, ~${origin.radiusKm} км радиуста. Осы аймақтағы кеме қозғалысы мен инфрақұрылымды тексеру ұсынылады.`;
}
