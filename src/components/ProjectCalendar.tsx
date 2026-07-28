import React, { useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "moment/locale/ca";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Task, Project, UserProfile, Workspace } from "../types";
import { Plus } from "lucide-react";
import { DEPARTMENTS } from "../data";

moment.updateLocale("ca", {
  week: {
    dow: 1, // Monday is the first day of the week
  },
});
moment.locale("ca");

const localizer = momentLocalizer(moment);

interface ProjectCalendarProps {
  tasks: Task[];
  projects?: Project[];
  users?: UserProfile[];
  workspaces?: Workspace[];
  activeWorkspaceId?: string;
  activeProjectId?: string | null;
  onAddTask?: (title: string, projectId: string, assigneeIds: string[], priority: any, departmentIds?: string[], dueDate?: string) => void;
  onSelectTask?: (task: Task) => void;
  // Filtres compartits amb el Llistat de tasques (mateix estat, mateix
  // resultat arreu) — el calendari ja rep `tasks` amb aquests filtres
  // aplicats des de fora, i només necessita els valors + setters per
  // mostrar-los al seu propi panell "Filtres".
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterPriority: string;
  setFilterPriority: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterDepartment: string;
  setFilterDepartment: (v: string) => void;
  filterAssignee: string;
  setFilterAssignee: (v: string) => void;
  filterProject: string;
  setFilterProject: (v: string) => void;
  dateFilterField: "startDate" | "dueDate";
  setDateFilterField: (v: "startDate" | "dueDate") => void;
  dateFilterFrom: string;
  setDateFilterFrom: (v: string) => void;
  dateFilterTo: string;
  setDateFilterTo: (v: string) => void;
}

