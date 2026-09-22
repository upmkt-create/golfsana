// ============================================================================
// VERCEL API ROUTE — /api/leading-courses
// ============================================================================
// Llegeix, per a Golf d'Aro i els 6 competidors ja identificats al
// comparador de tarifes, la puntuació, el nombre de ressenyes i les
// puntuacions per categoria a Leading Courses.
//
// 1golf.eu es va treure (22/09/2026): bloqueja SEMPRE les peticions
// directes (HTTP 403) i necessitava un proxy en cada sincronització, cosa
// que allargava l'endpoint i no acabava de donar dades fiables — Isabel va
// demanar treure-ho en lloc de seguir depenent-ne.
//
// La pàgina de Leading Courses és majoritàriament renderitzada al servidor
// (confirmat manualment abans de construir aquest fitxer) — per això es
// prova SEMPRE primer una petició directa, sense proxy. Només si això
// falla es fa servir el millor proxy disponible com a reserva.
//
// ús: GET /api/leading-courses
// ============================================================================

interface VercelRequest {
  query: { [key: string]: string | string[] | undefined };
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

interface ClubTarget {
  slug: string;
  name: string;
  isOwnClub: boolean;
  leadingCoursesUrl: string;
}

// Fitxes confirmades manualment (21/08/2026). Mateixos slugs que ja es fan
// servir al comparador de tarifes (api/rates.ts), per coherència.
const TARGETS: ClubTarget[] = [
  {
    slug: "golfdaro",
    name: "Club Golf d'Aro - Mas Nou",
    isOwnClub: true,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/club-golf-d-aro-mas-nou",
  },
  {
    slug: "torremirona",
    name: "Torremirona Golf Club",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/torremirona-golf-&-spa-resort",
  },
  {
    slug: "emporda",
    name: "Empordà Golf Club",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/empord%C3%A0-golf-resort",
  },
  {
    slug: "camiral",
    name: "Camiral Golf & Wellness",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/camiral-golf-wellness-fka-pga-catalunya",
  },
  {
    slug: "pals",
    name: "Golf de Pals",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/golf-de-pals",
  },
  {
    slug: "costabrava",
    name: "Golf Costa Brava",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/club-de-golf-costa-brava",
  },
  {
    slug: "perelada",
    name: "Camp de Golf Perelada",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/club-de-golf-peralada",
  },
];

interface LeadingCoursesCategoryScores {
  facilities: number | null;
  clubhouse: number | null;
  valueForMoney: number | null;
  hospitality: number | null;
  surroundings: number | null;
  restaurant: number | null;
}

interface ReviewSourceResult {
  rating: number | null;
  scale: 5 | 10;
  reviewCount: number | null;
  source: "live" | "error";
  scrapeDebug?: string;
  categoryScores?: LeadingCoursesCategoryScores | null;
}

interface ClubResult {
  slug: string;
  name: string;
  url: string;
  overallRating: number | null;
  reviewCount: number | null;
  isOwnClub: boolean;
  source: "live" | "error";
  scrapeDebug?: string;
  leadingCourses: ReviewSourceResult;
}

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts: number = 2
): Promise<{ resp: Response | null; lastErr: any; attempts: number }> {
  let lastErr: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(url, init);
      if (resp.status === 500 && attempt < maxAttempts) {
        const clone = resp.clone();
        const bodyText = await clone.text().catch(() => "");
        if (/try again|scrapingbee/i.test(bodyText)) {
          await new Promise((r) => setTimeout(r, 900 * attempt));
          continue;
        }
      }
      return { resp, lastErr: null, attempts: attempt };
    } catch (err) {
      lastErr = err;
      if ((err as any)?.name === "TimeoutError" || (err as any)?.name === "AbortError") {
        return { resp: null, lastErr, attempts: attempt };
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 900 * attempt));
        continue;
      }
    }
  }
  return { resp: null, lastErr, attempts: maxAttempts };
}

