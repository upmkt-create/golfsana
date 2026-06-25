import React, { useState } from "react";
import { Task, Project, UserProfile, Department } from "../types";
import { Search, Info, LayoutGrid, ArrowLeft } from "lucide-react";

interface AllTasksGlobalViewProps {
  tasks: Task[];
  projects: Project[];
  users: UserProfile[];
  workspaces: Department[];
  onSelectTask: (task: Task) => void;
  onBack: () => void;
}

export default function AllTasksGlobalView({
  tasks,
  projects,
  users,
  workspaces,
  onSelectTask,
  onBack,
}: AllTasksGlobalViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border text-center border-slate-200 p-8 shadow-sm group relative">
        <button 
          onClick={onBack}
          className="absolute left-6 top-6 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" /> Tornar
        </button>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Taulell Global de Tasques</h2>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto">
          Llistat complet de totes les tasques empresarials planificades a través de tots els projectes i espais de treball. Podeu buscar, filtrar i veure a qui estan delegades.
        </p>
      </div>

      <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cerca per nom de la tasca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 transition-all"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
          >
            <option value="all">Tots els estats</option>
            <option value="todo">Pendents (Per fer)</option>
            <option value="in_progress">En Processament</option>
            <option value="review">En Avaluació</option>
            <option value="done">Completades</option>
          </select>
        </div>

        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Tasca</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Estat</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Projecte</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Espai / Dept</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Assignat a</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm italic">
                    Cap tasca trobada.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const project = projects.find(p => p.id === task.projectId);
                  const workspace = project ? workspaces.find(w => w.id === project.workspaceId) : (task.workspaceId ? workspaces.find(w => w.id === task.workspaceId) : null);
                  const assignees = users.filter(u => 
                    (task.assigneeIds && Array.isArray(task.assigneeIds) && task.assigneeIds.includes(u.id)) || 
                    (task.assigneeId === u.id)
                  );

                  return (
                    <tr 
                      key={task.id} 
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => onSelectTask(task)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors line-clamp-1">{task.title || "Sense títol"}</span>
                          {task.dueDate && <span className="text-[10px] text-slate-500 font-mono mt-0.5">Venciment: {task.dueDate}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 border text-[10px] uppercase font-mono font-bold ${
                          task.status === "done" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          task.status === "review" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          task.status === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {task.status === "done" ? "Acabat" :
                           task.status === "review" ? "Revisió" :
                           task.status === "in_progress" ? "En Curs" : "Pendent"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {project ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-none shrink-0" style={{ backgroundColor: project.color }}></span>
                            <span className="text-xs font-semibold text-slate-700 line-clamp-1">{project.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No assignat</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {workspace ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-sm bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-500">
                              <LayoutGrid className="w-3 h-3" />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 line-clamp-1">{workspace.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No assignat</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {assignees.length > 0 ? (
                          <div className="flex -space-x-1 overflow-hidden">
                            {assignees.map(user => (
                              <div
                                key={user.id}
                                className="w-6 h-6 rounded-full text-white border border-white flex items-center justify-center text-[10px] font-bold shrink-0 font-sans"
                                style={{
                                  backgroundColor: user.id === "member_isabel" ? "#3B82F6" : 
                                                   user.id === "member_rocio" ? "#10B981" : 
                                                   user.id === "member_marc" ? "#F59E0B" : 
                                                   user.id === "member_erika" ? "#EF4444" : 
                                                   user.id === "member_ester" ? "#8B5CF6" : 
                                                   user.id === "member_monica" ? "#EC4899" : 
                                                   user.id === "member_marina" ? "#06B6D4" : 
                                                   user.id === "member_saba" ? "#14B8A6" : "#4B5563",
                                }}
                                title={user.name}
                              >
                                {user.avatar || user.name.slice(0, 2).toUpperCase()}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No assignat</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
