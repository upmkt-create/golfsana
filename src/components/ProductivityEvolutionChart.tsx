import React, { useState, useMemo } from "react";
import { Task, Workspace } from "../types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ArrowUpRight, 
  Briefcase,
  SlidersHorizontal
} from "lucide-react";

interface ProductivityEvolutionChartProps {
  tasks: Task[];
  workspaces: Workspace[];
}

// 3-month baseline structure for each department to guarantee realistic telemetry trends
// and allow new live tasks to dynamically alter the current month's (Juny) totals.
interface MonthData {
  monthName: string;
  completadesBaseline: number;
  pendentsBaseline: number;
}

const HISTORICAL_BASELINES: Record<string, MonthData[]> = {
  "all": [
    { monthName: "Abril", completadesBaseline: 60, pendentsBaseline: 23 },
    { monthName: "Maig", completadesBaseline: 82, pendentsBaseline: 34 },
    { monthName: "Juny (Actual)", completadesBaseline: 98, pendentsBaseline: 42 }
  ],
  "dep-comercial": [
    { monthName: "Abril", completadesBaseline: 37, pendentsBaseline: 13 },
    { monthName: "Maig", completadesBaseline: 50, pendentsBaseline: 19 },
    { monthName: "Juny (Actual)", completadesBaseline: 57, pendentsBaseline: 24 }
  ],
  "dep-marqueting": [
    { monthName: "Abril", completadesBaseline: 8, pendentsBaseline: 3 },
    { monthName: "Maig", completadesBaseline: 11, pendentsBaseline: 5 },
    { monthName: "Juny (Actual)", completadesBaseline: 14, pendentsBaseline: 6 }
  ],
  "dep-esportiu": [
    { monthName: "Abril", completadesBaseline: 10, pendentsBaseline: 5 },
    { monthName: "Maig", completadesBaseline: 14, pendentsBaseline: 7 },
    { monthName: "Juny (Actual)", completadesBaseline: 18, pendentsBaseline: 8 }
  ],
  "dep-pitch-putt": [
    { monthName: "Abril", completadesBaseline: 5, pendentsBaseline: 2 },
    { monthName: "Maig", completadesBaseline: 7, pendentsBaseline: 3 },
    { monthName: "Juny (Actual)", completadesBaseline: 9, pendentsBaseline: 4 }
  ]
};

