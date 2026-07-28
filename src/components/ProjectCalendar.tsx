// ============================================================================
// PROJECT CALENDAR — component propi, sense dependre de react-big-calendar
// ============================================================================
// Reconstruït des de zero perquè react-big-calendar tenia massa peculiaritats
// internes difícils de controlar (events "tot el dia" sempre, alçada
// inestable, filtres desconnectats, clics que no obrien el detall). Aquest
// component és un calendari propi inspirat en Google Calendar: vistes de
// Mes / Setmana / Dia, arrossegar per canviar data/hora, i colors per
// projecte — amb control total sobre cada comportament.
// ============================================================================

import React, { useState } from "react";
import { Task, Project, UserProfile, Workspace } from "../types";
import { ChevronLeft, ChevronRight, Plus, Filter, X } from "lucide-react";
import { DEPARTMENTS } from "../data";

interface ProjectCalendarProps {
  tasks: Task[];
  projects?: Project[];
  users?: UserProfile[];
  workspaces?: Workspace[];
  activeWorkspaceId?: string;
  activeProjectId?: string | null;
  onAddTask?: (title: string, projectId: string, assigneeIds: string[], priority: any, departmentIds?: string[], dueDate?: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onSelectTask?: (task: Task) => void;
  // Filtres compartits amb el Llistat de tasques
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterPriority: string;
  setFilterPriority: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterAssignee: string;
  setFilterAssignee: (v: string) => void;
  dateFilterField: "startDate" | "dueDate";
  setDateFilterField: (v: "startDate" | "dueDate") => void;
  dateFilterFrom: string;
  setDateFilterFrom: (v: string) => void;
  dateFilterTo: string;
  setDateFilterTo: (v: string) => void;
}

type ViewMode = "month" | "week" | "day";

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}
function startOfWeek(d: Date): Date {
  const nd = new Date(d);
  const day = nd.getDay();
  const diff = day === 0 ? 6 : day - 1;
  nd.setDate(nd.getDate() - diff);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function getMonthGrid(d: Date): Date[] {
  const first = startOfMonth(d);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}
function getWeekDays(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
const MONTH_NAMES = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"];
const DAY_NAMES = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];
const DAY_NAMES_LONG = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 48;

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ProjectCalendar({
  tasks,
  projects = [],
  users = [],
  workspaces = [],
  onAddTask,
  onUpdateTask,
  onSelectTask,
  searchTerm,
  setSearchTerm,
  filterPriority,
  setFilterPriority,
  filterStatus,
  setFilterStatus,
  filterAssignee,
  setFilterAssignee,
  dateFilterField,
  setDateFilterField,
  dateFilterFrom,
  setDateFilterFrom,
  dateFilterTo,
  setDateFilterTo,
}: ProjectCalendarProps) {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newProjId, setNewProjId] = useState("");
  const [newDepartmentIds, setNewDepartmentIds] = useState<string[]>(["dep-reserves"]);
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(() => workspaces.map(w => w.id));
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => projects.map(p => p.id));
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  React.useEffect(() => {
    if (!hasInitializedSelection && workspaces.length > 0 && projects.length > 0) {
      setSelectedWorkspaceIds(workspaces.map(w => w.id));
      setSelectedProjectIds(projects.map(p => p.id));
      setHasInitializedSelection(true);
    }
  }, [workspaces, projects, hasInitializedSelection]);

  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const hasActiveDateFilter = !!dateFilterFrom || !!dateFilterTo;
  const hasActiveFilters =
    filterAssignee !== "all" || filterStatus !== "all" || filterPriority !== "all" ||
    hasActiveDateFilter || !!searchTerm ||
    selectedWorkspaceIds.length !== workspaces.length || selectedProjectIds.length !== projects.length;

  const getTaskWorkspaceId = (t: Task) => {
    if (t.workspaceId) return t.workspaceId;
    const project = projects.find(p => p.id === t.projectId);
    return project ? project.workspaceId : "";
  };

  const calendarTasks = tasks.filter(t => {
    const wsId = getTaskWorkspaceId(t);
    if (wsId && !selectedWorkspaceIds.includes(wsId)) return false;
    if (t.projectId && !selectedProjectIds.includes(t.projectId)) return false;
    return true;
  });

  const getTaskColor = (t: Task) => {
    const project = projects.find(p => p.id === t.projectId);
    return project?.color || "#0f172a";
  };

  const tasksForDay = (day: Date) => {
    const key = formatDateKey(day);
    return calendarTasks.filter(t => (t.dueDate || t.startDate) === key);
  };

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    if (view === "month") setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    else if (view === "week") setCurrentDate(d => addDays(d, -7));
    else setCurrentDate(d => addDays(d, -1));
  };
  const goNext = () => {
    if (view === "month") setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    else if (view === "week") setCurrentDate(d => addDays(d, 7));
    else setCurrentDate(d => addDays(d, 1));
  };

  const headerLabel = (() => {
    if (view === "month") return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === "day") return `${DAY_NAMES_LONG[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}, ${currentDate.getDate()} ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    const days = getWeekDays(currentDate);
    const start = days[0], end = days[6];
    if (start.getMonth() === end.getMonth()) return `${start.getDate()} – ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
    return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
  })();

  const handleDropOnDay = (day: Date) => {
    if (!draggedTaskId || !onUpdateTask) return;
    const task = calendarTasks.find(t => t.id === draggedTaskId);
    if (!task) return;
    const newDueKey = formatDateKey(day);
    const updates: Partial<Task> = { dueDate: newDueKey };
    if (task.startDate && task.dueDate) {
      const oldDue = parseDateKey(task.dueDate);
      const oldStart = parseDateKey(task.startDate);
      const diffDays = Math.round((oldDue.getTime() - oldStart.getTime()) / 86400000);
      const newStart = addDays(day, -diffDays);
      updates.startDate = formatDateKey(newStart);
    }
    onUpdateTask(task.id, updates);
    setDraggedTaskId(null);
  };

  const handleDropOnHour = (day: Date, hour: number, minute: number) => {
    if (!draggedTaskId || !onUpdateTask) return;
    const task = calendarTasks.find(t => t.id === draggedTaskId);
    if (!task) return;
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    const updates: Partial<Task> = {
      dueDate: formatDateKey(day),
      startTime: `${hh}:${mm}`,
    };
    if (task.startTime && task.endTime) {
      const [sh, sm] = task.startTime.split(":").map(Number);
      const [eh, em] = task.endTime.split(":").map(Number);
      const durationMin = (eh * 60 + em) - (sh * 60 + sm);
      const newEndMin = hour * 60 + minute + Math.max(durationMin, 15);
      updates.endTime = `${String(Math.floor(newEndMin / 60) % 24).padStart(2, "0")}:${String(newEndMin % 60).padStart(2, "0")}`;
    }
    onUpdateTask(task.id, updates);
    setDraggedTaskId(null);
  };

  const toggleAssignee = (userId: string) => {
    setNewAssignees(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };
  const toggleDepartment = (deptId: string) => {
    setNewDepartmentIds(prev => prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]);
  };
  const handleCreateQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const finalProjId = newProjId || (projects.length > 0 ? projects[0].id : "");
    const dueDateStr = newTaskDate ? formatDateKey(newTaskDate) : formatDateKey(new Date());
    if (onAddTask) onAddTask(newTitle, finalProjId, newAssignees, "medium", newDepartmentIds, dueDateStr);
    setNewTitle(""); setNewAssignees([]); setNewDepartmentIds(["dep-reserves"]); setShowAddForm(false);
  };

  const EventChip = ({ task, compact = false }: { task: Task; compact?: boolean }) => (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); setDraggedTaskId(task.id); }}
      onClick={(e) => { e.stopPropagation(); onSelectTask?.(task); }}
      title={task.title}
      className={`cursor-pointer truncate rounded-sm px-1.5 font-bold text-white ${compact ? "text-[9.5px] py-0.5" : "text-[10px] py-1"} ${task.status === "done" ? "opacity-50 line-through" : ""}`}
      style={{ backgroundColor: getTaskColor(task) }}
    >
      {task.startTime && <span className="font-mono mr-1">{task.startTime}</span>}
      {task.title}
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 shadow-sm p-4 min-h-[900px] flex flex-col font-sans">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Calendari del Projecte</h3>
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="p-1 border border-slate-200 hover:bg-slate-50"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={goToday} className="text-[10px] font-bold px-2 py-1 border border-slate-200 hover:bg-slate-50">Avui</button>
            <button onClick={goNext} className="p-1 border border-slate-200 hover:bg-slate-50"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <span className="text-xs font-bold text-slate-700 capitalize">{headerLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-slate-200">
            {(["month", "week", "day"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-[10px] font-bold uppercase px-2.5 py-1.5 ${view === v ? "bg-[#0f172a] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                {v === "month" ? "Mes" : v === "week" ? "Setmana" : "Dia"}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setNewTaskDate(currentDate); setShowAddForm(!showAddForm); }}
            className="bg-[#022e5f] hover:bg-[#033b7a] text-white font-bold text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? "Tancar" : "Nova Tasca"}</span>
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <button
          onClick={() => setShowFiltersPanel(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border font-semibold ${hasActiveFilters ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filtres{hasActiveFilters ? " ●" : ""}</span>
        </button>
        {showFiltersPanel && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowFiltersPanel(false)}></div>
            <div className="absolute top-full left-0 mt-1.5 w-[340px] bg-white border border-slate-200 shadow-xl p-3.5 z-50 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Cerca</span>
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cerca pel nom..." className="w-full text-xs border border-slate-200 px-2 py-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Espais ({selectedWorkspaceIds.length}/{workspaces.length})</span>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setSelectedWorkspaceIds(workspaces.map(w => w.id))} className="text-[9px] font-bold text-slate-500 hover:text-indigo-600">Tots</button>
                    <button type="button" onClick={() => setSelectedWorkspaceIds([])} className="text-[9px] font-bold text-slate-500 hover:text-rose-600">Cap</button>
                  </div>
                </div>
                <div className="max-h-28 overflow-y-auto border border-slate-200 p-1.5 space-y-0.5">
                  {workspaces.map(w => (
                    <label key={w.id} className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-slate-50 px-1">
                      <input type="checkbox" checked={selectedWorkspaceIds.includes(w.id)} onChange={() => setSelectedWorkspaceIds(prev => prev.includes(w.id) ? prev.filter(id => id !== w.id) : [...prev, w.id])} className="rounded-none border-slate-300" />
                      <span className="text-[11px] text-slate-700 truncate">{w.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Projectes ({selectedProjectIds.length}/{projects.length})</span>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setSelectedProjectIds(projects.map(p => p.id))} className="text-[9px] font-bold text-slate-500 hover:text-indigo-600">Tots</button>
                    <button type="button" onClick={() => setSelectedProjectIds([])} className="text-[9px] font-bold text-slate-500 hover:text-rose-600">Cap</button>
                  </div>
                </div>
                <div className="max-h-28 overflow-y-auto border border-slate-200 p-1.5 space-y-0.5">
                  {projects.filter(p => selectedWorkspaceIds.includes(p.workspaceId)).map(p => (
                    <label key={p.id} className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-slate-50 px-1">
                      <input type="checkbox" checked={selectedProjectIds.includes(p.id)} onChange={() => setSelectedProjectIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} className="rounded-none border-slate-300" />
                      <span className="text-[11px] text-slate-700 truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Persona</span>
                <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="w-full text-xs border border-slate-200 px-2 py-1.5 font-semibold">
                  <option value="all">Totes</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Estat</span>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full text-xs border border-slate-200 px-2 py-1.5 font-semibold">
                  <option value="all">Tots els estats</option>
                  <option value="todo">Pendent</option>
                  <option value="in_progress">En Procés</option>
                  <option value="review">En Revisió</option>
                  <option value="done">Completada</option>
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Prioritat</span>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-full text-xs border border-slate-200 px-2 py-1.5 font-semibold">
                  <option value="all">Totes</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">Alta</option>
                  <option value="medium">Mitjana</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
              <div className="border-t border-slate-150 pt-3 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Rang de dates ({dateFilterField === "dueDate" ? "venciment" : "inici"})</span>
                <div className="flex border border-slate-200 overflow-hidden text-[11px] font-semibold">
                  <button type="button" onClick={() => setDateFilterField("startDate")} className={`flex-1 py-1.5 ${dateFilterField === "startDate" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>Data d'inici</button>
                  <button type="button" onClick={() => setDateFilterField("dueDate")} className={`flex-1 py-1.5 border-l border-slate-200 ${dateFilterField === "dueDate" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>Data límit</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={dateFilterFrom} onChange={e => setDateFilterFrom(e.target.value)} className="text-xs border border-slate-200 px-1.5 py-1" />
                  <input type="date" value={dateFilterTo} onChange={e => setDateFilterTo(e.target.value)} className="text-xs border border-slate-200 px-1.5 py-1" />
                </div>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm(""); setFilterAssignee("all"); setFilterStatus("all"); setFilterPriority("all");
                    setDateFilterFrom(""); setDateFilterTo("");
                    setSelectedWorkspaceIds(workspaces.map(w => w.id));
                    setSelectedProjectIds(projects.map(p => p.id));
                  }}
                  className="w-full text-center text-[11px] font-bold text-rose-600 hover:text-rose-800 border-t border-slate-150 pt-2.5"
                >
                  Netejar tots els filtres
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {showAddForm && (
        <div className="bg-slate-50 border border-slate-200 p-4 mb-4 shadow-sm text-left">
          <form onSubmit={handleCreateQuickTask} className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nom de la tasca</label>
              <input type="text" required placeholder="Ex. Preparar contingut..." value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Projecte</label>
              <select value={newProjId} onChange={e => setNewProjId(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 text-xs">
                <option value="">Selecciona projecte</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1 relative group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departaments</label>
              <button type="button" className="w-full px-2 py-1.5 bg-white border border-slate-200 text-xs flex items-center justify-between">
                <span>{newDepartmentIds.length} sel.</span>
              </button>
              <div className="hidden group-hover:block absolute z-10 w-48 mt-1 p-2 bg-white border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                {DEPARTMENTS.map(d => (
                  <label key={d.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={newDepartmentIds.includes(d.id)} onChange={() => toggleDepartment(d.id)} className="rounded-none border-slate-300" />
                    <span className="text-xs text-slate-700">{d.name.replace("Departament de ", "").replace("Departament ", "")}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1 relative group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Membres assignats</label>
              <button type="button" className="w-full px-2 py-1.5 bg-white border border-slate-200 text-xs flex items-center justify-between">
                <span>{newAssignees.length} sel.</span>
              </button>
              <div className="hidden group-hover:block absolute z-10 w-48 mt-1 p-2 bg-white border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                {users.map(u => (
                  <label key={u.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={newAssignees.includes(u.id)} onChange={() => toggleAssignee(u.id)} className="rounded-none border-slate-300" />
                    <span className="text-xs text-slate-700">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-end space-x-2 border-l border-slate-200 pl-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100">Cancel·lar</button>
              <button type="submit" disabled={!newTitle.trim()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs">Crear</button>
            </div>
          </form>
        </div>
      )}

      {view === "month" && (
        <div className="flex-1 flex flex-col border border-slate-200">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-[10px] font-bold uppercase text-slate-500 text-center py-2 tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1">
            {getMonthGrid(currentDate).map((day, i) => {
              const dayTasks = tasksForDay(day);
              const inMonth = day.getMonth() === currentDate.getMonth();
              const today = isSameDay(day, new Date());
              return (
                <div
                  key={i}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDropOnDay(day)}
                  onDoubleClick={() => { setNewTaskDate(day); setShowAddForm(true); }}
                  className={`min-h-[100px] border-r border-b border-slate-150 p-1 space-y-0.5 ${inMonth ? "bg-white" : "bg-slate-50/60"}`}
                >
                  <span className={`text-[10px] font-bold inline-flex items-center justify-center w-5 h-5 rounded-full ${today ? "bg-[#0f172a] text-white" : inMonth ? "text-slate-600" : "text-slate-350"}`}>
                    {day.getDate()}
                  </span>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map(t => <EventChip key={t.id} task={t} compact />)}
                    {dayTasks.length > 3 && (
                      <div className="text-[9px] font-bold text-slate-400 pl-1">+{dayTasks.length - 3} més</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(view === "week" || view === "day") && (() => {
        const days = view === "week" ? getWeekDays(currentDate) : [currentDate];
        const allDayTasksFor = (day: Date) => tasksForDay(day).filter(t => !t.startTime);
        const timedTasksFor = (day: Date) => tasksForDay(day).filter(t => !!t.startTime);
        return (
          <div className="flex-1 flex flex-col border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50">
              <div className="w-14 shrink-0" />
              {days.map((day, i) => {
                const today = isSameDay(day, new Date());
                return (
                  <div key={i} className="flex-1 text-center py-2 border-l border-slate-150">
                    <div className="text-[9.5px] font-bold uppercase text-slate-500 tracking-wider">{DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}</div>
                    <div className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full mt-0.5 ${today ? "bg-[#0f172a] text-white" : "text-slate-700"}`}>{day.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex border-b border-slate-200 min-h-[36px]">
              <div className="w-14 shrink-0 text-[9px] font-bold text-slate-400 flex items-center justify-center uppercase">Tot el dia</div>
              {days.map((day, i) => (
                <div
                  key={i}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDropOnDay(day)}
                  className="flex-1 border-l border-slate-150 p-0.5 space-y-0.5"
                >
                  {allDayTasksFor(day).map(t => <EventChip key={t.id} task={t} compact />)}
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="flex relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                <div className="w-14 shrink-0">
                  {HOURS.map(h => (
                    <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[9px] font-mono text-slate-400 text-right pr-1.5 -translate-y-1.5 border-t border-slate-100">
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
                {days.map((day, di) => (
                  <div key={di} className="flex-1 border-l border-slate-150 relative">
                    {HOURS.map(h => (
                      <div
                        key={h}
                        style={{ height: HOUR_HEIGHT }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => handleDropOnHour(day, h, 0)}
                        className="border-t border-slate-100 hover:bg-slate-50/60"
                      />
                    ))}
                    {timedTasksFor(day).map(t => {
                      const [sh, sm] = (t.startTime || "00:00").split(":").map(Number);
                      const top = (sh + sm / 60) * HOUR_HEIGHT;
                      let heightMin = 30;
                      if (t.endTime) {
                        const [eh, em] = t.endTime.split(":").map(Number);
                        heightMin = Math.max((eh * 60 + em) - (sh * 60 + sm), 20);
                      }
                      const height = (heightMin / 60) * HOUR_HEIGHT;
                      return (
                        <div key={t.id} className="absolute left-0.5 right-0.5" style={{ top, height }}>
                          <EventChip task={t} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
