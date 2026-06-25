import React, { useState } from "react";
import { Task, UserProfile, Project } from "../types";
import { DEPARTMENTS } from "../data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  Calendar, 
  PieChart as PieIcon, 
  TrendingUp, 
  Briefcase 
} from "lucide-react";

interface WorkloadDashboardProps {
  tasks: Task[];
  users: UserProfile[];
  projects: Project[];
}

export default function WorkloadDashboard({ tasks, users, projects }: WorkloadDashboardProps) {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");

  // Filter tasks based on selected department filter
  const displayedTasks = selectedDeptFilter === "all" 
    ? tasks 
    : tasks.filter(t => t.departmentId === selectedDeptFilter);

  // 1. Compute summary stats
  const totalTasks = displayedTasks.length;
  const completedTasks = displayedTasks.filter(t => t.status === "done").length;
  const pendingTasks = totalTasks - completedTasks;
  const inProgressTasks = displayedTasks.filter(t => t.status === "in_progress").length;
  const reviewTasks = displayedTasks.filter(t => t.status === "review").length;
  
  // Calculate completion percentage
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate overdue tasks (dueDate in past & not done)
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueTasks = displayedTasks.filter(t => {
    if (t.status === "done") return false;
    if (!t.dueDate) return false;
    return t.dueDate < todayStr;
  }).length;

  // 2. Prepare Data for Chart 1: Workload (Pending vs Completed) per Department
  const departmentChartData = DEPARTMENTS.map(dept => {
    const deptTasks = tasks.filter(t => t.departmentId === dept.id);
    const completed = deptTasks.filter(t => t.status === "done").length;
    const pending = deptTasks.length - completed;
    
    return {
      name: dept.name.replace("Departament de ", "").replace("Departament ", ""),
      "Completades": completed,
      "Pendents": pending,
      "Total": deptTasks.length,
      color: dept.color
    };
  });

  // 3. Prepare Data for Chart 2: Task Status Distribution (Donut Chart)
  const statusCounts = {
    todo: displayedTasks.filter(t => t.status === "todo").length,
    in_progress: inProgressTasks,
    review: reviewTasks,
    done: completedTasks
  };

  const statusChartData = [
    { name: "Pendent d'assignar/fer", value: statusCounts.todo, color: "#94a3b8" },
    { name: "En curs de resolució", value: statusCounts.in_progress, color: "#f59e0b" },
    { name: "En revisió d'aprovació", value: statusCounts.review, color: "#3b82f6" },
    { name: "Sincronitzada / Feta", value: statusCounts.done, color: "#10b981" }
  ].filter(c => c.value > 0);

  // 4. Prepare Data for Chart 3: Tasks by Priority
  const priorityChartData = [
    { name: "Urgent", value: displayedTasks.filter(t => t.priority === "urgent").length, color: "#dc2626" },
    { name: "Alta Prioritat", value: displayedTasks.filter(t => t.priority === "high").length, color: "#ef4444" },
    { name: "Mitjana", value: displayedTasks.filter(t => t.priority === "medium").length, color: "#f59e0b" },
    { name: "Baixa", value: displayedTasks.filter(t => t.priority === "low").length, color: "#10b981" }
  ].filter(p => p.value > 0);

  // 5. Prepare Data for Chart 4: Employee workloads
  const employeeChartData = users.map(u => {
    const uTasks = tasks.filter(t => (t.assigneeIds?.includes(u.id) || t.assigneeId === u.id));
    const completed = uTasks.filter(t => t.status === "done").length;
    const pending = uTasks.length - completed;
    const deptName = u.departmentId ? (DEPARTMENTS.find(d => d.id === u.departmentId)?.name.split(" ")[0] || "Direcció") : "General";

    return {
      name: `${u.name} (${deptName})`,
      "Completades": completed,
      "Pendents": pending,
      "Total": uTasks.length
    };
  }).filter(u => u.Total > 0) // Only display active employees
    .sort((a, b) => b.Total - a.Total);

  // Custom tooltips styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-2.5 text-white font-mono text-[11px] shadow-lg rounded-none">
          <p className="font-bold border-b border-slate-800 pb-1 mb-1 font-sans text-slate-200">{label}</p>
          {payload.map((pld: any) => (
            <p key={pld.name} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5" style={{ color: pld.color || pld.fill }}>
                <span className="w-1.5 h-1.5 inline-block rounded-none bg-current" />
                {pld.name}:
              </span>
              <span className="font-black text-white">{pld.value} tasques</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200" id="executive-workload-intelligence">
      
      {/* Dashboard Top Row and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-4 rounded-none">
        <div>
          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-indigo-650" />
            <span>Panell Executiu de Rendiment i Càrrega de l'Empresa</span>
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
            Quadre de comandaments sincronitzat en temps real amb les metadades de l'Asana Enterprise.
          </p>
        </div>

        {/* Filter Selection */}
        <div className="flex items-center gap-2 font-mono text-xs w-full sm:w-auto shrink-0 justify-end">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Filtrar Àrea:</span>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="bg-white text-slate-800 border border-slate-250 py-1 px-2 text-xs font-bold rounded-none focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">Sota tots els 5 Departaments</option>
            {DEPARTMENTS.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total stats */}
        <div className="p-4 border border-slate-200 bg-white shadow-sm hover:border-slate-350 transition-colors rounded-none flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Volum de Feina</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-800 tracking-tight">{totalTasks}</span>
            <span className="text-[10px] text-slate-450 block font-mono mt-0.5">Tasques en aquest filtre</span>
          </div>
        </div>

        {/* Pending Card */}
        <div className="p-4 border border-slate-200 bg-white shadow-sm hover:border-slate-350 transition-colors rounded-none flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Tasques Pendents</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-600 tracking-tight">{pendingTasks}</span>
            <div className="text-[10px] text-slate-450 block font-mono mt-0.5 flex gap-1 items-center">
              <span>Todo: {statusCounts.todo}</span> | <span>Curs: {statusCounts.in_progress}</span>
            </div>
          </div>
        </div>

        {/* Done Card with percentage */}
        <div className="p-4 border border-slate-200 bg-white shadow-sm hover:border-slate-350 transition-colors rounded-none flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Taxa d'èxit</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-505" style={{ color: '#10b981' }} />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">{completionRate}%</span>
            <span className="text-[10px] text-slate-450 block font-mono mt-0.5">
              {completedTasks} de {totalTasks} completades
            </span>
          </div>
        </div>

        {/* Overdue alert Card */}
        <div className={`p-4 border shadow-sm transition-colors rounded-none flex flex-col justify-between ${
          overdueTasks > 0 ? "border-red-200 bg-red-50/10 hover:border-red-300" : "border-slate-200 bg-white hover:border-slate-350"
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Tasques Fora de Termini</span>
            <AlertTriangle className={`w-4 h-4 ${overdueTasks > 0 ? "text-red-500 animate-pulse" : "text-slate-450"}`} />
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black tracking-tight ${overdueTasks > 0 ? "text-red-650" : "text-slate-800"}`}>
              {overdueTasks}
            </span>
            <span className="text-[10px] text-slate-450 block font-mono mt-0.5">
              {overdueTasks > 0 ? "Requereix replanificació" : "Calendari sencer al dia"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Bar Chart - Workload by Department (Side-by-side) */}
      <div className="p-5 border border-slate-200 bg-white shadow-sm rounded-none">
        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-805">
              1. Càrrega de Treball per Departament
            </h4>
            <p className="text-[10.5px] text-slate-450 mt-0.5 font-sans">
              Tasques actives distribuïdes entre els 5 nous departaments de gestió definits per a l'Asana Enterprise.
            </p>
          </div>
          <div className="flex items-center gap-3.5 font-mono text-[10px]">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span><span className="font-bold text-slate-500">Completades</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-500 rounded-none inline-block"></span><span className="font-bold text-slate-500">Pendents</span></div>
          </div>
        </div>

        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departmentChartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 9, fontWeight: "bold", fill: "#64748b" }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: "#64748b" }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Completades" fill="#10b981" radius={0} maxBarSize={30} />
              <Bar dataKey="Pendents" fill="#f59e0b" radius={0} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid of Inner Details: Task Status, Priorities, and Employee Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Card A: Task Status Distribution (Status Pie) - 4 cols */}
        <div className="p-5 border border-slate-200 bg-white shadow-sm rounded-none lg:col-span-4 flex flex-col">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-805 flex items-center gap-1.5">
              <PieIcon className="w-3.5 h-3.5 text-indigo-505" />
              <span>2. Estat de les Tasques (%)</span>
            </h4>
          </div>

          {statusChartData.length === 0 ? (
            <div className="flex-grow flex items-center justify-center py-10 text-slate-400 text-xs font-mono">
              Sense tasques registrades
            </div>
          ) : (
            <div className="flex-grow flex flex-col justify-between">
              <div className="h-44 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} tasques`, "Estat"]} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Embedded percentage directly in the center of the ring */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-bold text-slate-450 uppercase font-mono">Completat</span>
                  <span className="text-xl font-black text-slate-800">{completionRate}%</span>
                </div>
              </div>

              {/* Status Details List */}
              <div className="space-y-1.5 mt-2 text-[10.5px]">
                {statusChartData.map((d, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-slate-100 font-medium">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-mono font-bold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card B: Performance workload per Employee (Horizontal Bar) - 5 cols */}
        <div className="p-5 border border-slate-200 bg-white shadow-sm rounded-none lg:col-span-5 flex flex-col">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-850 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>3. Càrrega d'Equip (Tasques Actives)</span>
            </h4>
          </div>

          {employeeChartData.length === 0 ? (
            <div className="flex-grow flex items-center justify-center py-10 text-slate-400 text-xs font-mono">
              No hi ha treballadors amb tasques actives.
            </div>
          ) : (
            <div className="flex-grow mt-3">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={employeeChartData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 9, fontWeight: "bold", fill: "#334155" }} 
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      width={120}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Completades" stackId="a" fill="#10b981" maxBarSize={15} />
                    <Bar dataKey="Pendents" stackId="a" fill="#f59e0b" maxBarSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[9px] text-slate-400 italic text-center mt-2">
                Tip: La barra verda representa tasques completades i la taronja tasques restants.
              </p>
            </div>
          )}
        </div>

        {/* Card C: Priorities & Overdue distribution table - 3 cols */}
        <div className="p-5 border border-slate-200 bg-white shadow-sm rounded-none lg:col-span-3 flex flex-col">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-805 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-505" />
              <span>4. Nivell de Severitat</span>
            </h4>
          </div>

          <div className="flex-grow mt-3 space-y-4">
            {/* Priorities mini bar chart preview */}
            <div className="space-y-2">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Tasques per Prioritat</span>
              <div className="space-y-1.5 font-sans text-xs">
                {priorityChartData.map((p, idx) => {
                  const percent = totalTasks > 0 ? Math.round((p.value / totalTasks) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-bold text-[10px]">
                        <span className="text-slate-650">{p.name}</span>
                        <span className="font-mono text-slate-800">{p.value} ({percent}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-none overflow-hidden">
                        <div className="h-full rounded-none" style={{ width: `${percent}%`, backgroundColor: p.color }} />
                      </div>
                    </div>
                  );
                })}
                {priorityChartData.length === 0 && (
                  <div className="text-[10px] text-slate-450 italic font-mono py-1">Cap prioritat detectada</div>
                )}
              </div>
            </div>

            {/* General metrics tracker - Corporate SLA style */}
            <div className="border border-slate-200 bg-slate-50 p-3 rounded-none mt-2">
              <span className="text-[9.5px] font-bold uppercase block tracking-wider text-slate-400 font-mono mb-2">Acords de Nivell de Servei (SLA)</span>
              
              <div className="space-y-2 text-[10.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Mitjana de tasques / dept</span>
                  <span className="font-mono font-bold text-slate-800">
                    {Math.round((tasks.length / 5) * 10) / 10}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Tasques en cua d'Espera</span>
                  <span className="font-mono font-bold text-slate-800">{statusCounts.todo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Taxa d'aprovació pendent</span>
                  <span className="font-mono font-bold text-slate-800">{statusCounts.review}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-slate-200">
                  <span className="text-slate-700 font-bold">Resolució Total</span>
                  <span className="font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-150 px-1">
                    {completedTasks}/{totalTasks}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
