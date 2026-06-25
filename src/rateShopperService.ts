// ============================================================================
// SERVEI DE DADES DEL RATE SHOPPER (client-side)
// ============================================================================
// Punt d'entrada únic perquè el comparador obtingui tarifes i disponibilitat.
//
// FLUX:
//   1r) Crida /api/rates (scraping en directe server-side + fallback model)
//   2n) Si /api/rates no respon (ex: dev local sense funcions Vercel),
//       cau directament al model verificat de competitorRates.ts
//
// AIXÒ DESACOBLA EL COMPARADOR DE FIREBASE: les dades de tarifes ja no
// depenen de Firestore. Firebase es reserva només per a tasques/usuaris.
// ============================================================================

import {
  getCompetitorTeeTimes,
  getDaySummary,
  isCourseClosedOn,
  type TeeTime,
  type DaySummary,
} from "./competitorRates";

export interface CourseRateData {
  course: string;
  slug: string;
  source: "live" | "model" | "closed";
  closedReason?: string;
  teeTimes: TeeTime[];
  summary: DaySummary;
}

export interface RatesResponse {
  date: string;
  courses: CourseRateData[];
}

// Mapa nom de camp → slug d'API (per a crides individuals)
const NAME_TO_SLUG: Record<string, string> = {
  "club golf d'aro - mas nou": "golfdaro",
  "torremirona golf club": "torremirona",
  "empordà golf club": "emporda",
  "camiral golf & wellness (stadium course)": "camiral",
  "golf de pals": "pals",
  "golf costa brava": "costabrava",
  "camp de golf perelada": "perelada",
};

function slugFor(courseName: string): string | undefined {
  const n = courseName.toLowerCase().trim();
  if (NAME_TO_SLUG[n]) return NAME_TO_SLUG[n];
  for (const [name, slug] of Object.entries(NAME_TO_SLUG)) {
    if (n.includes(slug) || name.includes(n.substring(0, 10))) return slug;
  }
  return undefined;
}

// Construeix la resposta localment des del model verificat (fallback)
function buildFromModel(courseName: string, dateStr: string): CourseRateData {
  const closed = isCourseClosedOn(courseName, dateStr);
  return {
    course: courseName,
    slug: slugFor(courseName) || courseName,
    source: closed.closed ? "closed" : "model",
    closedReason: closed.reason,
    teeTimes: getCompetitorTeeTimes(courseName, dateStr),
    summary: getDaySummary(courseName, dateStr),
  };
}

/**
 * Obté tarifes per a UN camp en una data. Intenta /api/rates; si falla, model.
 */
export async function fetchCourseRates(courseName: string, dateStr: string): Promise<CourseRateData> {
  const slug = slugFor(courseName);
  try {
    const resp = await fetch(`/api/rates?course=${slug}&date=${dateStr}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (resp.ok) {
      const data: RatesResponse = await resp.json();
      if (data.courses?.[0]) return data.courses[0];
    }
  } catch {
    // silenci → fallback
  }
  return buildFromModel(courseName, dateStr);
}

/**
 * Obté tarifes de TOTS els camps en una data. Intenta /api/rates; si falla, model.
 */
export async function fetchAllRates(courseNames: string[], dateStr: string): Promise<RatesResponse> {
  try {
    const resp = await fetch(`/api/rates?date=${dateStr}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (resp.ok) {
      const data: RatesResponse = await resp.json();
      if (data.courses?.length) return data;
    }
  } catch {
    // silenci → fallback
  }
  // Fallback complet des del model
  return {
    date: dateStr,
    courses: courseNames.map((name) => buildFromModel(name, dateStr)),
  };
}

// Re-exporta tipus i funcions del model per comoditat
export { getCompetitorTeeTimes, getDaySummary, isCourseClosedOn };
export type { TeeTime, DaySummary };