export default function ProjectCalendar({ 
  tasks, 
  projects = [], 
  users = [], 
  workspaces = [],
  activeWorkspaceId,
  activeProjectId,
  onAddTask, 
  onSelectTask,
  searchTerm,
  setSearchTerm,
  filterPriority,
  setFilterPriority,
  filterStatus,
  setFilterStatus,
  filterDepartment,
  setFilterDepartment,
  filterAssignee,
  setFilterAssignee,
  filterProject,
  setFilterProject,
  dateFilterField,
  setDateFilterField,
  dateFilterFrom,
  setDateFilterFrom,
  dateFilterTo,
  setDateFilterTo,
}: ProjectCalendarProps) {
  const [view, setView] = useState<any>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const hasActiveDateFilter = !!dateFilterFrom || !!dateFilterTo;
  const hasActiveFilters =
    filterDepartment !== "all" ||
    filterAssignee !== "all" ||
    filterStatus !== "all" ||
    filterPriority !== "all" ||
    filterProject !== "all" ||
    hasActiveDateFilter ||
    !!searchTerm;

  const [newTitle, setNewTitle] = useState("");
  const [newProjId, setNewProjId] = useState("");
  const [newDepartmentIds, setNewDepartmentIds] = useState<string[]>(["dep-reserves"]);
  const [newAssignees, setNewAssignees] = useState<string[]>([]);

  const toggleAssignee = (userId: string) => {
    setNewAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleDepartment = (deptId: string) => {
    setNewDepartmentIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  // Les tasques ja arriben filtrades des d'App.tsx (mateixos filtres que el
  // Llistat de tasques) — aquí ja no cal tornar a filtrar per res.
  const events = tasks.map(t => {
    const startStr = t.startDate || t.dueDate;
    const endStr = t.dueDate;
    const hasTime = !!t.startTime;

    let startDate: Date;
    let endDate: Date;

    if (hasTime && startStr) {
      // Amb hora concreta: l'esdeveniment ocupa la franja horària real,
      // així es distribueix a la graella d'hores en lloc d'anar a la franja
      // de "tot el dia" (que abans s'omplia sempre, encara que la majoria
      // de tasques no tenen cap hora associada).
      startDate = moment(`${startStr} ${t.startTime}`, "YYYY-MM-DD HH:mm").toDate();
      const endBase = endStr || startStr;
      endDate = t.endTime
        ? moment(`${endBase} ${t.endTime}`, "YYYY-MM-DD HH:mm").toDate()
        : moment(startDate).add(1, "hour").toDate();
    } else {
      startDate = startStr ? moment(startStr).startOf("day").toDate() : new Date();
      endDate = endStr ? moment(endStr).endOf("day").toDate() : new Date();
    }

    const project = projects.find(p => p.id === t.projectId);

    return {
      id: t.id,
      title: t.title,
      start: startDate,
      end: endDate,
      allDay: !hasTime,
      resource: t,
      color: project ? project.color : "#0f172a",
      status: t.status
    };
  });

  const eventStyleGetter = (event: any) => {
    let backgroundColor = event.color || "#0f172a";
    
    if (event.status === "done") {
      backgroundColor = "#cbd5e1";
    }

    const style = {
      backgroundColor,
      borderRadius: "0px", // sleek, non-rounded
      opacity: 1,
      color: event.status === "done" ? "#475569" : "white",
      border: "0px",
      display: "block",
      fontSize: "0.65rem",
      fontWeight: 'bold' as const,
      textTransform: 'uppercase' as const,
      padding: "2px 4px",
      textDecoration: event.status === "done" ? "line-through" : "none"
    };
    return { style };
  };

  const handleSelectSlot = (slotInfo: any) => {
    setNewTaskDate(slotInfo.start);
    setShowAddForm(true);
  };

  const handleSelectEvent = (event: any) => {
    if (onSelectTask && event.resource) {
      onSelectTask(event.resource);
    }
  };

  const handleCreateQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    const finalProjId = newProjId || (projects.length > 0 ? projects[0].id : "");
    const dueDateStr = newTaskDate ? moment(newTaskDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");
    
    if (onAddTask) {
      onAddTask(newTitle, finalProjId, newAssignees, "medium", newDepartmentIds, dueDateStr);
    }
    
    setNewTitle("");
    setNewAssignees([]);
    setNewDepartmentIds(["dep-reserves"]);
    setShowAddForm(false);
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm p-4 min-h-[900px] flex flex-col font-sans">
      <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Calendari del Projecte</h3>
          <p className="text-xs text-slate-500">Planificació i vista general de tasques i calendaris</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setNewTaskDate(new Date());
              setShowAddForm(!showAddForm);
            }}
            className="bg-[#022e5f] hover:bg-[#033b7a] text-white font-bold text-xs py-1.5 px-3 flex items-center gap-1.5 transition-all shadow-sm rounded-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? "Tancar" : "Nova Tasca"}</span>
          </button>
        </div>
      </div>

      {/* Filtres — exactament els mateixos que el Llistat de tasques */}
      <div className="relative mb-4">
        <button
          onClick={() => setShowFiltersPanel((v) => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-none border font-semibold transition-colors ${
            hasActiveFilters
              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
              : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
        >
          <span>Filtres{hasActiveFilters ? " ●" : ""}</span>
        </button>

        {showFiltersPanel && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowFiltersPanel(false)}></div>
            <div className="absolute top-full left-0 mt-1.5 w-[340px] bg-white border border-slate-200 shadow-xl rounded-none p-3.5 z-50 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Cerca</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cerca pel nom..."
                  className="w-full text-xs border border-slate-200 rounded-none px-2 py-1.5"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Espai de treball</span>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-none px-2 py-1.5 font-semibold"
                >
                  <option value="all">Tots</option>
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Persona</span>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-none px-2 py-1.5 font-semibold"
                >
                  <option value="all">Totes</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Estat</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-none px-2 py-1.5 font-semibold"
                >
                  <option value="all">Tots els estats</option>
                  <option value="todo">Pendent</option>
                  <option value="in_progress">En Procés</option>
                  <option value="review">En Revisió</option>
                  <option value="done">Completada</option>
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Prioritat</span>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-none px-2 py-1.5 font-semibold"
                >
                  <option value="all">Totes</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">Alta</option>
                  <option value="medium">Mitjana</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Projecte</span>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-none px-2 py-1.5 font-semibold"
                >
                  <option value="all">Tots</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="border-t border-slate-150 pt-3 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Filtrar per rang de dates</span>
                <div className="flex items-center border border-slate-200 rounded-none overflow-hidden text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setDateFilterField("startDate")}
                    className={`flex-1 py-1.5 transition-colors ${dateFilterField === "startDate" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                  >
                    Data d'inici
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilterField("dueDate")}
                    className={`flex-1 py-1.5 transition-colors border-l border-slate-200 ${dateFilterField === "dueDate" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                  >
                    Data límit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block">Des de</span>
                    <input
                      type="date"
                      value={dateFilterFrom}
                      onChange={(e) => setDateFilterFrom(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-none px-1.5 py-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block">Fins a</span>
                    <input
                      type="date"
                      value={dateFilterTo}
                      onChange={(e) => setDateFilterTo(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-none px-1.5 py-1"
                    />
                  </div>
                </div>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterDepartment("all");
                    setFilterAssignee("all");
                    setFilterStatus("all");
                    setFilterPriority("all");
                    setFilterProject("all");
                    setDateFilterFrom("");
                    setDateFilterTo("");
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
              <input
                type="text"
                required
                placeholder="Ex. Preparar contingut..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none focus:border-blue-500 text-xs text-slate-800 rounded-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Projecte</label>
              <select
                value={newProjId}
                onChange={(e) => setNewProjId(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none focus:border-blue-500 text-xs text-slate-800 rounded-none"
              >
                <option value="">Selecciona projecte</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 relative group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departaments</label>
              <button 
                type="button" 
                className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none text-xs text-slate-800 rounded-none flex items-center justify-between"
              >
                <span>{newDepartmentIds.length} sel.</span>
              </button>
              <div className="hidden group-hover:block absolute z-10 w-48 mt-1 p-2 bg-white border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                {DEPARTMENTS.map(d => (
                  <label key={d.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={newDepartmentIds.includes(d.id)}
                      onChange={() => toggleDepartment(d.id)}
                      className="rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">{d.name.replace("Departament de ", "").replace("Departament ", "")}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1 relative group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Membres assignats</label>
              <button 
                type="button" 
                className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none text-xs text-slate-800 rounded-none flex items-center justify-between"
              >
                <span>{newAssignees.length} sel.</span>
              </button>
              <div className="hidden group-hover:block absolute z-10 w-48 mt-1 p-2 bg-white border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                {users.map(u => (
                  <label key={u.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={newAssignees.includes(u.id)}
                      onChange={() => toggleAssignee(u.id)}
                      className="rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-end space-x-2 border-l border-slate-200 pl-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 rounded-none"
              >
                Cancel·lar
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-none"
              >
                Crear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Styled Big Calendar Container */}
      <div className="flex-1 min-h-[550px] custom-calendar-wrapper">
        <style>{`
          .custom-calendar-wrapper .rbc-toolbar button {
            color: #475569;
            border-color: #cbd5e1;
            border-radius: 0;
            font-size: 0.75rem;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.05em;
            padding: 0.25rem 0.5rem;
            margin-right: -1px;
          }
          .custom-calendar-wrapper .rbc-toolbar button:active,
          .custom-calendar-wrapper .rbc-toolbar button.rbc-active {
            background-color: #0f172a;
            color: #ffffff;
            border-color: #0f172a;
            box-shadow: none;
          }
          .custom-calendar-wrapper .rbc-toolbar button:hover:not(.rbc-active) {
            background-color: #f1f5f9;
          }
          .custom-calendar-wrapper .rbc-header {
            padding: 0.5rem;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #1e293b;
            background-color: #f8fafc;
            border-bottom: 2px solid #e2e8f0;
          }
          .custom-calendar-wrapper .rbc-month-view,
          .custom-calendar-wrapper .rbc-time-view,
          .custom-calendar-wrapper .rbc-agenda-view {
            border: 1px solid #e2e8f0;
            border-radius: 0;
          }
          .custom-calendar-wrapper .rbc-day-bg + .rbc-day-bg {
            border-left: 1px solid #e2e8f0;
          }
          .custom-calendar-wrapper .rbc-month-row + .rbc-month-row {
            border-top: 1px solid #e2e8f0;
          }
          .custom-calendar-wrapper .rbc-today {
            background-color: #eff6ff;
          }
          .custom-calendar-wrapper .rbc-off-range-bg {
            background-color: #f8fafc;
          }
          .custom-calendar-wrapper .rbc-date-cell {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            font-weight: 600;
            color: #475569;
          }
        `}</style>
        <Calendar
          localizer={localizer}
          culture="ca"
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          selectable={true}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          messages={{
            today: "Avui",
            previous: "Enrere",
            next: "Següent",
            month: "Mes",
            week: "Setmana",
            day: "Dia",
            agenda: "Agenda",
            date: "Data",
            time: "Hora",
            event: "Tasca / Projecte",
            noEventsInRange: "No hi ha tasques en aquest rang de dates.",
            showMore: (total) => `+ ${total} més`
          }}
        />
      </div>
    </div>
  );
}
