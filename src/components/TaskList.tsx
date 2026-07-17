import React, { useState } from "react";
import { Task, UserProfile, Project, TaskStatus, TaskPriority, Department } from "../types";
import { Plus, Trash, Search, Filter, MessageSquare, AlertCircle, Calendar, Check, Landmark, RefreshCw, Play, Square, ChevronDown, ChevronRight, CheckSquare, Circle, Star, FileText } from "lucide-react";
import { DEPARTMENTS } from "../data";
import RichTextEditor from "./RichTextEditor";

interface TaskListProps {
  tasks: Task[];
  users: UserProfile[];
  projects: Project[];
  activeProjectId: string | null;
  activeWorkspaceId: string;
  onAddTask: (title: string, projectId: string, assigneeIds: string[], priority: TaskPriority, departmentIds?: string[]) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectTaskForDetails: (task: Task) => void;
  isCompactView?: boolean;
  activeTimer: { taskId: string; subtaskId?: string; startTime: Date } | null;
  setActiveTimer: React.Dispatch<React.SetStateAction<{ taskId: string; subtaskId?: string; startTime: Date } | null>>;
}

export default function TaskList({
  tasks,
  users,
  projects,
  activeProjectId,
  activeWorkspaceId,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onSelectTaskForDetails,
  isCompactView = false,
  activeTimer,
  setActiveTimer,
}: TaskListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDepartmentIds, setNewDepartmentIds] = useState<string[]>(["dep-reserves"]);
  const [newAssignees, setNewAssignees] = useState<string[]>(() => {
    const firstInDept = users.find(u => u.departmentId === "dep-reserves");
    return firstInDept ? [firstInDept.id] : (users[0] ? [users[0].id] : []);
  });
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newProjId, setNewProjId] = useState("");
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  // Controla quines tasques tenen les subtasques desplegades al llistat
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };
  // Quina subtasca té l'editor de descripció desplegat (una alhora, per no
  // carregar la llista quan hi ha moltes subtasques)
  const [expandedSubtaskDescId, setExpandedSubtaskDescId] = useState<string | null>(null);

  // Inicia un cronòmetre (de tasca o subtasca). Si ja n'hi havia un altre
  // actiu en un altre lloc, l'atura i en desa el temps abans, per no perdre'l.
  const startTimer = (targetTaskId: string, targetSubtaskId?: string) => {
    if (activeTimer) {
      const isSameTarget = activeTimer.taskId === targetTaskId && activeTimer.subtaskId === targetSubtaskId;
      if (!isSameTarget) {
        const prevTask = tasks.find((t) => t.id === activeTimer.taskId);
        if (prevTask) {
          const startTime = activeTimer.startTime;
          const endTime = new Date();
          const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          const newEntry = { id: Date.now().toString(), startTime, endTime, duration };
          if (activeTimer.subtaskId) {
            const updatedSubtasks = (prevTask.subtasks || []).map((s) =>
              s.id === activeTimer.subtaskId ? { ...s, timeEntries: [...(s.timeEntries || []), newEntry] } : s
            );
            onUpdateTask(prevTask.id, { subtasks: updatedSubtasks });
          } else {
            onUpdateTask(prevTask.id, { timeEntries: [...(prevTask.timeEntries || []), newEntry] });
          }
        }
      }
    }
    setActiveTimer({ taskId: targetTaskId, subtaskId: targetSubtaskId, startTime: new Date() });
  };

  // Get current project options
  const workspaceProjects = projects.filter(p => p.workspaceId === activeWorkspaceId);
  const defaultProj = activeProjectId || (workspaceProjects[0]?.id || "");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const projToUse = activeProjectId || newProjId || defaultProj;
    if (!projToUse) {
      alert("Si us plau, selecciona un projecte per crear la tasca.");
      return;
    }

    onAddTask(newTitle, projToUse, newAssignees, newPriority, newDepartmentIds);
    setNewTitle("");
  };

  const toggleDepartment = (deptId: string) => {
    setNewDepartmentIds(prev => {
      const next = prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId];
      if (next.length > 0) {
        const primaryDept = next[next.length - 1]; // Use last added as primary for default assignee
        const firstUserInDept = users.find(u => u.departmentId === primaryDept);
        if (firstUserInDept && newAssignees.length === 0) {
           setNewAssignees([firstUserInDept.id]);
        }
      }
      return next;
    });
  };

  const toggleAssignee = (userId: string) => {
    setNewAssignees(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Filter tasks belonging strictly to active projects or workspace
  const filteredTasks = tasks.filter(task => {
    // Project filter
    if (activeProjectId && task.projectId !== activeProjectId) return false;
    
    // Workspace filter if no project selected
    const tWorkspaceId = task.workspaceId || projects.find(p => p.id === task.projectId)?.workspaceId;
    if (!activeProjectId && tWorkspaceId !== activeWorkspaceId) return false;

    // Search term
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase()) && !task.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Filter Priority
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;

    // Filter Status
    if (filterStatus !== "all" && task.status !== filterStatus) return false;

    // Filter Department (supporting multiple departments)
    if (filterDepartment !== "all") {
      const taskDepts = task.departmentIds && task.departmentIds.length > 0
        ? task.departmentIds
        : (task.departmentId ? [task.departmentId] : ["ALL"]);
      if (!taskDepts.includes("ALL") && !taskDepts.includes(filterDepartment)) return false;
    }

    // Filter Assignee
    if (filterAssignee !== "all") {
      const taskAssignees = task.assigneeIds && task.assigneeIds.length > 0
        ? task.assigneeIds
        : (task.assigneeId ? [task.assigneeId] : []);
      if (!taskAssignees.includes(filterAssignee)) return false;
    }

    return true;
  }).sort((a, b) => {
    if (!sortDirection) return 0;
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    
    if (sortDirection === "asc") return dateA - dateB;
    return dateB - dateA;
  });

  const getPriorityBadgeColor = (p: TaskPriority) => {
    switch (p) {
      case "urgent":
        return "bg-red-600 text-white dark:bg-red-800 dark:text-white border border-red-700 font-extrabold uppercase animate-pulse";
      case "high":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900";
      case "medium":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900";
      default:
        return "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-100 dark:border-slate-700";
    }
  };

  const getStatusBadgeColor = (s: TaskStatus) => {
    switch (s) {
      case "done":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400";
      case "review":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400";
      case "in_progress":
        return "bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-4" id="task-list-section">
      {/* Search & Bulk Options */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-none border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-grow max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Cerca tasques o accions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Workspace filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-700">
            <Landmark className="w-3.5 h-3.5 text-amber-500" />
            <span>Espai de treball:</span>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="bg-transparent border-none text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">Tots ({DEPARTMENTS.length})</option>
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Assignee filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-700">
            <Landmark className="w-3.5 h-3.5 text-indigo-500" />
            <span>Persona:</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-transparent border-none text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">Totes</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-700">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Estat:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">Tots els estats</option>
              <option value="todo">Pendent</option>
              <option value="in_progress">En Procés</option>
              <option value="review">En Revisió</option>
              <option value="done">Completada</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5" />
            <span>Prioritat:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent border-none text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">Totes</option>
              <option value="urgent">Urgent</option>
              <option value="high">Alta</option>
              <option value="medium">Mitjana</option>
              <option value="low">Baixa</option>
            </select>
          </div>

          {/* Sort by Due Date */}
          <button
            onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
            className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-700 font-semibold"
          >
            Data límit {sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "↕"}
          </button>

          {/* Nova Tasca Trigger Button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-none flex items-center gap-1.5 transition-all shadow-md shrink-0 focus:outline-none"
            title="Afegir una nova tasca"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? "Tancar" : "Nova Tasca"}</span>
          </button>
        </div>
      </div>

      {/* Expanded Add Task Form (Highly visible, elegant card right at the top) */}
      {showAddForm && (
        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Crear tasca en el projecte actiu</span>
            </h4>
            <span className="text-[9px] bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 uppercase tracking-wider rounded-none">Formulari nou</span>
          </div>

          <form onSubmit={(e) => {
            handleCreate(e);
            setShowAddForm(false);
          }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Títol de la tasca</label>
              <input
                type="text"
                required
                placeholder="Ex. Disseny de baner promocional, Definir pressupost..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 dark:text-slate-200 rounded-none font-semibold"
              />
            </div>

            <div className="space-y-1 relative group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dept. Responsable</label>
              <button 
                type="button" 
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none text-xs text-slate-700 dark:text-slate-200 font-bold rounded-none flex items-center justify-between"
              >
                <span>{newDepartmentIds.length} sel.</span>
              </button>
              <div className="hidden group-hover:block absolute z-10 w-full mt-1 p-2 bg-white border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                {DEPARTMENTS.map(d => (
                  <label key={d.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={newDepartmentIds.includes(d.id)}
                      onChange={() => toggleDepartment(d.id)}
                      className="rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700 font-semibold">{d.name.replace("Departament de ", "").replace("Departament ", "")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1 relative group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Membres assignats</label>
              <button 
                type="button" 
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none text-xs text-slate-700 dark:text-slate-200 font-bold rounded-none flex items-center justify-between"
              >
                <span>{newAssignees.length} sel.</span>
              </button>
              <div className="hidden group-hover:block absolute z-10 w-full mt-1 p-2 bg-white border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                {users.map(u => (
                  <label key={u.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={newAssignees.includes(u.id)}
                      onChange={() => toggleAssignee(u.id)}
                      className="rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prioritat de treball</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none text-xs text-slate-700 dark:text-slate-200 rounded-none font-semibold"
              >
                <option value="low">Baixa</option>
                <option value="medium">Mitjana</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {!activeProjectId && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Projecte Destí</label>
                <select
                  value={newProjId || defaultProj}
                  onChange={(e) => setNewProjId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none text-xs text-slate-700 dark:text-slate-200 rounded-none font-semibold"
                >
                  {workspaceProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={`flex items-end justify-end ${activeProjectId ? "lg:col-span-3" : "lg:col-span-2"} gap-2`}>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTitle("");
                }}
                className="px-4 py-2 border border-slate-350 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
              >
                Cancel·lar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-none shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Crear Tasca</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Spreadsheet / Table Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-none overflow-x-auto">
        <table className="w-full text-left border-collapse" id="tasks-table-enterprise">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className={`${isCompactView ? "py-1.5 px-3 text-[10px]" : "py-3.5 px-4"} w-12 text-center`}>
                <Check className="w-3.5 h-3.5 mx-auto text-slate-400 stroke-[2.5]" />
              </th>
              <th className={isCompactView ? "py-1.5 px-3 text-[10px]" : "py-3.5 px-4"}>Nom de la tasca</th>
              <th className={isCompactView ? "py-1.5 px-3 text-[10px]" : "py-3.5 px-4"}>Espai de treball</th>
              <th className={isCompactView ? "py-1.5 px-3 text-[10px]" : "py-3.5 px-4"}>Persona Assignada</th>
              <th className={isCompactView ? "py-1.5 px-3 text-[10px]" : "py-3.5 px-4"}>Estat</th>
              <th className={isCompactView ? "py-1.5 px-3 text-[10px]" : "py-3.5 px-4"}>Prioritat</th>
              <th className={isCompactView ? "py-1.5 px-3 text-[10px]" : "py-3.5 px-4"}>Temps</th>
              <th className={isCompactView ? "py-1.5 px-3 text-[10px]" : "py-3.5 px-4"}>Projecte</th>
              <th className={isCompactView ? "py-1.5 px-3 text-[10px]" : "py-3.5 px-4"}>Data límit</th>
              <th className={`${isCompactView ? "py-1.5 px-3 text-[10px]" : "py-3.5 px-4"} text-center`}>Accions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <span>No s'ha trobat cap tasca amb els filtres actius.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTasks.map((task, idx) => {
                const assignee = users.find(u => (task.assigneeIds?.includes(u.id) || u.id === task.assigneeId));
                const proj = projects.find(p => p.id === task.projectId);
                const cellCls = isCompactView ? "py-1 px-2.5" : "py-3 px-4";

                return (
                  <React.Fragment key={task.id}>
                  <tr
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group"
                  >
                    <td className={`${cellCls} text-center`}>
                      <button
                        type="button"
                        onClick={() => onUpdateTask(task.id, { status: task.status === "done" ? "todo" : "done" })}
                        className="group flex items-center justify-center mx-auto focus:outline-none"
                        title={task.status === "done" ? "Marcar com a pendent" : "Marcar com a completada"}
                      >
                        {task.status === "done" ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white border border-emerald-600 shadow-sm transition-all scale-105">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors">
                            <Check className="w-3.5 h-3.5 text-transparent group-hover:text-emerald-500 dark:group-hover:text-emerald-400 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    </td>

                    <td className={`${cellCls} font-semibold text-slate-800 dark:text-slate-100`}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateTask(task.id, { isBaseTask: !task.isBaseTask })}
                          className="shrink-0 transition-colors"
                          title={task.isBaseTask ? "Tasca Base del Projecte (clica per treure-la)" : "Marcar com a Tasca Base del Projecte"}
                        >
                          <Star className={`w-3.5 h-3.5 ${task.isBaseTask ? "fill-amber-400 text-amber-500" : "text-slate-250 hover:text-amber-400"}`} />
                        </button>
                        {task.subtasks && task.subtasks.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(task.id)}
                            className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none text-slate-400 hover:text-slate-700 shrink-0 transition-colors"
                            title={expandedTaskIds.has(task.id) ? "Amagar subtasques" : `Veure ${task.subtasks.length} subtasca(es)`}
                          >
                            {expandedTaskIds.has(task.id) ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <button
                          onClick={() => onSelectTaskForDetails(task)}
                          className="hover:text-blue-600 transition-colors text-left truncate max-w-[280px]"
                        >
                          {task.title}
                        </button>
                        {task.description && (
                          <span className="w-1.5 h-1.5 rounded-none bg-slate-300" title="Té descripció"></span>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <span
                            className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-none shrink-0"
                            title={`${task.subtasks.filter(s => s.completed).length} de ${task.subtasks.length} completades`}
                          >
                            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className={cellCls}>
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {(() => {
                          const taskDepts = task.departmentIds && task.departmentIds.length > 0
                            ? task.departmentIds
                            : (task.departmentId ? [task.departmentId] : ["dep-reserves"]);
                          return taskDepts.map(depId => {
                            const d = DEPARTMENTS.find(dep => dep.id === depId);
                            if (!d) return null;
                            return (
                              <span
                                key={depId}
                                className="px-2 py-0.5 rounded text-[9.5px] font-bold text-white tracking-wide uppercase shadow-xs shrink-0 font-sans"
                                style={{ backgroundColor: d.color }}
                                title={d.name}
                              >
                                {d.name.replace("Departament de ", "").replace("Departament ", "")}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </td>

                    <td className={cellCls}>
                      <div className="flex flex-wrap items-center gap-1">
                        {(task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : [task.assigneeId]).filter(Boolean).map(aId => {
                          const assignee = users.find(u => u.id === aId);
                          return (
                            <div key={aId} className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-blue-600 border border-blue-200/50" title={assignee?.name}>
                              {assignee ? assignee.avatar : "U"}
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    <td className={cellCls}>
                      <select
                        value={task.status}
                        onChange={(e) => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-none border-none focus:outline-none cursor-pointer ${getStatusBadgeColor(task.status)}`}
                      >
                        <option value="todo">Pendent</option>
                        <option value="in_progress">En Procés</option>
                        <option value="review">En Revisió</option>
                        <option value="done">Completada</option>
                      </select>
                    </td>

                    <td className={cellCls}>
                      <select
                        value={task.priority}
                        onChange={(e) => onUpdateTask(task.id, { priority: e.target.value as TaskPriority })}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-none focus:outline-none cursor-pointer ${getPriorityBadgeColor(task.priority)}`}
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Mitjana</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </td>

                  <td className={`${cellCls} text-xs font-medium text-slate-500`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {(() => {
                            const totalMs = (task.timeEntries || []).reduce((acc, entry) => acc + (entry.duration || 0), 0) * 1000;
                            const hours = Math.floor(totalMs / 3600000);
                            const minutes = Math.floor((totalMs % 3600000) / 60000);
                            const seconds = Math.floor((totalMs % 60000) / 1000);
                            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                          })()}
                        </span>
                        <button
                          onClick={() => {
                            if (activeTimer?.taskId === task.id && !activeTimer?.subtaskId) {
                              // Stop timer
                              const startTime = activeTimer.startTime;
                              const endTime = new Date();
                              const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
                              onUpdateTask(task.id, {
                                timeEntries: [...(task.timeEntries || []), { id: Date.now().toString(), startTime, endTime, duration }]
                              });
                              setActiveTimer(null);
                            } else {
                              // Start timer (de la tasca, no d'una subtasca)
                              startTimer(task.id);
                            }
                          }}
                          className={`p-1 rounded-full ${activeTimer?.taskId === task.id && !activeTimer?.subtaskId ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}
                        >
                          {activeTimer?.taskId === task.id && !activeTimer?.subtaskId ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                        </button>
                      </div>
                    </td>

                    <td className={`${cellCls} text-xs font-medium text-slate-500`}>
                      <span className="px-2.5 py-1 rounded-none border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                        {proj ? proj.name : "Sense projecte"}
                      </span>
                    </td>

                    <td className={cellCls}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="date"
                            value={task.dueDate}
                            onChange={(e) => onUpdateTask(task.id, { dueDate: e.target.value })}
                            className="bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-none px-1 cursor-pointer"
                          />
                        </div>
                        {task.startDate && (
                          <div className="text-[10px] text-slate-450 font-mono">
                            Inici: {task.startDate}
                          </div>
                        )}
                        {task.recurrence && task.recurrence !== "none" && (
                          <div className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5 mt-0.5 tracking-tight">
                            <RefreshCw className="w-2.5 h-2.5 text-indigo-505 animate-spin-slow" />
                            <span>{(() => {
                              switch(task.recurrence) {
                                case "weekly": return "Setmanal";
                                case "fortnightly": return "Quinzenal";
                                case "monthly": return "Mensual";
                                case "bimonthly": return "Bimensual";
                                case "quarterly": return "Trimestral";
                                case "semiannually": return "Semestral";
                                case "yearly": return "Anual";
                                default: return task.recurrence || "";
                              }
                            })()}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className={`${cellCls} text-center`}>
                      <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onSelectTaskForDetails(task)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none text-slate-500 hover:text-blue-600 transition-all"
                          title="Fòrum de discussió i comentaris"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-none text-slate-400 hover:text-rose-600 transition-all"
                          title="Eliminar tasca"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedTaskIds.has(task.id) && task.subtasks && task.subtasks.length > 0 && (
                    <tr key={`${task.id}-subtasks`} className="bg-slate-50/60 dark:bg-slate-900/40">
                      <td></td>
                      <td colSpan={8} className="py-2 px-4">
                        <div className="pl-5 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5">
                          <div className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Subtasques (ordenades per data de venciment)
                          </div>
                          {[...task.subtasks]
                            .sort((a, b) => {
                              // Sense data de venciment van al final
                              if (!a.endDate && !b.endDate) return 0;
                              if (!a.endDate) return 1;
                              if (!b.endDate) return -1;
                              return a.endDate.localeCompare(b.endDate);
                            })
                            .map((sub) => {
                              const subAssignees = (sub.assigneeIds || []).map((aId) => users.find((u) => u.id === aId)).filter(Boolean);
                              const isSubTimerActive = activeTimer?.taskId === task.id && activeTimer?.subtaskId === sub.id;
                              const subTotalMs = (sub.timeEntries || []).reduce((acc, entry) => acc + (entry.duration || 0), 0) * 1000;
                              const subHours = Math.floor(subTotalMs / 3600000);
                              const subMinutes = Math.floor((subTotalMs % 3600000) / 60000);
                              const subSeconds = Math.floor((subTotalMs % 60000) / 1000);

                              return (
                              <div key={sub.id}>
                              <div
                                className="flex items-center gap-2.5 text-xs py-1"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedSubtasks = (task.subtasks || []).map((s) =>
                                      s.id === sub.id ? { ...s, completed: !s.completed } : s
                                    );
                                    onUpdateTask(task.id, { subtasks: updatedSubtasks });
                                  }}
                                  className="shrink-0"
                                  title={sub.completed ? "Marcar com a pendent" : "Marcar com a feta"}
                                >
                                  {sub.completed ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500" />
                                  )}
                                </button>
                                <span className={`flex-1 truncate ${sub.completed ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>
                                  {sub.title}
                                </span>

                                {/* Responsable(s) assignat(s) */}
                                {subAssignees.length > 0 && (
                                  <div className="flex items-center -space-x-1 shrink-0">
                                    {subAssignees.map((u) => (
                                      <div
                                        key={u!.id}
                                        className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center font-bold text-[9px] text-blue-600 border border-white dark:border-slate-900 ring-1 ring-blue-200/50"
                                        title={u!.name}
                                      >
                                        {u!.avatar}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Prioritat (sempre editable, "medium" per defecte) */}
                                <select
                                  value={sub.priority || "medium"}
                                  onChange={(e) => {
                                    const updatedSubtasks = (task.subtasks || []).map((s) =>
                                      s.id === sub.id ? { ...s, priority: e.target.value as TaskPriority } : s
                                    );
                                    onUpdateTask(task.id, { subtasks: updatedSubtasks });
                                  }}
                                  className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded-none shrink-0 border-none focus:outline-none cursor-pointer ${getPriorityBadgeColor(sub.priority || "medium")}`}
                                  title="Prioritat de la subtasca"
                                >
                                  <option value="low">Baixa</option>
                                  <option value="medium">Mitjana</option>
                                  <option value="high">Alta</option>
                                  <option value="urgent">Urgent</option>
                                </select>

                                {/* Cronòmetre */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                    {`${subHours.toString().padStart(2, '0')}:${subMinutes.toString().padStart(2, '0')}:${subSeconds.toString().padStart(2, '0')}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isSubTimerActive) {
                                        const startTime = activeTimer!.startTime;
                                        const endTime = new Date();
                                        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
                                        const updatedSubtasks = (task.subtasks || []).map((s) =>
                                          s.id === sub.id
                                            ? { ...s, timeEntries: [...(s.timeEntries || []), { id: Date.now().toString(), startTime, endTime, duration }] }
                                            : s
                                        );
                                        onUpdateTask(task.id, { subtasks: updatedSubtasks });
                                        setActiveTimer(null);
                                      } else {
                                        startTimer(task.id, sub.id);
                                      }
                                    }}
                                    className={`p-1 rounded-full ${isSubTimerActive ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}
                                    title={isSubTimerActive ? "Aturar cronòmetre" : "Iniciar cronòmetre"}
                                  >
                                    {isSubTimerActive ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                                  </button>
                                </div>

                                {sub.endDate && (
                                  <span className="flex items-center gap-1 text-[10px] font-mono text-slate-450 shrink-0">
                                    <Calendar className="w-3 h-3" />
                                    {sub.endDate}
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setExpandedSubtaskDescId(expandedSubtaskDescId === sub.id ? null : sub.id)}
                                  className={`flex items-center gap-1 shrink-0 p-1 rounded-none transition-colors ${
                                    expandedSubtaskDescId === sub.id
                                      ? "text-indigo-600 bg-indigo-50"
                                      : sub.description
                                      ? "text-indigo-400 hover:text-indigo-600"
                                      : "text-slate-300 hover:text-slate-500"
                                  }`}
                                  title={sub.description ? "Veure/editar descripció" : "Afegir descripció"}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {expandedSubtaskDescId === sub.id && (
                                <div className="pl-6 pr-2 pb-2">
                                  <RichTextEditor
                                    value={sub.description || ""}
                                    onChange={(html) => {
                                      const updatedSubtasks = (task.subtasks || []).map((s) =>
                                        s.id === sub.id ? { ...s, description: html } : s
                                      );
                                      onUpdateTask(task.id, { subtasks: updatedSubtasks });
                                    }}
                                    placeholder="Notes o detalls d'aquesta subtasca..."
                                    minHeightClass="min-h-[4rem]"
                                  />
                                </div>
                              )}
                              </div>
                              );
                            })}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })
            )}

            {/* Bottom row empty */}
          </tbody>
        </table>
      </div>
    </div>
  );
}
