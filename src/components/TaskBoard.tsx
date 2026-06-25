import React, { useState } from "react";
import { Task, UserProfile, Project, TaskStatus } from "../types";
import { ChevronRight, ChevronLeft, ArrowRightLeft, Calendar, Kanban, LayoutGrid } from "lucide-react";
import { motion } from "motion/react";
import { DEPARTMENTS } from "../data";

interface TaskBoardProps {
  tasks: Task[];
  users: UserProfile[];
  projects: Project[];
  activeProjectId: string | null;
  activeWorkspaceId: string;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onSelectTaskForDetails: (task: Task) => void;
  isCompactView?: boolean;
}

export default function TaskBoard({
  tasks,
  users,
  projects,
  activeProjectId,
  activeWorkspaceId,
  onUpdateTask,
  onSelectTaskForDetails,
  isCompactView = false,
}: TaskBoardProps) {
  // Option to group the board by status ("status") or by department ("department")
  const [groupBy, setGroupBy] = useState<"status" | "department">("department");

  interface BoardColumn {
    id: string;
    title: string;
    color: string;
    bg: string;
    borderTopColor?: string;
  }

  // Columns for grouping by Status
  const statusColumns: BoardColumn[] = [
    { id: "todo", title: "Pendent", color: "text-slate-700 bg-slate-100 border-slate-300", bg: "bg-slate-50/60" },
    { id: "in_progress", title: "En Procés", color: "text-blue-700 bg-blue-50 border-blue-200", bg: "bg-slate-50/60" },
    { id: "review", title: "En Revisió", color: "text-indigo-700 bg-indigo-50 border-indigo-200", bg: "bg-slate-50/60" },
    { id: "done", title: "Completada", color: "text-emerald-700 bg-emerald-50 border-emerald-200", bg: "bg-slate-50/60" },
  ];

  // Columns for grouping by Department
  const deptColumns: BoardColumn[] = DEPARTMENTS.map((d) => ({
    id: d.id,
    title: d.name.replace("Departament de ", "").replace("Departament ", ""),
    color: `text-slate-800 bg-white`,
    bg: "bg-slate-50/60",
    borderTopColor: d.color,
  }));

  const activeColumns = groupBy === "status" ? statusColumns : deptColumns;

  // Filter tasks to active project/workspace
  const filteredTasks = tasks.filter((task) => {
    if (activeProjectId && task.projectId !== activeProjectId) return false;
    const tWorkspaceId = task.workspaceId || projects.find(p => p.id === task.projectId)?.workspaceId;
    if (!activeProjectId && tWorkspaceId !== activeWorkspaceId) return false;
    return true;
  });

  // Safe fetch of departments list for a task
  const getTaskDepartments = (task: Task): string[] => {
    if (task.departmentIds && task.departmentIds.length > 0) {
      return task.departmentIds;
    }
    return task.departmentId ? [task.departmentId] : ["dep-reserves"];
  };

  // Helper to move task when grouped by status
  const handleMoveStatus = (task: Task, direction: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail panel
    const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];
    const currIdx = statuses.indexOf(task.status);
    let nextIdx = direction === "right" ? currIdx + 1 : currIdx - 1;

    if (nextIdx >= 0 && nextIdx < statuses.length) {
      onUpdateTask(task.id, { status: statuses[nextIdx] });
    }
  };

  // Helper to move task when grouped by department (assign / cycle primary department)
  const handleMoveDept = (task: Task, direction: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail panel
    const currentDepts = getTaskDepartments(task);
    const allDeptIds = DEPARTMENTS.map((d) => d.id);
    
    // Cycle the primary (first) department
    const currIdx = allDeptIds.indexOf(currentDepts[0] || "dep-reserves");
    let nextIdx = direction === "right" ? currIdx + 1 : currIdx - 1;

    if (nextIdx >= 0 && nextIdx < allDeptIds.length) {
      const nextDept = allDeptIds[nextIdx];
      // Build updated list (place new dept first)
      const nextDeptsList = currentDepts.includes(nextDept)
        ? [nextDept, ...currentDepts.filter((id) => id !== nextDept)]
        : [nextDept, ...currentDepts];

      onUpdateTask(task.id, {
        departmentId: nextDept,
        departmentIds: nextDeptsList,
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <span className="px-2 py-0.5 text-[9px] font-extrabold bg-red-600 text-white rounded uppercase tracking-wider animate-pulse">Urgent</span>;
      case "high":
        return <span className="px-2 py-0.5 text-[9px] font-extrabold bg-rose-50 text-rose-600 rounded uppercase tracking-wider">Alt</span>;
      case "medium":
        return <span className="px-2 py-0.5 text-[9px] font-extrabold bg-amber-50 text-amber-600 rounded uppercase tracking-wider">Mitjà</span>;
      default:
        return <span className="px-2 py-0.5 text-[9px] font-extrabold bg-slate-100 text-slate-500 rounded uppercase tracking-wider">Baix</span>;
    }
  };

  return (
    <div className="space-y-4" id="task-board-wrapper">
      {/* Board Controls */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150">Taulell Interactiu d'Acció</h3>
          <p className="text-[11px] text-slate-400">Canvia la distribució de les columnes per obtenir perspectives d'estat o de càrrega de treball per equips.</p>
        </div>
        
        {/* Toggle Selector */}
        <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            onClick={() => setGroupBy("department")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-semibold transition-all ${
              groupBy === "department"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Per Departaments</span>
          </button>
          
          <button
            onClick={() => setGroupBy("status")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-semibold transition-all ${
              groupBy === "status"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Per Estats</span>
          </button>
        </div>
      </div>

      {/* Grid columns */}
      <div 
        className={`grid grid-cols-1 md:grid-cols-2 ${
          groupBy === "status" ? "lg:grid-cols-4" : "lg:grid-cols-5"
        } gap-5`}
        id="kanban-board-cols"
      >
        {activeColumns.map((col) => {
          // Filter tasks correctly matching this column
          const colTasks = filteredTasks.filter((t) => {
            if (groupBy === "status") {
              return t.status === col.id;
            } else {
              // Task belongs to this department
              return getTaskDepartments(t).includes(col.id);
            }
          });

          return (
            <div
              key={col.id}
              className={`rounded-xl border border-slate-200/80 flex flex-col transition-all ${col.bg} ${
                isCompactView ? "p-2.5 min-h-[400px]" : "p-4 min-h-[550px]"
              }`}
              style={groupBy === "department" ? { borderTop: `4px solid ${col.borderTopColor}` } : undefined}
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between border-b border-slate-200/50 ${
                isCompactView ? "mb-2 pb-1.5" : "mb-4 pb-2"
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-bold ${col.color}`}>
                    {col.title}
                  </span>
                  <span className="text-xs text-slate-500 font-sans font-bold bg-slate-200/50 px-1.5 py-0.5 rounded">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Column Body / Card collection */}
              <div className={`flex-1 overflow-y-auto max-h-[650px] pr-1 scrollbar-thin ${
                isCompactView ? "space-y-2" : "space-y-3.5"
              }`}>
                {colTasks.length === 0 ? (
                  <div className="h-28 rounded-xl border border-dashed border-slate-250 flex flex-col items-center justify-center p-4 text-center text-[11px] text-slate-400 bg-white/40">
                    <ArrowRightLeft className="w-5 h-5 text-slate-300 mb-1" />
                    <span>Sense tasques</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const assignee = users.find((u) => (task.assigneeIds?.includes(u.id) || u.id === task.assigneeId));
                    const proj = projects.find((p) => p.id === task.projectId);
                    const taskDepts = getTaskDepartments(task);

                    return (
                      <motion.div
                        layout
                        key={`${task.id}-${col.id}`}
                        onClick={() => onSelectTaskForDetails(task)}
                        className={`block bg-white border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_1.5px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:translate-y-[-1px] transition-all cursor-pointer relative group-card border-l-4 ${
                          isCompactView ? "p-2.5 rounded-lg" : "p-4 rounded-xl"
                        }`}
                        style={{ borderLeftColor: proj ? proj.color : "#cbd5e1" }}
                      >
                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-800 hover:text-blue-600 leading-snug tracking-tight">
                            {task.title}
                          </h4>
                          <div className="shrink-0">{getPriorityBadge(task.priority)}</div>
                        </div>

                        {/* Description (Highlighted Container for Supreme Legibility) */}
                        {task.description ? (
                          <div className="mt-2.5 bg-slate-50 text-[11px] text-slate-700 p-2.5 rounded-lg border-0 leading-relaxed font-sans max-h-20 overflow-y-auto whitespace-pre-line border-l-2 border-slate-250">
                            {task.description}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-450 italic mt-1.5">— Sense descripció</p>
                        )}

                        {/* Metainfo Row */}
                        <div className="flex flex-col gap-2 mt-3.5 pt-3 border-t border-slate-100">
                          {/* Assigned Departments Pills */}
                          <div className="flex flex-wrap gap-1">
                            {taskDepts.map((dId) => {
                              const deptObj = DEPARTMENTS.find((dep) => dep.id === dId);
                              if (!deptObj) return null;
                              return (
                                <span
                                  key={dId}
                                  className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded text-white font-sans tracking-wide shadow-xs"
                                  style={{ backgroundColor: deptObj.color }}
                                  title={deptObj.name}
                                >
                                  {deptObj.name.replace("Departament de ", "").replace("Departament ", "")}
                                </span>
                              );
                            })}
                          </div>

                          {/* Project, Date, and Person */}
                          <div className="flex items-center justify-between">
                            {/* Project Chip */}
                            <span 
                              className="text-[9px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[95px]"
                              title={proj ? proj.name : "Tasca General"}
                            >
                              {proj ? proj.name : "General"}
                            </span>

                            <div className="flex items-center gap-2">
                              {/* Due Date Indicator */}
                              {task.dueDate && (
                                <div className="flex items-center gap-1 text-[9.5px] text-slate-500 font-sans font-bold">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{task.dueDate.split("-").slice(1).join("/")}</span>
                                </div>
                              )}

                              {/* Member Avatar */}
                              <div
                                className="w-5.5 h-5.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold flex items-center justify-center text-[9px]"
                                title={assignee ? assignee.name : "No assignat"}
                              >
                                {assignee ? assignee.avatar : "U"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Direction Toggles for touchscreen / Quick move */}
                        <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-dashed border-slate-100 opacity-60 hover:opacity-100 transition-all">
                          <span className="text-[9px] text-slate-400 font-bold mr-auto uppercase tracking-wider">Moure:</span>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              if (groupBy === "status") {
                                handleMoveStatus(task, "left", e);
                              } else {
                                handleMoveDept(task, "left", e);
                              }
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 border border-slate-200"
                            title={groupBy === "status" ? "Moure a columna esquerra" : "Atribuir a departament anterior"}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              if (groupBy === "status") {
                                handleMoveStatus(task, "right", e);
                              } else {
                                handleMoveDept(task, "right", e);
                              }
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 border border-slate-200"
                            title={groupBy === "status" ? "Moure a columna dreta" : "Atribuir a departament següent"}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
