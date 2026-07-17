import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight, 
  Check, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  X, 
  AlertTriangle,
  Flame,
  TrendingDown,
  TrendingUp,
  Sliders,
  DollarSign
} from "lucide-react";
import { GolfCourse } from "../types";

export interface PriceNotification {
  id: string;
  courseId: string;
  courseName: string;
  hourRange: string;
  oldPrice: number;
  newPrice: number;
  timestamp: string; // ISO String
  read: boolean;
  type: "increase" | "decrease" | "initial";
}

interface PriceNotificationBubbleProps {
  golfCourses: GolfCourse[];
  onUpdateCourse: (courseId: string, updates: Partial<GolfCourse>) => Promise<any>;
}

const DEFAULT_ALERTS: PriceNotification[] = [
  {
    id: "alert-1",
    courseId: "camiral",
    courseName: "Camiral Golf & Wellness (Stadium Course)",
    hourRange: "13:00-14:00",
    oldPrice: 220,
    newPrice: 235,
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15m fa
    read: false,
    type: "increase"
  },
  {
    id: "alert-2",
    courseId: "pals",
    courseName: "Golf de Pals",
    hourRange: "07:00-08:00",
    oldPrice: 100,
    newPrice: 92,
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45m fa
    read: false,
    type: "decrease"
  },
  {
    id: "alert-3",
    courseId: "emporda",
    courseName: "Empordà Golf Club",
    hourRange: "15:00-16:00",
    oldPrice: 82,
    newPrice: 88,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h fa
    read: true,
    type: "increase"
  },
  {
    id: "alert-4",
    courseId: "peralada",
    courseName: "Camp de Golf Peralada",
    hourRange: "08:00-12:00",
    oldPrice: 120,
    newPrice: 115,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5h fa
    read: true,
    type: "decrease"
  }
];

