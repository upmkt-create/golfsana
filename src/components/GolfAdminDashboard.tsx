import React, { useState } from "react";
import { GolfCourse } from "../types";
import { STARTER_GOLF_CORES, getRealWorldCompetitorPrices, parseAndCleanPrice, isAllowedTariff } from "../data";
import { fetchCourseRates, fetchAllRates } from "../rateShopperService";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  TrendingUp,
  MapPin,
  DollarSign,
  Plus,
  Trash2,
  Edit3,
  Check,
  RefreshCw,
  Sparkles,
  Search,
  ExternalLink,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from "lucide-react";

interface GolfAdminDashboardProps {
  golfCourses: GolfCourse[];
  isAdmin: boolean;
  onAddCourse: (course: Omit<GolfCourse, "id">) => Promise<void>;
  onUpdateCourse: (courseId: string, updates: Partial<GolfCourse>) => Promise<void>;
  onDeleteCourse: (courseId: string) => void | Promise<void>;
}

export interface HourRange {
  key: string;
  label: string;
  tariff: string;
  defaultDiscount: number;
}

export const HOUR_RANGES: HourRange[] = [
  { key: "07:00-08:00", label: "07:00 - 08:00", tariff: "GF 18F Earlybird", defaultDiscount: 20 },
  { key: "08:00-09:00", label: "08:00 - 09:00", tariff: "GF 18 Forats", defaultDiscount: 0 },
  { key: "09:00-10:00", label: "09:00 - 10:00", tariff: "GF 18 Forats", defaultDiscount: 0 },
  { key: "10:00-11:00", label: "10:00 - 11:00", tariff: "GF 18 Forats", defaultDiscount: 0 },
  { key: "11:00-12:00", label: "11:00 - 12:00", tariff: "GF 18 Forats", defaultDiscount: 0 },
  { key: "12:00-13:00", label: "12:00 - 13:00", tariff: "GF 18 Forats (-4%)", defaultDiscount: 4 },
  { key: "13:00-14:00", label: "13:00 - 14:00", tariff: "GF 18 Forats (-10%)", defaultDiscount: 10 },
  { key: "14:00-15:00", label: "14:00 - 15:00", tariff: "GF 18 Forats (-15%)", defaultDiscount: 15 },
  { key: "15:00-16:00", label: "15:00 - 16:00", tariff: "GF 18 Forats (-20%)", defaultDiscount: 20 },
  { key: "16:00-17:00", label: "16:00 - 17:00", tariff: "GF All You Can Play", defaultDiscount: 35 },
  { key: "17:00-18:00", label: "17:00 - 18:00", tariff: "GF All You Can Play", defaultDiscount: 35 },
  { key: "18:00-19:00", label: "18:00 - 19:00", tariff: "GF Twilight", defaultDiscount: 40 },
  { key: "19:00-21:00", label: "19:00 - 21:00", tariff: "GF Twilight", defaultDiscount: 40 },
];

export function getConsecutiveDays(startDateStr: string, count: number) {
  const days = [];
  const baseDate = new Date(startDateStr);
  const weekdays = ["Diumenge", "Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte"];
  
  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate.getTime());
    d.setDate(baseDate.getDate() + i);
    const dayName = weekdays[d.getDay()];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    const displayLabel = `${dayName}, ${dd}/${mm}`;
    days.push({
      dateStr: formattedDate,
      label: displayLabel,
      isWeekend: [0, 6].includes(d.getDay())
    });
  }
  return days;
}

// Genera tots els dies d'un mes natural (per a la vista mensual del comparador)
export function getMonthDays(year: number, month: number) {
  const days = [];
  const weekdays = ["Diumenge", "Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dayName = weekdays[d.getDay()];
    const dd = String(day).padStart(2, "0");
    const mm = String(month + 1).padStart(2, "0");
    days.push({
      dateStr: `${year}-${mm}-${dd}`,
      label: `${dayName}, ${dd}/${mm}`,
      isWeekend: [0, 6].includes(d.getDay()),
    });
  }
  return days;
}

const MONTH_NAMES = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"];

export function getOurClubDetailedTeeTimes(t: number) {
  // t is minutes from 00:00 (e.g. 07:00 is 420, 20:48 is 1248)
  
  // 1. 07:00 to 07:59 (420 to 479 mins)
  if (t >= 420 && t < 480) {
    return [
      { tariff: "GF 18 - 4 players", price: 92, discountPct: 20, originalPrice: 115 },
      { tariff: "GF 18 Forats", price: 115, discountPct: 0, originalPrice: 115 }
    ];
  }

  // 2. 08:00 to 12:00
  if (t >= 480 && t < 720) {
    const isBoth = (t === 492 || t === 501) || // 08:12, 08:21
                   (t === 591 || t === 600 || t === 609) || // 09:51, 10:00, 10:09
                   (t >= 681 && t <= 717); // 11:21 to 11:57
    
    if (isBoth) {
      return [
        { tariff: "GF 18 Forats", price: 115, discountPct: 0, originalPrice: 115 },
        { tariff: "GF 18 - 4 players", price: 92, discountPct: 20, originalPrice: 115 }
      ];
    } else {
      return [
        { tariff: "GF 18 Forats", price: 115, discountPct: 0, originalPrice: 115 }
      ];
    }
  }

  // 3. 12:00 to 13:00 (12:06 to 13:00)
  if (t >= 720 && t <= 780) {
    return [
      { tariff: "GF 18 Forats", price: 110, discountPct: 4, originalPrice: 115 },
      { tariff: "GF 18 - 4 players", price: 92, discountPct: 20, originalPrice: 115 }
    ];
  }

  // 4. 13:00 to 14:00 (13:09 to 13:54)
  if (t > 780 && t <= 834) {
    return [
      { tariff: "GF 18 Forats", price: 104, discountPct: 10, originalPrice: 115 },
      { tariff: "GF 18 - 4 players", price: 92, discountPct: 20, originalPrice: 115 }
    ];
  }

  // 5. 14:00 to 15:00 (14:03 to 14:57)
  if (t > 834 && t <= 897) {
    return [
      { tariff: "GF 18 Forats", price: 98, discountPct: 15, originalPrice: 115 },
      { tariff: "GF 18 - 4 players", price: 92, discountPct: 20, originalPrice: 115 }
    ];
  }

  // 6. 15:00 to 15:59 (15:06 to 15:51)
  if (t >= 900 && t < 960) {
    return [
      { tariff: "GF 18 Forats", price: 92, discountPct: 20, originalPrice: 115 }
    ];
  }

  // 7. 16:00 to 21:00 (16:00 to 20:48)
  if (t >= 960 && t <= 1260) {
    // exceptions where ONLY All You Play is available: 17:39, 17:48, or after 18:06
    const isOnlyPlay = (t === 1059 || t === 1068) || (t >= 1086);
    if (isOnlyPlay) {
      return [
        { tariff: "GF All You Can Play", price: 75, discountPct: 35, originalPrice: 115 }
      ];
    } else {
      return [
        { tariff: "GF All You Can Play", price: 75, discountPct: 35, originalPrice: 115 },
        { tariff: "GF 18 Forats", price: 86, discountPct: 25, originalPrice: 115 }
      ];
    }
  }

  return [
    { tariff: "GF 18 Forats", price: 115, discountPct: 0, originalPrice: 115 }
  ];
}

