// ============================================================================
// VERCEL API ROUTE — /api/reputation
// ============================================================================
// Llegeix, des de la fitxa pública de Google Maps del club, la puntuació
// global, el nombre de ressenyes i el desglossament per estrelles (5→1).
// NO llegeix el text de les ressenyes individuals: Google Maps és una app
// 100% JavaScript on les ressenyes es carreguen amb scroll/clics i Google
// bloqueja agressivament els bots que ho intenten (vist en documentació i
// fòrums reals) — intentar-ho seria repetir l'error de prometre una dada
// que després no arriba de fiar. La puntuació i el desglossament, en canvi,
// carreguen amb la pàgina inicial i sí que es poden llegir amb fiabilitat.
//
// Per a qui vulgui llegir les ressenyes senceres: `mapsUrl` porta
// directament a la fitxa real — no cal reproduir-les dins GolfSana.
//
// ús: GET /api/reputation
// ============================================================================

interface VercelRequest {
  query: { [key: string]: string | string[] | undefined };
}
interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

// Fitxa oficial del Club Golf d'Aro a Google Maps (confirmada per Isabel,
// 18/08/2026). CID: 0xf00fae11f515a50
const CLUB_MAPS_URL =
  "https://www.google.com/maps/place/Club+Golf+d'Aro/@41.8359843,3.0158665,17z/data=!3m1!4b1!4m6!3m5!1s0x12bb03d6164f5033:0xf00fae11f515a50!8m2!3d41.8359803!4d3.0184414!16s%2Fg%2F1tgn6tgz";
const CLUB_SHORT_URL = "https://maps.app.goo.gl/bTKghBEpCyzqyHtP6";

interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface ReputationResult {
  placeName: string;
  mapsUrl: string;
  overallRating: number | null;
  reviewCount: number | null;
  ratingBreakdown: RatingBreakdown | null;
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

// Extreu puntuació/nombre de ressenyes/desglossament del HTML ja renderitzat
// (render_js=true a ScrapingBee). Google no exposa un format estable
// documentat per a això, així que es proven diversos patrons coneguts
// (aria-label és el més estable perquè Google el fa servir per accessibilitat
// i canvia molt menys que les classes CSS internes).
function parseReputationFromHtml(html: string): {
  overallRating: number | null;
  reviewCount: number | null;
  ratingBreakdown: RatingBreakdown | null;
  placeName: string | null;
} {
  let overallRating: number | null = null;
  let reviewCount: number | null = null;
  let placeName: string | null = null;

  // Patró típic: aria-label="4,3 estrelles" o "4.3 stars"
  const ratingMatch =
    html.match(/aria-label="(\d[.,]\d)\s*(?:estrell[ae]s?|stars?|étoiles?)"/i) ||
    html.match(/"ratingValue"\s*:\s*"?(\d[.,]?\d?)"?/i);
  if (ratingMatch) {
    overallRating = parseFloat(ratingMatch[1].replace(",", "."));
  }

  // Patró típic: aria-label="128 ressenyes" o "(128)" al costat de la puntuació
  const countMatch =
    html.match(/aria-label="(\d[\d.,]*)\s*(?:ressenyes|reviews|avis|opiniones)"/i) ||
    html.match(/"reviewCount"\s*:\s*"?(\d[\d.,]*)"?/i);
  if (countMatch) {
    reviewCount = parseInt(countMatch[1].replace(/[.,]/g, ""), 10);
  }

  // Nom del lloc, per confirmar que hem llegit la fitxa correcta
  const nameMatch = html.match(/<meta content="([^"]+)"\s+itemprop="name"/i) || html.match(/<title>([^<|]+)/i);
  if (nameMatch) {
    placeName = nameMatch[1].trim();
  }

  // Desglossament per estrelles: Google el mostra com 5 barres, cadascuna amb
  // un aria-label del tipus "5 estrelles, 90 ressenyes". Es busquen les 5.
  let ratingBreakdown: RatingBreakdown | null = null;
  const breakdown: Partial<RatingBreakdown> = {};
  const starRegex = /aria-label="(\d)\s*(?:estrell[ae]s?|stars?),\s*(\d[\d.,]*)\s*(?:ressenyes|reviews|avis|opiniones)"/gi;
  let m: RegExpExecArray | null;
  while ((m = starRegex.exec(html)) !== null) {
    const star = parseInt(m[1], 10) as 1 | 2 | 3 | 4 | 5;
    const count = parseInt(m[2].replace(/[.,]/g, ""), 10);
    if (star >= 1 && star <= 5) breakdown[star] = count;
  }
  if (Object.keys(breakdown).length === 5) {
    ratingBreakdown = breakdown as RatingBreakdown;
  }

  return { overallRating, reviewCount, ratingBreakdown, placeName };
}