export const PriceNotificationBubble: React.FC<PriceNotificationBubbleProps> = ({ 
  golfCourses, 
  onUpdateCourse 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [toast, setToast] = useState<PriceNotification | null>(null);
  
  // Load initial alerts from LocalStorage or seed with default ones
  const [notifications, setNotifications] = useState<PriceNotification[]>(() => {
    try {
      const saved = localStorage.getItem("golfsana_price_alerts");
      if (saved) {
        return JSON.parse(saved);
      } else {
        localStorage.setItem("golfsana_price_alerts", JSON.stringify(DEFAULT_ALERTS));
        return DEFAULT_ALERTS;
      }
    } catch {
      return DEFAULT_ALERTS;
    }
  });

  const prevCoursesRef = useRef<GolfCourse[]>([]);
  const toastTimeoutRef = useRef<any>(null);

  // Monitor price changes from Firestore synced golfCourses
  useEffect(() => {
    if (!golfCourses || golfCourses.length === 0) return;

    // First load: just cache the current state to reference later
    if (prevCoursesRef.current.length === 0) {
      prevCoursesRef.current = JSON.parse(JSON.stringify(golfCourses));
      return;
    }

    const newAlerts: PriceNotification[] = [];

    golfCourses.forEach((currentCourse) => {
      // Find matching course inside previous cached array
      const prevCourse = prevCoursesRef.current.find(c => c.name === currentCourse.name);
      if (!prevCourse) return;

      const currentRates = currentCourse.hourlyRates || {};
      const prevRates = prevCourse.hourlyRates || {};

      Object.keys(currentRates).forEach((hour) => {
        const curPrice = currentRates[hour];
        const prevPrice = prevRates[hour];

        // If price differs and previous price actually existed, we found a change!
        if (prevPrice !== undefined && curPrice !== prevPrice) {
          const type = curPrice > prevPrice ? "increase" : "decrease";
          const newAlert: PriceNotification = {
            id: `alert-${Math.random().toString(36).substring(2, 9)}`,
            courseId: currentCourse.id,
            courseName: currentCourse.name,
            hourRange: hour,
            oldPrice: prevPrice,
            newPrice: curPrice,
            timestamp: new Date().toISOString(),
            read: false,
            type
          };
          newAlerts.push(newAlert);
        }
      });
    });

    if (newAlerts.length > 0) {
      // Prepend to current alerts list
      setNotifications(prev => {
        const updated = [...newAlerts, ...prev];
        localStorage.setItem("golfsana_price_alerts", JSON.stringify(updated));
        return updated;
      });

      // Spawn toast notification
      const latest = newAlerts[0];
      setToast(latest);

      // Dismiss after 5.5s
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, 5500);

      // Play elegant high-pitched chime notification sound (Client friendly)
      if (isAudioEnabled) {
        try {
          const AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
          if (AudioContext) {
            const context = new AudioContext();
            
            // Note 1 (E5)
            const osc1 = context.createOscillator();
            const gain1 = context.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(659.25, context.currentTime); // E5
            gain1.gain.setValueAtTime(0.08, context.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
            osc1.connect(gain1);
            gain1.connect(context.destination);
            osc1.start();
            osc1.stop(context.currentTime + 0.3);

            // Note 2 (A5) slightly staggered
            setTimeout(() => {
              const osc2 = context.createOscillator();
              const gain2 = context.createGain();
              osc2.type = "sine";
              osc2.frequency.setValueAtTime(880, context.currentTime); // A5
              gain2.gain.setValueAtTime(0.08, context.currentTime);
              gain2.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
              osc2.connect(gain2);
              gain2.connect(context.destination);
              osc2.start();
              osc2.stop(context.currentTime + 0.35);
            }, 80);
          }
        } catch (err) {
          console.warn("Subtle alert chime bypass:", err);
        }
      }
    }

    // Always update cache for next snapshot comparison
    prevCoursesRef.current = JSON.parse(JSON.stringify(golfCourses));
  }, [golfCourses, isAudioEnabled]);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("golfsana_price_alerts", JSON.stringify(updated));
  };

  const handleClearAll = () => {
    setNotifications([]);
    localStorage.setItem("golfsana_price_alerts", JSON.stringify([]));
  };

  const handleToggleReadOne = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: !n.read } : n);
    setNotifications(updated);
    localStorage.setItem("golfsana_price_alerts", JSON.stringify(updated));
  };

  // Helper function to format readable elapsed time in Catalan
  const formatTimeElapsed = (isoStr: string) => {
    try {
      const elapsedMs = Date.now() - new Date(isoStr).getTime();
      const mins = Math.floor(elapsedMs / (60 * 1000));
      if (mins < 1) return "Ara mateix";
      if (mins === 1) return "Fa 1 minut";
      if (mins < 60) return `Fa ${mins} minuts`;
      
      const hours = Math.floor(mins / 60);
      if (hours === 1) return "Fa 1 hora";
      if (hours < 24) return `Fa ${hours} hores`;
      
      return new Date(isoStr).toLocaleDateString("ca-ES", { day: "numeric", month: "short" });
    } catch {
      return "Detecció recent";
    }
  };

  // Manual pricing simulation generator
  const handleSimulateChange = async () => {
    if (!golfCourses || golfCourses.length === 0) return;
    
    // Select competitor only
    const competitors = golfCourses.filter(c => !c.isOurClub);
    if (competitors.length === 0) return;

    const randomCourse = competitors[Math.floor(Math.random() * competitors.length)];
    const HOURS = [
      "07:00-08:00", 
      "08:00-12:00", 
      "12:00-13:00", 
      "13:00-14:00", 
      "14:00-15:00", 
      "15:00-16:00", 
      "16:00-21:00"
    ];
    const randomHour = HOURS[Math.floor(Math.random() * HOURS.length)];
    const currentPrice = randomCourse.hourlyRates?.[randomHour] || 110;
    
    // Choose random price delta: e.g. -10€, -5€, +5€, +10€
    const priceChange = [5, 10, -5, -10][Math.floor(Math.random() * 4)];
    const newPrice = Math.max(50, currentPrice + priceChange);

    const updatedRates = { ...(randomCourse.hourlyRates || {}) };
    updatedRates[randomHour] = newPrice;

    // Set updated values into Firestore
    try {
      await onUpdateCourse(randomCourse.id, {
        hourlyRates: updatedRates,
        lastSyncTime: "Avui, " + new Date().toLocaleTimeString("ca-ES", { hour: "2-digit", minute: "2-digit" }),
        updatedBy: "Scraper Automàtic (~Evasion Agent)"
      });
    } catch (e) {
      console.warn("Simulation update error:", e);
    }
  };

  return (
    <>
      {/* Toast Notification popin in bottom right */}
      {toast && (
        <div className="fixed bottom-24 right-6 z-50 max-w-sm w-96 bg-white border-l-4 border-amber-500 shadow-xl rounded-none p-4 animate-slide-up flex flex-col gap-2 border border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 rounded-none bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-extrabold uppercase font-mono flex items-center gap-1 animate-pulse">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Alerta de Preu
              </span>
              <span className="text-[10px] text-slate-400 font-medium font-mono">Ara mateix</span>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="text-slate-800 text-xs">
            A les <span className="font-bold font-mono">{toast.hourRange}</span> : El competidor <strong className="text-slate-930 text-xs font-bold">{toast.courseName}</strong> ha canviat la tarifa de{" "}
            <span className="font-mono line-through text-slate-450">{toast.oldPrice}€</span> a{" "}
            <span className={`font-mono font-bold ${toast.type === "increase" ? "text-red-650" : "text-emerald-650"}`}>
              {toast.newPrice}€
            </span>{" "}
            ({toast.type === "increase" ? "Apujat" : "Rebaixat"})
          </div>

          <div className="flex items-center gap-2 justify-end mt-1">
            <button 
              onClick={() => {
                setIsOpen(true);
                setToast(null);
              }}
              className="text-[10px] font-bold text-blue-650 hover:underline flex items-center gap-1"
            >
              Obrir Quadre de Control →
            </button>
          </div>
        </div>
      )}

      {/* Bell Button — ara inline a la capçalera, al costat del selector de sessió */}
      <div className="relative flex items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-1 px-2 border transition-all flex items-center gap-1.5 rounded-sm text-xs font-semibold ${
            isOpen
              ? "bg-blue-900/85 border-blue-800 text-white"
              : "border-blue-800 bg-blue-900/60 hover:bg-blue-800/85 text-blue-200 hover:text-white"
          }`}
          title="Canvis de Preus de la Competència (Web Scraping)"
          id="comparator-notification-bubble"
        >
          <Bell className={`w-3.5 h-3.5 ${unreadCount > 0 ? "text-amber-400 animate-bounce" : ""}`} />
          <span>Preus</span>
          {unreadCount > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Panel Container (Pop-up, s'obre cap avall des de la capçalera) */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-[420px] max-h-[580px] bg-white border border-slate-200 shadow-2xl rounded-none flex flex-col overflow-hidden z-50 animate-fade-in">
            {/* Header */}
            <div className="p-4 bg-[#022e5f] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2 text-[9.5px] uppercase font-mono font-extrabold bg-blue-500 text-white flex items-center gap-1 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  Live Feed
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide">Monitor de Competència</h3>
                  <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">Alertes de Web Scraping</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Audio chime toggle */}
                <button 
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className={`p-1.5 hover:bg-blue-900 border transition-all text-white ${isAudioEnabled ? 'bg-blue-500/20 border-blue-400/30' : 'bg-transparent border-transparent text-slate-350'}`}
                  title={isAudioEnabled ? "Sons d'alerta actius" : "Sons d'alerta desactivats"}
                >
                  {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-blue-200 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Explanatory Banner */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-600 font-bold">Avís sobre preus:</strong> Només els preus del <strong className="text-blue-750 font-bold">Club de Golf d'Aro - Mas Nou</strong> són 100% reals. Els canvis destacats en aquest monitor de camps rivals resten en format de simulació orientativa.
              </div>
            </div>

            {/* Tool Actions */}
            <div className="p-2 px-3 border-b border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
              <button 
                onClick={handleSimulateChange}
                className="px-2 py-1 text-[10.5px] font-extrabold text-[#022e5f] hover:bg-blue-50 border border-[#022e5f]/20 uppercase tracking-tight flex items-center gap-1"
                title="Llança immediatament un canvi aleatori d'un competidor per comprovar el sistema de so de la bombolla"
              >
                <Sliders className="w-3 h-3 text-amber-500 animate-spin" />
                Simular Canvi Rival
              </button>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-slate-650 hover:text-[#022e5f] hover:underline"
                  disabled={unreadCount === 0}
                >
                  Marcar llegits
                </button>
                <span className="text-slate-300">|</span>
                <button 
                  onClick={handleClearAll}
                  className="text-[10px] font-bold text-slate-650 hover:text-red-600 hover:underline flex items-center gap-0.5"
                  disabled={notifications.length === 0}
                >
                  <Trash2 className="w-3 h-3" />
                  Buidar
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto max-h-[350px] divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs px-4 flex flex-col items-center justify-center gap-2">
                  <Check className="w-8 h-8 text-emerald-500 bg-emerald-50 p-1.5 rounded-full border border-emerald-150" />
                  <div>
                    <p className="font-extrabold text-slate-700">Sense alertes noves</p>
                    <p className="text-[11px] mt-0.5 text-slate-350">Totes les tarifes dels rivals es mantenen constants avui.</p>
                  </div>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isInc = notif.type === "increase";
                  const isDec = notif.type === "decrease";
                  
                  return (
                    <div 
                      key={notif.id} 
                      onClick={() => handleToggleReadOne(notif.id)}
                      className={`p-3.5 transition-all cursor-pointer flex gap-3 text-xs items-start hover:bg-slate-50 relative ${
                        !notif.read ? "bg-blue-50/20 font-medium" : "bg-white"
                      }`}
                    >
                      {/* Left blue bullet indicator for unread */}
                      {!notif.read && (
                        <span className="absolute top-4 left-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}

                      {/* Icon Pill */}
                      <div className={`p-1.5 border shrink-0 ${
                        isInc 
                          ? "bg-red-50 border-red-150 text-red-650"
                          : isDec 
                            ? "bg-emerald-50 border-emerald-150 text-emerald-650"
                            : "bg-slate-50 border-slate-200 text-slate-650"
                      }`}>
                        {isInc ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : isDec ? (
                          <TrendingDown className="w-3.5 h-3.5" />
                        ) : (
                          <DollarSign className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Text content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide leading-tight">
                            {notif.courseName}
                          </h4>
                          <span className="text-[9.5px] font-mono text-slate-450 whitespace-nowrap ml-1 font-semibold">
                            {formatTimeElapsed(notif.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          La tarifa per a les <span className="font-bold text-slate-700 font-mono italic">{notif.hourRange}</span> h ha passat de{" "}
                          <span className="font-mono line-through text-slate-400">{notif.oldPrice}€</span> a{" "}
                          <span className={`font-mono font-bold ${isInc ? 'text-red-650' : 'text-emerald-650'}`}>{notif.newPrice}€</span>.
                        </p>

                        <div className="flex gap-2 pt-0.5 items-center">
                          <span className={`p-0.5 px-1.5 rounded-none text-[8.5px] uppercase font-bold font-mono tracking-wider ${
                            isInc 
                              ? "bg-red-50 text-red-700 border border-red-100" 
                              : isDec 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-slate-50 text-slate-755 border border-slate-100"
                          }`}>
                            {isInc ? "Increment de preu" : isDec ? "Descompte / Oferta" : "Inicial"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-150 text-[10px] text-slate-500 font-mono text-center shrink-0">
              Sincronització de preus activa de forma encriptada v1.2
            </div>
          </div>
        )}
      </div>
    </>
  );
};
