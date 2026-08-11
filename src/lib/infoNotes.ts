import { InfoNote } from "../types";

// Font única de veritat de quan una nota informativa "és en directe" (visible
// per a tothom, no només per l'autor/admins). Es fa servir tant a App.tsx
// (per decidir el pop-up i l'avís intermitent) com a InfoNotesDashboard.tsx
// (per filtrar la llista) — NO duplicar aquesta lògica en cap altre lloc.
export function isInfoNoteLive(note: InfoNote, now: Date = new Date()): boolean {
  if (note.status === "published") return true;
  if (note.status === "scheduled" && note.scheduledFor) {
    return new Date(note.scheduledFor).getTime() <= now.getTime();
  }
  return false; // draft, o scheduled sense data encara
}
