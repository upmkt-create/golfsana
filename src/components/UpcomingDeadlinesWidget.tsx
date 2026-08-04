import React, { useState } from "react";
import { Task, UserProfile, Project } from "../types";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { getTaskUrgency, URGENCY_STYLES } from "../lib/taskUrgency";

// Avís de tasques properes al venciment (o ja vençudes) — abans hi havia
// dues còpies gairebé idèntiques d'aquest bloc (a la pestanya d'Inici i al
// Dashboard de cada membre), amb la mateixa lògica duplicada. Ara viu en un
// sol lloc amb dos modes: "team" (informe agrupat per persona, per a
// administradors mirant tot l'equip) i "personal" (llista senzilla de les
// tasques d'una sola persona).

interface UpcomingDeadlinesWidgetProps {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  mode: "team" | "personal";
  // Mode "team"
  users?: UserProfile[];
  // Mode "personal"
  personId?: string;
  title?: string;
}

export default function UpcomingDeadlinesWidget({
  tasks,
  projects,
  onSelectTask,
  mode,
  users = [],
  personId,
  title,
}: UpcomingDeadlinesWidgetProps) {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  if (mode === "team") {
    const urgentByMember = new Map<string, { task: Task; urgency: ReturnType<typeof getTaskUrgency> }[]>();
    tasks.forEach((t) => {
      const urgency = getTaskUrgency(t.dueDate, t.status);
      if (urgency === "normal") return;
      const assigneeIds = t.assigneeIds && t.assigneeIds.length > 0 ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []);
      assigneeIds.forEach((uid) => {
        if (!urgentByMember.has(uid)) urgentByMember.set(uid, []);
        urgentByMember.get(uid)!.push({ task: t, urgency });
      });
    });

    const memberSummaries = Array.from(urgentByMember.entries())
      .map(([uid, items]) => {
        const memberUser = users.find((u) => u.id === uid);
        const overdueCount = items.filter((i) => i.urgency === "overdue").length;
        const urgentCount = items.filter((i) => i.urgency === "urgent").length;
        const sortedItems = [...items].sort((a, b) => (a.task.dueDate || "").localeCompare(b.task.dueDate || ""));
        return { uid, memberUser, items: sortedItems, overdueCount, urgentCount };
      })
      .filter((m) => !!m.memberUser)
      .sort((a, b) => b.overdueCount - a.overdueCount || (b.overdueCount + b.urgentCount) - (a.overdueCount + a.urgentCount));

    if (memberSummaries.length === 0) return null;

    const totalOverdue = memberSummaries.reduce((sum, m) => sum + m.overdueCount, 0);

    return (
      <div className="bg-white border-l-4 border-rose-400 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-rose-50/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title || "Estat de l'equip — tasques que vencen aviat"}</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-rose-600">
            {totalOverdue > 0 ? `${totalOverdue} vençuda${totalOverdue > 1 ? "s" : ""} en total` : `${memberSummaries.length} persona${memberSummaries.length > 1 ? "es" : ""} amb properes`}
          </span>
        </div>
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {memberSummaries.map(({ uid, memberUser, items, overdueCount, urgentCount }) => (
            <div key={uid}>
              <button
                onClick={() => setExpandedMemberId(expandedMemberId === uid ? null : uid)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {memberUser!.avatar}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 truncate">{memberUser!.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {overdueCount > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-rose-50 text-rose-700">
                      {overdueCount} vençuda{overdueCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {urgentCount > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-amber-50 text-amber-700">
                      {urgentCount} propera{urgentCount > 1 ? "es" : ""}
                    </span>
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedMemberId === uid ? "rotate-90" : ""}`} />
                </div>
              </button>
              {expandedMemberId === uid && (
                <div className="bg-slate-50/60 divide-y divide-slate-100">
                  {items.map(({ task, urgency }) => {
                    const style = URGENCY_STYLES[urgency];
                    const proj = projects.find((p) => p.id === task.projectId);
                    return (
                      <button
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="w-full flex items-center justify-between gap-3 pl-11 pr-4 py-2 hover:bg-slate-100 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} ${urgency === "overdue" ? "animate-pulse" : ""}`} />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-700 truncate">{task.title}</p>
                            <p className="text-[9.5px] text-slate-400 truncate">{proj?.name || "Sense projecte"}</p>
                          </div>
                        </div>
                        <span className={`text-[9.5px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded-sm ${style.bg} ${style.text}`}>
                          {urgency === "overdue" ? "Vençuda" : task.dueDate}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // mode === "personal"
  const myUrgentTasks = tasks
    .filter((t) => !personId || t.assigneeIds?.includes(personId) || t.assigneeId === personId)
    .map((t) => ({ task: t, urgency: getTaskUrgency(t.dueDate, t.status) }))
    .filter((x) => x.urgency !== "normal")
    .sort((a, b) => (a.task.dueDate || "").localeCompare(b.task.dueDate || ""));

  if (myUrgentTasks.length === 0) return null;

  const overdueCount = myUrgentTasks.filter((x) => x.urgency === "overdue").length;

  return (
    <div className="bg-white border-l-4 border-rose-400 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-rose-50/40">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title || "Les teves tasques que vencen aviat"}</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-rose-600">
          {overdueCount > 0 ? `${overdueCount} vençuda${overdueCount > 1 ? "s" : ""}` : `${myUrgentTasks.length} propera${myUrgentTasks.length > 1 ? "es" : ""}`}
        </span>
      </div>
      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
        {myUrgentTasks.map(({ task, urgency }) => {
          const style = URGENCY_STYLES[urgency];
          const proj = projects.find((p) => p.id === task.projectId);
          return (
            <button
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot} ${urgency === "overdue" ? "animate-pulse" : ""}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{task.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">{proj?.name || "Sense projecte"}</p>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold shrink-0 px-2 py-0.5 rounded-sm ${style.bg} ${style.text}`}>
                {urgency === "overdue" ? "Vençuda" : task.dueDate}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
