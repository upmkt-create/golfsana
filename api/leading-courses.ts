// ============================================================================
// VERCEL API ROUTE — /api/leading-courses
// ============================================================================
// Llegeix, per a Golf d'Aro i els 6 competidors ja identificats al
// comparador de tarifes, la puntuació i el nombre de ressenyes a dues fonts
// de golf (Leading Courses i 1golf.eu / Albrecht Golf Guide).
//
// Totes dues pàgines són majoritàriament renderitzades al servidor
// (confirmat manualment abans de construir aquest fitxer) — per això es
// prova SEMPRE primer una petició directa, SENSE ScrapingBee. Només si això
// falla (per exemple, si algun dia comencen a bloquejar peticions sense
// proxy) es fa servir ScrapingBee com a reserva, si hi ha clau configurada.
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
  oneGolfUrl: string;
}

// Fitxes confirmades manualment (21/08/2026). Mateixos slugs que ja es fan
// servir al comparador de tarifes (api/rates.ts), per coherència.
const TARGETS: ClubTarget[] = [
  {
    slug: "golfdaro",
    name: "Club Golf d'Aro - Mas Nou",
    isOwnClub: true,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/club-golf-d-aro-mas-nou",
    oneGolfUrl: "https://www.1golf.eu/en/club/club-golf-d-aro-mas-nou/reviews/",
  },
  {
    slug: "torremirona",
    name: "Torremirona Golf Club",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/torremirona-golf-&-spa-resort",
    oneGolfUrl: "https://www.1golf.eu/en/club/torremirona-golf-club/reviews/",
  },
  {
    slug: "emporda",
    name: "Empordà Golf Club",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/empord%C3%A0-golf-resort",
    oneGolfUrl: "https://www.1golf.eu/en/club/emporda-golf-club/reviews/",
  },
  {
    slug: "camiral",
    name: "Camiral Golf & Wellness",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/camiral-golf-wellness-fka-pga-catalunya",
    oneGolfUrl: "https://www.1golf.eu/en/club/camiral-a-quinta-do-lago-resort/reviews/",
  },
  {
    slug: "pals",
    name: "Golf de Pals",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/golf-de-pals",
    oneGolfUrl: "https://www.1golf.eu/en/club/golf-de-pals/reviews/",
  },
  {
    slug: "costabrava",
    name: "Golf Costa Brava",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/club-de-golf-costa-brava",
    oneGolfUrl: "https://www.1golf.eu/en/club/club-de-golf-costa-brava/reviews/",
  },
  {
    slug: "perelada",
    name: "Camp de Golf Perelada",
    isOwnClub: false,
    leadingCoursesUrl: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/club-de-golf-peralada",
    oneGolfUrl: "https://www.1golf.eu/en/club/golf-club-peralada/reviews/",
  },
];

