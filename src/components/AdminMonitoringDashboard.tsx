import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { ActivityLog, UserProfile } from "../types";
import { Activity, Clock, Shield, Users, Radio } from "lucide-react";

interface AdminMonitoringDashboardProps {
  users?: UserProfile[];
}

interface UserPresenceInfo {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  lastActive: any; // Firestore Timestamp
  status: "online" | "offline";
  currentTab?: string;
  lastAction?: string;
  lastActionTime?: any; // Firestore Timestamp
}

function parseFirestoreTimestamp(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (typeof ts.seconds === "number") {
    return new Date(ts.seconds * 1000);
  }
  if (typeof ts === "string" || typeof ts === "number") {
    return new Date(ts);
  }
  return null;
}

export default function AdminMonitoringDashboard({ users = [] }: AdminMonitoringDashboardProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [presences, setPresences] = useState<Record<string, UserPresenceInfo>>({});
  const [now, setNow] = useState<Date>(new Date());

  // Subscription for audit logs
  useEffect(() => {
    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Monitoring Dashboard snapshot received, size:", snapshot.size);
      const logsData: ActivityLog[] = [];
      snapshot.forEach((doc) => {
        logsData.push({ id: doc.id, ...doc.data() } as ActivityLog);
      });
      setLogs(logsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "logs");
    });

    return () => unsubscribe();
  }, []);

  // Subscription for real-time presence/active sessions
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "presence"), (snapshot) => {
      const presenceMap: Record<string, UserPresenceInfo> = {};
      snapshot.forEach((doc) => {
        presenceMap[doc.id] = doc.data() as UserPresenceInfo;
      });
      setPresences(presenceMap);
    }, (error) => {
      console.warn("Presence sync error:", error);
    });

    return () => unsubscribe();
  }, []);

  // Keep 'now' ticking every 5 seconds to calculate real-time elapsed durations accurately
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Real-time active connection indicator */}
      <div className="bg-white border border-slate-205 p-6 shadow-none">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-emerald-600 animate-pulse shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                Estat de l'Equip i Seccions en Directe
              </h2>
              <p className="text-[11px] text-slate-500">
                Seguiment de presència per a pestanyes de fons (s'actualitza automàticament mentre l'aplicació està oberta) i rastreig de darreres operacions.
              </p>
            </div>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 border border-emerald-250">
            EN DIRECTE (LIVE)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {users.map((user) => {
            const presence = presences[user.id];
            const hasPresence = !!presence;
            
            // A user shows online if Firestore says "online" AND has written within the last 30 minutes (extremely robust to allow background tabs and clock skews)
            let isOnline = false;
            let lastActiveDate: Date | null = null;
            const thresholdMs = 30 * 60 * 1000; // 30-minute tolerance for inactive but open/minimized background tabs and clock desyncs

            if (hasPresence && presence.lastActive) {
              lastActiveDate = parseFirestoreTimestamp(presence.lastActive);
              if (lastActiveDate) {
                const diffMs = Math.abs(now.getTime() - lastActiveDate.getTime());
                isOnline = presence.status === "online" && diffMs < thresholdMs;
              }
            }

            return (
              <div 
                key={user.id} 
                className={`p-4 border transition-all flex flex-col justify-between space-y-3 ${
                  isOnline 
                    ? "bg-emerald-50/20 border-emerald-200 shadow-sm" 
                    : "bg-slate-50/50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between min-w-0 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Glowing Presence Spot */}
                    <div className="relative">
                      <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-205 font-extrabold flex items-center justify-center text-xs border border-slate-350 select-none">
                        {user.avatar}
                      </div>
                      {isOnline ? (
                        <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                        </span>
                      ) : (
                        <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-slate-300 border-2 border-white" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                        {user.name}
                        {user.role === "admin" && (
                          <Shield className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10 shrink-0" />
                        )}
                      </p>
                      <p className="text-[10px] text-slate-450 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isOnline ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.5 uppercase tracking-wider font-mono">
                        Actiu
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 font-bold px-1.5 py-0.5 uppercase tracking-wider font-mono">
                        Offline
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Section Tracker */}
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-slate-400 block tracking-wide">
                      Secció Oberta actualment:
                    </span>
                    <span className="font-semibold text-slate-800 block truncate mt-0.5">
                      {isOnline && presence?.currentTab ? (
                        <span className="text-blue-700 font-bold">🎬 {presence.currentTab}</span>
                      ) : (
                        <span className="text-slate-450 italic">Cap (Inactiu/Tancat)</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-slate-400 block tracking-wide">
                      Darrera Operació:
                    </span>
                    <p className="text-slate-700 font-mono text-[10.5px] leading-tight line-clamp-2 mt-0.5" title={presence?.lastAction}>
                      {presence?.lastAction ? (
                        <span className="text-indigo-700 font-semibold">{presence.lastAction}</span>
                      ) : (
                        <span className="text-slate-400 italic">Sense operacions recents</span>
                      )}
                    </p>
                    {presence?.lastActionTime && (
                      <span className="text-[8.5px] text-slate-400 block font-mono mt-1">
                        ⌚ {(() => {
                          const d = parseFirestoreTimestamp(presence.lastActionTime);
                          return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-";
                        })()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Active pulse ticker or last seen date */}
                <div className="pt-2 border-t border-slate-50 text-[10px] text-slate-500 flex justify-between items-center bg-slate-50/40 -mx-4 -mb-4 px-4 py-2 font-mono">
                  <span>Darrer contacte:</span>
                  <span className="font-semibold text-slate-700">
                    {lastActiveDate ? (
                      lastActiveDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Audit logs list */}
      <div className="bg-white border border-slate-205 p-6 shadow-none space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
          <Activity className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
              Registre d'Historial i Auditories
            </h2>
            <p className="text-[11px] text-slate-500">
              Traçabilitat d'accions operatives, tancament de tasques o canvis globals.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 font-semibold text-slate-700">Usuari</th>
                <th className="p-3 font-semibold text-slate-700">Acció</th>
                <th className="p-3 font-semibold text-slate-700">Data/Hora</th>
                <th className="p-3 font-semibold text-slate-700">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400">
                    No s'han registrat accions encara.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let formattedDate = "-";
                  try {
                    if (log.timestamp) {
                      const t = log.timestamp;
                      formattedDate = t.toDate ? t.toDate().toLocaleString() : new Date(t).toLocaleString();
                    }
                  } catch (e) {
                    console.warn(e);
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-3 font-semibold text-slate-900">{log.userName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 font-sans font-semibold rounded-none border text-[10px] ${
                          log.action?.includes("Inici") 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                            : log.action?.includes("Tancament")
                              ? "bg-slate-50 text-slate-650 border-slate-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-150"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{formattedDate}</td>
                      <td className="p-3 text-slate-400 truncate max-w-xs text-[10px]" title={JSON.stringify(log.meta)}>
                        {log.meta ? JSON.stringify(log.meta) : "Sens dades"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
