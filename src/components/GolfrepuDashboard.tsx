import React, { useState, useEffect } from "react";
import { Star, RefreshCw, ExternalLink, TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowLeft, Trophy, Flag } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ReputationSnapshot, RatingBreakdown, LeadingCoursesSnapshot } from "../types";

const NAVY = "#033b7a";
const CACHE_KEY = "golfsana_reputation_cache";
const LC_CACHE_KEY = "golfsana_leadingcourses_cache";

interface GolfrepuDashboardProps {
  onBack: () => void;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ca-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function GolfrepuDashboard({ onBack }: GolfrepuDashboardProps) {
  const [snapshot, setSnapshot] = useState<ReputationSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lcSnapshot, setLcSnapshot] = useState<LeadingCoursesSnapshot | null>(null);
  const [isLcLoading, setIsLcLoading] = useState(false);
  const [lcError, setLcError] = useState<string | null>(null);

  // Carrega l'últim snapshot desat (Firestore, amb fallback a localStorage) en
  // obrir la pestanya — no fa cap petició nova a ScrapingBee només per mirar-ho.
  useEffect(() => {
    (async () => {
      try {
        const docSnap = await getDoc(doc(db, "reputationSnapshots", "current"));
        if (docSnap.exists()) {
          setSnapshot(docSnap.data() as ReputationSnapshot);
          return;
        }
      } catch (err) {
        console.warn("[Golfrepu] No s'ha pogut llegir Firestore, provant cache local:", err);
      }
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) setSnapshot(JSON.parse(cached));
      } catch {
        // sense cache, es queda buit fins que l'usuari sincronitzi
      }
    })();
    (async () => {
      try {
        const docSnap = await getDoc(doc(db, "leadingCoursesSnapshots", "current"));
        if (docSnap.exists()) {
          setLcSnapshot(docSnap.data() as LeadingCoursesSnapshot);
          return;
        }
      } catch (err) {
        console.warn("[Golfrepu] No s'ha pogut llegir el benchmark de Firestore, provant cache local:", err);
      }
      try {
        const cached = localStorage.getItem(LC_CACHE_KEY);
        if (cached) setLcSnapshot(JSON.parse(cached));
      } catch {
        // sense cache
      }
    })();
  }, []);

  const handleSync = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/reputation");
      const data = await resp.json();

      if (data.source === "error") {
        setError(data.scrapeDebug || "No s'ha pogut llegir Google Maps ara mateix.");
        // Es manté el snapshot anterior visible — no s'esborra res per un error puntual.
        setIsLoading(false);
        return;
      }

      const prevHistory = snapshot?.history || [];
      const today = new Date().toISOString().slice(0, 10);
      // Un únic punt d'històric per dia (si ja s'ha sincronitzat avui, se substitueix)
      const nextHistory = [
        ...prevHistory.filter((h) => h.date !== today),
        { date: today, overallRating: data.overallRating, reviewCount: data.reviewCount },
      ].slice(-90); // 90 dies és de sobres per veure la tendència sense inflar el document

      const newSnapshot: ReputationSnapshot = {
        id: "current",
        scrapedAt: new Date().toISOString(),
        placeName: data.placeName,
        mapsUrl: data.mapsUrl,
        overallRating: data.overallRating,
        reviewCount: data.reviewCount,
        ratingBreakdown: data.ratingBreakdown,
        source: "live",
        history: nextHistory,
      };

      setSnapshot(newSnapshot);
      localStorage.setItem(CACHE_KEY, JSON.stringify(newSnapshot));
      try {
        await setDoc(doc(db, "reputationSnapshots", "current"), newSnapshot);
      } catch (err) {
        console.warn("[Golfrepu] Desat localment, Firestore no disponible:", err);
      }
    } catch (err: any) {
      setError(`Error de connexió: ${String(err?.message || err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncBenchmark = async () => {
    setIsLcLoading(true);
    setLcError(null);
    try {
      const resp = await fetch("/api/leading-courses");
      const data = await resp.json();

      const newSnapshot: LeadingCoursesSnapshot = {
        id: "current",
        scrapedAt: data.scrapedAt,
        clubs: data.clubs,
      };
      setLcSnapshot(newSnapshot);
      localStorage.setItem(LC_CACHE_KEY, JSON.stringify(newSnapshot));

      if (newSnapshot.clubs.every((c: any) => c.source === "error")) {
        setLcError("No s'ha pogut llegir cap dels clubs. Comprova la connexió i torna-ho a provar.");
      }

      try {
        await setDoc(doc(db, "leadingCoursesSnapshots", "current"), newSnapshot);
      } catch (err) {
        console.warn("[Golfrepu] Benchmark desat localment, Firestore no disponible:", err);
      }
    } catch (err: any) {
      setLcError(`Error de connexió: ${String(err?.message || err)}`);
    } finally {
      setIsLcLoading(false);
    }
  };

  const trend = (() => {
    const h = snapshot?.history;
    if (!h || h.length < 2) return null;
    const diff = h[h.length - 1].overallRating - h[h.length - 2].overallRating;
    if (Math.abs(diff) < 0.05) return { icon: Minus, label: "Estable", color: "text-slate-400" };
    if (diff > 0) return { icon: TrendingUp, label: `+${diff.toFixed(1)}`, color: "text-emerald-600" };
    return { icon: TrendingDown, label: diff.toFixed(1), color: "text-rose-600" };
  })();

  const breakdown: RatingBreakdown | null = snapshot?.ratingBreakdown || null;
  const maxBreakdownCount = breakdown ? Math.max(breakdown[5], breakdown[4], breakdown[3], breakdown[2], breakdown[1], 1) : 1;

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 text-slate-900 overflow-y-auto">
      {/* Capçalera pròpia de Golfrepu — espai diferent de GolfSana, no una pestanya més */}
      <header className="shrink-0 bg-gradient-to-r from-[#022e5f] to-[#044c9c] px-6 py-4 flex items-center justify-between border-b-[3px] border-amber-400 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 fill-[#022e5f] text-[#022e5f]" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider font-mono text-blue-200 font-bold">
              GolfSana · Tercer pilar
            </p>
            <h1 className="text-white font-black text-lg leading-tight">Golfrepu</h1>
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-100 hover:text-white hover:bg-white/10 border border-blue-300/40 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tornar a GolfSana
        </button>
      </header>

      <div className="flex-1 p-6 space-y-6 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              Reputació online
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Puntuació i ressenyes reals del club a Google Maps.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white transition-all disabled:opacity-60"
            style={{ backgroundColor: NAVY }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Sincronitzant..." : "Sincronitzar ara"}
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-3 flex items-start gap-2 text-xs text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No s'ha pogut sincronitzar</p>
              <p className="mt-0.5">{error}</p>
            </div>
        </div>
      )}

      {!snapshot && !error && (
        <div className="text-center py-16 text-sm text-slate-400 border border-dashed border-slate-200">
          Encara no hi ha cap dada. Prem "Sincronitzar ara" per llegir la puntuació real de Google Maps.
        </div>
      )}

      {snapshot && (snapshot.overallRating !== null || snapshot.reviewCount !== null) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Puntuació gran */}
          <div className="bg-white border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900 font-mono">
                {snapshot.overallRating !== null ? snapshot.overallRating.toFixed(1) : "—"}
              </span>
              <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {snapshot.reviewCount !== null ? `sobre ${snapshot.reviewCount} ressenyes` : "nombre de ressenyes no disponible"}
            </p>
            {trend && (
              <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${trend.color}`}>
                <trend.icon className="w-3.5 h-3.5" />
                {trend.label} des de l'última sincronització
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-3">
              Actualitzat {formatDate(snapshot.scrapedAt)}
            </p>
            <a
              href={snapshot.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Veure totes les ressenyes a Google Maps
            </a>
          </div>

          {/* Desglossament per estrelles */}
          <div className="bg-white border border-slate-200 p-6">
            <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-3">
              Desglossament per estrelles
            </p>
            {breakdown ? (
              <div className="space-y-2">
                {([5, 4, 3, 2, 1] as const).map((star) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-mono w-3">{star}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex-1 h-3 bg-slate-100 relative overflow-hidden">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${(breakdown[star] / maxBreakdownCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-mono w-10 text-right">{breakdown[star]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Desglossament no disponible en aquesta sincronització.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Benchmark amb competidors — Leading Courses */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Benchmark amb competidors — Leading Courses
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Golf d'Aro comparat amb els mateixos competidors del comparador de tarifes.
            </p>
          </div>
          <button
            onClick={handleSyncBenchmark}
            disabled={isLcLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white transition-all disabled:opacity-60"
            style={{ backgroundColor: NAVY }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLcLoading ? "animate-spin" : ""}`} />
            {isLcLoading ? "Sincronitzant..." : "Sincronitzar benchmark"}
          </button>
        </div>

        {lcError && (
          <div className="bg-rose-50 border border-rose-200 p-3 flex items-start gap-2 text-xs text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{lcError}</p>
          </div>
        )}

        {!lcSnapshot && !lcError && (
          <div className="text-center py-16 text-sm text-slate-400 border border-dashed border-slate-200">
            Encara no hi ha cap dada. Prem "Sincronitzar benchmark" per llegir les puntuacions reals de Leading Courses.
          </div>
        )}

        {lcSnapshot && lcSnapshot.clubs.length > 0 && (
          <div className="bg-white border border-slate-200 divide-y divide-slate-100">
            {lcSnapshot.clubs
              .slice()
              .sort((a, b) => {
                if (a.overallRating === null) return 1;
                if (b.overallRating === null) return -1;
                return b.overallRating - a.overallRating;
              })
              .map((club) => (
                <div
                  key={club.slug}
                  className={`p-4 flex items-center justify-between gap-3 flex-wrap ${club.isOwnClub ? "bg-amber-50/60" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {club.isOwnClub ? (
                      <Flag className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${club.isOwnClub ? "font-black text-slate-900" : "font-semibold text-slate-700"}`}>
                        {club.name}
                        {club.isOwnClub && <span className="ml-1.5 text-[9px] uppercase tracking-wide text-amber-600 font-bold">(vosaltres)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Leading Courses */}
                    <div className="text-right min-w-[86px]">
                      <p className="text-[8px] uppercase tracking-wide text-slate-400 font-bold">Leading Courses</p>
                      {club.leadingCourses.rating !== null ? (
                        <>
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-lg font-black text-slate-900 font-mono">{club.leadingCourses.rating.toFixed(1)}</span>
                            <span className="text-[9px] text-slate-400">/10</span>
                          </div>
                          {club.leadingCourses.reviewCount !== null && (
                            <p className="text-[9px] text-slate-400">{club.leadingCourses.reviewCount} ressenyes</p>
                          )}
                        </>
                      ) : (
                        <span
                          className="text-xs text-rose-400 cursor-help"
                          title={club.leadingCourses.scrapeDebug}
                        >
                          — error
                        </span>
                      )}
                    </div>
                    {/* 1golf.eu */}
                    <div className="text-right min-w-[70px]">
                      <p className="text-[8px] uppercase tracking-wide text-slate-400 font-bold">1golf.eu</p>
                      {club.oneGolf.rating !== null ? (
                        <>
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-lg font-black text-slate-900 font-mono">{club.oneGolf.rating.toFixed(1)}</span>
                            <span className="text-[9px] text-slate-400">/5</span>
                          </div>
                          {club.oneGolf.reviewCount !== null && (
                            <p className="text-[9px] text-slate-400">{club.oneGolf.reviewCount} ressenyes</p>
                          )}
                        </>
                      ) : (
                        <span
                          className="text-xs text-rose-400 cursor-help"
                          title={club.oneGolf.scrapeDebug}
                        >
                          — error
                        </span>
                      )}
                    </div>
                    <a
                      href={club.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      title="Veure a Leading Courses"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
          </div>
        )}
        {lcSnapshot && (
          <p className="text-[10px] text-slate-400">
            Actualitzat {formatDate(lcSnapshot.scrapedAt)}
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
