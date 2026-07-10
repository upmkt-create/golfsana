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
// FORMAT CONFIRMAT (GolfManager, capturat via DevTools el 09/07/2026):
//   GET {base}/availability.json?date=YYYY-MM-DD
//   → { area, items: [ { start, end, name, price, normalPrice, priceName,
//                         resource, resourceName, resourceType, slots, type } ],
//       queryStart, resourceTypes, resources, showRates }
//   "slots" (0-4) és la disponibilitat REAL (el comptador del consumer).
//
// ús:  GET /api/rates?course=torremirona&date=2026-06-26
//      GET /api/rates?date=2026-06-26           (tots els camps)
// ============================================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getCompetitorTeeTimes,
  getDaySummary,
  isCourseClosedOn,
  type TeeTime,
  type TeeTimeRate,
  type DaySummary,
} from "../src/competitorRates";

// ---- Mapa de camps: slug intern -> config del sistema de reserva ----------
interface CourseEndpoint {
  slug: string;
  name: string;
  system: "golfmanager" | "teeone";
  tenant: string;
  base: string;
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

// ---- FORMAT CRU DE GOLFMANAGER (confirmat per captura real) ---------------
interface GolfManagerItem {
  start: string;
  end: string;
  name: string;
  price: number;
  normalPrice: number;
  priceName?: string;
  resource: number;
  resourceName: string;
  resourceType: number;
  slots: number;
  type: number;
}

interface GolfManagerResponse {
  area: number;
  items: GolfManagerItem[];
  queryStart: string;
  showRates: boolean;
}

// ---- PARSER: GolfManager -> TeeTime[] --------------------------------------
function parseGolfManagerItems(items: GolfManagerItem[], allowedTariffs: string[]): TeeTime[] {
  const byTime = new Map<string, GolfManagerItem[]>();

  for (const item of items) {
    if (item.resourceType !== 3) continue; // només Golf, no Pitch&Putt
    if (allowedTariffs.length > 0 && !allowedTariffs.includes(item.name)) continue;
    const key = item.start;
    if (!byTime.has(key)) byTime.set(key, []);
    byTime.get(key)!.push(item);
  }

  const teeTimes: TeeTime[] = [];
  const sortedKeys = Array.from(byTime.keys()).sort();

  for (const startIso of sortedKeys) {
    const group = byTime.get(startIso)!;

    const bestByTariff = new Map<string, GolfManagerItem>();
    for (const item of group) {
      const existing = bestByTariff.get(item.name);
      if (!existing || item.slots > existing.slots) {
        bestByTariff.set(item.name, item);
      }
    }

    const rates: TeeTimeRate[] = Array.from(bestByTariff.values()).map((item) => ({
      tariff: item.name,
      price: item.price,
      originalPrice: item.normalPrice || undefined,
      discountPct: item.normalPrice > 0
        ? Math.round(((item.normalPrice - item.price) / item.normalPrice) * 100)
        : undefined,
    }));

    if (rates.length === 0) continue;

    const maxSlots = Math.max(...Array.from(bestByTariff.values()).map((i) => i.slots));

    // Extreure l'hora directament de l'string ISO (evita conversions de
    // timezone: el servidor de Vercel corre en UTC i "+02:00" es convertiria
    // malament si féssim servir new Date().getHours()).
    // Format esperat: "2026-07-09T07:00:00+02:00" → "07:00"
    const timeMatch = startIso.match(/T(\d{2}):(\d{2}):\d{2}/);
    const hh = timeMatch ? timeMatch[1] : "00";
    const mm = timeMatch ? timeMatch[2] : "00";
    const minutesFromMidnight = parseInt(hh, 10) * 60 + parseInt(mm, 10);

    teeTimes.push({
      time: `${hh}:${mm}`,
      minutes: minutesFromMidnight,
      rates,
      availableSlots: maxSlots,
    });
  }

  return teeTimes;
}

function buildLiveSummary(courseName: string, dateStr: string, teeTimes: TeeTime[]): DaySummary {
  if (teeTimes.length === 0) {
    return {
      courseName, dateStr, closed: false,
      minPrice: 0, maxPrice: 0, avgPrice: 0,
      totalTeeTimes: 0, freeTeeTimes: 0, totalFreeSlots: 0, occupancyPct: 0,
    };
  }
  const allPrices = teeTimes.flatMap((t) => t.rates.map((r) => r.price));
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const primaryPrices = teeTimes.map((t) => t.rates[0]?.price || 0);
  const avgPrice = Math.round(primaryPrices.reduce((a, b) => a + b, 0) / primaryPrices.length);

  const totalCapacity = teeTimes.length * 4;
  const totalFreeSlots = teeTimes.reduce((sum, t) => sum + t.availableSlots, 0);
  const freeTeeTimes = teeTimes.filter((t) => t.availableSlots > 0).length;
  const occupancyPct = Math.round(((totalCapacity - totalFreeSlots) / totalCapacity) * 100);

  return {
    courseName, dateStr, closed: false,
    minPrice, maxPrice, avgPrice,
    totalTeeTimes: teeTimes.length,
    freeTeeTimes, totalFreeSlots, occupancyPct,
  };
}

async function scrapeGolfManager(ep: CourseEndpoint, dateStr: string): Promise<TeeTime[] | null> {
  try {
    const url = `${ep.base}/availability.json?date=${dateStr}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": `${ep.base}/book?date=${dateStr}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("json")) return null;

    const data = (await resp.json()) as GolfManagerResponse;
    if (!Array.isArray(data?.items)) return null;

    const teeTimes = parseGolfManagerItems(data.items, ep.allowedTariffs);
    return teeTimes.length > 0 ? teeTimes : null;
  } catch {
    return null;
  }
}

