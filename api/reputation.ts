// ============================================================================
// VERCEL API ROUTE — /api/reputation
// ============================================================================
// Llegeix la puntuació i el nombre de ressenyes reals del club a Google Maps.
//
// ABANS es feia amb scraping (ScrapingBee + render_js=true). Es va abandonar
// perquè Google Maps és una app 100% JavaScript i detecta trànsit de bots
// encara que es renderitzi amb un navegador real via proxy — sovint retorna
// una pàgina "preview" buida sense dades, de manera intermitent i
// impredictible. No és un problema de format a corregir amb un millor
// parser: és protecció anti-bot deliberada.
//
// ARA es fa servir la Places API (New) oficial de Google — l'endpoint que
// Google mateix ofereix per llegir exactament aquesta dada (puntuació i
// nombre de ressenyes), sense necessitat de cap proxy ni de simular un
// navegador. Necessita una clau (GOOGLE_PLACES_API_KEY) d'un projecte de
// Google Cloud amb la "Places API (New)" activada — Google dona 200$ de
// crèdit gratuït cada mes, i sincronitzar aquest club unes poques vegades
// costa cèntims, així que hi cap còmodament dins del crèdit gratuït.
//
// LIMITACIÓ HONESTA: aquesta API oficial NO exposa el desglossament per
// estrelles (5→1) — Google només el mostra dins la pròpia fitxa de Maps, no
// via cap API pública. Per tenir-lo caldria l'API de Business Profile
// (Google Business Profile / antic "Google My Business"), només accessible
// si Isabel/Rocío són administradores verificades de la fitxa i Google
// aprova l'accés a l'API (procés d'aprovació manual, no immediat) — es
// deixa fora per ara; la puntuació global i el nombre de ressenyes sí que
// queden coberts.
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

// Place ID confirmat (22/09/2026) via cerca de llocs de Google — mateixa
// fitxa que abans es llegia per CID a Google Maps (0xf00fae11f515a50):
// "Club Golf d'Aro - Mas Nou", Urbanització Mas Nou, s/n, 17250 Platja d'Aro.
const CLUB_PLACE_ID = "ChIJM1BPFtYDuxIRUFpRH-H6AA8";
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
  ratingBreakdown: RatingBreakdown | null; // sempre null amb aquesta font — vegeu nota de dalt
  source: "live" | "error";
  scrapeDebug?: string;
}

async function fetchPlaceDetails(apiKey: string): Promise<ReputationResult> {
  const url = `https://places.googleapis.com/v1/places/${CLUB_PLACE_ID}`;

  try {
    const resp = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "displayName,rating,userRatingCount,googleMapsUri",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const bodySnippet = (await resp.text().catch(() => "")).slice(0, 300);
      return {
        placeName: "Club Golf d'Aro",
        mapsUrl: CLUB_SHORT_URL,
        overallRating: null,
        reviewCount: null,
        ratingBreakdown: null,
        source: "error",
        scrapeDebug: `HTTP ${resp.status} ${resp.statusText} (Google Places API)${bodySnippet ? ` — cos: ${bodySnippet}` : ""}`,
      };
    }

    const data = await resp.json();

    return {
      placeName: data?.displayName?.text || "Club Golf d'Aro",
      mapsUrl: data?.googleMapsUri || CLUB_SHORT_URL,
      overallRating: typeof data?.rating === "number" ? data.rating : null,
      reviewCount: typeof data?.userRatingCount === "number" ? data.userRatingCount : null,
      ratingBreakdown: null,
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
      scrapeDebug: isTimeout ? "Timeout connectant a la Places API de Google" : `Error de xarxa: ${String(err?.message || err)}`,
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      placeName: "Club Golf d'Aro",
      mapsUrl: CLUB_SHORT_URL,
      overallRating: null,
      reviewCount: null,
      ratingBreakdown: null,
      source: "error",
      scrapeDebug:
        "Falta la variable d'entorn GOOGLE_PLACES_API_KEY a Vercel (clau d'un projecte de Google Cloud amb la 'Places API (New)' activada).",
    } as ReputationResult);
  }

  try {
    const result = await fetchPlaceDetails(apiKey);

    // Mode diagnòstic: ?debug=true retorna la resposta crua de la Places
    // API, per si algun dia canvia el format dels camps.
    if (req.query.debug === "true" || req.query.debug === "1") {
      const rawResp = await fetch(`https://places.googleapis.com/v1/places/${CLUB_PLACE_ID}`, {
        headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "*" },
        signal: AbortSignal.timeout(15000),
      });
      const rawBody = await rawResp.text();
      return res.status(200).json({ parsed: result, httpStatus: rawResp.status, rawBody: rawBody.slice(0, 20000) });
    }

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
      } as ReputationResult);
    } catch {
      return;
    }
  }
}
