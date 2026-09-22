// ============================================================================
// MAPA DE CAMPS — Golfrepu
// ============================================================================
// Mapa amb OpenStreetMap (Leaflet) mostrant Golf d'Aro i els competidors.
// Fent clic a un pin s'obre la pàgina web oficial del club en una pestanya
// nova. No necessita cap clau d'API (a diferència de Google Maps) — les
// rajoles venen d'OpenStreetMap, gratuïtes i sense límit de peticions
// raonable per a un ús intern com aquest.
//
// Coordenades i webs oficials confirmades manualment (22/09/2026) via cerca
// — mai inventades.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2, Minimize2, LocateFixed } from "lucide-react";

export interface GolfClubMapPoint {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  website: string;
  isOwnClub?: boolean;
}

// Coordenades confirmades via cerca de llocs (Google Places, 22/09/2026) i
// URL oficial de cada club — no venen de cap font de scraping.
export const GOLF_CLUBS_MAP_POINTS: GolfClubMapPoint[] = [
  { slug: "golfdaro", name: "Club Golf d'Aro - Mas Nou", lat: 41.8359803, lng: 3.0184414, website: "https://www.golfdaro.com/en/", isOwnClub: true },
  { slug: "torremirona", name: "Torremirona Golf Club", lat: 42.2349818, lng: 2.8665572, website: "https://golftorremirona.com/en/" },
  { slug: "emporda", name: "Empordà Golf Resort", lat: 42.0137705, lng: 3.1393343, website: "https://www.empordagolf.com/" },
  { slug: "camiral", name: "Camiral Golf & Wellness", lat: 41.857257, lng: 2.7633609, website: "https://www.camiral.com/en/golf" },
  { slug: "pals", name: "Golf de Pals", lat: 41.9941596, lng: 3.1947174, website: "https://golfdepals.com/en/home.html" },
  { slug: "costabrava", name: "Club de Golf Costa Brava", lat: 41.8055569, lng: 2.9845225, website: "https://golfcostabrava.com/en/" },
  { slug: "perelada", name: "Camp de Golf Peralada", lat: 42.3139069, lng: 3.0229824, website: "https://www.golfperalada.com/en" },
];

function buildPinIcon(isOwnClub: boolean): L.DivIcon {
  const color = isOwnClub ? "#f59e0b" : "#334155"; // amber-500 per Golf d'Aro, slate-700 per la resta
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 30px; height: 30px;
        display: flex; align-items: center; justify-content: center;
        transform: translate(-50%, -100%);
      ">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1">
          <path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 6.8 14.7 7.1 15.1.2.3.6.3.8 0C12.2 22.7 20 13.4 20 8c0-4.4-3.6-8-8-8z"/>
          <circle cx="12" cy="8" r="3" fill="white" stroke="none"/>
        </svg>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

interface GolfClubsMapProps {
  points?: GolfClubMapPoint[];
  // Notifica quin club (slug) té el punter per sobre — null quan es deixa
  // d'estar-hi. Permet il·luminar la targeta corresponent a fora del mapa
  // (p.ex. la de reputació a Google Maps) sense que el mapa en sàpiga res.
  onHoverClub?: (slug: string | null) => void;
}

export default function GolfClubsMap({ points = GOLF_CLUBS_MAP_POINTS, onHoverClub }: GolfClubsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // El callback pot canviar de referència entre renders (p.ex. un setState
  // inline); es guarda en un ref perquè els listeners de Leaflet, creats un
  // sol cop, sempre truquin a la versió més recent.
  const onHoverClubRef = useRef(onHoverClub);
  onHoverClubRef.current = onHoverClub;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const markers: L.Marker[] = points.map((club) => {
      const marker = L.marker([club.lat, club.lng], { icon: buildPinIcon(!!club.isOwnClub) })
        .addTo(map)
        .bindTooltip(club.name, { direction: "top", offset: [0, -28] });
      marker.on("click", () => {
        window.open(club.website, "_blank", "noopener,noreferrer");
      });
      marker.on("mouseover", () => {
        onHoverClubRef.current?.(club.slug);
      });
      marker.on("mouseout", () => {
        onHoverClubRef.current?.(null);
      });
      return marker;
    });

    const bounds = L.latLngBounds(markers.map((m) => m.getLatLng()));
    boundsRef.current = bounds;
    map.fitBounds(bounds, { padding: [40, 40] });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quan es canvia a pantalla completa, Leaflet necessita que se li digui
  // que el contenidor ha canviat de mida, sinó les rajoles queden mal
  // retallades.
  useEffect(() => {
    const timeout = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 150);
    return () => clearTimeout(timeout);
  }, [isFullscreen]);

  const handleResetZoom = () => {
    if (mapRef.current && boundsRef.current) {
      mapRef.current.fitBounds(boundsRef.current, { padding: [40, 40] });
    }
  };

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[999] bg-white p-3"
          : "relative"
      }
    >
      <div ref={containerRef} className={isFullscreen ? "w-full h-full rounded-xl overflow-hidden" : "w-full h-[420px] rounded-xl overflow-hidden border border-slate-200"} />
      <div className="absolute top-2 right-2 flex gap-1.5 z-[500]">
        <button
          type="button"
          onClick={handleResetZoom}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white/95 hover:bg-white text-[10px] font-bold uppercase tracking-wide text-slate-600 rounded-full shadow border border-slate-200"
          title="Reiniciar zoom"
        >
          <LocateFixed className="w-3 h-3" />
          Reset zoom
        </button>
        <button
          type="button"
          onClick={() => setIsFullscreen((v) => !v)}
          className="p-1.5 bg-white/95 hover:bg-white text-slate-600 rounded-full shadow border border-slate-200"
          title={isFullscreen ? "Sortir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
