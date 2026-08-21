// ============================================================================
// VERCEL API ROUTE — /api/leading-courses
// ============================================================================
// Llegeix, per a Golf d'Aro i els 6 competidors ja identificats al
// comparador de tarifes, la puntuació mitjana i el nombre de ressenyes a
// Leading Courses (web específica de golf, a diferència de Google Maps).
// Les pàgines de Leading Courses són majoritàriament renderitzades al
// servidor (confirmat manualment abans de construir aquest fitxer, no és
// una suposició), així que NO calen els paràmetres cars de render_js — un
// scraping normal n'hi ha prou, com amb GolfManager.
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
  url: string;
}

// Fitxes confirmades a Leading Courses (18/08/2026). Mateixos slugs que ja
// es fan servir al comparador de tarifes (api/rates.ts), per coherència.
const TARGETS: ClubTarget[] = [
  {
    slug: "golfdaro",
    name: "Club Golf d'Aro - Mas Nou",
    isOwnClub: true,
    url: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/club-golf-d-aro-mas-nou",
  },
  {
    slug: "torremirona",
    name: "Torremirona Golf Club",
    isOwnClub: false,
    url: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/torremirona-golf-&-spa-resort",
  },
  {
    slug: "emporda",
    name: "Empordà Golf Club",
    isOwnClub: false,
    url: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/empord%C3%A0-golf-resort",
  },
  {
    slug: "camiral",
    name: "Camiral Golf & Wellness",
    isOwnClub: false,
    url: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/camiral-golf-wellness-fka-pga-catalunya",
  },
  {
    slug: "pals",
    name: "Golf de Pals",
    isOwnClub: false,
    url: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/golf-de-pals",
  },
  {
    slug: "costabrava",
    name: "Golf Costa Brava",
    isOwnClub: false,
    url: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/club-de-golf-costa-brava",
  },
  {
    slug: "perelada",
    name: "Camp de Golf Perelada",
    isOwnClub: false,
    url: "https://www.leadingcourses.com/clubs/europe+spain+catalonia/club-de-golf-peralada",
  },
];

interface ClubResult {
  slug: string;
  name: string;
  url: string;
  overallRating: number | null;
  reviewCount: number | null;
  isOwnClub: boolean;
  source: "live" | "error";
  scrapeDebug?: string;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts: number = 3
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

// Patró real confirmat manualment el 18/08/2026: "This golf club has 1 golf
// course, 18 holes and an average rating of 8.1 based on 331 reviews."
// Es cerca sobre el text ja net d'etiquetes HTML, no sobre el HTML cru, per
// no dependre de classes/estructura que Leading Courses pugui canviar.
function parseLeadingCourses(html: string): { overallRating: number | null; reviewCount: number | null } {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

  const match = text.match(/average rating of (\d[.,]\d)\s*based on\s*([\d.,]+)\s*reviews?/i);
  if (match) {
    return {
      overallRating: parseFloat(match[1].replace(",", ".")),
      reviewCount: parseInt(match[2].replace(/[.,]/g, ""), 10),
    };
  }
  return { overallRating: null, reviewCount: null };
}

async function scrapeClub(target: ClubTarget, scrapingBeeKey: string): Promise<ClubResult> {
  const url = `https://app.scrapingbee.com/api/v1/?api_key=${scrapingBeeKey}&url=${encodeURIComponent(
    target.url
  )}&premium_proxy=true&render_js=false`;

  const base: Omit<ClubResult, "source" | "scrapeDebug" | "overallRating" | "reviewCount"> = {
    slug: target.slug,
    name: target.name,
    url: target.url,
    isOwnClub: target.isOwnClub,
  };

  try {
    const { resp, lastErr, attempts } = await fetchWithRetry(
      url,
      { headers: { "Accept-Language": "en-US,en;q=0.9" }, signal: AbortSignal.timeout(30000) },
      3
    );

    if (!resp) {
      const isTimeout = lastErr?.name === "TimeoutError" || lastErr?.name === "AbortError";
      return {
        ...base,
        overallRating: null,
        reviewCount: null,
        source: "error",
        scrapeDebug: isTimeout
          ? `Timeout (${attempts} intent${attempts > 1 ? "s" : ""})`
          : `Error de xarxa: ${String(lastErr?.message || lastErr)}`,
      };
    }

    if (!resp.ok) {
      const bodySnippet = (await resp.text().catch(() => "")).slice(0, 150);
      return {
        ...base,
        overallRating: null,
        reviewCount: null,
        source: "error",
        scrapeDebug: `HTTP ${resp.status} ${resp.statusText}${bodySnippet ? ` — ${bodySnippet}` : ""}`,
      };
    }

    const html = await resp.text();
    const parsed = parseLeadingCourses(html);

    if (parsed.overallRating === null) {
      return {
        ...base,
        overallRating: null,
        reviewCount: null,
        source: "error",
        scrapeDebug: "Format de la pàgina no reconegut (pot haver canviat l'estructura de Leading Courses).",
      };
    }

    return { ...base, overallRating: parsed.overallRating, reviewCount: parsed.reviewCount, source: "live" };
  } catch (err: any) {
    return {
      ...base,
      overallRating: null,
      reviewCount: null,
      source: "error",
      scrapeDebug: `Error: ${String(err?.message || err)}`,
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const scrapingBeeKey = process.env.SCRAPINGBEE_KEY;

  if (!scrapingBeeKey) {
    return res.status(200).json({
      scrapedAt: new Date().toISOString(),
      clubs: TARGETS.map((t) => ({
        slug: t.slug,
        name: t.name,
        url: t.url,
        isOwnClub: t.isOwnClub,
        overallRating: null,
        reviewCount: null,
        source: "error",
        scrapeDebug: "Falta la variable d'entorn SCRAPINGBEE_KEY a Vercel.",
      })),
    });
  }

  // Es llegeixen els 7 clubs en paral·lel — és scraping normal (sense
  // render_js ni custom_google), molt més barat que Google Maps.
  const clubs = await Promise.all(TARGETS.map((t) => scrapeClub(t, scrapingBeeKey)));

  return res.status(200).json({
    scrapedAt: new Date().toISOString(),
    clubs,
  });
}
