export type UserRole = "admin" | "owner" | "member";

export interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface UserProfile {
  id: string; // uid
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  departmentId?: string; // Associated department
  departmentIds?: string[]; // Multiple associated departments
  createdAt?: any; // Firestore Timestamp
  accessCode?: string; // Custom access code for non-google auth
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  email: string;
  action: string;
  timestamp: any; // Firestore Timestamp
  meta?: any; // Additional context (e.g., taskId, workspaceId)
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt?: any;
  adminOnly?: boolean; // Si true, només els administradors hi poden entrar
}

export interface ProjectRole {
  userId: string;
  roleName: string; // e.g., "Encargado del proyecto", "Dissenyador", etc.
}

export interface KeyResource {
  id: string;
  title: string;
  type: "brief" | "link" | "file";
  url?: string;
  content?: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  description: string;
  status: "active" | "archived" | "completed";
  createdAt?: any;
  createdBy?: string;
  roles?: ProjectRole[];
  keyResources?: KeyResource[];
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TimeEntry {
  id: string;
  startTime: any; // Firestore Timestamp
  endTime?: any; // Firestore Timestamp
  duration?: number; // Duration in seconds
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  createdBy?: string;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  assigneeIds?: string[];
  workspaceId?: string;
  timeEntries?: TimeEntry[];
  priority?: "low" | "medium" | "high" | "urgent";
}

export interface Attachment {
  id: string;
  name: string;
  url?: string;
  size?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Task {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description: string;
  assigneeId?: string; // Legacy
  assigneeIds: string[]; // Active: Users IDs
  departmentId?: string; // Associated target department (legacy/fallback)
  departmentIds?: string[]; // Multiple associated target departments
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD (Data d'inici)
  recurrence?: "none" | "weekly" | "fortnightly" | "monthly" | "bimonthly" | "quarterly" | "semiannually" | "yearly"; // Periodicitat
  completedAt?: string; // YYYY-MM-DD
  completedOnTime?: boolean; // Ha acabat a temps?
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string; // NEW
  subtasks?: SubTask[];
  attachments?: Attachment[];
  tags?: string[];
  dependencies?: string[];
  timeEntries?: TimeEntry[];
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  comment: string;
  createdAt?: any;
}

export interface GolfCourse {
  id: string;
  name: string;
  location: string;
  url?: string;
  bookingUrl?: string; // Direct reservation quadrant link
  bookingSystem?: string; // Booking vendor: e.g. "Golf Manager", "Tee One", "Codi propi"
  syncStatus?: "idle" | "syncing" | "success" | "bad_connection" | "error";
  lastSyncTime?: string;
  isOurClub?: boolean;
  greenFeeHigh: number; // High Season fee
  greenFeeLow: number;  // Low Season fee
  buggyRental: number;
  clubRental: number;
  hourlyRates?: { [hour: string]: number }; // Booking rate for hourly slots
  hourlyTariffs?: { [hour: string]: string }; // Booking tariff name for hourly slots
  lastUpdated?: any;
  updatedBy: string; // Admin User Display Name
  occupancyToday?: number; // e.g. 74 for 74% occupancy
  reservationsToday?: number; // e.g. 61 reserves
  availableSlotsToday?: number; // e.g. 11 tee times remaining
  teeTimeInterval?: number; // Minute interval between tee times (e.g. 9 or 10 min)
}

// ----------------------------------------------------------------------------
// ACTA DE REUNIÓ — reunions individuals Rocío ↔ membre
// ----------------------------------------------------------------------------
export interface MeetingAgreement {
  id: string;
  text: string;            // L'acord / tasca acordada
  dueDate?: string;        // Data límit opcional
  taskCreated?: boolean;   // Si el membre ja ha convertit aquest acord en tasca
  taskId?: string;         // ID de la tasca creada (per saber si s'ha completat)
  recurring?: boolean;     // Si és de seguiment setmanal
}

export interface MeetingMinute {
  id: string;
  memberId: string;        // Membre amb qui s'ha fet la reunió
  memberName: string;      // Nom (per mostrar sense buscar)
  date: string;            // Data de la reunió (YYYY-MM-DD)
  title?: string;          // Títol opcional de la reunió
  notes?: string;          // Notes generals / context
  agreements: MeetingAgreement[]; // Llista d'acords/tasques
  createdBy: string;       // Qui ha creat l'acta (Rocío/admin)
  createdAt: string;
  updatedAt?: string;
}
