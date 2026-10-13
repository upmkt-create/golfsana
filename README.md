# Golfsana

Golfsana és la plataforma interna de gestió i analítica per a Club Golf d'Aro. Centralitza tasques, projectes, equips, reunions, comunicacions internes, reporting, reputació i el comparador de tarifes i disponibilitat de camps de golf.

## Stack

- React 19 + TypeScript
- Vite
- Firebase Authentication + Firestore
- Supabase Storage per als adjunts de tasques
- Vercel per al desplegament i les API routes
- Tailwind CSS
- Recharts / Leaflet / React Big Calendar

## Desenvolupament local

Requisits:

- Node.js 22
- npm

```bash
npm install
npm run dev
```

L'aplicació s'executa per defecte a `http://localhost:3000`.

## Comandes

```bash
npm run dev      # entorn local
npm run build    # build de producció
npm run preview  # previsualitza el build
npm run lint     # comprovació TypeScript
```

## Serveis externs

La configuració de Firebase del client es troba a `firebase-applet-config.json`. Les credencials secretes de serveis server-side s'han de configurar exclusivament com a variables d'entorn a Vercel; no s'han d'escriure al repositori.

Variables utilitzades actualment per funcionalitats server-side poden incloure, segons el mòdul activat:

- `GOOGLE_PLACES_API_KEY`
- `BRIGHTDATA_API_KEY`
- `BRIGHTDATA_ZONE`
- `SCRAPINGBEE_KEY`
- `SCRAPERAPI_KEY`
- `SCRAPERAPI_PREMIUM`

## Rate Shopper

El Rate Shopper normalitza tarifes i disponibilitat de diferents motors de reserva, incloent GolfManager i TeeOne. Les dades en directe tenen prioritat; el model local només s'ha d'utilitzar com a referència de preus quan la font en directe no està disponible.

## Persistència

- Firestore: dades operatives de Golfsana.
- Supabase Storage: adjunts de tasques.
- `localStorage`: només suport local/cache i compatibilitat; no ha de ser la font de veritat de dades compartides.

## Desplegament

El projecte es desplega a Vercel des del repositori GitHub. La branca `main` és la base de producció.

## Criteri de desenvolupament

GitHub és la font única del codi. Qualsevol eina d'IA que participi en el desenvolupament ha de treballar sobre l'estat real del repositori i evitar generar configuracions específiques d'un entorn d'edició que no siguin necessàries en producció.
