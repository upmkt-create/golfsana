import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  BarChart,
  PieChart as LucidePieChart,
  Users,
  Layers,
  FolderOpen,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
  Building2,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Info,
  Sliders,
  DollarSign,
  Briefcase,
  Target
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";
import { Task, UserProfile, Project } from "../types";
import { DEPARTMENTS } from "../data";

interface ReportsDashboardProps {
  tasks: Task[];
  users: UserProfile[];
  projects: Project[];
  defaultDepartmentId?: string;
}

export default function ReportsDashboard({ tasks, users, projects, defaultDepartmentId = "all" }: ReportsDashboardProps) {
  // 1. Interactive States
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(defaultDepartmentId);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [showBusinessTips, setShowBusinessTips] = useState<boolean>(true);

  React.useEffect(() => {
    console.log("ReportsDashboard mounted. Default department:", selectedDepartmentId);
  }, []);

  // Today helper
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // 2. Dynamic Filtering of tasks based on selected department & project
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchDept = selectedDepartmentId === "all" || t.departmentId === selectedDepartmentId || (t.departmentIds && t.departmentIds.includes(selectedDepartmentId));
      const matchProj = selectedProjectId === "all" || t.projectId === selectedProjectId;
      return matchDept && matchProj;
    });
  }, [tasks, selectedDepartmentId, selectedProjectId]);

  // 3. Calculated metrics for the filtered subset
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.status === "done");
    const pending = filteredTasks.filter((t) => t.status !== "done");

    const completedOnTime = completed.filter((t) => t.completedOnTime === true);
    const completedLate = completed.filter((t) => t.completedOnTime === false);

    // Overdue pending tasks: due date is in the past and status is not done
    const pendingOverdue = pending.filter((t) => t.dueDate && t.dueDate < todayStr);
    const pendingOnTime = pending.filter((t) => !t.dueDate || t.dueDate >= todayStr);

    const onTimeRate = completed.length > 0
      ? Math.round((completedOnTime.length / completed.length) * 100)
      : 100;

    return {
      total,
      completed: completed.length,
      pending: pending.length,
      completedOnTime: completedOnTime.length,
      completedLate: completedLate.length,
      pendingOverdue: pendingOverdue.length,
      pendingOnTime: pendingOnTime.length,
      onTimeRate,
    };
  }, [filteredTasks, todayStr]);

  // 4. Data for CHART 1: Pending Tasks by Project (Tasques sense finalitzar per Projecte)
  const pendingByProjectData = useMemo(() => {
    // Group active unfinished tasks
    const pendingTasks = filteredTasks.filter((t) => t.status !== "done");
    const counts: Record<string, number> = {};

    // Initialize counts for projects that have tasks in this subset
    projects.forEach(p => {
      counts[p.name] = 0;
    });

    pendingTasks.forEach((t) => {
      const proj = projects.find((p) => p.id === t.projectId);
      const projName = proj ? proj.name : "Tasques Generals";
      counts[projName] = (counts[projName] || 0) + 1;
    });

    // Format for Recharts
    return Object.entries(counts)
      .map(([name, value]) => ({ name, quantitat: value }))
      .filter((item) => item.quantitat > 0); // only show projects with pending tasks
  }, [filteredTasks, projects]);

  // 5. Data for CHART 2: Tasks by Completion Status (Tasques per Estat de Finalització)
  const completionStatusData = useMemo(() => {
    return [
      { name: "Finalitzades a temps", value: stats.completedOnTime, color: "#10B981" },
      { name: "Finalitzades amb retard", value: stats.completedLate, color: "#F59E0B" },
      { name: "Pendents a temps", value: stats.pendingOnTime, color: "#3B82F6" },
      { name: "Pendents retardades (Vencides)", value: stats.pendingOverdue, color: "#EF4444" },
    ].filter(item => item.value > 0); // Omit 0 items to avoid visual clutter
  }, [stats]);

  // 6. Upcoming Tasks by Team Member (Pròximes tasques per responsable)
  // We want to list the upcoming tasks sorted by due date, for active responsibles
  const upcomingTasksByAssignee = useMemo(() => {
    const activePending = filteredTasks
      .filter((t) => t.status !== "done")
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });

    return activePending.slice(0, 10); // show top 10 imminent tasks
  }, [filteredTasks]);

  // Pending Count per User (quantitat de tasques pendents per usuari)
  const pendingTasksPerUserData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      counts[u.name] = 0;
    });

    filteredTasks.filter(t => t.status !== "done").forEach((t) => {
      const user = users.find((u) => (t.assigneeIds?.includes(u.id) || u.id === t.assigneeId));
      if (user) {
        counts[user.name] = (counts[user.name] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([name, pendents]) => ({
      name,
      pendents
    }));
  }, [filteredTasks, users]);

  // 7. Department Traffic Light Risk (Semàfor de Risc del Departament)
  const departmentRisk = useMemo(() => {
    if (stats.pendingOverdue > 0) {
      return { status: "Perill Crític", color: "bg-rose-500 text-white border-rose-350 border-rose-600", desc: "S'han trobat tasques vençudes sense completar. Acció requerida.", icon: AlertCircle };
    }
    if (stats.pending > 4) {
      return { status: "Alerta de Càrrega", color: "bg-amber-500 text-white border-amber-350 border-amber-600", desc: "Elevat volum de tasques pendents en cua.", icon: Clock };
    }
    return { status: "Segur i al Corrent", color: "bg-emerald-500 text-white border-emerald-350 border-emerald-600", desc: "Totes les tasques estan planificades correctament.", icon: CheckCircle2 };
  }, [stats]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Panel */}
      <div className="bg-[#03254c] text-white p-6 rounded-none border border-[#012042] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-700/50 px-2 py-0.5 font-bold uppercase tracking-wider font-mono">
              Asana Business Intelligence
            </span>
          </div>
          <h2 className="text-xl font-bold mt-1 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Centre d'Informes Analítics i Quadre de Comandament
          </h2>
          <p className="text-xs text-blue-200/90 mt-1 max-w-3xl leading-normal">
            Explora de manera integrada el progrés general o filtra per cada un dels departaments individuals del Club de Golf per auditar les mètriques d'eficiència, riscos temporals i col·laboració en línia.
          </p>
        </div>

        <button
          onClick={() => setShowBusinessTips(!showBusinessTips)}
          className="text-xs bg-white/10 hover:bg-white/15 px-3 py-1.5 font-semibold flex items-center gap-1.5 transition-all text-white border border-white/20 whitespace-nowrap"
        >
          <Info className="w-3.5 h-3.5" />
          <span>{showBusinessTips ? "Ocultar Mètriques" : "Explicar Termes"}</span>
        </button>
      </div>

      {showBusinessTips && (
        <div className="bg-slate-50 border border-slate-205 p-4 rounded-none text-slate-800 text-xs leading-relaxed grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wide text-blue-805">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Taxa de Termini (On-Time Rate)
            </h4>
            <p className="text-slate-550 text-[11px]">
              El percentatge de tasques finalitzades que s'han tancat el mateix dia o abans del venciment establert. El llindar Asana Business recomanat és del <strong>75%</strong> o superior.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wide text-blue-805">
              <Building2 className="w-4 h-4 text-sky-600" />
              Tableros de Departament
            </h4>
            <p className="text-slate-550 text-[11px]">
              Seleccionant un departament es recalcula automàticament l'estat d'aquella àrea, útil per a la Rocío per comparar la feina de Comercials, Màrqueting o l'escola de Pitch&Putt.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wide text-blue-805">
              <Target className="w-4 h-4 text-indigo-600" />
              Alineació de Projecte
            </h4>
            <p className="text-slate-550 text-[11px]">
              Cada tasca pertany estructuralment a un Projecte, i pot posseir fins a 10 branques d'execució gràcies a les subtasques actives per un control detallat i escalable.
            </p>
          </div>
        </div>
      )}

      {/* DEPARTMENT & PROJECT SELECTOR PANEL */}
      <div className="bg-white border border-slate-200 p-5 shadow-none flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        
        {/* Department options */}
        <div className="space-y-1.5 w-full md:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
            Filtrar per Departament (Tablero Especialitçat)
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedDepartmentId("all")}
              className={`p-1.5 px-3.5 text-xs transition-all ${
                selectedDepartmentId === "all"
                  ? "bg-slate-900 text-white font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tots els Departaments
            </button>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDepartmentId(dept.id)}
                className={`p-1.5 px-3 uppercase text-[10px] font-mono tracking-tight transition-all font-semibold border ${
                  selectedDepartmentId === dept.id
                    ? "bg-indigo-600 text-white border-indigo-700 font-extrabold"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {dept.name.replace("Departament de ", "").replace("Departament ", "")}
              </button>
            ))}
          </div>
        </div>

        {/* Project alignment option */}
        <div className="space-y-1.5 w-full md:w-56 shrink-0">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
            Filtrar per Projecte Actiu
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full text-xs p-1.5 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
          >
            <option value="all">Tots els Projectes del Grup</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DEPARTMENT BANNER STATUS & METRIC SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Department Details Card / Risk Light */}
        <div className={`p-4 border flex flex-col justify-between ${
          selectedDepartmentId === "all" 
            ? "bg-slate-100 border-slate-350 text-slate-900" 
            : "bg-indigo-50/50 border-indigo-200 text-slate-900"
        }`}>
          <div>
            <span className="text-[8.5px] font-bold uppercase tracking-widest text-slate-400 block font-mono">
              Estat de Monitorització
            </span>
            <div className="text-sm font-extrabold text-slate-800 mt-1">
              {selectedDepartmentId === "all" 
                ? "Resum Corporatiu Global" 
                : DEPARTMENTS.find(d => d.id === selectedDepartmentId)?.name}
            </div>
            <p className="text-[10.5px] text-slate-500 mt-1.5 leading-snug">
              {selectedDepartmentId === "all" 
                ? "S'estan unint els registres de totes les divisions administratives en temps real."
                : DEPARTMENTS.find(d => d.id === selectedDepartmentId)?.description}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <span className="text-[8.5px] font-bold uppercase tracking-widest text-slate-400 block font-mono mb-1">
              Semàfor del Departament
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${
                departmentRisk.status === "Perill Crític" ? "bg-rose-500 animate-pulse" : departmentRisk.status === "Alerta de Càrrega" ? "bg-amber-400" : "bg-emerald-500"
              }`}></span>
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">{departmentRisk.status}</span>
            </div>
            <span className="text-[9.5px] text-slate-450 block mt-0.5">{departmentRisk.desc}</span>
          </div>
        </div>

        {/* Total stats columns */}
        <div className="bg-white border border-slate-200 p-4 flex flex-col justify-between">
          <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Volum Actiu al Tauler</span>
          <div className="mt-2 text-3xl font-extrabold text-slate-850 font-mono">
            {stats.total}
          </div>
          <div>
            <span className="text-[10px] text-slate-450 block">{stats.pending} tasques sense complir</span>
            <div className="w-full bg-slate-100 h-1.5 rounded-none mt-2 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full" 
                style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* On Time completion counter widget */}
        <div className="bg-white border border-slate-200 p-4 flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-[8.5px] font-mono font-bold text-emerald-800 uppercase tracking-wider block">Compliment a temps (KPI)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 font-mono">{stats.onTimeRate}%</span>
            <span className="text-xs text-slate-450 font-medium font-sans">taxa eficiència</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">
              {stats.completedOnTime} de {stats.completed} finalitzades correctament abans del límit.
            </span>
          </div>
        </div>

        {/* Retards / Penalitzacions */}
        <div className="bg-white border border-slate-200 p-4 flex flex-col justify-between border-l-4 border-l-rose-500">
          <span className="text-[8.5px] font-mono font-bold text-rose-800 uppercase tracking-wider block">Tasques Vençudes Actives</span>
          <div className="mt-2 text-3xl font-extrabold text-rose-600 font-mono">
            {stats.pendingOverdue}
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">
              {stats.completedLate} ràdios de tancament tardà addicionals detectades en l'històric d'incentius.
            </span>
          </div>
        </div>

      </div>

      {/* CORE CHARTS: BAR & PIE / QUESITO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: TASQUES SENSE FINALITZAR PER PROJECTE */}
        <div className="bg-white border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <BarChart className="w-4 h-4 text-indigo-600 font-bold" />
              Gràfic: Tasques sense finalitzar per projecte (Actives)
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-0.5">
              Refleteix la càrrega de treball acumulada actualment per a cada projecte del grup.
            </p>
          </div>

          <div className="mt-6 h-60 w-full">
            {pendingByProjectData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 bg-slate-50/50 border border-dashed border-slate-250 p-4 text-center">
                No hi ha tasques pendents en curs per a cap projecte dins d'aquestes condicions de filtre visual.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={pendingByProjectData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontFamily="monospace" tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} fontFamily="monospace" allowDecimals={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ fontSize: "11px", backgroundColor: "#0f172a", color: "#fff", borderRadius: "0px", border: "none" }}
                    itemStyle={{ color: "#38bdf8" }}
                  />
                  <Bar dataKey="quantitat" name="Tasques pendents" fill="#4f46e5" radius={[0, 0, 0, 0]} barSize={34} />
                </RechartsBarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 2: TASQUES PER ESTAT DE FINALITZACIÓ (QUESITO) */}
        <div className="bg-white border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <LucidePieChart className="w-4 h-4 text-cyan-600" />
              Gràfic Circular: Estat i distribució temporal de les tasques
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-0.5">
              Audita visualment les porcions d'assoliment a temps o retard de tot l'equip ("Quesito").
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
            <div className="h-44 w-full">
              {completionStatusData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center">
                  Sense dades de tasques.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={completionStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {completionStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ fontSize: "11.5px", background: "#ffffff", border: "1px solid #cbd5e1" }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Manual Legend */}
            <div className="space-y-1.5 pr-2">
              {completionStatusData.map((item, idx) => {
                const totalVal = completionStatusData.reduce((acc, curr) => acc + curr.value, 0);
                const percent = totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0;
                return (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 block shrink-0" style={{ backgroundColor: item.color }}></span>
                    <div className="truncate flex-1 text-slate-650 flex justify-between gap-1">
                      <span className="truncate font-semibold">{item.name}</span>
                      <span className="font-mono font-bold text-slate-800">
                        {item.value} ({percent}%)
                      </span>
                    </div>
                  </div>
                );
              })}
              {completionStatusData.length === 0 && (
                <span className="text-[10px] text-slate-400">No hi ha prou registres actius per generar la porció circular.</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ADDITIONAL STATISTICS CHART & LIST: PENDING PER USER & IMMINENT OVERVIEWS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Chart of Pending Tasks per Member (2/3 size roughly) */}
        <div className="bg-white border border-slate-200 p-5 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-600" />
              Tasques pendents per responsable
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-0.5">
              Volum de feina actiu de cada integrant del Club sense enllestir.
            </p>
          </div>

          <div className="mt-6 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart layout="vertical" data={pendingTasksPerUserData} margin={{ top: 0, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={9} fontFamily="monospace" tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={9} fontFamily="sans-serif" width={80} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ fontSize: "11px", backgroundColor: "#1e293b", color: "#fff", border: "none" }}
                  itemStyle={{ color: "#34d399" }}
                />
                <Bar dataKey="pendents" name="Tasques incompletes" fill="#3b82f6" barSize={12} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column: Next Tasks List (2/3 size) */}
        <div className="bg-white border border-slate-200 p-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs text-slate-805 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Pròximes Tasques per Cap de Setmana i Termini imminent
            </h4>
            <p className="text-[10.5px] text-slate-400 mt-0.5">
              Agenda ordenada cronològicament per a controlar retards potencials abans que afectin al client.
            </p>
          </div>

          <div className="mt-4 space-y-2 max-h-[224px] overflow-y-auto pr-1">
            {upcomingTasksByAssignee.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50">
                Excel·lent! No s'ha trobat cap tasca restant pendent per lliurar.
              </div>
            ) : (
              upcomingTasksByAssignee.map((task) => {
                const user = users.find(u => (task.assigneeIds?.includes(u.id) || u.id === task.assigneeId));
                const proj = projects.find(p => p.id === task.projectId);
                const isOverdue = task.dueDate && task.dueDate < todayStr;

                return (
                  <div key={task.id} className="p-2.5 bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 truncate">{task.title}</span>
                        {task.priority === "urgent" && (
                          <span className="text-[8px] bg-red-600 text-white px-1 py-0.5 rounded-none font-extrabold uppercase tracking-tight animate-pulse">Urgent</span>
                        )}
                        {task.priority === "high" && (
                          <span className="text-[8px] bg-rose-50 text-rose-600 px-1 py-0.5 rounded-none font-bold uppercase tracking-tight">Alta</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-450 mt-0.5 flex items-center gap-2">
                        <span className="font-semibold text-slate-600">{user?.name || "Desconegut"}</span>
                        <span>&bull;</span>
                        <span className="truncate">{proj?.name || "Sense projecte"}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`font-mono text-[10.5px] font-bold block ${isOverdue ? "text-rose-600" : "text-slate-600"}`}>
                        Venciment: {task.dueDate || "Sin data"}
                      </span>
                      {isOverdue ? (
                        <span className="text-[8.5px] text-rose-700 bg-rose-50 border border-rose-200 px-1 font-bold rounded-sm animate-pulse block mt-0.5">
                          TARDÀ / FORA DE TERMINI
                        </span>
                      ) : (
                        <span className="text-[8.5px] text-slate-400 block">Dins de termini</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* GOALS & ENTERPRISE METALS SECTION (Asana Business Extra Feature) */}
      <div className="border border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-600" />
            Metes Estratègiques i Objectius Corporatius (OKRs Asana Business)
          </h3>
          <p className="text-[10px] text-slate-405 mt-0.5">
            Assegura l'alineació de l'equip amb els grans indicadors de GolfSana. Les tasques resoltes alimenten directament el progrés d'aquestes metes clau.
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="border border-slate-150 p-3 bg-white space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[8.5px] bg-[#022e5f] text-blue-200 border border-[#033b7a] px-1.5 py-0.5 font-bold rounded-none uppercase font-mono tracking-widest block w-fit">
                  Comercial
                </span>
                <h4 className="font-bold text-xs text-slate-800 mt-1">Augmentar green fees de socis un 15%</h4>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600">82%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-none border border-slate-200 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: "82%" }}></div>
            </div>
            <p className="text-[10px] text-slate-400">
              Coordinadora: Erika | Control de tarifes i millors intervals de Tee Times.
            </p>
          </div>

          <div className="border border-slate-150 p-3 bg-white space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[8.5px] bg-[#022e5f] text-blue-200 border border-[#033b7a] px-1.5 py-0.5 font-bold rounded-none uppercase font-mono tracking-widest block w-fit">
                  Reserves
                </span>
                <h4 className="font-bold text-xs text-slate-800 mt-1">Sincronització de l'App Golf Manager</h4>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600">100%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-none border border-slate-200 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: "100%" }}></div>
            </div>
            <p className="text-[10px] text-slate-400">
              Coordinadora: Marina | Sincronització en curs d'intervals establerts a 10 minuts.
            </p>
          </div>

          <div className="border border-slate-150 p-3 bg-white space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[8.5px] bg-[#022e5f] text-blue-200 border border-[#033b7a] px-1.5 py-0.5 font-bold rounded-none uppercase font-mono tracking-widest block w-fit">
                  Incentius
                </span>
                <h4 className="font-bold text-xs text-slate-800 mt-1">Lliurar bonus variables mensuals</h4>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600">
                {stats.onTimeRate >= 75 ? "Apte" : "Alerta"}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-none border border-slate-200 overflow-hidden">
              <div className="bg-amber-400 h-full" style={{ width: `${stats.onTimeRate}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-400">
              Taxa general d'eficiència és del {stats.onTimeRate}%. Desemborsament sota decisió de la Rocío.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