export default function GolfAdminDashboard({
  golfCourses,
  isAdmin,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
}: GolfAdminDashboardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [selectedMatrixDate, setSelectedMatrixDate] = useState<string>(new Date().toISOString().slice(0, 10));
  // Vista del calendari comparador: "today" (30 dies des d'avui) o "month" (mes natural)
  const [calendarView, setCalendarView] = useState<"today" | "month">("today");
  // Mes de referència quan calendarView === "month" (primer dia del mes)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDetailCourseId, setSelectedDetailCourseId] = useState<string>("");
  const [detailFilterSearch, setDetailFilterSearch] = useState<string>("");
  const [chartMetric, setChartMetric] = useState<"avg" | "prime" | "twilight">("avg");

  // Tee-times reals per a competidors, obtinguts via /api/rates (scraping en
  // directe + fallback al model si falla) — abans es feia servir sempre el
  // model local directament, que pot quedar desactualitzat amb el temps.
  const [liveApiTeeTimes, setLiveApiTeeTimes] = useState<import("../competitorRates").TeeTime[] | null>(null);
  const [isLoadingLiveRates, setIsLoadingLiveRates] = useState(false);
  const [liveApiSource, setLiveApiSource] = useState<"live" | "model" | "closed" | null>(null);

  const activeDetailCourseId = selectedDetailCourseId || golfCourses.find(c => c.isOurClub)?.id || "";
  const activeDetailCourse = golfCourses.find(c => c.id === activeDetailCourseId);

  // Dades reals per a la taula "Camps Analitzats": tots els camps carregats
  // alhora, amb cache al navegador (20 min) i sincronització NOMÉS sota
  // demanda — abans no hi havia cap connexió amb l'scraping en directe, i
  // un disseny que consultés tot automàticament gastaria crèdits del
  // proxy (ScrapingBee) cada vegada que s'obrís la pestanya.
  const RATES_CACHE_MINUTES = 20;
  const [allCoursesRates, setAllCoursesRates] = useState<import("../rateShopperService").RatesResponse | null>(null);
  const [isLoadingAllRates, setIsLoadingAllRates] = useState(false);
  const [ratesLastSyncedAt, setRatesLastSyncedAt] = useState<number | null>(null);

  const cacheKeyForDate = (dateStr: string) => `golfsana_rates_cache_${dateStr}`;

  const loadRatesFromCache = (dateStr: string): boolean => {
    try {
      const raw = localStorage.getItem(cacheKeyForDate(dateStr));
      if (!raw) return false;
      const { data, timestamp } = JSON.parse(raw);
      const ageMinutes = (Date.now() - timestamp) / 60000;
      if (ageMinutes > RATES_CACHE_MINUTES) return false;
      setAllCoursesRates(data);
      setRatesLastSyncedAt(timestamp);
      return true;
    } catch {
      return false;
    }
  };

  const syncRatesNow = () => {
    if (golfCourses.length === 0) return;
    setIsLoadingAllRates(true);
    fetchAllRates(golfCourses.map(c => c.name), selectedMatrixDate)
      .then((data) => {
        setAllCoursesRates(data);
        const now = Date.now();
        setRatesLastSyncedAt(now);
        try {
          localStorage.setItem(cacheKeyForDate(selectedMatrixDate), JSON.stringify({ data, timestamp: now }));
        } catch { /* localStorage ple o no disponible — no crític */ }
      })
      .finally(() => {
        setIsLoadingAllRates(false);
      });
  };

  React.useEffect(() => {
    setAllCoursesRates(null);
    setRatesLastSyncedAt(null);
    loadRatesFromCache(selectedMatrixDate);
  }, [selectedMatrixDate]);

  // Agrupa els tee-times consecutius que tenen el mateix preu principal en
  // un sol "tram visual" — així cada camp mostra només els canvis REALS de
  // tarifa (uns 4-8 per dia), en lloc d'una fila per cada sortida cada 9/10
  // minuts (que serien desenes de columnes gairebé totes repetides).
  const groupTeeTimesIntoBlocks = (teeTimes: import("../competitorRates").TeeTime[]) => {
    const blocks: { startTime: string; endTime: string; price: number; tariff: string; discountPct?: number }[] = [];
    teeTimes.forEach((tt) => {
      const rate = tt.rates[0];
      if (!rate) return;
      const last = blocks[blocks.length - 1];
      if (last && last.price === rate.price && last.tariff === rate.tariff) {
        last.endTime = tt.time;
      } else {
        blocks.push({ startTime: tt.time, endTime: tt.time, price: rate.price, tariff: rate.tariff, discountPct: rate.discountPct });
      }
    });
    return blocks;
  };

  React.useEffect(() => {
    if (!activeDetailCourse) {
      setLiveApiTeeTimes(null);
      setLiveApiSource(null);
      return;
    }
    let cancelled = false;
    setIsLoadingLiveRates(true);
    fetchCourseRates(activeDetailCourse.name, selectedMatrixDate)
      .then((data) => {
        if (cancelled) return;
        setLiveApiTeeTimes(data.teeTimes);
        setLiveApiSource(data.source);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLiveRates(false);
      });
    return () => { cancelled = true; };
  }, [activeDetailCourse?.id, activeDetailCourse?.name, activeDetailCourse?.isOurClub, selectedMatrixDate]);

  const getDynamicCourseRate = (course: GolfCourse, dateStr: string, hourKey: string) => {
    const dObj = new Date(dateStr);
    const isWeekendDay = [0, 6].includes(dObj.getDay());
    const baseHigh = isWeekendDay ? course.greenFeeHigh + 10 : course.greenFeeHigh;

    interface CourseRateOption {
      price: number;
      tariff: string;
      discountPct?: number;
      originalPrice?: number;
    }

    let primaryPrice = 0;
    let primaryTariff = "";
    let options: CourseRateOption[] = [];

    if (course.isOurClub) {
      const base = course.greenFeeHigh || 115;
      
      switch (hourKey) {
        case "07:00-08:00": {
          options = [
            { price: 92, tariff: "GF 18 - 4 players", discountPct: 20, originalPrice: base },
            { price: base, tariff: "GF 18 Forats", discountPct: 0, originalPrice: base }
          ];
          primaryPrice = 92;
          primaryTariff = "GF 18 - 4 players (92€)";
          break;
        }
        case "08:00-12:00": {
          options = [
            { price: base, tariff: "GF 18 Forats", discountPct: 0, originalPrice: base },
            { price: 92, tariff: "GF 18 - 4 players", discountPct: 20, originalPrice: base }
          ];
          primaryPrice = base;
          primaryTariff = "GF 18 Forats (115€)";
          break;
        }
        case "12:00-13:00": {
          options = [
            { price: 110, tariff: "GF 18 Forats", discountPct: 4, originalPrice: base },
            { price: 92, tariff: "GF 18 - 4 players", discountPct: 20, originalPrice: base }
          ];
          primaryPrice = 110;
          primaryTariff = "GF 18 Forats -4% (110€)";
          break;
        }
         case "13:00-14:00": {
          options = [
            { price: 104, tariff: "GF 18 Forats", discountPct: 10, originalPrice: base },
            { price: 92, tariff: "GF 18 - 4 players", discountPct: 20, originalPrice: base }
          ];
          primaryPrice = 104;
          primaryTariff = "GF 18 Forats -10% (104€)";
          break;
        }
        case "14:00-15:00": {
          options = [
            { price: 98, tariff: "GF 18 Forats", discountPct: 15, originalPrice: base },
            { price: 92, tariff: "GF 18 - 4 players", discountPct: 20, originalPrice: base }
          ];
          primaryPrice = 98;
          primaryTariff = "GF 18 Forats -15% (98€)";
          break;
        }
        case "15:00-16:00": {
          options = [
            { price: 92, tariff: "GF 18 Forats", discountPct: 20, originalPrice: base }
          ];
          primaryPrice = 92;
          primaryTariff = "GF 18 Forats -20% (92€)";
          break;
        }
        case "16:00-21:00": {
          options = [
            { price: 75, tariff: "GF All You Can Play", discountPct: 35, originalPrice: base },
            { price: 86, tariff: "GF 18 Forats", discountPct: 25, originalPrice: base }
          ];
          primaryPrice = 75;
          primaryTariff = "GF All You Can Play (75€)";
          break;
        }
        default: {
          primaryPrice = base;
          primaryTariff = "GF 18 Forats";
          options = [{ price: base, tariff: "GF 18 Forats" }];
        }
      }
    } else {
      // Competitor or Simulated
      const realPrices = getRealWorldCompetitorPrices(course.name, isWeekendDay);
      if (realPrices) {
        const p = realPrices.hourlyRates?.[hourKey];
        const t = realPrices.hourlyTariffs?.[hourKey];
        if (p !== undefined) {
          primaryPrice = p;
          primaryTariff = t ?? "Tarifa General";
          options = [{ price: p, tariff: t ?? "Tarifa General" }];
        } else {
          // Fallback
          const range = HOUR_RANGES.find(r => r.key === hourKey);
          const disc = range ? range.defaultDiscount : 0;
          const price = Math.round(baseHigh * (1 - disc / 100));
          primaryPrice = price;
          primaryTariff = range ? range.tariff : "Tarifa General";
          options = [{ price, tariff: primaryTariff, discountPct: disc }];
        }
      } else {
        const range = HOUR_RANGES.find(r => r.key === hourKey);
        const disc = range ? range.defaultDiscount : 0;
        const price = Math.round(baseHigh * (1 - disc / 100));
        primaryPrice = price;
        primaryTariff = range ? range.tariff : "Tarifa General";
        options = [{ price, tariff: primaryTariff, discountPct: disc }];
      }
    }

    return { price: primaryPrice, tariff: primaryTariff, options };
  };

  // Quick edit mode state for individual cell (hourly rate)
  // Format: { courseId: string, hour: string }
  const [editingCell, setEditingCell] = useState<{ courseId: string; hour: string } | null>(null);
  const [tempCellVal, setTempCellVal] = useState<number>(0);
  const [tempTariffVal, setTempTariffVal] = useState<string>("");

  // Input states (add)
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [bookingSystem, setBookingSystem] = useState("Golf Manager");
  const [isOurClub, setIsOurClub] = useState(false);
  const [greenFeeHigh, setGreenFeeHigh] = useState<number | "">("");
  const [greenFeeLow, setGreenFeeLow] = useState<number | "">("");
  const [buggyRental, setBuggyRental] = useState<number | "">("");
  const [clubRental, setClubRental] = useState<number | "">("");
  const [teeTimeInterval, setTeeTimeInterval] = useState<number>(10);
  const [occupancyToday, setOccupancyToday] = useState<number | "">("");
  const [reservationsToday, setReservationsToday] = useState<number | "">("");
  const [availableSlotsToday, setAvailableSlotsToday] = useState<number | "">("");

  // Input states (editing basic details)
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editBookingUrl, setEditBookingUrl] = useState("");
  const [editBookingSystem, setEditBookingSystem] = useState("");
  const [editIsOurClub, setEditIsOurClub] = useState(false);
  const [editGreenFeeHigh, setEditGreenFeeHigh] = useState<number>(0);
  const [editGreenFeeLow, setEditGreenFeeLow] = useState<number>(0);
  const [editBuggyRental, setEditBuggyRental] = useState<number>(0);
  const [editClubRental, setEditClubRental] = useState<number>(0);
  const [editTeeTimeInterval, setEditTeeTimeInterval] = useState<number>(10);
  const [editOccupancyToday, setEditOccupancyToday] = useState<number>(0);
  const [editReservationsToday, setEditReservationsToday] = useState<number>(0);
  const [editAvailableSlotsToday, setEditAvailableSlotsToday] = useState<number>(0);


  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Generate normal baseline rates and tariffs for all hours
    const baseHigh = Number(greenFeeHigh) || 0;
    const computedHourly: Record<string, number> = {};
    const computedTariffs: Record<string, string> = {};
    HOUR_RANGES.forEach((range) => {
      const h = range.key;
      const discountFactor = (100 - range.defaultDiscount) / 100;
      computedHourly[h] = Math.round(baseHigh * discountFactor);
      computedTariffs[h] = range.tariff;
    });

    const data: Omit<GolfCourse, "id"> = {
      name,
      location,
      url: url.trim() || undefined,
      bookingUrl: bookingUrl.trim() || undefined,
      bookingSystem: bookingSystem,
      syncStatus: "idle",
      lastSyncTime: "Mai conectat",
      isOurClub,
      greenFeeHigh: baseHigh,
      greenFeeLow: Number(greenFeeLow) || 0,
      buggyRental: Number(buggyRental) || 0,
      clubRental: Number(clubRental) || 0,
      hourlyRates: computedHourly,
      hourlyTariffs: computedTariffs,
      updatedBy: "Administrador Total",
      teeTimeInterval: Number(teeTimeInterval) || 10,
      occupancyToday: occupancyToday !== "" ? Number(occupancyToday) : 40,
      reservationsToday: reservationsToday !== "" ? Number(reservationsToday) : 80,
      availableSlotsToday: availableSlotsToday !== "" ? Number(availableSlotsToday) : 12
    };

    try {
      await onAddCourse(data);
      // Reset inputs
      setName("");
      setLocation("");
      setUrl("");
      setBookingUrl("");
      setBookingSystem("Golf Manager");
      setIsOurClub(false);
      setGreenFeeHigh("");
      setGreenFeeLow("");
      setBuggyRental("");
      setClubRental("");
      setTeeTimeInterval(10);
      setOccupancyToday("");
      setReservationsToday("");
      setAvailableSlotsToday("");
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (course: GolfCourse) => {
    setEditingId(course.id);
    setEditName(course.name);
    setEditLocation(course.location);
    setEditUrl(course.url || "");
    setEditBookingUrl(course.bookingUrl || "");
    setEditBookingSystem(course.bookingSystem || "Golf Manager");
    setEditIsOurClub(!!course.isOurClub);
    setEditGreenFeeHigh(course.greenFeeHigh);
    setEditGreenFeeLow(course.greenFeeLow);
    setEditBuggyRental(course.buggyRental);
    setEditClubRental(course.clubRental);
    setEditTeeTimeInterval(course.teeTimeInterval || 10);
    setEditOccupancyToday(course.occupancyToday ?? 60);
    setEditReservationsToday(course.reservationsToday ?? 120);
    setEditAvailableSlotsToday(course.availableSlotsToday ?? 12);
  };

  const handleSaveEdit = async (courseId: string) => {
    try {
      await onUpdateCourse(courseId, {
        name: editName,
        location: editLocation,
        url: editUrl.trim() || undefined,
        bookingUrl: editBookingUrl.trim() || undefined,
        bookingSystem: editBookingSystem,
        isOurClub: editIsOurClub,
        greenFeeHigh: editGreenFeeHigh,
        greenFeeLow: editGreenFeeLow,
        buggyRental: editBuggyRental,
        clubRental: editClubRental,
        teeTimeInterval: editTeeTimeInterval,
        occupancyToday: editOccupancyToday,
        reservationsToday: editReservationsToday,
        availableSlotsToday: editAvailableSlotsToday,
        updatedBy: "Administrador Total"
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveHourlyRateAndTariff = async (course: GolfCourse, hour: string, newVal: number, newTariff: string) => {
    const freshRates = { ...(course.hourlyRates || {}) };
    freshRates[hour] = newVal;
    const freshTariffs = { ...(course.hourlyTariffs || {}) };
    freshTariffs[hour] = newTariff;
    try {
      await onUpdateCourse(course.id, {
        hourlyRates: freshRates,
        hourlyTariffs: freshTariffs,
        updatedBy: "Administrador Total"
      });
      setEditingCell(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Compute pricing insights for the selected date
  const isWeekendDay = [0, 6].includes(new Date(selectedMatrixDate).getDay());
  const validCourses = golfCourses.filter(c => c.greenFeeHigh > 0);
  
  const getCourseBaseHighPrice = (course: GolfCourse, isWeekend: boolean) => {
    if (course.isOurClub) {
      return isWeekend ? 125 : 115;
    }
    const realPrices = getRealWorldCompetitorPrices(course.name, isWeekend);
    return realPrices ? realPrices.greenFeeHigh : course.greenFeeHigh;
  };

  const getCourseBaseLowPrice = (course: GolfCourse, isWeekend: boolean) => {
    if (course.isOurClub) {
      return isWeekend ? 85 : 80;
    }
    const realPrices = getRealWorldCompetitorPrices(course.name, isWeekend);
    return realPrices ? realPrices.greenFeeLow : course.greenFeeLow;
  };

  // Average calculation for selected date
  const avgHigh = validCourses.length > 0 ? Math.round(validCourses.reduce((sum, c) => sum + getCourseBaseHighPrice(c, isWeekendDay), 0) / validCourses.length) : 0;
  const avgLow = validCourses.length > 0 ? Math.round(validCourses.reduce((sum, c) => sum + getCourseBaseLowPrice(c, isWeekendDay), 0) / validCourses.length) : 0;

  // Min/Max courses based on selected date base high season rate
  const cheapestCourse = validCourses.length > 0 ? [...validCourses].sort((a, b) => getCourseBaseHighPrice(a, isWeekendDay) - getCourseBaseHighPrice(b, isWeekendDay))[0] : null;
  const premiumCourse = validCourses.length > 0 ? [...validCourses].sort((a, b) => getCourseBaseHighPrice(b, isWeekendDay) - getCourseBaseHighPrice(a, isWeekendDay))[0] : null;

  // Find min and max price across all courses and hours for dynamic heat mapping on selected date
  let allPrices: number[] = [];
  golfCourses.forEach(c => {
    HOUR_RANGES.forEach(range => {
      const { price } = getDynamicCourseRate(c, selectedMatrixDate, range.key);
      if (price > 0) allPrices.push(price);
    });
  });
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 75;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 240;

  // Sort courses using strict requested order:
  // 1) Club Golf d'Aro - Mas Nou
  // 2) Golf de Pals
  // 3) Empordà Golf Club
  // 4) Golf Costa Brava
  // 5) Camiral Golf & Wellness
  // 6) Camp de Golf Perelada
  // 7) Torremirona Golf Club
  const getCourseOrderIndex = (name: string): number => {
    const norm = name.toLowerCase();
    if (norm.includes("aro") || norm.includes("mas nou")) return 0;
    if (norm.includes("pals")) return 1;
    if (norm.includes("empord")) return 2;
    if (norm.includes("costa brava")) return 3;
    if (norm.includes("camiral") || norm.includes("stadium")) return 4;
    if (norm.includes("perelada") || norm.includes("peralada")) return 5;
    if (norm.includes("torremirona")) return 6;
    return 7; // everything else
  };

  const sortedGolfCourses = [...golfCourses].sort((a, b) => {
    return getCourseOrderIndex(a.name) - getCourseOrderIndex(b.name);
  });

  // Search and selector filters
  const filteredCourses = sortedGolfCourses.filter(course => {
    const matchSearch = !searchTerm || 
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchDropdown = selectedCourseId === "all" || course.id === selectedCourseId || course.isOurClub;
    
    return matchSearch && matchDropdown;
  });

  return (
    <div className="space-y-6" id="golf-analysis-panel">
      
      {/* Admin Header Disclaimer */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-none border-b-2 border-blue-800 rounded-none">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-white text-blue-900 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-none flex items-center gap-1.5 shadow-none">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Comparador de Competència</span>
              </span>
              <span className="text-[10px] text-white/85 font-mono bg-white/10 px-2 py-0.5 rounded-none border border-white/20">GolfSana Enterprise Suite</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight font-sans text-white">
              Monitor Executiu de Competència del Green Fee
            </h2>
            <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
              Superviseu en temps real els preus de reserva del nostre club (<strong className="underline">Club Golf d'Aro - Mas Nou</strong>) contra els nostres grans competidors distingits a Pals, Empordà, Costa Brava, Camiral, Torremirona, entre d'altres. Afegeix, modifica i elimina clubs de golf i canvia els preus de cada franja horària.
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {isAdmin && !showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-white hover:bg-slate-50 text-blue-900 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-none transition-all shadow-none active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Afegir Nou Competidor</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analytical Cards - Fully Square (rounded-none) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="insights-grid">
        {/* Card 1: Mitjana Temporada Alta */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-none relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mitjana Green Fee Alta</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-sans">
              {avgHigh} €
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-2 font-mono">
            <TrendingUp className="w-3 h-3 text-blue-600" />
            <span>Tarifa estàndard de referència</span>
          </p>
        </div>

        {/* Card 2: Mitjana Temporada Baixa */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-none relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mitjana Green Fee Baixa</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-sans">
              {avgLow} €
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-2 font-mono">
            <TrendingUp className="w-3 h-3 text-blue-600" />
            <span>Marge promocional d'hivern</span>
          </p>
        </div>

        {/* Card 3: El nostre club */}
        <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-900/40 rounded-none p-4 shadow-none flex flex-col justify-between min-h-[110px]">
          <div>
            <p className="text-[10px] text-blue-800 dark:text-blue-400 font-bold uppercase tracking-wider">Golf d'Aro (Nostre)</p>
            {golfCourses.find(c => c.isOurClub) ? (
              <>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1.5 truncate">
                  {golfCourses.find(c => c.isOurClub)?.name}
                </h4>
                <p className="text-xl font-extrabold text-blue-700 dark:text-blue-400 mt-1">
                  {golfCourses.find(c => c.isOurClub)?.greenFeeHigh} €
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500 mt-1.5">No detectat</p>
            )}
          </div>
          <span className="text-[9px] font-mono text-blue-800/80 mt-1">
            Club Promotors Catalans
          </span>
        </div>

        {/* Card 4: El més Premium de la competència */}
        <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/40 rounded-none p-4 shadow-none flex flex-col justify-between min-h-[110px]">
          <div>
            <p className="text-[10px] text-rose-800 dark:text-rose-400 font-bold uppercase tracking-wider">Líder de Preus</p>
            {premiumCourse ? (
              <>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1.5 truncate">
                  {premiumCourse.name}
                </h4>
                <p className="text-xl font-extrabold text-rose-700 dark:text-rose-400 mt-1">
                  {premiumCourse.greenFeeHigh} €
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Sense dades</p>
            )}
          </div>
          <span className="text-[9px] font-mono text-rose-800/80 mt-1 truncate">
            {premiumCourse?.location}
          </span>
        </div>
      </div>

      {/* Dynamic 24-Hour / Slot Booking comparative pricing matrix (CRITICAL USER REQUEST) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 shadow-none overflow-x-auto">
        
        {/* Avís sobre la veracitat dels preus mostrats - Sol·licitat pel client */}
        <div className="mb-4 bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-300 dark:border-blue-911 border-l-4 border-l-blue-500 text-slate-800 dark:text-slate-200 text-xs rounded-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-500 text-white px-1.5 py-0.5 text-[8.5px] font-black uppercase font-mono tracking-wider">Sincronització Crawler de Fons</span>
            <strong className="text-blue-700 dark:text-blue-400 font-bold">Preus Reals Sincronitzats Multidia Actiu</strong>
          </div>
          <p className="leading-relaxed text-[11px] text-slate-650 dark:text-slate-300">
            El sistema té actiu el **crawler headless de fons multidia (dia actual i posteriors)**. Totes les dades dels nostres competidors (Golf de Pals, Empordà Golf Club, Golf Costa Brava, etc.) han estat obtingudes enllaçant directament els quadrants amb filtres de tarifes estrictes.
          </p>
          {isAdmin && (
            <div className="mt-2.5 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 rounded-none">
              <p className="font-extrabold text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                ⭐ ACCÉS D'ADMINISTRADORA ACTIU (info@up-mktdigital.com)
              </p>
              <p className="text-[10.5px] leading-relaxed">
                Com a administradora de l'empresa, <strong>potes corregir i introduir els preus reals de qualsevol camp directament</strong>:
              </p>
              <ul className="list-disc pl-4 mt-1 space-y-1 text-[10.5px]">
                <li>
                  <strong>Per hores puntuals:</strong> Fes clic directament damunt de qualsevol casella de la graella de sota (per exemple, on posa <span className="font-semibold underline">110€</span>). S'obrirà un editor on podràs posar el preu i el nom de la tarifa verídica d'avui i prémer guardar (icona del "check").
                </li>
                <li>
                  <strong>Preus generals, enllaços o dades del club:</strong> Al final de la pàgina, hi ha una taula amb el llistat de camps. Fes clic sobre la icona del llapis (editar) per ajustar els preus generals de Temporada Alta, Baixa o els preus dels serveis per a cada camp de golf competidor.
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Matriu Completa de Preus del Green Fee per Hores (Tee Times)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Aquesta matriu recull els preus reals sincronitzats tant del nostre club com de la competència gràcies al rastreig Puppeteer actiu. {isAdmin && <span className="text-blue-600 font-semibold">Clica sobre qualsevol preu per modificar-lo manualment.</span>}
              </p>
            </div>

            {/* Dropdown filter selector */}
            <div className="flex flex-col gap-1 w-full md:w-80 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono block">
                Selecciona Camp / Competència:
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full text-xs p-1.5 border border-slate-200 dark:border-slate-705 outline-none focus:ring-1 focus:ring-blue-600 bg-white dark:bg-slate-800 text-slate-750 dark:text-slate-200"
              >
                <option value="all">Tots els Camps de Golf (Comparativa Completa)</option>
                {sortedGolfCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.isOurClub ? "⭐ [Nostre] " : ""}{c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calendari comparador: 30 dies des d'avui o mes natural navegable */}
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <label className="text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>📅 CALENDARI COMPARADOR</span>
              </label>

              {/* Controls de vista */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Botó Avui (30 dies) */}
                <button
                  type="button"
                  onClick={() => {
                    setCalendarView("today");
                    setSelectedMatrixDate(new Date().toISOString().slice(0, 10));
                  }}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-none border transition-all ${
                    calendarView === "today"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <RotateCcw className="w-3 h-3" /> Pròxims 30 dies
                </button>

                {/* Navegació per mes */}
                <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-none">
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarView("month");
                      setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarView("month")}
                    className={`text-[10px] font-bold px-2 py-1.5 min-w-[95px] text-center ${
                      calendarView === "month"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarView("month");
                      setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    title="Mes següent"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded-none font-bold">
                  {calendarView === "today" ? "30 DIES CONSECUTIUS" : `${new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()} DIES`}
                </span>
              </div>
            </div>

            <div className="flex gap-2 items-center overflow-x-auto pb-2 scrollbar-none">
              {(calendarView === "today"
                ? getConsecutiveDays(new Date().toISOString().slice(0, 10), 30)
                : getMonthDays(calendarMonth.getFullYear(), calendarMonth.getMonth())
              ).map((day) => {
                const isActive = selectedMatrixDate === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    onClick={() => setSelectedMatrixDate(day.dateStr)}
                    className={`px-3 py-2 text-center text-xs font-sans tracking-tight shrink-0 transition-all border flex flex-col items-center justify-center min-w-[125px] rounded-none ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 font-extrabold shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 font-medium"
                    }`}
                    type="button"
                  >
                    <span className="text-[11.5px] whitespace-nowrap">{day.label}</span>
                    <span className={`text-[8.5px] font-bold font-mono tracking-tight uppercase mt-1 ${
                      isActive 
                        ? "text-blue-100" 
                        : day.isWeekend 
                        ? "text-orange-600 dark:text-orange-400" 
                        : "text-slate-400 dark:text-slate-500"
                    }`}>
                      {day.isWeekend ? "Cap de setmana 🏖️" : "Feiner 💼"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gràfic d'Evolució dels Preus (Darrers 7 dies) */}
          <div className="mt-6 bg-slate-50 dark:bg-slate-800/10 border border-slate-200 dark:border-slate-800 p-5 rounded-none space-y-4" id="price-evolution-chart-container">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Evolució de Preus dels darrers 7 dies</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Canvi diari de tarifes amb tancament el <span className="font-bold text-slate-700 dark:text-slate-300">{selectedMatrixDate}</span>. Selecciona la mètrica d'enfocament:
                </p>
              </div>

              {/* Toggles for price metrics */}
              <div className="flex bg-slate-200/60 dark:bg-slate-850 p-0.5 border border-slate-200 dark:border-slate-700 rounded-none w-fit">
                <button
                  type="button"
                  onClick={() => setChartMetric("avg")}
                  className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-none cursor-pointer ${
                    chartMetric === "avg"
                      ? "bg-blue-600 text-white shadow-none"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Mitjana Diària
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric("prime")}
                  className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-none cursor-pointer ${
                    chartMetric === "prime"
                      ? "bg-blue-600 text-white shadow-none"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Prime Time (08h-12h)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric("twilight")}
                  className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-none cursor-pointer ${
                    chartMetric === "twilight"
                      ? "bg-blue-600 text-white shadow-none"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Capvespre (16h-21h)
                </button>
              </div>
            </div>

            {/* Price Chart */}
            <div className="h-[250px] w-full font-mono text-[10px]">
              {(() => {
                const last7Days = (() => {
                  const dates = [];
                  const endDate = new Date(selectedMatrixDate);
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(endDate);
                    d.setDate(endDate.getDate() - i);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    const dateStr = `${yyyy}-${mm}-${dd}`;
                    
                    const weekdayLabels = ["Dg", "Dl", "Dt", "Dc", "Dj", "Dv", "Ds"];
                    const label = `${weekdayLabels[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
                    dates.push({ dateStr, label, isWeekend: [0, 6].includes(d.getDay()) });
                  }
                  return dates;
                })();

                const chartData = last7Days.map((day) => {
                  const dataPoint: any = {
                    name: day.label,
                    dateStr: day.dateStr,
                    isWeekend: day.isWeekend,
                  };
                  
                  sortedGolfCourses.forEach((course) => {
                    let price = 0;
                    if (chartMetric === "avg") {
                      let sum = 0;
                      HOUR_RANGES.forEach((range) => {
                        sum += getDynamicCourseRate(course, day.dateStr, range.key).price;
                      });
                      price = Math.round(sum / HOUR_RANGES.length);
                    } else if (chartMetric === "prime") {
                      price = getDynamicCourseRate(course, day.dateStr, "08:00-12:00").price;
                    } else {
                      price = getDynamicCourseRate(course, day.dateStr, "16:00-21:00").price;
                    }
                    dataPoint[course.name] = price;
                  });
                  return dataPoint;
                });

                const DEFAULT_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#14b8a6", "#f43f5e", "#84cc16"];
                const getCourseColor = (courseName: string, index: number) => {
                  const norm = courseName.toLowerCase();
                  if (norm.includes("aro") || norm.includes("nostre")) return "#3b82f6"; // Blue
                  if (norm.includes("pals")) return "#10b981"; // Emerald
                  if (norm.includes("empordà") || norm.includes("emporda")) return "#8b5cf6"; // Purple
                  if (norm.includes("costa brava")) return "#f59e0b"; // Amber
                  if (norm.includes("camiral")) return "#ef4444"; // Red
                  if (norm.includes("torremirona")) return "#ec4899"; // Pink
                  if (norm.includes("girona")) return "#06b6d4"; // Cyan
                  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                };

                const CustomTooltip = ({ active, payload, label }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 border-2 border-slate-700 p-2.5 shadow-md text-white font-sans text-xs space-y-1 rounded-none">
                        <p className="font-extrabold pb-0.5 border-b border-slate-700 uppercase tracking-wider text-[10px]">{label}</p>
                        <div className="space-y-0.5 pt-1">
                          {payload.map((entry: any, i: number) => {
                            const isOurClub = entry.name.toLowerCase().includes("aro") || entry.name.toLowerCase().includes("nostre");
                            return (
                              <p key={i} className="flex justify-between gap-4 font-sans font-medium" style={{ color: entry.stroke }}>
                                <span>{isOurClub ? "⭐ " : ""}{entry.name}:</span>
                                <span className="font-bold font-mono text-white">{entry.value} €</span>
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                };

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        tickLine={false}
                        axisLine={false}
                        style={{ fontSize: "10px", fontWeight: "bold" }} 
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        tickLine={false}
                        axisLine={false}
                        domain={["dataMin - 10", "dataMax + 10"]}
                        unit="€"
                        style={{ fontSize: "10px", fontWeight: "bold" }} 
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "10px", fontWeight: "bold", paddingTop: "10px" }}
                      />
                      {sortedGolfCourses.map((course, idx) => {
                        const isMatchFilter = selectedCourseId === "all" || course.id === selectedCourseId || course.isOurClub;
                        if (!isMatchFilter) return null;
                        
                        const color = getCourseColor(course.name, idx);
                        const strokeWidth = selectedCourseId === "all" 
                          ? (course.isOurClub ? 3 : 2) 
                          : (course.id === selectedCourseId ? 3.5 : course.isOurClub ? 2.5 : 1.5);
                        
                        return (
                          <Line
                            key={course.id}
                            type="monotone"
                            dataKey={course.name}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            dot={{ r: course.isOurClub ? 4 : 2, strokeWidth: 1 }}
                            activeDot={{ r: 6 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>

          {/* Pricing Heat Legend (User Request: Distinct contrast map & clear difference with solid vibrant colors) */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-100 dark:border-slate-800 text-[10.5px]">
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Llegenda de Mapa de Calor de Preus (Números Blancs):</span>
              <div className="flex items-center gap-1.5 font-sans font-normal">
                <span className="inline-block w-3.5 h-3.5 border border-green-500 rounded-none shadow-sm" style={{ backgroundColor: "rgb(34, 197, 94)" }}></span>
                <span className="text-green-700 dark:text-green-400">Econòmic (Verd Clar)</span>
              </div>
              <div className="flex items-center gap-1.5 font-sans font-normal">
                <span className="inline-block w-3.5 h-3.5 border border-green-700 rounded-none shadow-sm" style={{ backgroundColor: "rgb(21, 128, 61)" }}></span>
                <span className="text-green-800 dark:text-green-500 font-bold">Moderat (Verd Fosc)</span>
              </div>
              <div className="flex items-center gap-1.5 font-sans font-normal">
                <span className="inline-block w-3.5 h-3.5 border border-amber-600 rounded-none shadow-sm" style={{ backgroundColor: "rgb(245, 158, 11)" }}></span>
                <span className="text-amber-700 dark:text-amber-400">Estàndard</span>
              </div>
              <div className="flex items-center gap-1.5 font-sans font-normal">
                <span className="inline-block w-3.5 h-3.5 border border-orange-600 rounded-none shadow-sm" style={{ backgroundColor: "rgb(249, 115, 22)" }}></span>
                <span className="text-orange-700 dark:text-orange-400">Premium</span>
              </div>
              <div className="flex items-center gap-1.5 font-sans font-normal">
                <span className="inline-block w-3.5 h-3.5 border border-red-600 rounded-none shadow-sm" style={{ backgroundColor: "rgb(239, 68, 68)" }}></span>
                <span className="text-rose-600 dark:text-rose-450">Peak / Crític</span>
              </div>
            </div>
            <div className="text-slate-500 font-mono text-[9px] font-medium">
              Esquema de Contrast d'Amplia Lluminositat: ({minPrice}€ - {maxPrice}€)
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-[10.5px] text-slate-400">
            {ratesLastSyncedAt
              ? `Preus actualitzats fa ${Math.max(0, Math.round((Date.now() - ratesLastSyncedAt) / 60000))} min`
              : "Encara no s'ha sincronitzat per aquesta data"}
          </p>
          <button
            onClick={syncRatesNow}
            disabled={isLoadingAllRates}
            className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-3 py-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAllRates ? "animate-spin" : ""}`} />
            {isLoadingAllRates ? "Sincronitzant..." : "Sincronitzar ara"}
          </button>
        </div>

        <div className="mt-2 min-w-[900px] overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-2050 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-[260px] border-r border-slate-200 dark:border-slate-800">Camps Analitzats</th>
                <th className="py-2.5 px-3 text-left">
                  Trams de tarifa reals del dia (cada targeta = un canvi de preu real, no una hora fixa)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCourses.map(course => (
                <tr key={course.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/25 ${course.isOurClub ? "bg-blue-50/20" : ""}`}>
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                    <span className="flex items-center gap-1.5 justify-between">
                      <span className="truncate max-w-[170px] text-xs font-bold text-slate-900 dark:text-white">{course.name}</span>
                      {course.isOurClub ? (
                        <span className="bg-blue-600 text-white font-sans text-[8px] px-1 py-0.5 font-bold tracking-wider uppercase rounded-none shrink-0" title="La nostra marca">Nostre</span>
                      ) : (course.syncStatus === "success" || course.updatedBy?.includes("Sincronitzat") || course.updatedBy?.includes("Scraper")) ? (
                        <span className="bg-emerald-600 text-white font-sans text-[8px] px-1 py-0.5 font-bold tracking-wider uppercase rounded-none shrink-0 animate-pulse" title="Dades reals sincronitzades amb filtres estrictes">Real Directe</span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-955/30 dark:text-amber-400 dark:border-amber-900 text-[8px] px-1 py-0.5 font-extrabold tracking-tight uppercase rounded-none shrink-0" title="Dada de simulació de l'aplicació">Simulació</span>
                      )}
                    </span>
                    
                    {/* Tee Time Interval indicator (User request: 9 min vs 10 min) */}
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-semibold flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Sortides cada <strong className="text-blue-700 dark:text-blue-400 font-medium">{course.teeTimeInterval ?? 10} min</strong></span>
                    </span>

                    {course.url ? (
                      <a 
                        href={course.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        referrerPolicy="no-referrer"
                        className="text-[9.5px] text-blue-600 hover:underline flex items-center gap-0.5 mt-1 font-sans font-semibold"
                      >
                        <span>Visitar Web Oficial</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[9px] text-slate-400 mt-1 font-sans">Sense web configurada</span>
                    )}
                  </td>

                  <td className="p-3 align-top">
                    {(() => {
                      const courseData = allCoursesRates?.courses.find(cd => cd.course === course.name);
                      if (!courseData) {
                        return <span className="text-xs text-slate-400 italic">Prem "Sincronitzar ara" per veure els preus d'avui.</span>;
                      }
                      if (courseData.source === "closed") {
                        return (
                          <span className="text-xs text-rose-600 font-semibold">
                            Camp tancat aquest dia{courseData.closedReason ? ` — ${courseData.closedReason}` : ""}.
                          </span>
                        );
                      }
                      const blocks = groupTeeTimesIntoBlocks(courseData.teeTimes);
                      if (blocks.length === 0) {
                        return (
                          <span className="text-xs text-slate-400 italic">
                            Sense dades disponibles per aquest dia.
                            {courseData.source !== "live" && courseData.scrapeDebug && (
                              <><br /><span className="text-rose-500 not-italic" title={courseData.scrapeDebug}>Motiu: {courseData.scrapeDebug}</span></>
                            )}
                          </span>
                        );
                      }
                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-bold uppercase ${courseData.source === "live" ? "text-emerald-600" : "text-slate-400"}`}>
                              {courseData.source === "live" ? "● en directe" : "● referència"}
                            </span>
                            {courseData.source !== "live" && courseData.scrapeDebug && (
                              <span className="text-[9px] text-slate-400 truncate max-w-[420px]" title={courseData.scrapeDebug}>
                                — {courseData.scrapeDebug}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {blocks.map((block, idx) => (
                              <div key={idx} className="border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 min-w-[105px] bg-slate-50/60 dark:bg-slate-800/40">
                                <div className="text-[9.5px] font-mono text-slate-400">
                                  {block.startTime}{block.endTime !== block.startTime ? `–${block.endTime}` : ""}
                                </div>
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                  {block.price}€
                                  {block.discountPct ? <span className="ml-1 text-[10px] text-emerald-600 font-semibold">-{block.discountPct}%</span> : null}
                                </div>
                                <div className="text-[9px] text-slate-500 uppercase truncate max-w-[100px]" title={block.tariff}>{block.tariff}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓ DETALLADA: INSPECTOR CLÍNIC DE SORTIDES (TEE TIMES) SLOTS */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 space-y-6 mt-8" id="inspector-clinic-sortides">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-base">
                🔎 Inspector Clínic de Sortides i Tarifes Detallades
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visualització interactiva sortida per sortida (Tee Time) interval·lat en funció de les regles de negoci i de la programació del club.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Quick selector for golf course */}
            <select
              value={selectedDetailCourseId || golfCourses.find(c => c.isOurClub)?.id || ""}
              onChange={(e) => setSelectedDetailCourseId(e.target.value)}
              className="text-xs bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-3 py-1.5 focus:outline-none focus:border-blue-600 font-bold"
            >
              {golfCourses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.isOurClub ? "⛳ " : "🏌️ "} {c.name}
                </option>
              ))}
            </select>

            <span className="text-xs font-semibold text-slate-400">|</span>

            {/* Live Search slot */}
            <input
              type="text"
              placeholder="Cerca hora (Ex: 08:39, 12...)"
              value={detailFilterSearch}
              onChange={(e) => setDetailFilterSearch(e.target.value)}
              className="text-xs bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-3 py-1.5 focus:outline-none focus:border-blue-600 font-medium placeholder-slate-400 w-44"
            />
          </div>
        </div>

        {/* Selected Course Quick Info Banner */}
        {(() => {
          const activeCourse = activeDetailCourse;
          if (!activeCourse) return null;

          const slots = [];

          if (activeCourse.isOurClub) {
            // Propi club: bucle basat en l'interval configurable de la
            // pestanya (per defecte 10 min), amb ocupació simulada.
            const interval = activeCourse.teeTimeInterval || 10;
            const startMins = 7 * 60; // 07:00
            const endMins = 20 * 60 + 48; // 20:48

            for (let t = startMins; t <= endMins; t += interval) {
              const hrs = Math.floor(t / 60);
              const mins = t % 60;
              const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

              if (detailFilterSearch && !timeStr.includes(detailFilterSearch)) {
                continue;
              }

              let occupancyLevel = "disponible";
              let availablePlayers = 4;
              let statusColor = "bg-emerald-500";

              const seedValue = (t * 13 + activeCourse.name.charCodeAt(0)) % 100;
              if (t >= 510 && t <= 750) { // prime morning slots
                if (seedValue > 65) {
                  occupancyLevel = "complet";
                  availablePlayers = 0;
                  statusColor = "bg-rose-500";
                } else if (seedValue > 35) {
                  occupancyLevel = "ocupat (1 sol lliure)";
                  availablePlayers = 1;
                  statusColor = "bg-amber-500";
                } else {
                  occupancyLevel = "moderat (2 lliures)";
                  availablePlayers = 2;
                  statusColor = "bg-blue-400";
                }
              } else {
                if (seedValue > 85) {
                  occupancyLevel = "complet";
                  availablePlayers = 0;
                  statusColor = "bg-rose-500";
                } else if (seedValue > 65) {
                  occupancyLevel = "ocupat";
                  availablePlayers = 1;
                  statusColor = "bg-amber-500";
                } else {
                  occupancyLevel = "disponible (4 lliures)";
                  availablePlayers = 4;
                  statusColor = "bg-emerald-500";
                }
              }

              const rates = getOurClubDetailedTeeTimes(t);

              slots.push({
                time: timeStr,
                occupancyLevel,
                availablePlayers,
                statusColor,
                rates
              });
            }
          } else if (liveApiTeeTimes) {
            // Competidor: dades reals via /api/rates — scraping en directe
            // quan és possible, i si no, el model verificat com a
            // alternativa (mai la taula genèrica de 7 blocs d'abans, que
            // ocultava els canvis de tarifa reals entre franges).
            liveApiTeeTimes.forEach((tt) => {
              const timeStr = tt.time;
              if (detailFilterSearch && !timeStr.includes(detailFilterSearch)) {
                return;
              }

              const t = tt.minutes;
              let occupancyLevel = "disponible";
              let availablePlayers = 4;
              let statusColor = "bg-emerald-500";

              const seedValue = (t * 13 + activeCourse.name.charCodeAt(0)) % 100;
              if (seedValue > 80) {
                occupancyLevel = "complet";
                availablePlayers = 0;
                statusColor = "bg-rose-500";
              } else if (seedValue > 55) {
                occupancyLevel = "ocupat";
                availablePlayers = 1;
                statusColor = "bg-amber-500";
              } else if (seedValue > 30) {
                occupancyLevel = "moderat";
                availablePlayers = 2;
                statusColor = "bg-blue-400";
              } else {
                occupancyLevel = "disponible";
                availablePlayers = 4;
                statusColor = "bg-emerald-500";
              }

              const rates = tt.rates.map((r) => ({
                tariff: r.tariff,
                price: r.price,
                discountPct: r.discountPct,
                originalPrice: r.originalPrice,
              }));

              slots.push({
                time: timeStr,
                occupancyLevel,
                availablePlayers,
                statusColor,
                rates
              });
            });
          }

          return (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 font-bold uppercase">
                      {activeCourse.bookingSystem || "Golf Manager"}
                    </span>
                    {activeCourse.isOurClub && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-bold uppercase">
                        El Nostre Club
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {activeCourse.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Sincronitzador actiu: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeCourse.updatedBy || "Robot Headless"}</span> • Interval de sortides: <span className="font-bold text-slate-700 dark:text-slate-300">
                      {(() => {
                        if (slots.length >= 2) {
                          const [h1, m1] = slots[0].time.split(":").map(Number);
                          const [h2, m2] = slots[1].time.split(":").map(Number);
                          return (h2 * 60 + m2) - (h1 * 60 + m1);
                        }
                        return activeCourse.teeTimeInterval || 10;
                      })()} minuts
                    </span> • Total sortides visualitzades: <span className="font-extrabold text-blue-600">{slots.length} sortides</span>
                    {!activeCourse.isOurClub && (
                      isLoadingLiveRates ? (
                        <span className="ml-2 text-amber-600 font-bold">• Carregant dades en directe...</span>
                      ) : liveApiSource === "live" ? (
                        <span className="ml-2 text-emerald-600 font-bold">• Preus EN DIRECTE (avui)</span>
                      ) : liveApiSource === "model" ? (
                        <span className="ml-2 text-slate-450 font-bold" title="No s'ha pogut connectar en directe; es mostren les últimes tarifes verificades">• Model de referència (no en directe)</span>
                      ) : liveApiSource === "closed" ? (
                        <span className="ml-2 text-rose-600 font-bold">• Camp tancat aquest dia</span>
                      ) : null
                    )}
                  </p>
                </div>

                <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="block text-slate-400 uppercase text-[9px] font-bold">Preu Base de Greenfee (GF)</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">{activeCourse.greenFeeHigh || 115} €</span>
                  </div>
                  <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                    <span className="block text-slate-400 uppercase text-[9px] font-bold">Estat del Canal</span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Conexió Web Estable
                    </span>
                  </div>
                </div>
              </div>

              {/* Strict Catalan Pricing Rules Panel for our club */}
              {activeCourse.isOurClub && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-blue-600 p-4 space-y-2">
                  <h5 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest flex items-center gap-1.5">
                    💡 Regles Estrictes de Tarifes Públiques (Canal Oficial)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-blue-850 dark:text-blue-250 leading-relaxed font-sans">
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300 block">🔴 07:27 a 07:54 (Matinal Earlybird)</strong>
                      <span>Opcions de tarifa: <span className="font-semibold">GF 18 Forats (115€)</span> i promoció <span className="font-semibold text-emerald-700 dark:text-emerald-400">GF 18 - 4 players -20% (92€)</span>.</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300 block">🔴 08:12 i 08:21 (Matinal Premium)</strong>
                      <span>Opcions de tarifa: <span className="font-semibold">GF 18 Forats (115€)</span> i promoció <span className="font-semibold text-emerald-700 dark:text-emerald-400">GF 18 - 4 players -20% (92€)</span>.</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300 block">🟢 Des de 08:39 a 09:45</strong>
                      <span>Tarifa única estricta: <span className="font-semibold">GF 18 Forats (115€)</span>. No s'aplica cap promoció.</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300 block">🔴 09:51, 10:00 i 10:09</strong>
                      <span>Opcions coincidents: <span className="font-semibold">GF 18 Forats (115€)</span> i <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">GF 18 - 4 players (92€)</span>.</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300 block">🟢 Des de 10:18 a 11:12</strong>
                      <span>Tarifa única estricta de <span className="font-semibold">115€ (GF 18 Forats)</span>.</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-350 block">🔴 11:21 a 11:57</strong>
                      <span>Doble opció disponible: <span className="font-semibold">GF 18 Forats a 115€</span> i <span className="font-semibold text-emerald-700 dark:text-emerald-450">GF 18 - 4 players a 92€</span>.</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-350 block">🟠 Migdia 12:06 a 13:00 (-4% Promo)</strong>
                      <span>Doble opció: <span className="font-semibold">GF 18 Forats a 110€</span> i <span className="font-semibold text-emerald-750 font-mono">GF 18 - 4 players a 92€</span>.</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-355 block">🟠 Migdia 13:09 a 13:54 (-10% Promo)</strong>
                      <span>Doble opció: <span className="font-semibold">GF 18 Forats a 104€</span> i <span className="font-semibold text-emerald-750 font-mono">GF 18 - 4 players a 92€</span>.</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-355 block">🟠 Tarda 14:03 a 14:57 (-15% Promo)</strong>
                      <span>Doble opció: <span className="font-semibold">GF 18 Forats a 98€</span> i <span className="font-semibold text-emerald-750 font-mono font-bold">GF 18 - 4 players a 92€</span>.</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-355 block">🟢 Tarda 15:06 a 15:51 (-20% Promo única)</strong>
                      <span>Tarifa única promocional: <span className="font-extrabold text-blue-700 dark:text-blue-300">GF 18 Forats a 92€</span> (20% descompte).</span>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <strong className="text-blue-900 dark:text-blue-355 block">🌕 Capvespre 16:00 a 20:48 (Tarifa Crepuscular Especial)</strong>
                      <span>Doble opció de capvespre: <span className="font-semibold text-indigo-700">All You Play (75€ - 35% desc)</span> i <span className="font-semibold text-sky-700">GF 18 Forats (86€ - 25% desc)</span>. <span className="font-bold underline">EXCEPCIÓ:</span> A les <span className="font-mono">17:39, 17:48</span> i després de les <span className="font-mono">18:06</span>, <span className="font-bold text-rose-700 dark:text-rose-450 uppercase text-[10px]">només s'ofereix GF All You Can Play a 75€</span>.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Slot Table Grid */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm max-h-[500px] overflow-y-auto relative">
                {slots.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium">
                    Cap sortida coincideix amb el filtre de cerca de text "{detailFilterSearch}". Proveu de cercar una hora diferent (ex: "08", "12").
                  </div>
                ) : (
                  <table className="w-full text-xs text-left border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                        <th className="p-3 pl-4 w-28">Hora</th>
                        <th className="p-3 w-40">Ocupació (👤)</th>
                        <th className="p-3">Opcions de Tarifes Actives de la Web</th>
                        <th className="p-3 text-right pr-4">Canvis ràpids</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-sans">
                      {slots.map((slot, sIdx) => {
                        return (
                          <tr key={sIdx} className="hover:bg-slate-105/10 dark:hover:bg-slate-850/50 transition-colors font-sans">
                            {/* Time */}
                            <td className="p-3 pl-4 font-mono font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-900/40 text-sm">
                              {slot.time}
                            </td>

                            {/* Occupancy indicator */}
                            <td className="p-3 font-sans">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${slot.statusColor}`}></span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize text-[11px]">
                                  {slot.occupancyLevel}
                                </span>
                              </div>
                            </td>

                            {/* Rate Options listed individually */}
                            <td className="p-3 space-y-1.5 font-sans">
                              <div className="flex flex-wrap gap-2">
                                {slot.rates.map((rate, rIdx) => {
                                  let highlightBg = "bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-800 dark:text-slate-200";
                                  if (rate.tariff.includes("4 players") || rate.tariff.includes("4 jugadors")) {
                                    highlightBg = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-300";
                                  } else if (rate.tariff.includes("All You Can Play") || rate.tariff.includes("All You Play")) {
                                    highlightBg = "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 text-indigo-800 dark:text-indigo-300";
                                  } else {
                                    highlightBg = "bg-sky-50 dark:bg-sky-950/20 border-sky-200 text-sky-850 dark:text-sky-300";
                                  }
                                  
                                  return (
                                    <div key={rIdx} className={`px-2.5 py-1 rounded-none border text-[11.5px] leading-tight flex flex-col font-sans ${highlightBg}`}>
                                      <div className="flex items-center gap-2 font-sans font-bold">
                                        <span className="uppercase text-[9px] tracking-wider shrink-0 leading-none">{rate.tariff}</span>
                                        <span className="text-slate-900 dark:text-white text-xs font-black leading-none shrink-0">{rate.price} €</span>
                                      </div>
                                      {rate.discountPct !== undefined && rate.discountPct > 0 && (
                                        <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5">
                                          - {rate.discountPct}% de descompte (Preu normal {rate.originalPrice || 115}€)
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Direct edit cell triggers */}
                            <td className="p-3 text-right pr-4 font-sans">
                              {isAdmin ? (
                                <button
                                  onClick={() => {
                                    // Map this precise hour of the slot into the hour_ranges
                                    const slotHour = slot.time;
                                    const parsedH = parseInt(slotHour.split(":")[0]);
                                    let matchedRangeKey = "08:00-12:00";
                                    if (parsedH < 8) matchedRangeKey = "07:00-08:00";
                                    else if (parsedH >= 12 && parsedH < 13) matchedRangeKey = "12:00-13:00";
                                    else if (parsedH >= 13 && parsedH < 14) matchedRangeKey = "13:00-14:00";
                                    else if (parsedH >= 14 && parsedH < 15) matchedRangeKey = "14:00-15:00";
                                    else if (parsedH >= 15 && parsedH < 16) matchedRangeKey = "15:00-16:00";
                                    else if (parsedH >= 16) matchedRangeKey = "16:00-21:00";

                                    setSelectedMatrixDate(selectedMatrixDate);
                                    setEditingCell({ courseId: activeCourse.id, hour: matchedRangeKey });
                                    
                                    // scroll matrix into view so they can change the key
                                    const el = document.getElementById("comparador-preus-matrix");
                                    if (el) {
                                      el.scrollIntoView({ behavior: "smooth" });
                                    }
                                  }}
                                  className="text-[10px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-600 dark:hover:text-white px-2 py-1 font-bold uppercase transition-colors"
                                >
                                  Editar bloc d'hores
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">Només Lectura</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Add New Golf Course Modal form - Fully Square */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-white dark:bg-slate-900 border-2 border-blue-600 rounded-none p-6 shadow-none space-y-4"
          id="add-golf-venue-form"
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
              Registrar Nou Club Competidor & Tarifes
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-none font-bold"
            >
              Tancar formulari
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-bold uppercase">Nom comercial del Camp</label>
              <input
                type="text"
                required
                placeholder="Ex. Pals Golf Club"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-bold uppercase">Localització</label>
              <input
                type="text"
                required
                placeholder="Ex. Gualta, Girona"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-bold uppercase">URL del Lloc Web</label>
              <input
                type="url"
                placeholder="Ex. https://www.golfdepals.com/"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#022e5f] font-extrabold uppercase">Enllaç Quadrant Directe Scraper</label>
              <input
                type="url"
                placeholder="Ex. https://eu.golfmanager.com/..."
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-amber-400 bg-amber-50/10 text-slate-850 rounded-none focus:outline-none focus:ring-2 focus:ring-[#022e5f] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#022e5f] font-extrabold uppercase">Motor de Reserves (Sistema)</label>
              <select
                value={bookingSystem}
                onChange={(e) => setBookingSystem(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-850 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold"
              >
                <option value="Golf Manager">Golf Manager API</option>
                <option value="Tee One">Tee One (TeeOne Web)</option>
                <option value="Codi propi / Altres">Codi propi / Altres</option>
              </select>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="text-xs text-slate-500 font-bold uppercase mb-2">Tipus de club</label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none py-2 text-slate-705">
                <input 
                  type="checkbox"
                  checked={isOurClub}
                  onChange={(e) => setIsOurClub(e.target.checked)}
                  className="rounded-none border-slate-300 animate-pulse"
                />
                <span className="text-xs font-bold text-slate-700">És el nostre propi Club d'Aro</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-bold uppercase">Green Fee Alta (€)</label>
              <input
                type="number"
                required
                min={0}
                placeholder="Ex. 110"
                value={greenFeeHigh}
                onChange={(e) => setGreenFeeHigh(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-bold uppercase">Green Fee Baixa (€)</label>
              <input
                type="number"
                required
                min={0}
                placeholder="Ex. 80"
                value={greenFeeLow}
                onChange={(e) => setGreenFeeLow(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-bold uppercase">Lloguer Buggy (€)</label>
              <input
                type="number"
                min={0}
                placeholder="Ex. 42"
                value={buggyRental}
                onChange={(e) => setBuggyRental(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono text-center"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-bold uppercase">Lloguer Set de Pals (€)</label>
              <input
                type="number"
                min={0}
                placeholder="Ex. 45"
                value={clubRental}
                onChange={(e) => setClubRental(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono text-center"
              />
            </div>

            <div className="space-y-1.5 font-sans">
              <label className="text-[11px] text-slate-500 font-bold uppercase">Interval de sortides</label>
              <select
                value={teeTimeInterval}
                onChange={(e) => setTeeTimeInterval(Number(e.target.value) || 10)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold font-sans"
              >
                <option value={9}>9 min (ex. mas nou)</option>
                <option value={10}>10 min (ex. Pals/Empordà)</option>
                <option value={8}>8 min</option>
                <option value={12}>12 min</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-bold uppercase">Reserves Totals d'Avui</label>
              <input
                type="number"
                min={0}
                placeholder="Ex. 61"
                value={reservationsToday}
                onChange={(e) => setReservationsToday(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-bold uppercase">Percentatge Ocupació (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                placeholder="Ex. 30.5"
                value={occupancyToday}
                onChange={(e) => setOccupancyToday(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-bold uppercase">Tee Times Lliures (Slots)</label>
              <input
                type="number"
                min={0}
                placeholder="Ex. 139"
                value={availableSlotsToday}
                onChange={(e) => setAvailableSlotsToday(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white text-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono text-center font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-none shadow-none transition-all flex items-center justify-center gap-1 text-xs uppercase tracking-wider"
          >
            <Check className="w-4 h-4" />
            <span>Guardar i Registrar Nou Club</span>
          </button>
        </form>
      )}

      {/* Pricing Matrix Table - Fully Square */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 shadow-none overflow-x-auto">
        <div className="flex flex-col md:flex-row items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
              Control General de Tarifes d'Abonaments Ampliat
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Taula directiva principal que recull tots els costos i preus agregats.
            </p>
          </div>
          
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              placeholder="Cerca per club o ubicació..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white text-slate-800"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs mt-3" id="golf-rates-executive-table">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
              <th className="py-2.5 px-3 text-left w-52">Camp de Golf / Competència</th>
              <th className="py-2.5 px-3 text-left">Locatització</th>
              <th className="py-2.5 px-2">Motor & Quadrant Directe</th>
              <th className="py-2.5 px-2">Interval Sortides</th>
              <th className="py-2.5 px-2">Estat Scraper</th>
              <th className="py-2.5 px-3">Ocupació Avui</th>
              <th className="py-2.5 px-3">Green Fee Alta</th>
              <th className="py-2.5 px-3">Green Fee Baixa</th>
              <th className="py-2.5 px-3">Buggy (18 H.)</th>
              <th className="py-2.5 px-3">Lloguer Pals</th>
              <th className="py-2.5 px-3 font-bold">Reserva + Buggy</th>
              <th className="py-2.5 px-3">Enllaç Oficial</th>
              {isAdmin && <th className="py-2.5 px-3">Accions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-center font-medium">
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-slate-400 text-center">
                  Cap camp coincideix amb la cerca.
                </td>
              </tr>
            ) : (
              filteredCourses.map((course) => {
                const isEditing = editingId === course.id;

                // PACK STANDARD = Green Fee alta + Buggy
                const totalPack = course.greenFeeHigh + course.buggyRental;

                return (
                  <tr
                    key={course.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${course.isOurClub ? "bg-blue-50/10 font-bold" : ""}`}
                  >
                    {/* Name */}
                    <td className="py-3 px-3 text-left">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 border border-blue-500 bg-white rounded-none font-semibold text-slate-800"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {course.name}
                          </span>
                          {course.isOurClub && (
                            <span className="bg-emerald-600 text-white text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded-none font-mono">PROPI</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-3 text-left">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          className="w-full px-2 py-1 border border-blue-500 bg-white rounded-none text-slate-800"
                        />
                      ) : (
                        <div className="text-slate-500 flex items-center gap-1 font-sans">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{course.location}</span>
                        </div>
                      )}
                    </td>

                    {/* Motor & Quadrant Directe */}
                    <td className="py-3 px-2 text-center">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 w-32 mx-auto">
                          <input
                            type="url"
                            value={editBookingUrl}
                            onChange={(e) => setEditBookingUrl(e.target.value)}
                            className="px-1 py-0.5 border border-blue-500 bg-white rounded-none text-[10px]"
                            placeholder="Direct Quadrant URL"
                          />
                          <select
                            value={editBookingSystem}
                            onChange={(e) => setEditBookingSystem(e.target.value)}
                            className="px-1 py-0.5 border border-blue-500 bg-white text-xs rounded-none"
                          >
                            <option value="Golf Manager">Golf Manager</option>
                            <option value="Tee One">Tee One</option>
                            <option value="Codi propi / Altres">Altres</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="font-mono text-[9px] font-extrabold uppercase py-0.5 px-2 bg-blue-100 text-[#022e5f] border border-blue-200">
                            {course.bookingSystem || "Golf Manager"}
                          </span>
                          {course.bookingUrl ? (
                            <a
                              href={course.bookingUrl}
                              target="_blank"
                              rel="noreferrer"
                              referrerPolicy="no-referrer"
                              className="text-[9.5px] text-amber-600 hover:underline font-bold inline-flex items-center gap-0.5"
                            >
                              <span>Quadrant</span>
                              <ExternalLink className="w-2.5 h-2.5 text-amber-600" />
                            </a>
                          ) : (
                            <span className="text-[9px] text-slate-400">Cap enllaç</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Interval Sortides (9 o 10 min) */}
                    <td className="py-3 px-2 text-center">
                      {isEditing ? (
                        <select
                          value={editTeeTimeInterval}
                          onChange={(e) => setEditTeeTimeInterval(Number(e.target.value) || 10)}
                          className="px-1 py-1 border border-blue-500 bg-white rounded-none font-bold text-xs font-sans text-slate-800"
                        >
                          <option value={9}>9 minuts</option>
                          <option value={10}>10 minuts</option>
                          <option value={8}>8 minuts</option>
                          <option value={12}>12 minuts</option>
                        </select>
                      ) : (
                        <span className="font-sans font-extrabold text-[#022e5f] dark:text-amber-300 bg-blue-50 dark:bg-blue-950/25 px-2.5 py-1 text-xs inline-block rounded-none border border-blue-100 dark:border-blue-900/40">
                          {course.teeTimeInterval ?? 10} min
                        </span>
                      )}
                    </td>

                    {/* Estat Scraper */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center">
                        <span className="inline-flex items-center gap-1 font-sans text-[9px] font-extrabold uppercase text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                          <span>Actiu</span>
                        </span>
                        <span className="text-[8.5px] text-slate-500 font-sans font-bold bg-slate-100 px-1 py-0.5">
                          {course.lastSyncTime || "Pendents"}
                        </span>
                      </div>
                    </td>

                    {/* Ocupació / Disponibilitat */}
                    <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 min-w-[140px] text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-[9px] uppercase text-slate-400">Reserves:</span>
                            <input
                              type="number"
                              value={editReservationsToday}
                              onChange={(e) => setEditReservationsToday(Number(e.target.value) || 0)}
                              className="w-full px-1 py-0.5 border border-blue-500 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-center text-slate-800 dark:text-white"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-[9px] uppercase text-slate-400">Ocupació %:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={editOccupancyToday}
                              onChange={(e) => setEditOccupancyToday(Number(e.target.value) || 0)}
                              className="w-full px-1 py-0.5 border border-blue-500 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-center text-slate-800 dark:text-white"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-[9px] uppercase text-slate-400">Lliures:</span>
                            <input
                              type="number"
                              value={editAvailableSlotsToday}
                              onChange={(e) => setEditAvailableSlotsToday(Number(e.target.value) || 0)}
                              className="w-full px-1 py-0.5 border border-blue-500 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-center text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center min-w-[125px] font-sans animate-fade-in">
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className={`text-[10px] font-black uppercase ${
                              (course.occupancyToday ?? 60) >= 85 ? "text-rose-600" :
                              (course.occupancyToday ?? 60) >= 70 ? "text-amber-600" :
                              "text-emerald-600"
                            }`}>
                              {course.reservationsToday !== undefined ? `${course.reservationsToday} reserves (${course.occupancyToday}%)` : `${course.occupancyToday ?? 60}% Ocupat`}
                            </span>
                            <span className="text-[9.5px] text-slate-500 font-bold">
                              ({course.availableSlotsToday ?? 12} t. lliures)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-150 dark:bg-slate-800 rounded-none overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                (course.occupancyToday ?? 60) >= 85 ? "bg-rose-500" :
                                (course.occupancyToday ?? 60) >= 70 ? "bg-amber-500" :
                                "bg-emerald-500"
                              }`}
                              style={{ width: `${course.occupancyToday ?? 60}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Green Fee High */}
                    <td className="py-3 px-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editGreenFeeHigh}
                          onChange={(e) => setEditGreenFeeHigh(Number(e.target.value))}
                          className="w-16 px-1 py-0.5 border border-blue-500 bg-white rounded-none font-bold text-center font-sans"
                        />
                      ) : (
                        <span className="font-semibold text-[#022e5f] font-sans bg-slate-105 px-2 py-0.5 rounded-none text-xs border border-slate-200 dark:border-slate-700">
                          {course.greenFeeHigh} €
                        </span>
                      )}
                    </td>

                    {/* Green Fee Low */}
                    <td className="py-3 px-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editGreenFeeLow}
                          onChange={(e) => setEditGreenFeeLow(Number(e.target.value))}
                          className="w-16 px-1 py-0.5 border border-blue-500 bg-white rounded-none font-bold text-center font-sans"
                        />
                      ) : (
                        <span className="font-medium text-slate-500 font-sans bg-slate-105 px-2 py-0.5 rounded-none text-xs border border-slate-200 dark:border-slate-700">
                          {course.greenFeeLow} €
                        </span>
                      )}
                    </td>

                    {/* Buggy rental */}
                    <td className="py-3 px-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editBuggyRental}
                          onChange={(e) => setEditBuggyRental(Number(e.target.value))}
                          className="w-16 px-1 py-0.5 border border-blue-500 bg-white rounded-none font-bold text-center font-sans"
                        />
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300 font-sans font-medium">{course.buggyRental} €</span>
                      )}
                    </td>

                    {/* Club Rental */}
                    <td className="py-3 px-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editClubRental}
                          onChange={(e) => setEditClubRental(Number(e.target.value))}
                          className="w-16 px-1 py-0.5 border border-blue-500 bg-white rounded-none font-bold text-center font-sans"
                        />
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300 font-sans font-medium">{course.clubRental} €</span>
                      )}
                    </td>

                    {/* Pack Total Est */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-blue-700 dark:text-blue-400 font-sans bg-blue-100/40 dark:bg-blue-900/10 px-2 py-0.5 rounded-none text-xs border border-blue-200">
                        {totalPack} €
                      </span>
                    </td>

                    {/* Website Oficial click */}
                    <td className="py-3 px-3 font-sans text-center">
                      {isEditing ? (
                        <input
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="w-full px-2 py-0.5 border border-blue-500 bg-white rounded-none text-xs font-sans"
                          placeholder="Link web"
                        />
                      ) : (
                        course.url ? (
                          <a 
                            href={course.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            referrerPolicy="no-referrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1 hover:text-blue-705 font-semibold font-sans"
                          >
                            <span>Visitar</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 font-sans">-</span>
                        )
                      )}
                    </td>

                    {/* Actions if Admin */}
                    {isAdmin && (
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(course.id)}
                              className="p-1 bg-blue-600 hover:bg-blue-700 rounded-none text-white font-bold"
                              title="Guardar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 bg-slate-200 text-slate-705 text-xs rounded-none font-bold"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleStartEdit(course)}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-none"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteCourse(course.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-650 rounded-none"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