// Confirmat manualment el 21/08/2026 llegint la resposta d'una petició
// real: la pàgina porta un bloc <script type="application/ld+json"> amb
// dades estructurades schema.org/GolfCourse, que inclou
// "aggregateRating":{"ratingValue":"8.2","reviewCount":575,...}
function parseLeadingCourses(html: string): { rating: number | null; reviewCount: number | null } {
  const scriptMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const scriptMatch of scriptMatches) {
    const jsonText = scriptMatch[1];
    if (!jsonText.includes("aggregateRating")) continue;
    try {
      const data = JSON.parse(jsonText);
      const agg = data?.aggregateRating;
      if (agg?.ratingValue) {
        return {
          rating: parseFloat(String(agg.ratingValue).replace(",", ".")),
          reviewCount: agg.reviewCount != null ? parseInt(String(agg.reviewCount), 10) : null,
        };
      }
    } catch {
      continue;
    }
  }
  return { rating: null, reviewCount: null };
}

// Confirmat manualment el 22/09/2026: a la fitxa de cada club, Leading
// Courses mostra un bloc "Total score" amb puntuacions per categoria com a
// TEXT PLA (no dins de JSON ni de cap taula amb classes identificables):
// "Total score • course maintenance7.3 • facilities7.7 • clubhouse7.6 •
// Value for money7.0 • hospitality8.1 • surroundings9.1 • restaurant7.6"
// — l'etiqueta i el número van enganxats, sense espai ni separador.
// Per això s'elimina primer tot el markup (scripts, estils, etiquetes) i es
// busca cada etiqueta seguida de prop per un número decimal.
//
// "course maintenance" es va treure (22/09/2026): mai va donar cap valor
// per a cap dels 7 clubs (sempre null) — es manté descartada en lloc de
// seguir intentant-la sense evidència de per què falla.
const CATEGORY_LABELS: { key: keyof LeadingCoursesCategoryScores; label: string }[] = [
  { key: "facilities", label: "facilities" },
  { key: "clubhouse", label: "clubhouse" },
  { key: "valueForMoney", label: "value\\s*for\\s*money" },
  { key: "hospitality", label: "hospitality" },
  { key: "surroundings", label: "surroundings" },
  { key: "restaurant", label: "restaurant" },
];

function parseCategoryScores(html: string): LeadingCoursesCategoryScores | null {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

  const result: Partial<LeadingCoursesCategoryScores> = {};
  let foundAny = false;
  for (const { key, label } of CATEGORY_LABELS) {
    const re = new RegExp(label + "\\D{0,6}(\\d[.,]\\d)", "i");
    const m = text.match(re);
    if (m) {
      result[key] = parseFloat(m[1].replace(",", "."));
      foundAny = true;
    } else {
      result[key] = null;
    }
  }
  return foundAny ? (result as LeadingCoursesCategoryScores) : null;
}

interface ProxyFetchResult {
  resp: Response | null;
  lastErr: any;
  attempts: number;
  proxyLabel: string;
}

