import React, { useState } from "react";
import { 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Coins, 
  Clock, 
  Target, 
  Users, 
  Award, 
  Info,
  ChevronRight,
  TrendingDown,
  Sparkles,
  HelpCircle,
  Calendar
} from "lucide-react";
import { Task, UserProfile, Project } from "../types";
import { DEPARTMENTS } from "../data";

interface IncentivesDashboardProps {
  tasks: Task[];
  users: UserProfile[];
  projects: Project[];
}

export default function IncentivesDashboard({ tasks, users, projects }: IncentivesDashboardProps) {
  // Configurable incentive multipliers
  const [calculationModel, setCalculationModel] = useState<"task" | "quarterly">("quarterly"); // Default to quarterly as requested
  const [quarterlyMaxIncentive, setQuarterlyMaxIncentive] = useState<number>(150); // Max quarterly bonus is €150 by default
  const [multiplier, setMultiplier] = useState<number>(35); // € per on-time task
  const [highPriorityBonus, setHighPriorityBonus] = useState<number>(15); // € extra for high priority on-time tasks
  const [showExplanation, setShowExplanation] = useState<boolean>(true);
  // Filtre de període per a les tasques ACABADES (basat en completedAt, la
  // data real de finalització, no la data límit). Les tasques pendents no
  // es veuen afectades — són sempre "l'estat actual", independentment del
  // període triat per revisar el que ja s'ha completat.
  const [periodFilter, setPeriodFilter] = useState<"week" | "month" | "quarter" | "all">("all");
  // 0 = període actual, -1 = l'anterior, -2 = dos enrere... Es reinicia a 0
  // cada cop que es canvia de tipus de període (setmana/mes/trimestre).
  const [periodOffset, setPeriodOffset] = useState<number>(0);

  const changePeriodFilter = (period: "week" | "month" | "quarter" | "all") => {
    setPeriodFilter(period);
    setPeriodOffset(0);
  };

  const getPeriodRange = (period: "week" | "month" | "quarter", offset: number): { start: Date; end: Date } => {
    const now = new Date();
    if (period === "week") {
      const day = now.getDay(); // 0=diumenge, 1=dilluns...
      const diffToMonday = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday + offset * 7);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { start: monday, end: sunday };
    }
    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    // quarter
    const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), currentQuarterMonth + offset * 3, 1);
    const end = new Date(now.getFullYear(), currentQuarterMonth + offset * 3 + 3, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const isCompletedInPeriod = (completedAt: string | undefined): boolean => {
    if (periodFilter === "all") return true;
    if (!completedAt) return false;
    const { start, end } = getPeriodRange(periodFilter, periodOffset);
    const completedDate = new Date(completedAt);
    return completedDate >= start && completedDate <= end;
  };

  // Etiqueta llegible del període actiu, amb el rang de dates concret quan
  // no és "Tot l'històric" — perquè quedi clar quin període s'està mirant
  // en navegar cap enrere.
  const periodLabel = (() => {
    if (periodFilter === "all") return "sempre";
    const { start, end } = getPeriodRange(periodFilter, periodOffset);
    const isCurrent = periodOffset === 0;
    if (periodFilter === "week") {
      const rangeStr = `${start.toLocaleDateString("ca-ES", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("ca-ES", { day: "numeric", month: "short", year: "numeric" })}`;
      return isCurrent ? `aquesta setmana (${rangeStr})` : rangeStr;
    }
    if (periodFilter === "month") {
      const monthStr = start.toLocaleDateString("ca-ES", { month: "long", year: "numeric" });
      return isCurrent ? `aquest mes (${monthStr})` : monthStr;
    }
    // quarter
    const quarterNum = Math.floor(start.getMonth() / 3) + 1;
    const quarterStr = `${quarterNum}r trimestre ${start.getFullYear()}`;
    return isCurrent ? `aquest trimestre (${quarterStr})` : quarterStr;
  })();

  // Comparativa directa: nombre de tasques acabades en el període que
  // s'està mirant vs. el període immediatament anterior — es mostra
  // costat a costat perquè la comparació sigui instantània, sense haver
  // de navegar endavant i enrere per recordar el número anterior.
  const countCompletedInOffset = (offset: number): number => {
    if (periodFilter === "all") return 0;
    const { start, end } = getPeriodRange(periodFilter, offset);
    return tasks.filter((t) => {
      if (t.status !== "done" || !t.completedAt) return false;
      const d = new Date(t.completedAt);
      return d >= start && d <= end;
    }).length;
  };

  const currentPeriodCount = countCompletedInOffset(periodOffset);
  const previousPeriodCount = countCompletedInOffset(periodOffset - 1);
  const periodDiff = currentPeriodCount - previousPeriodCount;
  const periodDiffPct = previousPeriodCount > 0 ? Math.round((periodDiff / previousPeriodCount) * 100) : (currentPeriodCount > 0 ? 100 : 0);

  // Etiqueta curta amb el rang de dates concret per a qualsevol offset —
  // es fa servir tant per al període anterior com per l'actual, perquè
  // els dos costats de la comparativa mostrin sempre una data explícita
  // i no hi hagi dubte de quina setmana/mes concret s'està mirant.
  const getShortRangeLabel = (offset: number): string => {
    if (periodFilter === "all") return "";
    const { start, end } = getPeriodRange(periodFilter, offset);
    if (periodFilter === "week") {
      return `${start.toLocaleDateString("ca-ES", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("ca-ES", { day: "numeric", month: "short" })}`;
    }
    if (periodFilter === "month") return start.toLocaleDateString("ca-ES", { month: "short", year: "numeric" });
    const qn = Math.floor(start.getMonth() / 3) + 1;
    return `${qn}r trim. ${start.getFullYear()}`;
  };

  const previousPeriodLabel = getShortRangeLabel(periodOffset - 1);
  const currentPeriodLabelShort = getShortRangeLabel(periodOffset);

  // Grouped stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "done" && isCompletedInPeriod(t.completedAt));
  const onTimeTasks = completedTasks.filter(t => t.completedOnTime === true);
  const overdueTasksCount = completedTasks.filter(t => t.completedOnTime === false).length;
  const pendingTasks = tasks.filter(t => t.status !== "done");

  // Calculate overall performance rate
  const overallRate = completedTasks.length > 0 
    ? Math.round((onTimeTasks.length / completedTasks.length) * 100) 
    : 100;

  // Overdue pending tasks (due date is in the past and status is not done)
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const pendingOverdue = pendingTasks.filter(t => t.dueDate && t.dueDate < todayStr);

  // Generate statistics per team member
  const teamPerformance = users
    .filter(user => {
      const isRocioOrIsabel = 
        user.id === "member_rocio" || 
        user.id === "member_isabel" || 
        user.email === "info@up-mktdigital.com" || 
        user.email === "rocio@golfdaro.com" ||
        user.role === "admin" ||
        user.role === "owner";
      return !isRocioOrIsabel;
    })
    .map(user => {
    const userTasks = tasks.filter(t => (t.assigneeIds?.includes(user.id) || t.assigneeId === user.id));
    const uCompleted = userTasks.filter(t => t.status === "done" && isCompletedInPeriod(t.completedAt));
    const uOnTime = uCompleted.filter(t => t.completedOnTime === true);
    const uLate = uCompleted.filter(t => t.completedOnTime === false);
    const uPending = userTasks.filter(t => t.status !== "done");
    
    // Percentage rate of completed tasks finished on time
    const uRate = uCompleted.length > 0 
      ? Math.round((uOnTime.length / uCompleted.length) * 100) 
      : 100;
    const rateCapped = uRate > 100 ? 100 : uRate;

    // Proportional overall task completion percentage (percentage rate of assigned tasks finished)
    const uCompletionRate = userTasks.length > 0
      ? Math.round((uCompleted.length / userTasks.length) * 100)
      : 0;

    // Calculate dynamic incentive
    let totalEuros = 0;
    if (calculationModel === "quarterly") {
      // Proportional quarterly mode
      totalEuros = userTasks.length > 0
        ? Math.round((uCompletionRate / 100) * quarterlyMaxIncentive)
        : 0;
    } else {
      // Individual task based mode
      uOnTime.forEach(t => {
        totalEuros += multiplier;
        if (t.priority === "high") {
          totalEuros += highPriorityBonus;
        }
      });
    }

    // Descriptive titles
    let roleTitle = "Equip de Treball";
    if (user.id === "member_rocio") roleTitle = "Administradora Directiva";
    else if (user.id === "member_marc") roleTitle = "Comercial / Vendes";
    else if (user.id === "member_erika") roleTitle = "Màrqueting / Digitals";
    else if (user.id === "member_ester") roleTitle = "Social i Esportiu";
    else if (user.id === "member_monica") roleTitle = "Responsable Proshop";
    else if (user.id === "member_marina") roleTitle = "Atenció i Reserves";
    else if (user.id === "member_saba") roleTitle = "Comercial / Operacions";

    return {
      user,
      roleTitle,
      total: userTasks.length,
      completedCount: uCompleted.length,
      onTimeCount: uOnTime.length,
      lateCount: uLate.length,
      pendingCount: uPending.length,
      onTimeRate: rateCapped,
      completionRate: uCompletionRate,
      earnedIncentive: totalEuros
    };
  });

  const totalIncentivePaid = teamPerformance.reduce((acc, curr) => acc + curr.earnedIncentive, 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Upper header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-none shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-405 text-amber-300" />
            <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-700/50 px-2 py-0.5 font-bold uppercase tracking-wider font-mono">
              Asana Business Suite
            </span>
          </div>
          <h2 className="text-xl font-bold mt-1 tracking-tight">Panell de Control Executiu i Incentius Monetaris</h2>
          <p className="text-xs text-blue-200/90 mt-1 max-w-2xl leading-normal">
            Eina corporativa de la Rocío per fer el seguiment de l'equip GolfSana. Avalua automàticament les tasques completades a temps, calcula compensacions monetàries variables i gestiona la periodicitat del Club.
          </p>
        </div>

        <button 
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-xs bg-white/10 hover:bg-white/15 px-3 py-1.5 font-semibold flex items-center gap-1.5 transition-all text-white border border-white/20"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showExplanation ? "Ocultar Guia" : "Saber-ne més"}</span>
        </button>
      </div>

      {showExplanation && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-none text-slate-800 text-xs leading-relaxed space-y-2">
          <p className="font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            Com funcionen els incentius corporatius d'Asana de GolfSana?
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-750">
            <li>
              <strong>Model Trimestral Proporcional (Nou de 150€):</strong> Cada trimestre, cada col·laborador compta amb un incentiu màxim de <strong>{quarterlyMaxIncentive}€</strong>. Aquest import s'atorga en <strong>part proporcional</strong> segons el percentatge (%) de les seves tasques acabades sobre el global de tasques que té assignades en curs o històriques.
            </li>
            <li>
              <strong>Model Variable per Tasca (Alternatiu):</strong> Les tasques enllestides a temps generen un incentiu base configurable individualment. Més un complement monetari variable addicional per a prioritats crítiques (Prioritat Alta).
            </li>
            <li>
              <strong>Cicle Recurrent i Auditories del Termini:</strong> Totes les actualitzacions mecàniques mantenen el log de temps a la part de baix per resoldre qualsevol auditoria corporativa.
            </li>
          </ul>
        </div>
      )}

      {/* Period Filter for Completed Tasks */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>Comparativa de tasques acabades</span>
        </div>

        {/* Tabs: tipus de període */}
        <div className="bg-slate-100 p-1 flex border border-slate-205 max-w-xl font-sans text-xs">
          <button
            onClick={() => changePeriodFilter("week")}
            className={`flex-1 text-center py-2 font-bold transition-all ${
              periodFilter === "week"
                ? "bg-white text-blue-900 shadow-sm border border-slate-300"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Setmana
          </button>
          <button
            onClick={() => changePeriodFilter("month")}
            className={`flex-1 text-center py-2 font-bold transition-all ${
              periodFilter === "month"
                ? "bg-white text-blue-900 shadow-sm border border-slate-300"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => changePeriodFilter("quarter")}
            className={`flex-1 text-center py-2 font-bold transition-all ${
              periodFilter === "quarter"
                ? "bg-white text-blue-900 shadow-sm border border-slate-300"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Trimestre
          </button>
          <button
            onClick={() => changePeriodFilter("all")}
            className={`flex-1 text-center py-2 font-bold transition-all ${
              periodFilter === "all"
                ? "bg-white text-blue-900 shadow-sm border border-slate-300"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tot l'històric
          </button>
        </div>

        {/* Comparativa visual: període anterior vs període actual, costat a
            costat, amb navegació — pensada per no haver de recordar el
            número de l'altre període mentre naveguem. */}
        {periodFilter !== "all" && (
          <div className="bg-white border-2 border-blue-200 rounded-none p-4 max-w-xl">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setPeriodOffset((o) => o - 1)}
                className="flex flex-col items-center gap-1 px-3 py-2 border border-slate-250 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                title="Veure el període anterior"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span className="text-[9px] font-bold uppercase">Anterior</span>
              </button>

              <div className="flex-1 grid grid-cols-2 gap-3 items-center">
                <div className="text-center">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">{previousPeriodLabel}</div>
                  <div className="text-3xl font-extrabold font-mono text-slate-400">{previousPeriodCount}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">tasques acabades</div>
                </div>
                <div className="text-center border-l border-slate-150 pl-3">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-blue-700 mb-1">
                    {periodOffset === 0 ? `Ara (${currentPeriodLabelShort})` : currentPeriodLabelShort}
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-blue-900">{currentPeriodCount}</div>
                  <div className={`text-[10px] font-bold mt-0.5 flex items-center justify-center gap-1 ${periodDiff > 0 ? "text-emerald-600" : periodDiff < 0 ? "text-rose-600" : "text-slate-400"}`}>
                    {periodDiff !== 0 && (periodDiff > 0 ? "▲" : "▼")}
                    {periodDiff === 0 ? "Igual" : `${periodDiff > 0 ? "+" : ""}${periodDiffPct}% vs. anterior`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPeriodOffset((o) => Math.min(0, o + 1))}
                disabled={periodOffset === 0}
                className="flex flex-col items-center gap-1 px-3 py-2 border border-slate-250 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title={periodOffset === 0 ? "Ja ets al període actual" : "Avançar un període"}
              >
                <ChevronRight className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase">Següent</span>
              </button>
            </div>
            {periodOffset !== 0 && (
              <button
                onClick={() => setPeriodOffset(0)}
                className="w-full mt-3 text-[10px] font-bold text-blue-700 hover:text-blue-900 underline text-center"
              >
                Tornar al període actual
              </button>
            )}
          </div>
        )}
      </div>

      {/* Model Selection Switcher */}
      <div className="bg-slate-100 p-1 flex border border-slate-205 max-w-xl font-sans text-xs">
        <button
          onClick={() => setCalculationModel("quarterly")}
          className={`flex-1 text-center py-2 font-bold transition-all ${
            calculationModel === "quarterly"
              ? "bg-white text-blue-900 shadow-sm border border-slate-300"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          📈 Model Trimestral Proporcional (150€ Màx)
        </button>
        <button
          onClick={() => setCalculationModel("task")}
          className={`flex-1 text-center py-2 font-bold transition-all ${
            calculationModel === "task"
              ? "bg-white text-slate-900 shadow-sm border border-slate-300"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          🎯 Model Variable per Tasca
        </button>
      </div>

      {/* Parameter config controls (Interactive Sliders) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-slate-205 p-5">
        <div className="space-y-2 md:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-emerald-600" />
            Paràmetres de l'Incentiu (Càlcul Interactiu)
          </h3>
          <p className="text-[11px] text-slate-500">
            {calculationModel === "quarterly" 
              ? "Ajusta l'incentiu de totalitat del fons trimestral. El sistema calcula automàticament la part proporcional obtinguda per cada membre de l'equip."
              : "Modifica els multiplicadors individuals per tasca completada a temps en temps real."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            {calculationModel === "quarterly" ? (
              <div className="space-y-1.5 bg-slate-50 p-3 border border-slate-100 col-span-2">
                <label className="text-[11px] font-bold text-slate-700 flex justify-between">
                  <span>Incentiu Màxim Trimestral per Persona (Totalitat):</span>
                  <span className="text-blue-700 font-extrabold">{quarterlyMaxIncentive} €</span>
                </label>
                <input 
                  type="range" 
                  min="50" 
                  max="500" 
                  step="10"
                  value={quarterlyMaxIncentive}
                  onChange={(e) => setQuarterlyMaxIncentive(parseInt(e.target.value))}
                  className="w-full cursor-pointer accent-blue-600"
                />
                <span className="text-[9.5px] text-slate-400 block leading-normal mt-1">
                  Model Proporcional Actiu: si s'enllestexen el 100% de les tasques s'assoleixen els {quarterlyMaxIncentive}€ sencers. Si es completen la meitat (50%), s'obtenen {Math.round(quarterlyMaxIncentive * 0.5)}€ (parcial).
                </span>
              </div>
            ) : (
              <>
                {/* Base reward slider */}
                <div className="space-y-1.5 bg-slate-50 p-3 border border-slate-100">
                  <label className="text-[11px] font-bold text-slate-700 flex justify-between">
                    <span>Incentiu Base per Tasca:</span>
                    <span className="text-emerald-700 font-extrabold">{multiplier} €</span>
                  </label>
                  <input 
                    type="range" 
                    min="5" 
                    max="150" 
                    step="5"
                    value={multiplier}
                    onChange={(e) => setMultiplier(parseInt(e.target.value))}
                    className="w-full cursor-pointer accent-emerald-600"
                  />
                  <span className="text-[9.5px] text-slate-400 block">S'aplica per cada tasca completada a temps.</span>
                </div>

                {/* High priority bonus */}
                <div className="space-y-1.5 bg-slate-50 p-3 border border-slate-100">
                  <label className="text-[11px] font-bold text-slate-700 flex justify-between">
                    <span>Plus per Prioritat Alta:</span>
                    <span className="text-rose-700 font-extrabold">+{highPriorityBonus} €</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="5"
                    value={highPriorityBonus}
                    onChange={(e) => setHighPriorityBonus(parseInt(e.target.value))}
                    className="w-full cursor-pointer accent-rose-600"
                  />
                  <span className="text-[9.5px] text-slate-400 block">Comissió addicional per tasques crítiques tancades a temps.</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Global Incentives Pool Widget */}
        <div className="bg-slate-900 text-white p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-2 translate-y-2">
            <Coins className="w-32 h-32 text-white" />
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-400 font-mono">
              {calculationModel === "quarterly" ? "Fons Previsió Trimestral" : "Fons Variable Estimador"}
            </span>
            <div className="text-2xl font-extrabold mt-1 font-mono text-white">
              {totalIncentivePaid.toLocaleString()} €
            </div>
          </div>
          <p className="text-[10px] text-slate-350 leading-relaxed mt-2">
            {calculationModel === "quarterly" 
              ? `Import agregat estimat de tots els premis calculat de forma directament proporcional i dinàmica per a tot l'equip segons l'estat d'execució actual.`
              : `Previsió de desemborsament total de premis basat en els multiplicadors en curs i les ${onTimeTasks.length} tasques completades dins del termini.`}
          </p>
        </div>
      </div>

      {/* General Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tasques */}
        <div className="bg-white border border-slate-200 p-4 font-sans rounded-none flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-405 uppercase tracking-wider block">Volum Total de Tasques</span>
          <div className="mt-2.5">
            <span className="text-2xl font-extrabold text-slate-850 font-mono">{totalTasks}</span>
          </div>
          <span className="text-[10px] text-slate-450 block mt-2">{pendingTasks.length} actives en curs</span>
        </div>

        {/* Completades */}
        <div className="bg-white border border-slate-205 p-4 font-sans rounded-none flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-405 uppercase tracking-wider block">S'han acabat</span>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-2xl font-extrabold text-emerald-655 font-mono text-emerald-600">{completedTasks.length}</span>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 font-mono">
              {totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0}%
            </span>
          </div>
          <span className="text-[10px] text-slate-450 block mt-2 capitalize">{periodLabel}</span>
        </div>

        {/* A temps */}
        <div className="bg-white border border-slate-205 p-4 font-sans rounded-none flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">Acabades a temps</span>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-2xl font-extrabold text-emerald-700 font-mono">{onTimeTasks.length}</span>
            <span className="text-[10px] font-extrabold py-0.5 px-1.5 bg-emerald-50 text-emerald-700 rounded-sm">
              Termini Ok
            </span>
          </div>
          <span className="text-[10px] text-slate-450 block mt-2">Percentatge global del {overallRate}%</span>
        </div>

        {/* Amb retard */}
        <div className="bg-white border border-slate-205 p-4 font-sans rounded-none flex flex-col justify-between border-l-4 border-l-amber-500">
          <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider block">Acabades fora de termini</span>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-2xl font-extrabold text-amber-700 font-mono">{overdueTasksCount}</span>
            {overdueTasksCount > 0 ? (
              <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Retardat
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-sm font-bold">Cap</span>
            )}
          </div>
          <span className="text-[10px] text-slate-450 block mt-2">Incurreixen penalitzacions</span>
        </div>

        {/* Overdue actives (S'han de tancar ja) */}
        <div className="bg-white border border-slate-205 p-4 font-sans rounded-none flex flex-col justify-between border-l-4 border-l-rose-500 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-mono font-bold text-rose-700 uppercase tracking-wider block">Vencides i pendents</span>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-2xl font-extrabold text-rose-700 font-mono">{pendingOverdue.length}</span>
            {pendingOverdue.length > 0 && (
              <span className="text-[9.5px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-sm font-bold animate-pulse">
                Acció Immediata
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-450 block mt-2">Fora de venciment actual</span>
        </div>
      </div>

      {/* TEAM MEMBERS PERFORMANCE GRID */}
      <div className="border border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-800" />
              Taula de Rendiment de l'Equip GolfSana
            </h3>
            <p className="text-[11px] text-slate-500">
              Rendimient calculat individualment amb el suport del filtre d'Asana Business.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono bg-white p-1.5 border border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>A temps &ge; 75% és considerat excel·lent i apte per a incentius mkt decimals</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {teamPerformance.map(({ user, roleTitle, total, completedCount, onTimeCount, lateCount, pendingCount, onTimeRate, completionRate, earnedIncentive }) => {
            const isExcellent = calculationModel === "quarterly" 
              ? completionRate >= 90 && completedCount > 0
              : onTimeRate >= 75 && completedCount > 0;
            return (
              <div key={user.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition-all">
                {/* User profiling details */}
                <div className="flex items-center gap-3 w-72 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 font-bold text-slate-700 text-sm flex items-center justify-center shrink-0">
                    {user.avatar || user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-800">{user.name}</span>
                      {user.role === "admin" && (
                        <span className="text-[8.5px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 uppercase tracking-wider rounded-none scale-90">
                          Corporate Admin
                        </span>
                      )}
                    </div>
                    <span className="text-[9.5px] text-slate-550 block truncate bg-slate-100 px-1 py-0.5 rounded-sm mt-1 w-fit border border-slate-200/55 text-slate-500">
                      {user.email}
                    </span>
                  </div>
                </div>

                {/* Performance percentages and bar */}
                <div className="flex-1 max-w-sm space-y-1.5">
                  {calculationModel === "quarterly" ? (
                    <>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-750 font-bold flex items-center gap-1">
                          📊 Tasques Acabades (Proporcional):
                        </span>
                        <span className="font-mono font-bold text-blue-700">
                          {completionRate}%
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-none border border-slate-200 overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-550 font-medium">Acompliment en Termini:</span>
                        <span className={`font-mono font-semibold ${onTimeRate >= 75 ? "text-emerald-700" : onTimeRate >= 45 ? "text-amber-700" : "text-rose-700"}`}>
                          {onTimeRate}%
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-none border border-slate-200 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            onTimeRate >= 75 ? "bg-emerald-500" : onTimeRate >= 45 ? "bg-amber-400" : "bg-rose-500"
                          }`}
                          style={{ width: `${onTimeRate}%` }}
                        ></div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>{completedCount} acabades / {total} totals</span>
                    {calculationModel === "quarterly" ? (
                      <span className="text-emerald-700 font-semibold font-mono">A temps: {onTimeRate}%</span>
                    ) : (
                      <span>{pendingCount} actives en curs</span>
                    )}
                  </div>
                </div>

                {/* Tasks metrics breakdown */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs shrink-0 w-80">
                  <div className="p-1 px-2 border border-slate-100 bg-slate-50/50">
                    <span className="text-[8px] text-slate-400 font-mono block uppercase">Total</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{total}</span>
                  </div>
                  <div className="p-1 px-2 border border-emerald-100 bg-emerald-50/20">
                    <span className="text-[8px] text-emerald-600 font-mono block uppercase">A Temps</span>
                    <span className="font-bold text-emerald-600 block mt-0.5">{onTimeCount}</span>
                  </div>
                  <div className="p-1 px-2 border border-amber-100 bg-amber-50/20">
                    <span className="text-[8px] text-amber-600 font-mono block uppercase">Amb Retard</span>
                    <span className="font-bold text-amber-600 block mt-0.5">{lateCount}</span>
                  </div>
                  <div className="p-1 px-2 border border-slate-100 bg-slate-50/50">
                    <span className="text-[8px] text-slate-400 font-mono block uppercase">Actives</span>
                    <span className="font-bold text-slate-600 block mt-0.5">{pendingCount}</span>
                  </div>
                </div>

                {/* Personal Incentive Earnings Area */}
                <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 lg:w-48 bg-slate-50 p-2.5 lg:p-3 border-l-2 border-l-emerald-500">
                  <div className="lg:text-right">
                    <span className="text-[8px] font-mono text-slate-450 block uppercase font-bold">
                      {calculationModel === "quarterly" ? "Part Trimestral" : "Incentiu Estimat"}
                    </span>
                    <span className="text-sm font-extrabold text-slate-800 font-mono block mt-0.5">
                      {earnedIncentive} €
                    </span>
                    {calculationModel === "quarterly" && total > 0 && (
                      <span className="text-[9px] text-blue-700 font-mono block mt-0.5 leading-none font-bold">
                        ({completionRate}% de {quarterlyMaxIncentive}€)
                      </span>
                    )}
                    {calculationModel === "quarterly" && total === 0 && (
                      <span className="text-[9px] text-slate-450 font-mono block mt-0.5 leading-none">
                        Sense tasques
                      </span>
                    )}
                  </div>
                  <div className="shrink-0">
                    {calculationModel === "quarterly" ? (
                      total > 0 ? (
                        completionRate === 100 ? (
                          <span className="p-1 px-2 bg-emerald-100 text-emerald-700 text-[8px] font-bold uppercase rounded-sm border border-emerald-200 font-mono flex items-center gap-1">
                            <Award className="w-3 h-3" /> Sencer
                          </span>
                        ) : completionRate >= 50 ? (
                          <span className="p-1 px-1.5 bg-amber-50 text-amber-700 text-[8px] font-bold uppercase rounded-sm border border-amber-200 font-mono">
                            Parcial
                          </span>
                        ) : (
                          <span className="p-1 px-2 bg-slate-100 text-slate-500 text-[8px] font-bold uppercase rounded-sm font-mono">
                            Mínim
                          </span>
                        )
                      ) : (
                        <span className="p-1 px-2 bg-slate-100 text-slate-400 text-[8px] font-bold uppercase rounded-sm font-mono">
                          -
                        </span>
                      )
                    ) : isExcellent ? (
                      <span className="p-1 px-2 bg-emerald-100 text-emerald-700 text-[8px] font-bold uppercase rounded-sm border border-emerald-200 font-mono flex items-center gap-1">
                        <Award className="w-3 h-3" /> Apte
                      </span>
                    ) : completedCount > 0 ? (
                      <span className="p-1 px-2 bg-rose-50 text-rose-700 text-[8px] font-bold uppercase rounded-sm border border-rose-100 font-mono" title="Acompliment sota el requeriment mínim (75%)">
                        Baix
                      </span>
                    ) : (
                      <span className="p-1 px-2 bg-slate-100 text-slate-400 text-[8px] font-bold uppercase rounded-sm font-mono">
                        Sense dades
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HISTORIC AUDIT OF COMPLETED TASKS & TIMINGS */}
      <div className="border border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-150 bg-slate-50">
          <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            Registre d'Auditoria d'Execucions del Termini
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Historial cronològic de tasques finalitzades. Indispensable per dur a terme deduccions variables correctes.
          </p>
        </div>

        {completedTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-450 text-xs">
            No s'ha registrat cap tasca completada encara. Les dades s'ompliran quan un usuari enllesteixi una tasca!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-500 font-mono text-[9px] uppercase tracking-wide border-b border-slate-200">
                  <th className="p-3">Tasca</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Departament Origen</th>
                  <th className="p-3 text-center">Data Assignada</th>
                  <th className="p-3 text-center">Data Finalització</th>
                  <th className="p-3 text-center">Termini</th>
                  <th className="p-3 text-center">Auditoria Termini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...completedTasks].reverse().map((task) => {
                  const assignee = users.find(u => (task.assigneeIds?.includes(u.id) || u.id === task.assigneeId));
                  const deptObj = DEPARTMENTS.find(d => d.id === task.departmentId);
                  const projectObj = projects.find(p => p.id === task.projectId);

                  return (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{task.title}</div>
                        <div className="text-[9.5px] text-slate-400">{projectObj?.name || "Global"}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-650 font-extrabold text-[8.5px] flex items-center justify-center shrink-0 border border-slate-300">
                            {assignee?.avatar || "?"}
                          </span>
                          <span className="font-semibold text-slate-700">{assignee?.name || "Desconegut"}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] py-0.5 px-2 bg-slate-100 rounded-full font-semibold border border-slate-200/50">
                          {deptObj?.name.replace("Departament ", "") || "General"}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-500">
                        {task.dueDate || "Sense venciment"}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-indigo-700">
                        {task.completedAt || task.updatedAt?.slice(0, 10) || "Avui"}
                      </td>
                      <td className="p-3 text-center">
                        {task.recurrence && task.recurrence !== "none" ? (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold rounded-sm uppercase tracking-wide">
                            Recurrent: {
                              task.recurrence === "weekly" ? "Setmanal" :
                              task.recurrence === "fortnightly" ? "Quinzenal" :
                              task.recurrence === "monthly" ? "Mensual" :
                              task.recurrence === "bimonthly" ? "Bimensual" :
                              task.recurrence === "quarterly" ? "Trimestral" :
                              task.recurrence === "semiannually" ? "Semestral" :
                              "Anual"
                            }
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Tasca única</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {task.completedOnTime ? (
                          <span className="p-1 px-2.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold uppercase rounded-sm border border-emerald-200">
                            Atemps
                          </span>
                        ) : (
                          <span className="p-1 px-2.5 bg-amber-50 text-amber-800 text-[9px] font-bold uppercase rounded-sm border border-amber-200">
                            Fora de termini
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
