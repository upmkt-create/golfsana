import { InfoNote } from "../types";
import { UserProfile } from "../types";

// Font única de veritat de quan una nota informativa "és en directe" (visible
// per a tothom a qui va dirigida, no només per l'autor/admins). Es fa servir
// tant a App.tsx (per decidir el pop-up i l'avís intermitent) com a
// InfoNotesDashboard.tsx (per filtrar la llista) — NO duplicar aquesta
// lògica en cap altre lloc.
export function isInfoNoteLive(note: InfoNote, now: Date = new Date()): boolean {
  if (note.status === "published") return true;
  if (note.status === "scheduled" && note.scheduledFor) {
    return new Date(note.scheduledFor).getTime() <= now.getTime();
  }
  return false; // draft, o scheduled sense data encara
}

// Determina si un usuari concret és dins del públic al qui va dirigida la
// nota (independentment de si ja s'ha publicat o no). Si `targetDepartmentIds`
// és buit o absent, és per a tothom — comportament igual que abans d'afegir
// aquesta funcionalitat, per no trencar notes ja creades.
export function isInfoNoteForUser(note: InfoNote, user: UserProfile): boolean {
  if (!note.targetDepartmentIds || note.targetDepartmentIds.length === 0) return true;
  const userDeptIds = new Set([
    ...(user.departmentIds || []),
    ...(user.departmentId ? [user.departmentId] : []),
  ]);
  return note.targetDepartmentIds.some((d) => userDeptIds.has(d));
}

// En directe + dirigida a aquest usuari — la comprovació combinada que cal
// gairebé sempre per decidir si un membre concret ha de veure la nota.
export function isInfoNoteVisibleTo(note: InfoNote, user: UserProfile, now: Date = new Date()): boolean {
  return isInfoNoteLive(note, now) && isInfoNoteForUser(note, user);
}

// Dies des que la nota és en directe (publicada, o programada i ja ha
// arribat l'hora) — es fa servir pel recordatori automàtic.
export function daysSinceLive(note: InfoNote, now: Date = new Date()): number {
  const liveSince = note.status === "scheduled" && note.scheduledFor ? note.scheduledFor : note.createdAt;
  if (!liveSince) return 0;
  const ms = now.getTime() - new Date(liveSince).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

