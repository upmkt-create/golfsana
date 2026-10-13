import { UserProfile, Workspace } from "../types";

export const CADDY_MASTER_WORKSPACE_ID = "ws-wcrm6ca";
export const GREENKEEPER_WORKSPACE_ID = "ws-u61yrek";

const ACCESS_SCOPE_WORKSPACES: Record<string, string[]> = {
  caddy_master: [CADDY_MASTER_WORKSPACE_ID],
  greenkeeper: [GREENKEEPER_WORKSPACE_ID],
};

// Legacy helper: older profiles stored their workspace assignment in
// departmentId/departmentIds. Keep reading it so existing accounts do not
// lose access while the profiles are migrated to accessScope.
export function getOwnWorkspaceIds(user: UserProfile): Set<string> {
  return new Set([
    ...(user.departmentIds || []),
    ...(user.departmentId ? [user.departmentId] : []),
  ].filter(Boolean));
}

export function getRestrictedWorkspaceIds(user: UserProfile): Set<string> {
  if (user.role === "admin") return new Set();

  if (user.accessScope && user.accessScope !== "normal") {
    return new Set(ACCESS_SCOPE_WORKSPACES[user.accessScope] || user.allowedWorkspaceIds || []);
  }

  if ((user.allowedWorkspaceIds || []).length > 0) {
    return new Set(user.allowedWorkspaceIds);
  }

  if (user.restrictedToOwnDepartment) {
    return getOwnWorkspaceIds(user);
  }

  return new Set();
}

export function isWorkspaceRestrictedUser(user: UserProfile | null | undefined): boolean {
  return !!user && user.role !== "admin" && getRestrictedWorkspaceIds(user).size > 0;
}

// Single source of truth for workspace access. Normal team members work
// transversally across all non-admin workspaces. Caddy Master and Greenkeeper
// can only access their explicitly assigned operational workspace.
export function canAccessWorkspace(user: UserProfile, workspace: Workspace, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (workspace.adminOnly) return false;

  const restrictedWorkspaceIds = getRestrictedWorkspaceIds(user);
  if (restrictedWorkspaceIds.size > 0) {
    return restrictedWorkspaceIds.has(workspace.id);
  }

  return true;
}
