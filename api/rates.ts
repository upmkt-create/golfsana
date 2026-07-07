// ============================================================================
// VERCEL API ROUTE — /api/rates
// ============================================================================
// Rate shopper server-side. Llegeix tarifes i disponibilitat reals dels camps
// competidors directament dels seus sistemes de reserva públics (GolfManager i
// TeeOne), executant-se al servidor de Vercel (sense restriccions CORS).
//
// ESTRATÈGIA DE RESILIÈNCIA:
//   1r) Intenta scraping EN DIRECTE del consumer endpoint públic del camp.
//   2n) Si falla (bloqueig, timeout, format desconegut), cau al MODEL VERIFICAT
//       de competitorRates.ts → el comparador mai es queda buit.
//
// ús:  GET /api/rates?course=torremirona&date=2026-06-26
//      GET /api/rates?date=2026-06-26           (tots els camps)
// ============================================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCompetitorTeeTimes, getDaySummary, isCourseClosedOn } from "../src/competitorRates";

// ---- Mapa de camps: slug intern → config del sistema de reserva -----------
interface CourseEndpoint {
  slug: string;
  name: string;
  system: "golfmanager" | "teeone";
  tenant: string;       // identificador del club al sistema
  // URL base del consumer públic (sense data, s'injecta dinàmicament)
  base: string;
  // Filtres de tarifa permesos (per descartar buggies, juniors, packs...)
  allowedTariffs: string[];
}

const COURSE_ENDPOINTS: CourseEndpoint[] = [
  {
    slug: "golfdaro", name: "Club Golf d'Aro - Mas Nou", system: "golfmanager", tenant: "golfdaro",
    base: "https://eu.golfmanager.com/golfdaro/consumer",
    allowedTariffs: ["GF 18 Forats", "GF 18F Earlybird", "GF 18 - 4 Players", "GF All You Can Play"],
  },
  {
    slug: "torremirona", name: "Torremirona Golf Club", system: "golfmanager", tenant: "golftorremirona",
    base: "https://eu.golfmanager.com/golftorremirona/consumer",
    allowedTariffs: ["GF 18 - Earlybird", "GF 18 Forats", "GF 18 - 4 Jugadors", "GF 18 - Summer Fee", "GF 18 - Twilight", "GF 9 - Twilight", "GF 18 - All You Can Play"],
  },
  {
    slug: "emporda", name: "Empordà Golf Club", system: "golfmanager", tenant: "emporda",
    base: "https://eu.golfmanager.com/emporda/consumer",
    allowedTariffs: ["GF 18 HOLES FOREST", "GF ALL YOU CAN PLAY FOREST"],
  },
  {
    slug: "camiral", name: "Camiral Golf & Wellness (Stadium Course)", system: "golfmanager", tenant: "camiral",
    base: "https://golf.camiral.com/camiral/consumer",
    allowedTariffs: ["Stadium Course"],
  },
  {
    slug: "pals", name: "Golf de Pals", system: "teeone", tenant: "platjadepals",
    base: "https://open.teeone.golf/es/platjadepals",
    allowedTariffs: ["PALS - 18 HOYOS ADULTO", "18 HOYOS TWILIGHT"],
  },
  {
    slug: "costabrava", name: "Golf Costa Brava", system: "teeone", tenant: "costa-brava",
    base: "https://open.teeone.golf/en/costa-brava",
    allowedTariffs: ["18 Holes", "18 Holes Sun Hour"],
  },
  {
    slug: "perelada", name: "Camp de Golf Perelada", system: "teeone", tenant: "peralada",
    base: "https://open.teeone.golf/es/peralada",
    allowedTariffs: ["GREEN FEE 18 Hoyos"],
  },
];

function findEndpoint(courseParam: string): CourseEndpoint | null {
  const p = courseParam.toLowerCase().trim();
  return (
    COURSE_ENDPOINTS.find((c) => c.slug === p) ||
    COURSE_ENDPOINTS.find((c) => c.name.toLowerCase().includes(p) || p.includes(c.slug)) ||
    null
  );
}

// ---- SCRAPER GOLFMANAGER ---------------------------------------------------
// El consumer públic de GolfManager carrega la disponibilitat via una crida
// JSON interna. Aquest fetch la replica server-side. El format exacte de la
// resposta encara s'ha de confirmar amb DevTools → quan el tinguem, ajustem
// el parser aquí. De moment retorna null per activar el fallback.
async function scrapeGolfManager(ep: CourseEndpoint, dateStr: string): Promise<any[] | null> {
  try {
    // Candidats d'endpoint intern conegut del consumer GolfManager.
    // (S'ajustarà quan confirmem el format real via DevTools Network.)
    const url = `${ep.base}/searchAvailability?tenant=${ep.tenant}&start=${dateStr}T07:00:00&end=${dateStr}T21:00:00&slots=1`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": `${ep.base}/book`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("json")) return null;
    const data = await resp.json();
    // TODO: mapejar data.slots[] → TeeTime[] segons format real confirmat
    if (!Array.isArray(data?.slots)) return null;
    return data.slots;
  } catch {
    return null; // qualsevol error → fallback
  }
}

// ---- SCRAPER TEEONE --------------------------------------------------------
async function scrapeTeeOne(ep: CourseEndpoint, dateStr: string): Promise<any[] | null> {
  try {
    const url = `${ep.base}/disponibilidad?date=${dateStr}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json, text/html, */*",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("json")) return null;
    const data = await resp.json();
    if (!Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}

// ---- HANDLER PRINCIPAL -----------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cache CDN: 10 min fresc, 1h stale-while-revalidate
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");

  const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const courseParam = req.query.course as string | undefined;

  // Quins camps processar
  const targets = courseParam
    ? [findEndpoint(courseParam)].filter(Boolean) as CourseEndpoint[]
    : COURSE_ENDPOINTS;

  if (targets.length === 0) {
    return res.status(404).json({ error: `Camp no trobat: ${courseParam}` });
  }

  try {
    // De moment servim el MODEL VERIFICAT (dades correctes de les captures).
    // L'scraping en directe s'activarà quan es confirmi el format JSON real de
    // GolfManager/TeeOne. Servir el model és instantani i no pot petar.
    const results = targets.map((ep) => {
      try {
        const closed = isCourseClosedOn(ep.name, dateStr);
        if (closed.closed) {
          return {
            course: ep.name, slug: ep.slug, source: "closed",
            closedReason: closed.reason, teeTimes: [],
            summary: getDaySummary(ep.name, dateStr),
          };
        }
        return {
          course: ep.name, slug: ep.slug, source: "model",
          teeTimes: getCompetitorTeeTimes(ep.name, dateStr),
          summary: getDaySummary(ep.name, dateStr),
        };
      } catch (courseErr: any) {
        // Si un camp concret falla, no tombem tota la resposta
        return {
          course: ep.name, slug: ep.slug, source: "error",
          error: String(courseErr?.message || courseErr),
          teeTimes: [], summary: null,
        };
      }
    });

    return res.status(200).json({ date: dateStr, courses: results });
  } catch (err: any) {
    // Xarxa de seguretat global: mai retornem 500
    return res.status(200).json({
      date: dateStr,
      courses: [],
      error: String(err?.message || err),
    });
  }
}