// Mateix helper que api/rates.ts (mantingut sincronitzat a mà): tria
// automàticament quin proxy fer servir segons quines variables d'entorn hi
// ha configurades a Vercel. Bright Data (Web Unlocker) és la PRIMERA opció
// (crèdits gratuïts recurrents cada mes); ScrapingBee i ScraperAPI es
// mantenen com a reserva. 1golf.eu bloqueja les peticions directes (HTTP
// 403) i necessita SEMPRE un proxy.
//
// IMPORTANT (après el 22/09/2026, timeout real vist als logs de Vercel):
// aquest endpoint llegeix 7 clubs × 2 fonts = 14 peticions, i la funció de
// Vercel talla als 60 segons (maxDuration del pla actual). Amb 3 reintents
// de 20s cadascun per petició via proxy, UNA sola font que necessiti proxy
// ja podia consumir els 60s sencers ella sola. Per això aquí els reintents
// del proxy es limiten a 1 sol intent i 15s de marge — si Bright Data no
// respon en 15s, es dona per error i es continua (millor un error puntual
// que fer petar tot l'endpoint per una font penjada).
async function fetchViaBestProxy(targetUrl: string, directHeaders: Record<string, string>): Promise<ProxyFetchResult> {
  const brightDataKey = process.env.BRIGHTDATA_API_KEY;
  const brightDataZone = process.env.BRIGHTDATA_ZONE;
  const scrapingBeeKey = process.env.SCRAPINGBEE_KEY;
  const scraperApiKey = process.env.SCRAPERAPI_KEY;
  const usePremium = process.env.SCRAPERAPI_PREMIUM === "true";

  if (brightDataKey && brightDataZone) {
    const { resp, lastErr, attempts } = await fetchWithRetry(
      "https://api.brightdata.com/request",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${brightDataKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ zone: brightDataZone, url: targetUrl, format: "raw" }),
        signal: AbortSignal.timeout(15000),
      },
      1
    );
    return { resp, lastErr, attempts, proxyLabel: "via Bright Data (Web Unlocker)" };
  }

  if (scrapingBeeKey) {
    const url = `https://app.scrapingbee.com/api/v1/?api_key=${scrapingBeeKey}&url=${encodeURIComponent(targetUrl)}&premium_proxy=true&render_js=false`;
    const { resp, lastErr, attempts } = await fetchWithRetry(url, { headers: directHeaders, signal: AbortSignal.timeout(15000) }, 1);
    return { resp, lastErr, attempts, proxyLabel: "via ScrapingBee (premium)" };
  }

  if (scraperApiKey) {
    const url = `https://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}${usePremium ? "&premium=true" : ""}`;
    const { resp, lastErr, attempts } = await fetchWithRetry(url, { headers: directHeaders, signal: AbortSignal.timeout(15000) }, 1);
    return { resp, lastErr, attempts, proxyLabel: `via ScraperAPI${usePremium ? " premium" : " standard"}` };
  }

  const { resp, lastErr, attempts } = await fetchWithRetry(targetUrl, { headers: directHeaders, signal: AbortSignal.timeout(8000) }, 1);
  return { resp, lastErr, attempts, proxyLabel: "" };
}

async function fetchSource(url: string): Promise<{ html: string | null; scrapeDebug?: string }> {
  const directHeaders = { "Accept-Language": "en-US,en;q=0.9", "User-Agent": CHROME_UA };

  // 1r intent: directe, sense proxy. Un sol intent (no 2): si falla no és
  // per una errada puntual de xarxa (aquestes URLs o funcionen o donen 403
  // a l'instant) — reintentar només allarga el temps total sense canviar
  // el resultat.
  const direct = await fetchWithRetry(url, { headers: directHeaders, signal: AbortSignal.timeout(10000) }, 1);
  if (direct.resp?.ok) {
    return { html: await direct.resp.text() };
  }

  // 2n intent (reserva): el millor proxy disponible (Bright Data →
  // ScrapingBee → ScraperAPI), només si hi ha alguna clau configurada.
  const proxy = await fetchViaBestProxy(url, directHeaders);
  if (proxy.proxyLabel && proxy.resp?.ok) {
    return { html: await proxy.resp.text() };
  }
  if (!proxy.proxyLabel) {
    // Cap proxy configurat: només tenim el resultat directe.
    return {
      html: null,
      scrapeDebug: direct.resp
        ? `HTTP ${direct.resp.status} ${direct.resp.statusText}`
        : `Error de xarxa: ${String(direct.lastErr?.message || direct.lastErr)}`,
    };
  }

  return {
    html: null,
    scrapeDebug: `Directe: ${direct.resp ? `HTTP ${direct.resp.status}` : String(direct.lastErr?.message || direct.lastErr)} · ${proxy.proxyLabel}: ${
      proxy.resp ? `HTTP ${proxy.resp.status}` : String(proxy.lastErr?.message || proxy.lastErr)
    }`,
  };
}