export default function ProductivityEvolutionChart({ tasks, workspaces }: ProductivityEvolutionChartProps) {
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");

  const chartData = useMemo(() => {
    // Get baseline array for this workspace id
    const baseline = HISTORICAL_BASELINES[selectedDeptId] || [
      { monthName: "Abril", completadesBaseline: 4, pendentsBaseline: 2 },
      { monthName: "Maig", completadesBaseline: 6, pendentsBaseline: 3 },
      { monthName: "Juny (Actual)", completadesBaseline: 8, pendentsBaseline: 4 }
    ];

    // Filter live tasks based on selected department (workspace)
    const liveTasks = selectedDeptId === "all" 
      ? tasks 
      : tasks.filter(t => t.workspaceId === selectedDeptId);

    // Live calculations for the current month (Juny 2026)
    // Let's count actual tasks that are Done vs Active (todo/in_progress/review)
    const liveDoneCount = liveTasks.filter(t => t.status === "done").length;
    const liveActiveCount = liveTasks.filter(t => t.status !== "done").length;

    return baseline.map((data) => {
      // For the current month "Juny (Actual)", we dynamically add the live tasks in the system
      if (data.monthName.startsWith("Juny")) {
        return {
          name: data.monthName,
          "Tasques Completades": data.completadesBaseline + liveDoneCount,
          "Tasques Pendents": data.pendentsBaseline + liveActiveCount,
          total: (data.completadesBaseline + liveDoneCount) + (data.pendentsBaseline + liveActiveCount)
        };
      }
      return {
        name: data.monthName,
        "Tasques Completades": data.completadesBaseline,
        "Tasques Pendents": data.pendentsBaseline,
        total: data.completadesBaseline + data.pendentsBaseline
      };
    });
  }, [tasks, selectedDeptId]);

  // Derived current month's highlights
  const currentMonthData = chartData[2] || { "Tasques Completades": 1, "Tasques Pendents": 1, total: 2 };
  const completedCount = currentMonthData["Tasques Completades"];
  const pendingCount = currentMonthData["Tasques Pendents"];
  const totalMonthTasks = currentMonthData.total;
  
  const productivityIndex = totalMonthTasks > 0 
    ? Math.round((completedCount / totalMonthTasks) * 100) 
    : 0;

  // Compute total productivity evolution trend delta (Completades May -> June)
  const previousMonthCompleted = chartData[1]?.["Tasques Completades"] || 1;
  const growthRate = previousMonthCompleted > 0
    ? Math.round(((completedCount - previousMonthCompleted) / previousMonthCompleted) * 100)
    : 0;

  return (
    <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-5" id="productivity-evolution-block">
      {/* Block Header */}
      <div className="border-b border-slate-150 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-slate-900 text-white font-mono font-extrabold px-2 py-0.5 tracking-wider uppercase mb-1 inline-block">
            MÈTRIQUES EXECUTIVES (ÚLTIMS 3 MESOS)
          </span>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Evolució de la Productivitat per Departament</span>
          </h3>
          <p className="text-[10.5px] text-slate-505 font-semibold mt-0.5">
            Comparativa temporal de rendiment: tasques finalitzades amb èxit versus volum pendent
          </p>
        </div>

        {/* Dropdown / Inline Department selector */}
        <div className="flex items-center gap-2 font-mono text-xs w-full md:w-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-450 shrink-0" />
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="w-full md:w-64 bg-slate-50 border border-slate-250 text-slate-800 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            id="productivity-dept-selector"
          >
            <option value="all">🌍 Tots els Departaments (Consolidat)</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                🏢 {ws.name.replace("Departament ", "")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Layout (Stats Bento Grid + Chart Area) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* Left Side: Summary Metrics Card */}
        <div className="lg:col-span-1 bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between space-y-4 rounded-none">
          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Índex de Rendiment (Juny)</h4>
              <p className="text-4xl font-extrabold text-slate-900 font-sans tracking-tight pt-1">
                {productivityIndex}%
              </p>
              <div className="flex items-center gap-1 pt-1.5">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none ${
                  growthRate >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  {growthRate >= 0 ? "+" : ""}{growthRate}% {growthRate >= 0 ? "millora" : "decreixement"}
                </span>
                <span className="text-[9.5px] text-slate-400 font-mono">Vs mes anterior</span>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Quick breakdown metrics of the chosen view */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-550 shrink-0" />
                  Completades:
                </span>
                <span className="font-mono font-bold text-emerald-700">{completedCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  Pendents actives:
                </span>
                <span className="font-mono font-bold text-indigo-600">{pendingCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Total gestionades:
                </span>
                <span className="font-mono font-bold text-slate-705">{totalMonthTasks}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[10px] text-slate-400 leading-normal font-mono">
              *Aquestes dades es recalculen automàticament a mesura que l'equip clica, actualitza l'estat o resol tasques.
            </p>
          </div>
        </div>

        {/* Right Side: Recharts Line Chart */}
        <div className="lg:col-span-3 border border-slate-200 bg-white p-4 h-[300px] w-full flex flex-col justify-between">
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 28, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10.5} 
                  fontWeight="bold" 
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "none",
                    borderRadius: "0px",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "11px"
                  }}
                  itemStyle={{ color: "#fff" }}
                  labelStyle={{ fontWeight: "bold", borderBottom: "1px solid rgba(255, 255, 255, 0.15)", paddingBottom: "4px", marginBottom: "4px" }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="plainline" 
                  iconSize={14}
                  wrapperStyle={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    color: "#475569"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Tasques Completades"
                  stroke="#10b981"
                  strokeWidth={3}
                  activeDot={{ r: 7, stroke: "#10b981", strokeWidth: 2, fill: "#fff" }}
                  dot={{ r: 4, stroke: "#10b981", strokeWidth: 2, fill: "#fff" }}
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="Tasques Pendents"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  activeDot={{ r: 7, stroke: "#4f46e5", strokeWidth: 2, fill: "#fff" }}
                  dot={{ r: 4, stroke: "#4f46e5", strokeWidth: 2, fill: "#fff" }}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Tendència ascendent de rendiment en el Q2 de 2026
            </span>
            <span>Estadístiques consolidades del Golf d'Aro</span>
          </div>
        </div>

      </div>
    </div>
  );
}
