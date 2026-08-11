import { Workspace } from "../types";

export interface DepartmentOption {
  id: string;
  name: string;
  description: string;
  color: string;
}

// Paleta determinista: cada espai de treball sempre té el mateix color,
// calculat a partir del seu id (no cal desar-lo enlloc).
const COLOR_PALETTE = ["#0ea5e9", "#8b5cf6", "#f97316", "#14b8a6", "#ec4899", "#84cc16", "#6366f1", "#eab308"];

export function colorForWorkspace(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

// "Departaments" a GolfSana JA NO és una llista fixa al codi — són sempre
// els espais de treball que existeixen ara mateix a Firestore (`workspaces`).
// Si es crea, es renombra o s'elimina un espai de treball des de l'app,
// aquesta llista ho reflecteix sola arreu (Kanban, informes, Novetats,
// Càrrega de feina, etc.), sense haver de tocar ni desplegar cap fitxer.
//
// FONT ÚNICA — no duplicar aquesta funció ni tornar a crear cap llista fixa
// de departaments; si cal filtrar-ne algun (per exemple, excloure espais
// només d'administració) fer-ho aquí, no a cada component per separat.
export function getDepartmentOptions(workspaces: Workspace[]): DepartmentOption[] {
  return workspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    description: ws.description || "",
    color: colorForWorkspace(ws.id),
  }));
}