async function scrapeSource(
  url: string,
  scale: 5 | 10,
  parser: (html: string) => { rating: number | null; reviewCount: number | null },
  withCategoryScores: boolean = false
): Promise<ReviewSourceResult> {
  try {
    const { html, scrapeDebug } = await fetchSource(url);
    if (!html) {
      return { rating: null, scale, reviewCount: null, source: "error", scrapeDebug };
    }
    const parsed = parser(html);
    if (parsed.rating === null) {
      return { rating: null, scale, reviewCount: null, source: "error", scrapeDebug: "Format de la pàgina no reconegut." };
    }
    const categoryScores = withCategoryScores ? parseCategoryScores(html) : undefined;
    return { rating: parsed.rating, scale, reviewCount: parsed.reviewCount, source: "live", categoryScores };
  } catch (err: any) {
    return { rating: null, scale, reviewCount: null, source: "error", scrapeDebug: `Error: ${String(err?.message || err)}` };
  }
}

async function scrapeClub(target: ClubTarget): Promise<ClubResult> {
  const leadingCourses = await scrapeSource(target.leadingCoursesUrl, 10, parseLeadingCourses, true);

  return {
    slug: target.slug,
    name: target.name,
    url: target.leadingCoursesUrl,
    isOwnClub: target.isOwnClub,
    // Camps antics (overallRating/reviewCount/source) es mantenen per
    // compatibilitat, apuntant a Leading Courses.
    overallRating: leadingCourses.rating,
    reviewCount: leadingCourses.reviewCount,
    source: leadingCourses.source,
    scrapeDebug: leadingCourses.scrapeDebug,
    leadingCourses,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Mode diagnòstic: ?debug=<slug> retorna el HTML cru de Leading Courses,
  // sense intentar interpretar-lo.
  const debugSlug = typeof req.query.debug === "string" ? req.query.debug : null;
  if (debugSlug) {
    const target = TARGETS.find((t) => t.slug === debugSlug);
    if (!target) {
      return res.status(200).json({ error: `Slug desconegut: ${debugSlug}` });
    }
    const { html, scrapeDebug } = await fetchSource(target.leadingCoursesUrl);
    if (!html) {
      return res.status(200).json({ error: scrapeDebug });
    }
    // ?around=<text> retorna només el tros del HTML CRU al voltant de la
    // primera aparició d'aquest text — més útil que el principi/final quan
    // la dada que es busca (com "maintenance") és enmig d'un HTML d'1MB+.
    const around = typeof req.query.around === "string" ? req.query.around : null;
    if (around) {
      const idx = html.toLowerCase().indexOf(around.toLowerCase());
      if (idx === -1) {
        return res.status(200).json({ error: `Text "${around}" no trobat a l'HTML (longitud total: ${html.length}).` });
      }
      return res.status(200).json({ context: html.slice(Math.max(0, idx - 600), idx + 600) });
    }
    return res.status(200).json({ htmlLength: html.length, htmlSnippet: html.slice(0, 3000), rawHtmlEnd: html.slice(-15000) });
  }

  // Es llegeixen els 7 clubs en blocs de 3 en paral·lel (no tots 7 alhora,
  // per no arriscar-se a passar cap límit de concurrència del proxy que no
  // tenim confirmat) — abans es feien D'UN EN UN i, combinat amb els
  // reintents del proxy, l'endpoint podia superar els 60s que permet
  // Vercel i acabar en timeout total (vist als logs el 22/09/2026). Ara amb
  // només Leading Courses (1golf.eu tret) hi ha molt més marge.
  const CONCURRENCY = 3;
  const clubs: ClubResult[] = [];
  for (let i = 0; i < TARGETS.length; i += CONCURRENCY) {
    const batch = TARGETS.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((target) => scrapeClub(target)));
    clubs.push(...results);
  }

  return res.status(200).json({
    scrapedAt: new Date().toISOString(),
    clubs,
  });
}