interface ReviewSourceResult {
  rating: number | null;
  scale: 5 | 10;
  reviewCount: number | null;
  source: "live" | "error";
  scrapeDebug?: string;
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
  oneGolf: ReviewSourceResult;
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

// Confirmat manualment el 21/08/2026: la pàgina porta una etiqueta
// <meta name="description" content="Read 38 reviews for Club Golf
// d'Aro-Mas Nou in Platja d'Aro, España, rated 3.6 from 5 by our users."/>
// — molt més estable que llegir el text visible o taules de la pàgina.
function parseOneGolf(html: string): { rating: number | null; reviewCount: number | null } {
  const match = html.match(
    /Read\s+(\d+)\s+reviews?\s+for[\s\S]*?rated\s+(\d[.,]\d)\s+from\s+5/i
  );
  if (match) {
    return {
      reviewCount: parseInt(match[1], 10),
      rating: parseFloat(match[2].replace(",", ".")),
    };
  }
  return { rating: null, reviewCount: null };
}

async function fetchSource(
  url: string,
  scrapingBeeKey: string | undefined
): Promise<{ html: string | null; scrapeDebug?: string }> {
  // 1r intent: directe, sense ScrapingBee.
  const direct = await fetchWithRetry(
    url,
    { headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": CHROME_UA }, signal: AbortSignal.timeout(25000) },
    2
  );
  if (direct.resp?.ok) {
    return { html: await direct.resp.text() };
  }

  // 2n intent (reserva): ScrapingBee, només si hi ha clau configurada.
  if (scrapingBeeKey) {
    const beeUrl = `https://app.scrapingbee.com/api/v1/?api_key=${scrapingBeeKey}&url=${encodeURIComponent(
      url
    )}&premium_proxy=true&render_js=false`;
    const bee = await fetchWithRetry(beeUrl, { headers: { "Accept-Language": "en-US,en;q=0.9" }, signal: AbortSignal.timeout(25000) }, 2);
    if (bee.resp?.ok) {
      return { html: await bee.resp.text() };
    }
    return {
      html: null,
      scrapeDebug: `Directe: ${direct.resp ? `HTTP ${direct.resp.status}` : String(direct.lastErr?.message || direct.lastErr)} · ScrapingBee: ${bee.resp ? `HTTP ${bee.resp.status}` : String(bee.lastErr?.message || bee.lastErr)}`,
    };
  }

  return {
    html: null,
    scrapeDebug: direct.resp
      ? `HTTP ${direct.resp.status} ${direct.resp.statusText}`
      : `Error de xarxa: ${String(direct.lastErr?.message || direct.lastErr)}`,
  };
}

async function scrapeSource(
  url: string,
  scale: 5 | 10,
  parser: (html: string) => { rating: number | null; reviewCount: number | null },
  scrapingBeeKey: string | undefined
): Promise<ReviewSourceResult> {
  try {
    const { html, scrapeDebug } = await fetchSource(url, scrapingBeeKey);
    if (!html) {
      return { rating: null, scale, reviewCount: null, source: "error", scrapeDebug };
    }
    const parsed = parser(html);
    if (parsed.rating === null) {
      return { rating: null, scale, reviewCount: null, source: "error", scrapeDebug: "Format de la pàgina no reconegut." };
    }
    return { rating: parsed.rating, scale, reviewCount: parsed.reviewCount, source: "live" };
  } catch (err: any) {
    return { rating: null, scale, reviewCount: null, source: "error", scrapeDebug: `Error: ${String(err?.message || err)}` };
  }
}

async function scrapeClub(target: ClubTarget, scrapingBeeKey: string | undefined): Promise<ClubResult> {
  const leadingCourses = await scrapeSource(target.leadingCoursesUrl, 10, parseLeadingCourses, scrapingBeeKey);
  const oneGolf = await scrapeSource(target.oneGolfUrl, 5, parseOneGolf, scrapingBeeKey);

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
    oneGolf,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const scrapingBeeKey = process.env.SCRAPINGBEE_KEY; // opcional — només com a reserva

  // Mode diagnòstic: ?debug=<slug>&source=leadingcourses|onegolf retorna el
  // HTML cru, sense intentar interpretar-lo.
  const debugSlug = typeof req.query.debug === "string" ? req.query.debug : null;
  if (debugSlug) {
    const target = TARGETS.find((t) => t.slug === debugSlug);
    if (!target) {
      return res.status(200).json({ error: `Slug desconegut: ${debugSlug}` });
    }
    const wantSource = req.query.source === "onegolf" ? "onegolf" : "leadingcourses";
    const url = wantSource === "onegolf" ? target.oneGolfUrl : target.leadingCoursesUrl;
    const { html, scrapeDebug } = await fetchSource(url, scrapingBeeKey);
    if (!html) {
      return res.status(200).json({ error: scrapeDebug });
    }
    return res.status(200).json({ htmlLength: html.length, htmlSnippet: html.slice(0, 3000), rawHtmlEnd: html.slice(-15000) });
  }

  // Es llegeixen els 7 clubs D'UN EN UN (no en paral·lel) — el pla de
  // ScrapingBee (usat només com a reserva) limita a 5 peticions simultànies.
  const clubs: ClubResult[] = [];
  for (const target of TARGETS) {
    const result = await scrapeClub(target, scrapingBeeKey);
    clubs.push(result);
  }

  return res.status(200).json({
    scrapedAt: new Date().toISOString(),
    clubs,
  });
}
