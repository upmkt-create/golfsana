import React, { useState, useEffect } from "react";
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
}

export default function ProjectCalendar({ 
  tasks, 
  projects = [], 
  users = [], 
  workspaces = [],
  activeWorkspaceId,
  activeProjectId,
  onAddTask, 
  onSelectTask 
}: ProjectCalendarProps) {
  const [view, setView] = useState<any>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  
  const [newTitle, setNewTitle] = useState("");
  const [newProjId, setNewProjId] = useState("");
  const [newDepartmentIds, setNewDepartmentIds] = useState<string[]>(["dep-reserves"]);
  const [newAssignees, setNewAssignees] = useState<string[]>([]);

  // Filter States
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(() => workspaces.map(w => w.id));
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => projects.map(p => p.id));
  const [hasInitialized, setHasInitialized] = useState(false);

  // Sync to show all workspaces & projects once they initially load from persistence
  useEffect(() => {
    if (!hasInitialized && workspaces.length > 0 && projects.length > 0) {
      setSelectedWorkspaceIds(workspaces.map(w => w.id));
      setSelectedProjectIds(projects.map(p => p.id));
      setHasInitialized(true);
    }
  }, [workspaces, projects, hasInitialized]);

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

  // Helper helper to locate a task's workspace ID correctly
  const getTaskWorkspaceId = (t: Task) => {
    if (t.workspaceId) return t.workspaceId;
    const project = projects.find(p => p.id === t.projectId);
    return project ? project.workspaceId : "";
  };

  // Filter the tasks shown inside the calendar dynamically
  const filteredTasks = tasks.filter(t => {
    const wsId = getTaskWorkspaceId(t);
    // If we have selected workspace filters active, tasks must belong to those workspaces
    if (wsId && !selectedWorkspaceIds.includes(wsId)) return false;

    // If task template is bound to a project, project must be toggled on
    if (t.projectId && !selectedProjectIds.includes(t.projectId)) return false;

    return true;
  });

  const events = filteredTasks.map(t => {
    const startStr = t.startDate || t.dueDate;
    const endStr = t.dueDate;

    const startDate = startStr ? moment(startStr).startOf("day").toDate() : new Date();
    const endDate = endStr ? moment(endStr).endOf("day").toDate() : new Date();

    const project = projects.find(p => p.id === t.projectId);

    return {
      id: t.id,
      title: t.title,
      start: startDate,
      end: endDate,
      allDay: true,
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

      {/* Visual Filters Section */}
      <div className="bg-slate-50 border border-slate-200 p-4 mb-4 space-y-4 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
          <div>
            <h4 className="text-xs font-bold text-[#022e5f] uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Filtres de visualització de tasques
            </h4>
            <p className="text-[11px] text-slate-500">Selecciona quins espais de treball i projectes es mostren en el calendari d'operacions.</p>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => {
                setSelectedWorkspaceIds(workspaces.map(w => w.id));
                setSelectedProjectIds(projects.map(p => p.id));
              }}
              className="text-[#033b7a] hover:underline font-bold text-[10px] uppercase tracking-wider"
            >
              Mostrar-ho tot
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => {
                setSelectedWorkspaceIds([]);
                setSelectedProjectIds([]);
              }}
              className="text-slate-500 hover:underline font-bold text-[10px] uppercase tracking-wider"
            >
              Ocultar-ho tot
            </button>
          </div>
        </div>

        {/* Workspaces Checkboxes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Espais de Treball ({workspaces.length})</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedWorkspaceIds(workspaces.map(w => w.id))}
                className="text-[9px] font-bold text-slate-500 hover:text-blue-600 uppercase bg-slate-200/50 px-1 py-0.5 rounded-sm"
              >
                Tots
              </button>
              <button
                type="button"
                onClick={() => setSelectedWorkspaceIds([])}
                className="text-[9px] font-bold text-slate-500 hover:text-blue-600 uppercase bg-slate-200/50 px-1 py-0.5 rounded-sm"
              >
                Cap
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {workspaces.map(ws => {
              const isChecked = selectedWorkspaceIds.includes(ws.id);
              const wsTasksCount = tasks.filter(t => getTaskWorkspaceId(t) === ws.id).length;
              return (
                <label
                  key={ws.id}
                  className={`flex items-center gap-2 px-2.5 py-1 border text-xs font-semibold cursor-pointer transition-all ${
                    isChecked
                      ? "bg-blue-50/80 border-blue-200 text-blue-950 shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedWorkspaceIds(prev => [...prev, ws.id]);
                        const wsProjects = projects.filter(p => p.workspaceId === ws.id).map(p => p.id);
                        setSelectedProjectIds(prev => [...new Set([...prev, ...wsProjects])]);
                      } else {
                        setSelectedWorkspaceIds(prev => prev.filter(id => id !== ws.id));
                        const wsProjects = projects.filter(p => p.workspaceId === ws.id).map(p => p.id);
                        setSelectedProjectIds(prev => prev.filter(id => !wsProjects.includes(id)));
                      }
                    }}
                    className="rounded-none border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>{ws.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm ${isChecked ? "bg-[#033b7a] text-white" : "bg-slate-100 text-slate-500"}`}>
                    {wsTasksCount}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Projects Checkboxes */}
        {selectedWorkspaceIds.length > 0 && (
          <div className="space-y-1.5 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Projectes actius ({projects.filter(p => selectedWorkspaceIds.includes(p.workspaceId)).length})
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const activeWsProjs = projects.filter(p => selectedWorkspaceIds.includes(p.workspaceId)).map(p => p.id);
                    setSelectedProjectIds(prev => [...new Set([...prev, ...activeWsProjs])]);
                  }}
                  className="text-[9px] font-bold text-slate-500 hover:text-blue-600 uppercase bg-slate-200/50 px-1 py-0.5 rounded-sm"
                >
                  Tots
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const activeWsProjs = projects.filter(p => selectedWorkspaceIds.includes(p.workspaceId)).map(p => p.id);
                    setSelectedProjectIds(prev => prev.filter(id => !activeWsProjs.includes(id)));
                  }}
                  className="text-[9px] font-bold text-slate-500 hover:text-blue-600 uppercase bg-slate-200/50 px-1 py-0.5 rounded-sm"
                >
                  Cap
                </button>
              </div>
            </div>
            {projects.filter(p => selectedWorkspaceIds.includes(p.workspaceId)).length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No hi ha projectes a l'espai de treball seleccionat.</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                {projects.filter(p => selectedWorkspaceIds.includes(p.workspaceId)).map(p => {
                  const isChecked = selectedProjectIds.includes(p.id);
                  const pTasksCount = tasks.filter(t => t.projectId === p.id).length;
                  const parentWs = workspaces.find(w => w.id === p.workspaceId);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 px-2.5 py-1 border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "bg-white border-slate-300 text-slate-900 shadow-xs"
                          : "bg-slate-50/60 border-slate-200 text-slate-400 hover:bg-slate-50"
                      }`}
                      style={{ borderLeft: isChecked ? `3px solid ${p.color}` : `3.5px solid #cbd5e1` }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProjectIds(prev => [...prev, p.id]);
                          } else {
                            setSelectedProjectIds(prev => prev.filter(id => id !== p.id));
                          }
                        }}
                        className="rounded-none border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                      />
                      <span className="font-semibold">{p.name}</span>
                      {parentWs && (
                        <span className="text-[9px] px-1 py-px bg-slate-100 text-slate-500 font-medium rounded-sm">
                          {parentWs.name}
                        </span>
                      )}
                      <span className={`text-[9px] font-bold px-1 rounded-sm ${isChecked ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-400"}`}>
                        {pTasksCount}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
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
      <div className="flex-1 min-h-0 custom-calendar-wrapper">
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
