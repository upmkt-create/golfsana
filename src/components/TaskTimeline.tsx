import React from "react";
import { Task, UserProfile, Project } from "../types";
import { Calendar, Clock, AlertTriangle } from "lucide-react";

interface TaskTimelineProps {
  tasks: Task[];
  users: UserProfile[];
  projects: Project[];
  activeProjectId: string | null;
  activeWorkspaceId: string;
}

export default function TaskTimeline({
  tasks,
  users,
  projects,
  activeProjectId,
  activeWorkspaceId,
}: TaskTimelineProps) {
  // Filter tasks to active scope
  const filteredTasks = tasks.filter(task => {
    if (activeProjectId && task.projectId !== activeProjectId) return false;
    const tWorkspaceId = task.workspaceId || projects.find(p => p.id === task.projectId)?.workspaceId;
    if (!activeProjectId && tWorkspaceId !== activeWorkspaceId) return false;
    // We only display tasks that have valid dueDates
    return !!task.dueDate;
  });

  // Calculate some timeline months/weeks (June - July 2026)
  const timelineDates = [
    { label: "Juny Setmana 1", key: "06-05" },
    { label: "Juny Setmana 2", key: "06-12" },
    { label: "Juny Setmana 3", key: "06-19" },
    { label: "Juny Setmana 4", key: "06-26" },
    { label: "Juliol Setmana 1", key: "07-03" },
    { label: "Juliol Setmana 2", key: "07-10" },
    { label: "Juliol Setmana 3", key: "07-17" },
    { label: "Juliol Setmana 4", key: "07-24" },
  ];

  // Helper to place task in the timeline grid (crudely maps due month/day to column indices)
  const getTimelinePosition = (dueDateStr: string): { startCol: number; span: number; color: string } => {
    let color = "from-blue-500 to-indigo-600";

    try {
      const parts = dueDateStr.split("-");
      if (parts.length < 3) return { startCol: 2, span: 2, color };
      
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      let startCol = 1;
      
      if (month === 6) {
        if (day <= 7) startCol = 1;
        else if (day <= 14) startCol = 2;
        else if (day <= 21) startCol = 3;
        else startCol = 4;
      } else if (month === 7) {
        if (day <= 7) startCol = 5;
        else if (day <= 14) startCol = 6;
        else if (day <= 21) startCol = 7;
        else startCol = 8;
      } else {
        startCol = 4; // default spill
      }

      // Span based on starting col or priority
      const span = Math.min(3, 9 - startCol);

      return { startCol, span, color };
    } catch {
      return { startCol: 3, span: 2, color };
    }
  };

  const getPriorityGradient = (p: string) => {
    switch (p) {
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
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Cronograma de Projecte (Pla Enterprise)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Planificació visual de l'Asana Enterprise dels mesos de Juny i Juliol del 2026.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5 font-mono">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
            <span>Alta Prioritat</span>
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

      {filteredTasks.length === 0 ? (
        <div className="py-12 border border-dashed border-slate-250 dark:border-slate-800 rounded-none text-center text-slate-400 text-xs">
          <AlertTriangle className="w-6 h-6 mx-auto text-slate-350 mb-2" />
          <span>No hi ha tasques amb data límit assignada en aquest projecte per graficar.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Timeline Grid layout */}
          <div className="min-w-[800px]">
            {/* Headers */}
            <div className="grid grid-cols-12 gap-1 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-4 text-left px-2">Tasca</div>
              {timelineDates.map((date) => (
                <div key={date.key} className="col-span-1 border-l border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                  {date.label}
                </div>
              ))}
            </div>

            {/* List of Tasks represented as Gantt Bars */}
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const { startCol, span } = getTimelinePosition(task.dueDate);
                const gradient = getPriorityGradient(task.priority);
                const assignee = users.find(u => (task.assigneeIds?.includes(u.id) || u.id === task.assigneeId));

                return (
                  <div key={task.id} className="grid grid-cols-12 gap-1 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/10 py-1.5 rounded-none transition-all">
                    {/* Task Title & Assignee left hand */}
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

                    {/* Timeline bar right hand offset */}
                    <div className="col-span-8 grid grid-cols-8 gap-1 h-8 relative items-center">
                      <div
                        className="h-6 bg-gradient-to-r text-[10px] text-white flex items-center px-1.5 font-bold overflow-hidden whitespace-nowrap rounded-none select-none border border-black/10 truncate font-mono"
                        style={{
                          gridColumnStart: startCol,
                          gridColumnEnd: `span ${span}`,
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
