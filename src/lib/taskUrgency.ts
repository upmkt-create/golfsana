// Càlcul compartit de la urgència d'una tasca segons la seva data de
// venciment — usat pel Llistat, el Kanban, el Calendari i el Dashboard,
// perquè tots mostrin exactament el mateix criteri.

export type UrgencyLevel = "overdue" | "urgent" | "normal";

// Sempre en hora LOCAL (mai amb `new Date(str)` directe, que interpreta com
// UTC i pot desplaçar el dia — el mateix problema que ja vam trobar abans
// al comparador de tarifes).
function parseLocalDate(dateStr: string): Date | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * "properament" = venç dins dels pròxims 3 dies (inclòs avui).
 * "overdue" = ja ha vençut i encara no està feta.
 */
export function getTaskUrgency(dueDate: string | undefined, status: string): UrgencyLevel {
  if (!dueDate || status === "done") return "normal";
  const due = parseLocalDate(dueDate);
  if (!due) return "normal";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "urgent";
  return "normal";
}

export const URGENCY_STYLES: Record<UrgencyLevel, { text: string; bg: string; border: string; dot: string; label: string }> = {
  overdue: { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-400", dot: "bg-rose-500", label: "Vençuda" },
  urgent: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-400", dot: "bg-amber-500", label: "Propera" },
  normal: { text: "", bg: "", border: "", dot: "", label: "" },
};
