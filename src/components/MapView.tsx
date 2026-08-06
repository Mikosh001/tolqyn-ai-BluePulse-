import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import ParticleCanvasLayer from "./ParticleCanvasLayer";
import { COAST_SECTORS } from "../data/geo";
import type { LatLng } from "../lib/simulation";
import type { SectorRisk, InterceptionResult } from "../lib/simulation";
import { MAP_CENTER, MAP_DEFAULT_ZOOM } from "../data/geo";

interface Props {
  event: LatLng;
  onPickEvent: (p: LatLng) => void;
  pickingEnabled: boolean;
  particles: LatLng[];
  sectorRisks: SectorRisk[] | null;
  interception: InterceptionResult | null;
  mode: "forward" | "reverse";
}

function eventDivIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="event-pin"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function interceptionDivIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="intercept-pin">⌖</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function ClickHandler({ enabled, onPick }: { enabled: boolean; onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function riskColor(prob: number) {
  if (prob >= 0.6) return "#e63946";
  if (prob >= 0.3) return "#f6a13a";
  if (prob > 0.05) return "#02C39A";
  return "#8fa8b5";
}

export default function MapView({
  event,
  onPickEvent,
  pickingEnabled,
  particles,
  sectorRisks,
  interception,
  mode,
}: Props) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_DEFAULT_ZOOM}
      className="map-root"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler enabled={pickingEnabled} onPick={onPickEvent} />

      {COAST_SECTORS.map((s) => {
        const risk = sectorRisks?.find((r) => r.sector.id === s.id);
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={9}
            pathOptions={{
              color: risk ? riskColor(risk.probability) : "#1C7293",
              fillColor: risk ? riskColor(risk.probability) : "#1C7293",
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <strong>{s.name}</strong>
              {risk ? (
                <div>Ықтималдық: {Math.round(risk.probability * 100)}%</div>
              ) : (
                <div>Симуляция әлі жүргізілмеді</div>
              )}
            </Tooltip>
          </CircleMarker>
        );
      })}

      <Marker position={[event.lat, event.lng]} icon={eventDivIcon()}>
        <Tooltip direction="top" offset={[0, -10]}>
          {mode === "forward" ? "Оқиға нүктесі" : "Табылған орын"}
        </Tooltip>
      </Marker>

      {interception && (
        <Marker position={[interception.point.lat, interception.point.lng]} icon={interceptionDivIcon()}>
          <Tooltip direction="top" offset={[0, -12]}>
            Interception Point
          </Tooltip>
        </Marker>
      )}

      <ParticleCanvasLayer particles={particles} color={mode === "forward" ? "#02C39A" : "#f6a13a"} />
    </MapContainer>
  );
}