async function scrapeReputation(): Promise<ReputationResult> {
  const scrapingBeeKey = process.env.SCRAPINGBEE_KEY;

  if (!scrapingBeeKey) {
    return {
      placeName: "Club Golf d'Aro",
      mapsUrl: CLUB_SHORT_URL,
      overallRating: null,
      reviewCount: null,
      ratingBreakdown: null,
      source: "error",
      scrapeDebug: "Falta la variable d'entorn SCRAPINGBEE_KEY a Vercel (la mateixa que ja es fa servir pel comparador de tarifes).",
    };
  }

  // Google Maps és 100% JavaScript: cal render_js=true (a diferència de
  // GolfManager, que és una API JSON i no en necessita). Això consumeix més
  // crèdits de ScrapingBee per petició — per això la sincronització és
  // manual, no automàtica.
  const url = `https://app.scrapingbee.com/api/v1/?api_key=${scrapingBeeKey}&url=${encodeURIComponent(
    CLUB_MAPS_URL
  )}&premium_proxy=true&render_js=true&wait=2500`;

  try {
    const { resp, lastErr, attempts } = await fetchWithRetry(
      url,
      {
        headers: {
          "Accept-Language": "ca-ES,ca;q=0.9,es-ES;q=0.8,es;q=0.7,en;q=0.6",
        },
        signal: AbortSignal.timeout(45000),
      },
      2 // menys reintents que rates.ts perquè render_js=true ja és lent i car
    );

    if (!resp) {
      const isTimeout = lastErr?.name === "TimeoutError" || lastErr?.name === "AbortError";
      return {
        placeName: "Club Golf d'Aro",
        mapsUrl: CLUB_SHORT_URL,
        overallRating: null,
        reviewCount: null,
        ratingBreakdown: null,
        source: "error",
        scrapeDebug: isTimeout
          ? `Timeout connectant a Google Maps (via ScrapingBee, ${attempts} intent${attempts > 1 ? "s" : ""})`
          : `Error de xarxa: ${String(lastErr?.message || lastErr)}`,
      };
    }

    if (!resp.ok) {
      const bodySnippet = (await resp.text().catch(() => "")).slice(0, 200);
      return {
        placeName: "Club Golf d'Aro",
        mapsUrl: CLUB_SHORT_URL,
        overallRating: null,
        reviewCount: null,
        ratingBreakdown: null,
        source: "error",
        scrapeDebug: `HTTP ${resp.status} ${resp.statusText} via ScrapingBee${bodySnippet ? ` — cos: ${bodySnippet}` : ""}`,
      };
    }

    const html = await resp.text();
    const parsed = parseReputationFromHtml(html);

    if (parsed.overallRating === null && parsed.reviewCount === null) {
      return {
        placeName: parsed.placeName || "Club Golf d'Aro",
        mapsUrl: CLUB_SHORT_URL,
        overallRating: null,
        reviewCount: null,
        ratingBreakdown: null,
        source: "error",
        scrapeDebug: "Format de la pàgina de Google Maps no reconegut (pot haver canviat l'estructura, o Google ha mostrat una pàgina de verificació en lloc de la fitxa).",
      };
    }

    return {
      placeName: parsed.placeName || "Club Golf d'Aro",
      mapsUrl: CLUB_SHORT_URL,
      overallRating: parsed.overallRating,
      reviewCount: parsed.reviewCount,
      ratingBreakdown: parsed.ratingBreakdown,
      source: "live",
    };
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      placeName: "Club Golf d'Aro",
      mapsUrl: CLUB_SHORT_URL,
      overallRating: null,
      reviewCount: null,
      ratingBreakdown: null,
      source: "error",
      scrapeDebug: isTimeout ? "Timeout connectant a Google Maps" : `Error de xarxa: ${String(err?.message || err)}`,
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const result = await scrapeReputation();
    return res.status(200).json(result);
  } catch (err: any) {
    try {
      return res.status(200).json({
        placeName: "Club Golf d'Aro",
        mapsUrl: CLUB_SHORT_URL,
        overallRating: null,
        reviewCount: null,
        ratingBreakdown: null,
        source: "error",
        scrapeDebug: `Excepció no capturada: ${String(err?.message || err)}`,
      });
    } catch {
      return;
    }
  }
}
