// Mangystau / Каспий жағалауы бойынша демо географиялық деректер.
// Координаттар нақты аймаққа жуықтатылған (демо мақсатында).

export interface CoastSector {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Тәуекел есептеу радиусы, км */
  radiusKm: number;
  /** Аймақ түрі — презентация/UI үшін */
  kind: "port" | "city" | "protected";
}

export const COAST_SECTORS: CoastSector[] = [
  { id: "tupkaragan", name: "Түпқараған", lat: 44.61, lng: 50.34, radiusKm: 18, kind: "protected" },
  { id: "bautino", name: "Баутино порты", lat: 44.548, lng: 50.265, radiusKm: 14, kind: "port" },
  { id: "protected", name: "Қорғалатын аймақ (итбалық мекені)", lat: 44.22, lng: 50.98, radiusKm: 20, kind: "protected" },
  { id: "aktau", name: "Ақтау жағалауы", lat: 43.651, lng: 51.198, radiusKm: 16, kind: "city" },
];

export interface ObjectType {
  id: string;
  label: string;
  /** Жел әсер ету коэффициенті (windage), 0..0.06 аралығында */
  windage: number;
  icon: string;
}

export const OBJECT_TYPES: ObjectType[] = [
  { id: "oil", label: "Мұнайға ұқсас дақ", windage: 0.03, icon: "droplet" },
  { id: "plastic", label: "Қалқымалы пластик", windage: 0.04, icon: "recycle" },
  { id: "net", label: "Балық аулау торы", windage: 0.02, icon: "waves" },
  { id: "bio", label: "Биологиялық объект", windage: 0.012, icon: "fish" },
];

export const DEFAULT_EVENT = {
  lat: 44.02,
  lng: 50.62,
  areaKm2: 1.7,
};

export const MAP_CENTER: [number, number] = [44.15, 50.55];
export const MAP_DEFAULT_ZOOM = 8;
