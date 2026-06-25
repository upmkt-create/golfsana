import React from "react";
import { FolderGit2, CalendarCheck, Activity, BellRing, Check } from "lucide-react";

export default function WorkspaceKPICards({
  workspaceTasks,
  workspaceProjects,
  activeWorkspaceObj,
  currentUser,
  isAdmin,
  activeProjectId = null
}: {
  workspaceTasks: any[];
  workspaceProjects: any[];
  activeWorkspaceObj: any;
  currentUser: any;
  isAdmin: boolean;
  activeProjectId?: string | null;
}) {
  const activeProjectObj = activeProjectId ? workspaceProjects.find(p => p.id === activeProjectId) : null;
  const filteredTasks = activeProjectId ? workspaceTasks.filter(t => t.projectId === activeProjectId) : workspaceTasks;

  const todoCount = filteredTasks.filter(t => t.status === "todo").length;
  const inProgressCount = filteredTasks.filter(t => t.status === "in_progress").length;
  const reviewCount = filteredTasks.filter(t => t.status === "review").length;
  const doneCount = filteredTasks.filter(t => t.status === "done").length;
  const totalTasksCount = filteredTasks.length;
  const taskProgressPercent = totalTasksCount > 0 ? Math.min(100, Math.round((doneCount / totalTasksCount) * 100)) : 0;

  const myMentions = filteredTasks.filter(t => t.assigneeIds?.includes(currentUser?.id) && t.status !== "done");

  return (
    <div className="space-y-6 mb-6">
      {/* Greetings header */}
      <div className="bg-gradient-to-r from-[#022e5f] to-[#033b7a] p-6 text-white border border-[#022e5f] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight uppercase">
            {activeProjectObj ? (
              <span>
                {isAdmin ? "⭐ " : ""}Espai: {activeWorkspaceObj?.name || 'Departament'} › Projecte: <span className="text-amber-450 text-amber-400">{activeProjectObj.name}</span>
              </span>
            ) : (
              <span>
                {isAdmin ? `⭐ Resum de l'Espai: ${activeWorkspaceObj?.name || 'Departament'}` : `Espai de Treball: ${activeWorkspaceObj?.name || 'Departament'}`}
              </span>
            )}
          </h3>
          <p className="text-xs text-blue-105 opacity-90 mt-1 max-w-2xl leading-relaxed">
            {activeProjectObj ? (
              <span>Hola {currentUser?.name}, aquí tens la llista i resum de control per a les tasques, l'estat i el pla d'Asana d'aquest projecte.</span>
            ) : (
              <span>Hola {currentUser?.name}, aquí tens un resum global de l'espai de treball actual amb els projectes i tasques vinculats, i les teves mencions pendents.</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#012042] px-3 py-1.5 border border-[#033b7a] shrink-0">
          <Activity className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
          <span className="text-[10px] uppercase font-mono tracking-wider">{activeProjectObj ? "Projecte Actiu" : "Espai Actiu"}</span>
        </div>
      </div>

      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        
        {/* CARD 1: Workspace Projects List */}
        <div className="bg-white border border-slate-200 p-4 flex flex-col shadow-sm max-h-64">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold">
              {activeProjectObj ? "Projecte Seleccionat" : "Projectes de l'Espai"}
            </span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="overflow-y-auto pr-1 flex-1 space-y-2 custom-scrollbar">
            {workspaceProjects.length > 0 ? (
              workspaceProjects.map((proj) => {
                const isSelected = proj.id === activeProjectId;
                return (
                  <div 
                    key={proj.id} 
                    className={`border p-2 transition-colors ${
                      isSelected 
                        ? 'bg-blue-50/50 border-blue-400 font-bold dark:bg-blue-950/20' 
                        : 'border-slate-100 bg-slate-50 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 line-clamp-1" title={proj.name}>{proj.name}</div>
                      {isSelected && (
                        <span className="text-[8px] bg-blue-600 text-white px-1 font-mono tracking-widest leading-none font-bold">ACTIU</span>
                      )}
                    </div>
                    <div className="text-[9.5px] text-slate-500 line-clamp-1 mt-0.5" title={proj.description}>{proj.description}</div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-450 italic mt-2">Cap projecte en aquest espai.</div>
            )}
          </div>
        </div>

        {/* CARD 2: Total Tasks Involving Workspace */}
        <div className="bg-white border border-slate-200 p-4 flex flex-col shadow-sm max-h-64">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold">
              {activeProjectObj ? "Tasques del Projecte" : "Tasques de l'Espai"}
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-600 border border-amber-200">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="overflow-y-auto pr-1 flex-1 space-y-2 custom-scrollbar">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <div key={task.id} className="border border-slate-100 p-2 bg-slate-50 hover:bg-amber-50/30 transition-colors">
                  <div className="text-xs font-bold text-slate-800 line-clamp-1" title={task.title}>{task.title || "Sense títol"}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-[1px] font-bold border ${task.status === 'done' ? 'bg-green-50 text-green-700 border-green-200' : task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : task.status === 'review' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">{task.dueDate || "Sense data"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-450 italic mt-2 text-center py-6">Cap tasca en aquest projecte actiu.</div>
            )}
          </div>
        </div>

        {/* CARD 3: Asana Task Control */}
        <div className="bg-white border border-slate-200 p-4 flex flex-col justify-between shadow-sm max-h-64">
          <div>
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold">
                {activeProjectObj ? "Resum de tasques del projecte" : "Resum de Tasques de l'espai"}
              </span>
              <div className="p-1.5 bg-blue-50 text-blue-600 border border-blue-200">
                <Check className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-3xl font-bold text-slate-800 font-sans">
                {doneCount} <span className="text-lg text-slate-400">/ {totalTasksCount}</span>
              </h4>
              <div className="text-[10px] text-slate-500 mt-2 font-mono font-bold tracking-tight uppercase space-y-1">
                <div className="flex justify-between"><span>Per fer:</span> <span className="text-slate-700">{todoCount}</span></div>
                <div className="flex justify-between"><span>En progrés:</span> <span className="text-blue-600">{inProgressCount}</span></div>
                <div className="flex justify-between"><span>En revisió:</span> <span className="text-purple-600">{reviewCount}</span></div>
              </div>
            </div>
          </div>
          <div className="mt-4 shrink-0">
            <div className="flex justify-between text-[9px] font-bold text-blue-600 mb-1">
              <span>PROGRÉS DEL PROJECTE</span>
              <span>{taskProgressPercent}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 overflow-hidden w-full">
              <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${taskProgressPercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* CARD 4: Alerts & Mentions */}
        <div className="bg-white border border-slate-200 p-4 flex flex-col shadow-sm max-h-64">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold">
              {activeProjectObj ? "Avisos i Mencions del Projecte" : "Avisos i Mencions de l'Espai"}
            </span>
            <div className="p-1.5 bg-rose-50 text-rose-600 border border-rose-200 relative">
              {myMentions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
              )}
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div className="overflow-y-auto pr-1 flex-1 space-y-2 custom-scrollbar">
            {myMentions.length > 0 ? (
              myMentions.map((mention) => (
                <div key={mention.id} className="border border-rose-100 p-2 bg-rose-50 hover:bg-rose-100/50 transition-colors">
                  <div className="text-xs font-bold text-rose-900 line-clamp-1" title={mention.title}>{mention.title}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] font-mono uppercase px-1.5 py-[1px] font-bold border bg-white border-rose-200 text-rose-600">
                      Menció pendent
                    </span>
                    <span className="text-[9px] text-rose-400 font-mono">{mention.dueDate || "Aviat"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-450 italic mt-2 text-center py-4">
                No tens cap avís ni menció pendent {activeProjectObj ? "en aquest projecte" : "en aquest espai"}. Tot al dia!
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
