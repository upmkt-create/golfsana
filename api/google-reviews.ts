// ============================================================================
// VERCEL API ROUTE — /api/google-reviews
// ============================================================================
// Llegeix, per a Golf d'Aro i els 6 competidors del benchmark, la puntuació
// i el nombre de ressenyes reals a Google Maps — via la Places API (New)
// oficial de Google (la mateixa que fa servir /api/reputation per al propi
// club), MAI via scraping: Google detecta i bloqueja el scraping del seu
// Maps, per això aquell mòdul es va migrar a l'API oficial (vegeu
// api/reputation.ts per l'explicació completa).
//
// Necessita la mateixa variable d'entorn GOOGLE_PLACES_API_KEY que ja es
// va configurar per a /api/reputation — no calen claus noves.
//
// LIMITACIÓ HONESTA (igual que a /api/reputation): aquesta API no exposa
// el desglossament per estrelles, només la puntuació global i el nombre de
// ressenyes.
//
// ús: GET /api/google-reviews
// ============================================================================

interface VercelRequest {
  query: { [key: string]: string | string[] | undefined };
}
interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

interface ClubPlace {
  slug: string;
  name: string;
  placeId: string;
}

// Place IDs confirmats (22/09/2026) via cerca de llocs de Google — mateixos
// slugs que ja es fan servir a api/rates.ts i api/leading-courses.ts, per
// coherència. No inventats: cada un ve d'una cerca real per nom+població.
const CLUB_PLACES: ClubPlace[] = [
  { slug: "golfdaro", name: "Club Golf d'Aro - Mas Nou", placeId: "ChIJM1BPFtYDuxIRUFpRH-H6AA8" },
  { slug: "torremirona", name: "Torremirona Golf Club", placeId: "ChIJQbHQ3G-TuhIR7ex6jJpe8Cg" },
  { slug: "emporda", name: "Empordà Golf Resort", placeId: "ChIJ1RZZKiZYuhIRZQx6F5q2PRw" },
  { slug: "camiral", name: "Camiral Golf & Wellness", placeId: "ChIJsbka0zYguxIR_8T9zeeCqEU" },
  { slug: "pals", name: "Golf de Pals", placeId: "ChIJq1gq0iFRuhIRrhoPwnPOUGs" },
  { slug: "costabrava", name: "Club de Golf Costa Brava", placeId: "ChIJj20-ai7nuhIR5v2o_UDz9I8" },
  { slug: "perelada", name: "Camp de Golf Peralada", placeId: "ChIJWRcSyNeIuhIRYFlRH-H6AA8" },
];

interface ClubGoogleResult {
  slug: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string | null;
  source: "live" | "error";
  scrapeDebug?: string;
}

async function fetchOnePlace(apiKey: string, club: ClubPlace): Promise<ClubGoogleResult> {
  try {
    const resp = await fetch(`https://places.googleapis.com/v1/places/${club.placeId}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!resp.ok) {
      const bodySnippet = (await resp.text().catch(() => "")).slice(0, 200);
      return {
        slug: club.slug,
        name: club.name,
        rating: null,
        reviewCount: null,
        mapsUrl: null,
        source: "error",
        scrapeDebug: `HTTP ${resp.status} ${resp.statusText}${bodySnippet ? ` — cos: ${bodySnippet}` : ""}`,
      };
    }

    const data = await resp.json();
    return {
      slug: club.slug,
      name: club.name,
      rating: typeof data?.rating === "number" ? data.rating : null,
      reviewCount: typeof data?.userRatingCount === "number" ? data.userRatingCount : null,
      mapsUrl: data?.googleMapsUri || null,
      source: "live",
    };
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      slug: club.slug,
      name: club.name,
      rating: null,
      reviewCount: null,
      mapsUrl: null,
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
      error: "Falta la variable d'entorn GOOGLE_PLACES_API_KEY a Vercel (la mateixa que ja es fa servir a /api/reputation).",
      clubs: [],
    });
  }

  // Les 7 peticions són independents i ràpides (API oficial, sense proxy)
  // — es demanen totes en paral·lel sense cap límit de concurrència perquè
  // Google Cloud no l'imposa per a aquest volum.
  const clubs = await Promise.all(CLUB_PLACES.map((club) => fetchOnePlace(apiKey, club)));

  return res.status(200).json({
    scrapedAt: new Date().toISOString(),
    clubs,
  });
}
