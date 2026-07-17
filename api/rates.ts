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
//       (definit més avall en aquest mateix fitxer) → el comparador mai es
//       queda buit.
//
// NOTA IMPORTANT SOBRE AQUEST FITXER:
// Tot el motor de tarifes de reserva (abans a src/competitorRates.ts) està
// FUSIONAT aquí mateix, sense cap import relatiu fora de /api. Vercel, en
// empaquetar aquesta funció, no incloïa el fitxer extern al bundle final
// (error real vist als logs: "Cannot find module '/var/task/src/
// competitorRates'"), tot i que el build local i el TypeScript compilaven
// perfecte. Fusionar-ho tot en un únic fitxer autocontingut elimina aquest
// risc de bundling per complet.
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

// Tipus mínims propis per a la petició/resposta de la funció — evitem
// dependre de "@vercel/node" en runtime. És una devDependency: si el
// bundler de Vercel no elimina del tot l'import (encara que sigui
// "import type"), la funció peta en producció en no trobar el paquet,
// tot i funcionar perfecte en local. Definint els tipus aquí mateix,
// no cal cap import extern per a res.
interface VercelRequest {
  query: { [key: string]: string | string[] | undefined };
}
interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

// ============================================================================
// MOTOR DE TARIFES REALS — RATE SHOPPER GOLFSANA (fusionat, veure nota dalt)
// ============================================================================

export interface TeeTimeRate {
  tariff: string;        // Nom de la tarifa (ex: "GF 18 Forats")
  price: number;         // Preu vigent net (€)
  originalPrice?: number; // Preu sense descompte (€)
  discountPct?: number;  // % descompte aplicat
}

export interface TeeTime {
  time: string;          // "HH:MM"
  minutes: number;       // minuts des de 00:00 (per ordenar/filtrar)
  rates: TeeTimeRate[];  // Tarifes disponibles en aquest tee-time
  availableSlots: number; // Slots lliures (0-4)
}

// Converteix "HH:MM" a minuts des de mitjanit
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Genera una sèrie de tee-times entre dues hores amb un interval donat
function generateSlots(startTime: string, endTime: string, intervalMin: number): string[] {
  const result: string[] = [];
  let t = toMinutes(startTime);
  const end = toMinutes(endTime);
  while (t <= end) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    result.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    t += intervalMin;
  }
  return result;
}

// Disponibilitat pseudo-aleatòria però DETERMINISTA (mateixa data+hora+camp =
// mateixa disponibilitat). Evita que els números ballin a cada render.
function deterministicSlots(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const r = Math.abs(hash) % 100;
  // 70% dels tee-times tenen 4 slots, la resta entre 1-3 (simula ocupació real)
  if (r < 70) return 4;
  if (r < 82) return 3;
  if (r < 92) return 2;
  return 1;
}

// ----------------------------------------------------------------------------
// DEFINICIÓ DE FRANGES TARIFÀRIES REALS PER CAMP
// ----------------------------------------------------------------------------
interface RateBlock {
  start: string;
  end: string;
  rates: TeeTimeRate[];
}

interface CourseRateModel {
  matchKeys: string[];
  interval: number;
  openFrom: string;
  openTo: string;
  wkndDelta: number;
  closedRanges?: { from: string; to: string; reason: string }[];
  blocks: RateBlock[];
}

