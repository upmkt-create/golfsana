import { UserProfile, Workspace } from "../types";

// Retorna els ids dels espais de treball propis d'un usuari (segons el seu
// perfil), sense duplicats.
export function getOwnWorkspaceIds(user: UserProfile): Set<string> {
  return new Set([
    ...(user.departmentIds || []),
    ...(user.departmentId ? [user.departmentId] : []),
  ]);
}

// Font única de veritat: pot aquest usuari accedir a aquest espai de
// treball? Es fa servir tant per bloquejar la navegació (menú lateral, canvi
// d'espai actiu) com per filtrar quines tasques/projectes veu — perquè mai
// hi hagi un lloc on es pugui "veure" el que un altre no permet clicar.
export function canAccessWorkspace(user: UserProfile, workspace: Workspace, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (workspace.adminOnly) return false; // espai privat de direcció
  if (user.restrictedToOwnDepartment) return getOwnWorkspaceIds(user).has(workspace.id);
  return true; // comportament normal: tothom veu tots els espais no privats
}