async function scrapeTeeOne(ep: CourseEndpoint, dateStr: string): Promise<TeeTime[] | null> {
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
    return null; // format TeeOne encara no confirmat
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");

  const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const courseParam = req.query.course as string | undefined;

  const targets = courseParam
    ? [findEndpoint(courseParam)].filter(Boolean) as CourseEndpoint[]
    : COURSE_ENDPOINTS;

  if (targets.length === 0) {
    return res.status(404).json({ error: `Camp no trobat: ${courseParam}` });
  }

  try {
    const results = await Promise.all(
      targets.map(async (ep) => {
        try {
          const closed = isCourseClosedOn(ep.name, dateStr);
          if (closed.closed) {
            return {
              course: ep.name, slug: ep.slug, source: "closed",
              closedReason: closed.reason, teeTimes: [],
              summary: getDaySummary(ep.name, dateStr),
            };
          }

          let liveTeeTimes: TeeTime[] | null = null;
          try {
            if (ep.system === "golfmanager") liveTeeTimes = await scrapeGolfManager(ep, dateStr);
            else if (ep.system === "teeone") liveTeeTimes = await scrapeTeeOne(ep, dateStr);
          } catch {
            liveTeeTimes = null;
          }

          if (liveTeeTimes && liveTeeTimes.length > 0) {
            return {
              course: ep.name, slug: ep.slug, source: "live",
              teeTimes: liveTeeTimes,
              summary: buildLiveSummary(ep.name, dateStr, liveTeeTimes),
            };
          }

          return {
            course: ep.name, slug: ep.slug, source: "model",
            teeTimes: getCompetitorTeeTimes(ep.name, dateStr),
            summary: getDaySummary(ep.name, dateStr),
          };
        } catch (courseErr: any) {
          try {
            return {
              course: ep.name, slug: ep.slug, source: "model",
              teeTimes: getCompetitorTeeTimes(ep.name, dateStr),
              summary: getDaySummary(ep.name, dateStr),
            };
          } catch {
            return {
              course: ep.name, slug: ep.slug, source: "error",
              error: String(courseErr?.message || courseErr),
              teeTimes: [], summary: null,
            };
          }
        }
      })
    );

    return res.status(200).json({ date: dateStr, courses: results });
  } catch (err: any) {
    return res.status(200).json({
      date: dateStr,
      courses: [],
      error: String(err?.message || err),
    });
  }
}