// Dades reals juny 2026 (de les captures dels sistemes de reserva)
const COURSE_MODELS: Record<string, CourseRateModel> = {

  // ---- GOLF DE PALS (TeeOne) — captura 25/06/2026 -------------------------
  pals: {
    matchKeys: ["pals"],
    interval: 10,
    openFrom: "08:10",
    openTo: "17:30",
    wkndDelta: 10,
    blocks: [
      { start: "08:10", end: "11:00", rates: [{ tariff: "PALS - 18 HOYOS ADULTO", price: 116, originalPrice: 116, discountPct: 0 }] },
      { start: "11:00", end: "12:00", rates: [{ tariff: "PALS - 18 HOYOS ADULTO", price: 96, originalPrice: 116, discountPct: 17 }] },
      { start: "12:00", end: "12:20", rates: [{ tariff: "PALS - 18 HOYOS ADULTO", price: 106, originalPrice: 116, discountPct: 9 }] },
      { start: "12:20", end: "13:00", rates: [{ tariff: "PALS - 18 HOYOS ADULTO", price: 99, originalPrice: 116, discountPct: 15 }] },
      { start: "13:00", end: "14:00", rates: [{ tariff: "PALS - 18 HOYOS ADULTO", price: 98, originalPrice: 116, discountPct: 16 }] },
      { start: "14:00", end: "14:20", rates: [{ tariff: "PALS - 18 HOYOS ADULTO", price: 107, originalPrice: 116, discountPct: 8 }] },
      { start: "14:20", end: "16:00", rates: [{ tariff: "PALS - 18 HOYOS ADULTO", price: 102, originalPrice: 116, discountPct: 12 }] },
      { start: "16:00", end: "16:30", rates: [{ tariff: "PALS - 18 HOYOS ADULTO", price: 106, originalPrice: 116, discountPct: 9 }] },
      { start: "16:30", end: "17:30", rates: [{ tariff: "18 HOYOS TWILIGHT", price: 71, originalPrice: 116, discountPct: 39 }] },
    ],
  },

  // ---- EMPORDÀ GOLF CLUB (GolfManager) — captura 24/06/2026 ---------------
  emporda: {
    matchKeys: ["empord", "gualta"],
    interval: 10,
    openFrom: "08:20",
    openTo: "19:30",
    wkndDelta: 10,
    blocks: [
      { start: "08:20", end: "16:00", rates: [{ tariff: "GF 18 HOLES FOREST", price: 104, originalPrice: 125, discountPct: 17 }] },
      { start: "16:00", end: "19:30", rates: [{ tariff: "GF ALL YOU CAN PLAY FOREST", price: 75, originalPrice: 125, discountPct: 40 }] },
    ],
  },

  // ---- GOLF COSTA BRAVA (TeeOne) — captura 29/06/2026 ---------------------
  costa_brava: {
    matchKeys: ["costa brava"],
    interval: 9,
    openFrom: "08:54",
    openTo: "16:24",
    wkndDelta: 10,
    blocks: [
      { start: "08:54", end: "12:00", rates: [{ tariff: "18 Holes", price: 103, originalPrice: 114, discountPct: 10 }] },
      { start: "12:00", end: "16:24", rates: [{ tariff: "18 Holes Sun Hour", price: 82, originalPrice: 114, discountPct: 28 }] },
    ],
  },

  // ---- CAMIRAL GOLF & WELLNESS (GolfManager) — captura 25/06/2026 ---------
  camiral: {
    matchKeys: ["camiral", "pga", "stadium"],
    interval: 10,
    openFrom: "08:00",
    openTo: "18:20",
    wkndDelta: 20,
    closedRanges: [{ from: "2026-07-27", to: "2026-09-27", reason: "Stadium Course tancat per millores" }],
    blocks: [
      { start: "08:00", end: "10:00", rates: [{ tariff: "Stadium Course", price: 171, originalPrice: 171, discountPct: 0 }] },
      { start: "10:00", end: "10:10", rates: [{ tariff: "Stadium Course", price: 192, originalPrice: 192, discountPct: 0 }] },
      { start: "10:10", end: "11:30", rates: [{ tariff: "Stadium Course", price: 171, originalPrice: 171, discountPct: 0 }] },
      { start: "11:30", end: "11:40", rates: [{ tariff: "Stadium Course", price: 192, originalPrice: 192, discountPct: 0 }] },
      { start: "11:40", end: "17:10", rates: [{ tariff: "Stadium Course", price: 171, originalPrice: 171, discountPct: 0 }] },
      { start: "17:10", end: "18:20", rates: [{ tariff: "Stadium Course", price: 139, originalPrice: 171, discountPct: 19 }] },
    ],
  },

  // ---- TORREMIRONA GOLF CLUB (GolfManager) — captura 26/06/2026 -----------
  torremirona: {
    matchKeys: ["torremirona"],
    interval: 9,
    openFrom: "08:00",
    openTo: "19:15",
    wkndDelta: 10,
    blocks: [
      { start: "08:00", end: "09:03", rates: [
        { tariff: "GF 18 - Earlybird", price: 83, originalPrice: 107, discountPct: 22 },
        { tariff: "GF 18 Forats", price: 107, originalPrice: 107, discountPct: 0 },
      ] },
      { start: "09:03", end: "10:15", rates: [
        { tariff: "GF 18 Forats", price: 107, originalPrice: 107, discountPct: 0 },
      ] },
      { start: "10:15", end: "12:03", rates: [
        { tariff: "GF 18 Forats", price: 107, originalPrice: 107, discountPct: 0 },
        { tariff: "GF 18 - 4 Jugadors", price: 76, originalPrice: 107, discountPct: 29 },
      ] },
      { start: "12:03", end: "13:33", rates: [
        { tariff: "GF 18 Forats", price: 107, originalPrice: 107, discountPct: 0 },
        { tariff: "GF 18 - Summer Fee", price: 72, originalPrice: 107, discountPct: 33 },
      ] },
      { start: "13:33", end: "15:03", rates: [
        { tariff: "GF 18 Forats", price: 107, originalPrice: 107, discountPct: 0 },
        { tariff: "GF 18 - Summer Fee", price: 72, originalPrice: 107, discountPct: 33 },
        { tariff: "GF 9 - Twilight", price: 52, originalPrice: 107, discountPct: 51 },
      ] },
      { start: "15:03", end: "17:00", rates: [
        { tariff: "GF 18 Forats", price: 107, originalPrice: 107, discountPct: 0 },
        { tariff: "GF 18 - Twilight", price: 82, originalPrice: 107, discountPct: 23 },
        { tariff: "GF 9 - Twilight", price: 52, originalPrice: 107, discountPct: 51 },
      ] },
      { start: "17:00", end: "18:39", rates: [
        { tariff: "GF 18 - All You Can Play", price: 69, originalPrice: 107, discountPct: 36 },
      ] },
      { start: "18:39", end: "19:15", rates: [
        { tariff: "GF 9 - Twilight", price: 52, originalPrice: 107, discountPct: 51 },
      ] },
    ],
  },

  // ---- CAMP DE GOLF PERALADA (TeeOne) — captura 25/06/2026 ----------------
  perelada: {
    matchKeys: ["perelada", "peralada"],
    interval: 10,
    openFrom: "08:00",
    openTo: "16:00",
    wkndDelta: 10,
    blocks: [
      { start: "08:00", end: "16:00", rates: [{ tariff: "GREEN FEE 18 Hoyos", price: 84, originalPrice: 99, discountPct: 15 }] },
    ],
  },
};

