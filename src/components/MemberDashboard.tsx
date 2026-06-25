import React, { useState } from "react";
import { 
  Task, 
  UserProfile, 
  Project, 
  Workspace,
  TaskStatus,
  TaskPriority
} from "../types";
import { DEPARTMENTS } from "../data";
import MemberCalendar from "./MemberCalendar";
import { 
  CalendarDays, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  ListTodo,
  Calendar,
  X,
  FileSpreadsheet,
  Check,
  User,
  ChevronRight,
  Plus
} from "lucide-react";

interface MemberDashboardProps {
  memberId: string;
  users: UserProfile[];
  tasks: Task[];
  projects: Project[];
  workspaces: Workspace[];
  onClose: () => void;
  onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onAddTask?: (title: string, projectId: string, assigneeIds: string[], priority: TaskPriority, departmentIds?: string[], dueDate?: string) => Promise<void>;
  onSelectTask?: (task: Task) => void;
}

export default function MemberDashboard({
  memberId,
  users,
  tasks,
  projects,
  workspaces,
  onClose,
  onUpdateTaskStatus,
  onAddTask,
  onSelectTask
}: MemberDashboardProps) {
  // Find member details
  const member = users.find(u => u.id === memberId);
  
  // Tabs "tasques" | "projectes" | "cronograma" | "calendari"
  const [activeTab, setActiveTab] = useState<"tasques" | "projectes" | "cronograma" | "calendari">("tasques");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<any>("medium");
  const [newProjId, setNewProjId] = useState("");
  const [newDepartmentIds, setNewDepartmentIds] = useState<string[]>(["dep-reserves"]);
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssignees, setNewAssignees] = useState<string[]>([memberId]);

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

  if (!member) {
    return (
      <div className="bg-white border border-slate-200 p-8 text-center text-slate-500 rounded-none">
        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="font-extrabold text-slate-800">Membre no trobat</p>
        <p className="text-xs">S'ha proporcionat un identificador de membre de l'equip no vàlid.</p>
        <button onClick={onClose} className="mt-4 px-4 py-1.5 bg-[#022e5f] text-white text-xs font-bold rounded-none uppercase">Torna</button>
      </div>
    );
  }

  // Filter tasks assigned to this member
  
  const handleCreateTask = async (e: any) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    // We expect a valid project ID, if not, we try to grab the first active or workspace project 
    const finalProjId = newProjId || (projects.length > 0 ? projects[0].id : "project-1"); 
    
    if (onAddTask) {
      await onAddTask(newTitle, finalProjId, newAssignees, newPriority, newDepartmentIds, newDueDate || undefined);
    }
    
    setNewTitle("");
    setNewDueDate("");
    setNewAssignees([memberId]);
    setNewDepartmentIds(["dep-reserves"]);
    setShowAddForm(false);
  };

  const memberTasks = tasks.filter(t => t.assigneeIds?.includes(memberId) || t.assigneeId === memberId);

  // Group tasks by status
  const todoTasks = memberTasks.filter(t => t.status === "todo");
  const inProgressTasks = memberTasks.filter(t => t.status === "in_progress");
  const reviewTasks = memberTasks.filter(t => t.status === "review");
  const doneTasks = memberTasks.filter(t => t.status === "done");

  const totalTasksCount = memberTasks.length;
  const completedTasksCount = doneTasks.length;
  const inProgressTasksCount = inProgressTasks.length + reviewTasks.length;
  const pendingTasksCount = todoTasks.length;

  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Find projects where the member has at least one task
  const memberProjectIds = Array.from(new Set(memberTasks.map(t => t.projectId).filter(Boolean)));
  const memberProjects = projects.filter(p => memberProjectIds.includes(p.id));

  // Dates for timeline
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

  // Map task due dates to Gantt chart column indices
  const getTimelinePosition = (dueDateStr: string): { startCol: number; span: number; color: string } => {
    let color = "from-blue-500 to-indigo-600";
    if (!dueDateStr) return { startCol: 1, span: 1, color };

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
        startCol = 4;
      }

      const span = Math.min(3, 9 - startCol);
      return { startCol, span, color };
    } catch {
      return { startCol: 3, span: 2, color };
    }
  };

  const getPriorityBadgeClass = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-600 text-white border border-red-700 font-black animate-pulse";
      case "high":
        return "bg-red-50 text-red-700 border border-red-150 font-bold";
      case "medium":
        return "bg-amber-50 text-amber-700 border border-amber-150 font-bold";
      default:
        return "bg-emerald-50 text-emerald-700 border border-emerald-150 font-bold";
    }
  };

  const statusLabels: Record<TaskStatus, string> = {
    todo: "Per fer",
    in_progress: "En curs",
    review: "En revisió",
    done: "Completat"
  };

  return (
    <div className="space-y-6" id="member-dashboard-panel">
      {/* Profil Header Card */}
      <div className="bg-gradient-to-r from-[#022e5f] to-[#044c9c] p-6 text-white shadow-md border-b-[3px] border-emerald-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-900 border-2 border-white/80 text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-md">
            {member.avatar || member.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-emerald-500 text-slate-900 font-mono font-black px-2 py-0.5 tracking-wider uppercase">
                Perfil de l'Equip
              </span>
              <span className="text-[9px] bg-blue-950 text-blue-200 border border-blue-700 font-mono px-2 py-0.5 tracking-wider uppercase">
                {member.role === "admin" ? "Administrador/a" : "Col·laborador/a"}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-1 truncate max-w-md">
              {member.name}
            </h2>
            <p className="text-xs text-blue-100 font-mono opacity-90 mt-0.5">
              {member.email}
            </p>
          </div>
        </div>

        {/* Action button to return */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-right bg-blue-950/40 p-2.5 px-3.5 border border-blue-800">
            <span className="text-[10px] text-blue-200 font-bold font-mono">RENDIMENT GLOBAL</span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">{completionRate}% Tasques Fetes</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-[#022e5f] hover:bg-[#033b7a] text-blue-200 hover:text-white border border-[#033b7a] flex items-center gap-1.5 text-xs font-bold transition-all uppercase px-3 shadow-sm rounded-none"
            title="Tanca vista de col·laborador"
          >
            <X className="w-4 h-4" />
            <span>Tanca</span>
          </button>
        </div>
      </div>

      {/* Mini KPIs cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">TASQUES ASSIGNADES</span>
          <h3 className="text-2xl font-black text-slate-800 font-mono mt-1">{totalTasksCount}</h3>
          <div className="text-[10px] text-slate-500 font-medium">Volum total de feina assignada</div>
        </div>
        {/* KPI 2 */}
        <div className="bg-white border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">TASQUES COMPLETADES</span>
          <h3 className="text-2xl font-black text-emerald-600 font-mono mt-1">{completedTasksCount}</h3>
          <div className="text-[10px] text-emerald-600 font-mono font-semibold">{completionRate}% d'èxit de lliurament</div>
        </div>
        {/* KPI 3 */}
        <div className="bg-white border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">EN CURS I REVISIÓ</span>
          <h3 className="text-2xl font-black text-blue-600 font-mono mt-1">{inProgressTasksCount}</h3>
          <div className="text-[10px] text-slate-500 font-medium">En desenvolupament actiu</div>
        </div>
        {/* KPI 4 */}
        <div className="bg-white border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">PROJECTES INVOLUCRATS</span>
          <h3 className="text-2xl font-black text-indigo-600 font-mono mt-1">{memberProjects.length}</h3>
          <div className="text-[10px] text-slate-500 font-medium">Grup de projectes del membre</div>
        </div>
      </div>

      {/* TABS SELECTOR (TASQUES | PROJECTES | CRONOGRAMA) */}
      <div className="border-b border-slate-200 bg-white p-1 flex items-center gap-1">
        <button
          onClick={() => setActiveTab("tasques")}
          className={`py-2 px-4.5 text-xs font-bold transition-all uppercase tracking-tight flex items-center gap-2 border ${
            activeTab === "tasques"
              ? "bg-slate-100 border-slate-350 text-slate-900"
              : "text-slate-505 border-transparent hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <ListTodo className="w-4 h-4 text-slate-550" />
          <span>Tasques ({totalTasksCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("projectes")}
          className={`py-2 px-4.5 text-xs font-bold transition-all uppercase tracking-tight flex items-center gap-2 border ${
            activeTab === "projectes"
              ? "bg-slate-100 border-slate-350 text-slate-900"
              : "text-slate-505 border-transparent hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Briefcase className="w-4 h-4 text-slate-550" />
          <span>Projectes Participats ({memberProjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("cronograma")}
          className={`py-2 px-4.5 text-xs font-bold transition-all uppercase tracking-tight flex items-center gap-2 border ${
            activeTab === "cronograma"
              ? "bg-slate-100 border-slate-350 text-slate-900"
              : "text-slate-505 border-transparent hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Briefcase className="w-4 h-4 text-slate-550" />
          <span>Cronograma del Membre (Gantt)</span>
        </button>

        <button
          onClick={() => setActiveTab("calendari")}
          className={`py-2 px-4.5 text-xs font-bold transition-all uppercase tracking-tight flex items-center gap-2 border ${
            activeTab === "calendari"
              ? "bg-slate-100 border-slate-350 text-slate-900"
              : "text-slate-505 border-transparent hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4 text-slate-550" />
          <span>Calendari Visual</span>
        </button>
      </div>

      {/* TAB CONTENT: TASQUES ASSIGNADES */}
      {activeTab === "tasques" && (
        <div className="space-y-6">
          
          {/* Afegir Tasca Section */}
          {onAddTask && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Tauler de Tasques</h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-[#022e5f] hover:bg-[#033b7a] text-white font-bold text-xs py-1.5 px-4 rounded-none flex items-center gap-1.5 transition-all shadow-sm focus:outline-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? "Tancar" : "Nova Tasca"}</span>
                </button>
              </div>

              {showAddForm && (
                <div className="bg-slate-50 border border-slate-200 p-4 mb-4 shadow-sm text-left">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Crear tasca per a {member.name}</span>
                  </h4>
                  <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div className="lg:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Títol de la tasca</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex. Disseny de baner promocional..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 rounded-none"
                      />
                    </div>
                    <div className="lg:col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departaments</label>
                      <div className="relative group">
                        <button 
                          type="button" 
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none text-xs text-slate-800 rounded-none flex items-center justify-between"
                        >
                          <span>{newDepartmentIds.length} sel.</span>
                        </button>
                        <div className="hidden group-hover:block absolute z-10 w-48 mt-1 p-2 bg-white border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                          {DEPARTMENTS.map((d: any) => (
                            <label key={d.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={newDepartmentIds.includes(d.id)}
                                onChange={() => toggleDepartment(d.id)}
                                className="rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs text-slate-700">{d.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prioritat</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none text-xs text-slate-700 rounded-none"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Mitjana</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Projecte Destí</label>
                      <select
                        value={newProjId}
                        onChange={(e) => setNewProjId(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none text-xs text-slate-700 rounded-none"
                      >
                        <option value="">Selecciona un projecte</option>
                        {projects.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 lg:col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Venciment</label>
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none text-xs text-slate-700 rounded-none"
                      />
                    </div>
                    <div className="space-y-1 lg:col-span-3 border-l md:border-l-0 lg:border-l border-slate-200 lg:pl-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Membres assignats</label>
                       <div className="relative group">
                        <button 
                          type="button" 
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none text-xs text-slate-800 rounded-none flex items-center justify-between"
                        >
                          <span>{newAssignees.length} seleccionats</span>
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
                    </div>
                    <div className="flex items-end justify-end lg:col-span-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewTitle("");
                          setNewDueDate("");
                        }}
                        className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 rounded-none transition-colors"
                      >
                        Cancel·lar
                      </button>
                      <button
                        type="submit"
                        disabled={!newTitle.trim()}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-none shadow-sm disabled:opacity-50 transition-colors"
                      >
                        Crear Tasca
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* COLUMN 1: TO DO */}
            <div className="bg-slate-50 border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>Per fer</span>
                </span>
                <span className="text-xs bg-slate-200/80 px-2 py-0.5 font-bold font-mono">{todoTasks.length}</span>
              </div>
              
              <div className="space-y-3">
                {todoTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4 italic">Cap tasca en cua</p>
                ) : (
                  todoTasks.map(task => (
                    <div key={task.id} onClick={() => onSelectTask && onSelectTask(task)} className="bg-white p-3 border border-slate-200 space-y-2 group shadow-sm cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded-none uppercase ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority === "urgent" ? "Urgent" : task.priority === "high" ? "Alta" : task.priority === "medium" ? "Mitjana" : "Baixa"}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9.5px] text-slate-450 font-mono font-semibold">{task.dueDate}</span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-750 transition-colors">
                        {task.title}
                      </h4>
                      {task.projectId && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projects.find(p => p.id === task.projectId)?.color || "#ccc" }}></span>
                          <span className="truncate">{projects.find(p => p.id === task.projectId)?.name}</span>
                        </div>
                      )}
                      
                      {onUpdateTaskStatus && (
                        <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                          <button 
                            onClick={() => onUpdateTaskStatus(task.id, "in_progress")}
                            className="text-[10px] font-bold text-blue-650 hover:underline flex items-center gap-1 leading-none uppercase"
                          >
                            <span>Començar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: IN PROGRESS */}
            <div className="bg-blue-50/10 border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-blue-150 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>En curs</span>
                </span>
                <span className="text-xs bg-blue-105 border border-blue-200 text-blue-800 px-2 py-0.5 font-bold font-mono">{inProgressTasks.length}</span>
              </div>
                      <div className="space-y-3">
                {inProgressTasks.length === 0 ? (
                   <p className="text-[11px] text-slate-400 text-center py-4 italic">Sense tasques actives</p>
                ) : (
                  inProgressTasks.map(task => (
                    <div key={task.id} onClick={() => onSelectTask && onSelectTask(task)} className="bg-white p-3 border border-slate-200 space-y-2 group shadow-sm cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded-none uppercase ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority === "urgent" ? "Urgent" : task.priority === "high" ? "Alta" : task.priority === "medium" ? "Mitjana" : "Baixa"}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9.5px] text-blue-600 font-mono font-bold bg-blue-50 px-1 border border-blue-100">{task.dueDate}</span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-750 transition-colors">
                        {task.title}
                      </h4>
                      {task.projectId && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projects.find(p => p.id === task.projectId)?.color || "#ccc" }}></span>
                          <span className="truncate">{projects.find(p => p.id === task.projectId)?.name}</span>
                        </div>
                      )}
                      
                      {onUpdateTaskStatus && (
                        <div className="flex justify-between pt-2 border-t border-slate-100 mt-2">
                          <button 
                            onClick={() => onUpdateTaskStatus(task.id, "todo")}
                            className="text-[10px] font-bold text-slate-500 hover:underline leading-none uppercase"
                          >
                            Un-start
                          </button>
                          <button 
                            onClick={() => onUpdateTaskStatus(task.id, "review")}
                            className="text-[10px] font-bold text-amber-650 hover:underline flex items-center gap-1 leading-none uppercase"
                          >
                            <span>Per revisar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 3: REVIEW */}
            <div className="bg-amber-50/10 border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-150 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>En revisió</span>
                </span>
                <span className="text-xs bg-amber-55 border border-amber-200 text-amber-800 px-2 py-0.5 font-bold font-mono">{reviewTasks.length}</span>
              </div>
              
              <div className="space-y-3">
                {reviewTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4 italic">No hi ha tasques per avaluar</p>
                ) : (
                  reviewTasks.map(task => (
                    <div key={task.id} onClick={() => onSelectTask && onSelectTask(task)} className="bg-white p-3 border border-slate-100/10 space-y-2 group shadow-sm cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded-none uppercase ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority === "urgent" ? "Urgent" : task.priority === "high" ? "Alta" : task.priority === "medium" ? "Mitjana" : "Baixa"}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9.5px] text-amber-700 font-mono font-bold bg-amber-50 px-1 border border-amber-100">{task.dueDate}</span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-750 transition-colors">
                        {task.title}
                      </h4>
                      {task.projectId && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projects.find(p => p.id === task.projectId)?.color || "#ccc" }}></span>
                          <span className="truncate">{projects.find(p => p.id === task.projectId)?.name}</span>
                        </div>
                      )}
                      
                      {onUpdateTaskStatus && (
                        <div className="flex justify-between pt-2 border-t border-slate-100 mt-2">
                          <button 
                            onClick={() => onUpdateTaskStatus(task.id, "in_progress")}
                            className="text-[10px] font-bold text-[#022e5f] hover:underline leading-none uppercase"
                          >
                            Rebutjar
                          </button>
                          <button 
                            onClick={() => onUpdateTaskStatus(task.id, "done")}
                            className="text-[10px] font-bold text-emerald-650 hover:underline flex items-center gap-1 leading-none uppercase"
                          >
                            <span>Completar</span>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 4: DONE */}
            <div className="bg-emerald-50/15 border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-150 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Completat</span>
                </span>
                <span className="text-xs bg-emerald-55 border border-emerald-170 text-emerald-800 px-2 py-0.5 font-bold font-mono">{doneTasks.length}</span>
              </div>
              
              <div className="space-y-3">
                {doneTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4 italic">Encara sense lliuraments</p>
                ) : (
                  doneTasks.map(task => (
                    <div key={task.id} onClick={() => onSelectTask && onSelectTask(task)} className="bg-white p-3 border border-slate-200/80 opacity-85 space-y-2 group shadow-none cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="text-[8.5px] bg-slate-100 border text-slate-500 font-mono px-1.5 py-0.5">ACABAT</span>
                        <div className="flex items-center gap-1 text-emerald-650">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-550 leading-snug line-through">
                        {task.title}
                      </h4>
                      {task.completedAt && (
                        <p className="text-[9.5px] text-emerald-700 font-mono font-medium">Acabat el {task.completedAt}</p>
                      )}
                      
                      {onUpdateTaskStatus && (
                        <div className="flex justify-start pt-2 border-t border-slate-100 mt-2">
                          <button 
                            onClick={() => onUpdateTaskStatus(task.id, "review")}
                            className="text-[10px] font-bold text-slate-450 hover:underline leading-none uppercase"
                          >
                            Reobrir Tasca
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PROJECTES INVOLUCRATS */}
      {activeTab === "projectes" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-none p-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <Briefcase className="w-4.5 h-4.5 text-blue-650" />
              <span>Projectes Actius del Col·laborador</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              S'està realitzant el seguiment del percentatge d'avenç d'aquest membre en cada un dels projectes assignats.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberProjects.length === 0 ? (
              <div className="col-span-2 py-12 border border-dashed border-slate-250 text-center text-slate-400 text-xs">
                Aquest col·laborador no participa directament en projectes del grup actualment.
              </div>
            ) : (
              memberProjects.map(project => {
                const projTasks = memberTasks.filter(t => t.projectId === project.id);
                const projTasksDone = projTasks.filter(t => t.status === "done").length;
                const projTasksPending = projTasks.length - projTasksDone;
                const projPct = projTasks.length > 0 ? Math.round((projTasksDone / projTasks.length) * 100) : 0;
                
                // Find Workspace name
                const wsObj = workspaces.find(w => w.id === project.workspaceId);
                const isExpanded = activeTab === "projectes" && showAddForm === false; // Just keeping track simply, wait

                return (
                  <div key={project.id} className="bg-white border border-slate-200 p-5 shadow-sm space-y-4 transition-all hover:border-slate-350">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-none shrink-0" style={{ backgroundColor: project.color || "#ccc" }}></span>
                          <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">
                            {project.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">
                          Espai: {wsObj ? wsObj.name : "N/A"}
                        </p>
                      </div>
                      <span className="text-xs font-bold font-mono bg-blue-50 text-[#022e5f] px-2 py-0.5 border border-blue-200 uppercase">
                        {statusLabels[project.status === "active" ? "in_progress" : "done"] || "Actiu"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {project.description || "Sense descripció corporativa formal disponible pel projecte."}
                    </p>

                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500">Avenç Personal</span>
                        <span className="font-mono text-[#022e5f] font-black">{projPct}% ({projTasksDone}/{projTasks.length} tasques)</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 h-2 border border-slate-200/60 overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-500" 
                          style={{ width: `${projPct}%` }}
                        ></div>
                      </div>

                      <div className="flex gap-4 text-[11px] text-slate-450 font-mono pt-1">
                        <span>Pendent: <strong className="text-slate-800 font-bold">{projTasksPending}</strong></span>
                        <span>Completades: <strong className="text-emerald-600 font-bold">{projTasksDone}</strong></span>
                      </div>
                    </div>
                    
                    {projTasks.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Tasques del projecte ({projTasks.length})</h5>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {projTasks.map(task => (
                            <div 
                              key={task.id} 
                              onClick={() => onSelectTask && onSelectTask(task)}
                              className="bg-slate-50 border border-slate-200/70 p-2 text-xs flex justify-between items-center cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex flex-col gap-1 truncate w-3/4">
                                <span className={`font-semibold truncate ${task.status === "done" ? "line-through text-slate-400" : "text-slate-700"}`}>
                                  {task.title}
                                </span>
                                {task.dueDate && (
                                  <span className="text-[9px] font-mono text-slate-500">
                                    Venciment: {task.dueDate}
                                  </span>
                                )}
                              </div>
                              <span className={`px-1.5 py-0.5 text-[9px] uppercase font-mono border ${getPriorityBadgeClass(task.priority)}`}>
                                 {task.status === "done" ? "Acabada" : (task.priority === "urgent" ? "Urgent" : task.priority === "high" ? "Alta" : "Mitjana")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CRONOGRAMA DE TREBALL (MEMBER TIMELINE) */}
      {activeTab === "cronograma" && (
        <div className="bg-white border border-slate-200 p-6 shadow-none">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-150">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Cronograma Personal ({member.name})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Visualització d'Asana Gantt individual pels terminis establerts a l'agenda d'aquest col·laborador.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-1.5 font-mono">
                <div className="w-2.5 h-2.5 bg-rose-500"></div>
                <span>Alta Prioritat</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <div className="w-2.5 h-2.5 bg-amber-500"></div>
                <span>Mitjana</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <div className="w-2.5 h-2.5 bg-emerald-500"></div>
                <span>Baixa</span>
              </div>
            </div>
          </div>

          {memberTasks.length === 0 ? (
            <div className="py-12 border border-dashed border-slate-250 text-center text-slate-400 text-xs">
              <AlertTriangle className="w-6 h-6 mx-auto text-slate-350 mb-2" />
              <span>No hi ha tasques assignades a aquest membre del grup per poder graficar.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[850px]">
                {/* Headers */}
                <div className="grid grid-cols-12 gap-1 border-b border-slate-200 pb-3 mb-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-4 text-left px-2">Tasca de l'Asana</div>
                  {timelineDates.map((date) => (
                    <div key={date.key} className="col-span-1 border-l border-slate-150 font-mono text-[10px]">
                      {date.label}
                    </div>
                  ))}
                </div>

                {/* List of Tasks represented as Gantt Bars */}
                <div className="space-y-3">
                  {memberTasks.map((task) => {
                    const { startCol, span } = getTimelinePosition(task.dueDate);
                    
                    // Colors
                    const barColor = task.priority === "urgent"
                      ? "from-rose-600 to-rose-700 border border-red-900 shadow-md animate-pulse"
                      : task.priority === "high" 
                        ? "from-rose-500 to-red-600 border border-red-750" 
                        : task.priority === "medium" 
                          ? "from-amber-400 to-amber-550 border border-amber-650" 
                          : "from-emerald-400 to-teal-550 border border-teal-650";

                    return (
                      <div key={task.id} onClick={() => onSelectTask && onSelectTask(task)} className="grid grid-cols-12 gap-1 items-center hover:bg-slate-50 py-1.5 transition-all cursor-pointer">
                        {/* Task Title left hand */}
                        <div className="col-span-4 flex items-center gap-2 pl-2 truncate pr-4">
                          <span className={`w-2.5 h-2.5 shrink-0`} style={{ backgroundColor: projects.find(p => p.id === task.projectId)?.color || "#ccc" }}></span>
                          <div className="truncate leading-tight">
                            <p className="text-xs font-bold text-slate-800 truncate" title={task.title}>
                              {task.title}
                            </p>
                            <span className="text-[9px] text-slate-400 font-mono uppercase font-semibold">
                              Límit: {task.dueDate || "Sense establir"}
                            </span>
                          </div>
                        </div>

                        {/* Gantt Bar spanning custom columns */}
                        <div className="col-span-8 grid grid-cols-8 gap-1 h-7 relative">
                          <div
                            className={`col-span-1 h-full rounded-none bg-gradient-to-r ${barColor} shadow-sm text-white text-[9.5px] font-black font-mono tracking-tight flex items-center justify-center p-1 px-2 uppercase truncate select-none border-l-4 border-l-black/15`}
                            style={{
                              gridColumnStart: startCol,
                              gridColumnEnd: `span ${span}`,
                            }}
                          >
                            <span className="truncate drop-shadow-sm font-sans">{statusLabels[task.status]}</span>
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
      )}

      {/* TAB CONTENT: CALENDARI */}
      {activeTab === "calendari" && (
        <div className="space-y-6">
          <MemberCalendar
            tasks={memberTasks}
            projects={projects}
            onAddTask={(date) => {
              setNewDueDate(date.toISOString().split("T")[0]);
              setShowAddForm(true);
              setActiveTab("tasques"); // Switch back to 'tasques' tab where the form is located
            }}
            onAddProject={() => {
              alert("Per afegir projectes, navega al Panell de Projectes del grup.");
            }}
          />
        </div>
      )}
    </div>
  );
}
