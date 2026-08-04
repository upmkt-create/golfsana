import React, { useState, useMemo } from "react";
import { Task, UserProfile, Project } from "../types";
import { Clock, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

interface TaskTimelineProps {
  tasks: Task[];
  users: UserProfile[];
  projects: Project[];
  activeProjectId: string | null;
  activeWorkspaceId: string;
}

const MONTH_SHORT = ["Gen", "Feb", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Des"];

function startOfWeek(d: Date): Date {
  const nd = new Date(d);
  const day = nd.getDay(); // 0 = diumenge
  const diff = day === 0 ? 6 : day - 1;
  nd.setDate(nd.getDate() - diff);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function parseDateKey(key: string): Date | null {
  const parts = key.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export default function TaskTimeline({
  tasks,
  users,
  projects,
  activeProjectId,
  activeWorkspaceId,
}: TaskTimelineProps) {
  // Setmanes generades DINÀMICAMENT a partir d'avui (abans era una llista
  // fixa de 8 setmanes de juny-juliol 2026, que deixava de mostrar res un
  // cop passat aquell rang). weekOffset permet navegar cap enrere/endavant.
  const [weekOffset, setWeekOffset] = useState(0);

  const timelineWeeks = useMemo(() => {
    const firstWeekStart = startOfWeek(new Date());
    firstWeekStart.setDate(firstWeekStart.getDate() + weekOffset * 7);
    return Array.from({ length: 8 }, (_, i) => {
      const start = new Date(firstWeekStart);
      start.setDate(start.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end,
        label: `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}–${end.getDate()}`,
      };
    });
  }, [weekOffset]);

  const rangeLabel = `${timelineWeeks[0].start.getDate()} ${MONTH_SHORT[timelineWeeks[0].start.getMonth()]} – ${timelineWeeks[7].end.getDate()} ${MONTH_SHORT[timelineWeeks[7].end.getMonth()]} ${timelineWeeks[7].end.getFullYear()}`;
  // Llista explícita de tots els mesos inclosos al rang de 8 setmanes —
  // el resum de dalt (per exemple "28 Set – 22 Nov") pot donar la
  // impressió que es salta algun mes pel mig, encara que les columnes de
  // sota ja el mostrin correctament; això ho deixa clar sense ambigüitat.
  const monthsInRangeLabel = Array.from(
    new Set(timelineWeeks.map(w => `${MONTH_SHORT[w.start.getMonth()]} ${w.start.getFullYear()}`))
  ).join(", ");

  // Filter tasks to active scope
  const scopedTasks = tasks.filter(task => {
    if (activeProjectId && task.projectId !== activeProjectId) return false;
    const tWorkspaceId = task.workspaceId || projects.find(p => p.id === task.projectId)?.workspaceId;
    if (!activeProjectId && tWorkspaceId !== activeWorkspaceId) return false;
    return !!task.dueDate;
  });

  // Troba a quina de les 8 setmanes visibles cau cada tasca — si cau fora
  // del rang actual, es compta a banda en lloc de dibuixar-se malament.
  const getWeekIndex = (dueDateStr: string): number => {
    const dueDate = parseDateKey(dueDateStr);
    if (!dueDate) return -1;
    return timelineWeeks.findIndex(w => dueDate >= w.start && dueDate <= w.end);
  };

  const visibleTasksUnsorted = scopedTasks.filter(t => getWeekIndex(t.dueDate) !== -1);
  const outOfRangeCount = scopedTasks.length - visibleTasksUnsorted.length;

  // Ordenació per data d'inici o de finalització — abans les tasques
  // sortien sempre en l'ordre en què venien, sense cap control.
  const [sortField, setSortField] = useState<"startDate" | "dueDate">("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const handleSortClick = (field: "startDate" | "dueDate") => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const visibleTasks = [...visibleTasksUnsorted].sort((a, b) => {
    const rawA = sortField === "dueDate" ? a.dueDate : (a.startDate || a.dueDate);
    const rawB = sortField === "dueDate" ? b.dueDate : (b.startDate || b.dueDate);
    const cmp = (rawA || "").localeCompare(rawB || "");
    return sortDirection === "asc" ? cmp : -cmp;
  });

  const getPriorityGradient = (p: string) => {
    switch (p) {
      case "urgent":
      case "high":
        return "from-rose-500 to-red-650";
      case "medium":
        return "from-amber-400 to-amber-600";
      default:
        return "from-emerald-400 to-teal-650";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-6 shadow-none" id="timeline-gantt-section">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Cronograma de Projecte (Gantt)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Planificació visual per les 8 properes setmanes: {rangeLabel} (inclou: {monthsInRangeLabel}).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset(o => o - 8)} className="p-1 border border-slate-200 hover:bg-slate-50" title="8 setmanes enrere">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
              className="text-[10px] font-bold px-2 py-1 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Avui
            </button>
            <button onClick={() => setWeekOffset(o => o + 8)} className="p-1 border border-slate-200 hover:bg-slate-50" title="8 setmanes endavant">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center border border-slate-200 overflow-hidden text-[10px] font-bold">
            <button
              onClick={() => handleSortClick("startDate")}
              className={`px-2 py-1 transition-colors ${sortField === "startDate" ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              Data d'inici {sortField === "startDate" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
            </button>
            <button
              onClick={() => handleSortClick("dueDate")}
              className={`px-2 py-1 border-l border-slate-200 transition-colors ${sortField === "dueDate" ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              Data de venciment {sortField === "dueDate" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5 font-mono">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
              <span>Alta/Urgent</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              <span>Mitjana</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span>Baixa</span>
            </div>
          </div>
        </div>
      </div>

      {outOfRangeCount > 0 && (
        <div className="mb-4 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{outOfRangeCount} tasca{outOfRangeCount > 1 ? "ques" : ""} amb venciment fora d'aquest rang de 8 setmanes — navega amb les fletxes per veure-les.</span>
        </div>
      )}

      {scopedTasks.length === 0 ? (
        <div className="py-12 border border-dashed border-slate-250 dark:border-slate-800 rounded-none text-center text-slate-400 text-xs">
          <AlertTriangle className="w-6 h-6 mx-auto text-slate-350 mb-2" />
          <span>No hi ha tasques amb data límit assignada en aquest projecte per graficar.</span>
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="py-12 border border-dashed border-slate-250 dark:border-slate-800 rounded-none text-center text-slate-400 text-xs">
          <AlertTriangle className="w-6 h-6 mx-auto text-slate-350 mb-2" />
          <span>Cap tasca amb venciment en aquestes 8 setmanes. Prova de navegar amb les fletxes.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-12 gap-1 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-4 text-left px-2">Tasca</div>
              {timelineWeeks.map((w, i) => (
                <div key={i} className="col-span-1 border-l border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                  {w.label}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {visibleTasks.map((task) => {
                const startCol = getWeekIndex(task.dueDate) + 1;
                const gradient = getPriorityGradient(task.priority);
                const assignee = users.find(u => (task.assigneeIds?.includes(u.id) || u.id === task.assigneeId));

                return (
                  <div key={task.id} className="grid grid-cols-12 gap-1 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/10 py-1.5 rounded-none transition-all">
                    <div className="col-span-4 flex items-center gap-2.5 pl-2 truncate pr-4">
                      <div className="w-5.5 h-5.5 rounded-none bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center font-extrabold text-[9px] text-blue-600">
                        {assignee ? assignee.avatar : "U"}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono font-medium">
                          Fins al {task.dueDate}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-8 grid grid-cols-8 gap-1 h-8 relative items-center">
                      <div
                        className="h-6 bg-gradient-to-r text-[10px] text-white flex items-center px-1.5 font-bold overflow-hidden whitespace-nowrap rounded-none select-none border border-black/10 truncate font-mono"
                        style={{
                          gridColumnStart: startCol,
                          gridColumnEnd: `span 1`,
                        }}
                      >
                        <span className={`w-full h-full bg-gradient-to-r ${gradient} flex items-center px-2 shadow-none rounded-none truncate`}>
                          {task.title}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