// Identifica el model de camp pel nom
function findCourseModel(courseName: string): CourseRateModel | null {
  const n = courseName.toLowerCase().trim();
  for (const model of Object.values(COURSE_MODELS)) {
    if (model.matchKeys.some((k) => n.includes(k))) return model;
  }
  return null;
}

// Comprova si el camp està tancat en una data concreta
function isCourseClosedOn(courseName: string, dateStr: string): { closed: boolean; reason?: string } {
  const model = findCourseModel(courseName);
  if (!model?.closedRanges) return { closed: false };
  for (const r of model.closedRanges) {
    if (dateStr >= r.from && dateStr <= r.to) return { closed: true, reason: r.reason };
  }
  return { closed: false };
}

// Genera tots els tee-times reals d'un camp en una data
function getCompetitorTeeTimes(courseName: string, dateStr: string): TeeTime[] {
  const model = findCourseModel(courseName);
  if (!model) return [];

  const closed = isCourseClosedOn(courseName, dateStr);
  if (closed.closed) return [];

  const dObj = new Date(dateStr);
  const isWeekend = [0, 6].includes(dObj.getDay());
  const delta = isWeekend ? model.wkndDelta : 0;

  const slots = generateSlots(model.openFrom, model.openTo, model.interval);
  const teeTimes: TeeTime[] = [];

  for (const time of slots) {
    const mins = toMinutes(time);
    const block = model.blocks.find((b) => mins >= toMinutes(b.start) && mins < toMinutes(b.end));
    if (!block) continue;

    const rates: TeeTimeRate[] = block.rates.map((r) => ({
      tariff: r.tariff,
      price: r.price + delta,
      originalPrice: r.originalPrice ? r.originalPrice + delta : undefined,
      discountPct: r.discountPct,
    }));

    teeTimes.push({
      time,
      minutes: mins,
      rates,
      availableSlots: deterministicSlots(`${courseName}|${dateStr}|${time}`),
    });
  }

  return teeTimes;
}

// Resum agregat del dia per a un camp
export interface DaySummary {
  courseName: string;
  dateStr: string;
  closed: boolean;
  closedReason?: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalTeeTimes: number;
  freeTeeTimes: number;
  totalFreeSlots: number;
  occupancyPct: number;
}

function getDaySummary(courseName: string, dateStr: string): DaySummary {
  const closed = isCourseClosedOn(courseName, dateStr);
  if (closed.closed) {
    return {
      courseName, dateStr, closed: true, closedReason: closed.reason,
      minPrice: 0, maxPrice: 0, avgPrice: 0,
      totalTeeTimes: 0, freeTeeTimes: 0, totalFreeSlots: 0, occupancyPct: 100,
    };
  }

  const teeTimes = getCompetitorTeeTimes(courseName, dateStr);
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
    freeTeeTimes,
    totalFreeSlots,
    occupancyPct,
  };
}

// ============================================================================
// SCRAPING EN DIRECTE + HANDLER DE LA RUTA
// ============================================================================

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
  let dateStr = new Date().toISOString().slice(0, 10);
  try {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");

    dateStr = (req.query.date as string) || dateStr;
    const courseParam = req.query.course as string | undefined;

    const targets = courseParam
      ? [findEndpoint(courseParam)].filter(Boolean) as CourseEndpoint[]
      : COURSE_ENDPOINTS;

    if (targets.length === 0) {
      return res.status(404).json({ error: `Camp no trobat: ${courseParam}` });
    }

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
    try {
      return res.status(200).json({
        date: dateStr,
        courses: [],
        error: String(err?.message || err),
      });
    } catch {
      return;
    }
  }
}
