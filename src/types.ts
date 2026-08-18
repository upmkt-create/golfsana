export type UserRole = "admin" | "owner" | "member";

export interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface MemberNote {
  id: string;
  content: string; // Contingut amb format (HTML de RichTextEditor)
  createdAt: string; // ISO
  updatedAt?: string; // ISO — present només si la nota s'ha editat
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
  notes?: string; // (Antic — format previ d'una sola nota. Es manté per compatibilitat de lectura.)
  notesList?: MemberNote[]; // Notes internes sobre aquest membre — se'n poden afegir vàries
  restrictedToOwnDepartment?: boolean; // Si és true, aquest membre només veu/pot accedir al(s) seu(s) propi(s) espai(s) de treball — pensat per a rols molt acotats (Caddy Master, Greenkeeper...). Per defecte false/absent = comportament normal (veuen tots els espais no privats, com sempre).
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
  description?: string; // Notes/descripció amb el mateix editor de text ric que les tasques
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
  startTime?: string; // HH:MM — hora opcional (reunions, visites...); si no es defineix, la tasca es tracta com "de tot el dia"
  endTime?: string; // HH:MM — hora de fi opcional, associada a dueDate
  recurrence?: "none" | "daily" | "weekly" | "fortnightly" | "monthly" | "bimonthly" | "quarterly" | "semiannually" | "yearly"; // Periodicitat
  isBaseTask?: boolean; // Tasca estructural del projecte (Base del Projecte), a diferència de les puntuals/ad-hoc
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
  isTask?: boolean;        // true = és una tasca (per defecte); false = només punt informatiu tractat, sense seguiment
  priority?: "low" | "medium" | "high" | "urgent"; // Mateixos atributs que una tasca normal
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

// ----------------------------------------------------------------------------
// NOTES INFORMATIVES — comunicats a tot l'equip (substitueix el WhatsApp)
// ----------------------------------------------------------------------------
export interface InfoNoteAck {
  userId: string;
  userName: string;
  acknowledgedAt: string; // ISO
}

export type InfoNoteStatus = "draft" | "scheduled" | "published";

export interface InfoNoteAttachment {
  id: string;
  name: string;
  url: string;          // enllaç extern (Google Drive, etc.) — no és una pujada real
  contentType?: string; // opcional, no sempre el sabem d'un enllaç extern
  size?: number;         // bytes — opcional, normalment desconegut per a enllaços externs
}

export interface InfoNoteReminder {
  userId: string;
  remindedAt: string; // ISO — últim cop que se li ha enviat un recordatori per aquesta nota
}

export interface InfoNote {
  id: string;
  title: string;
  content: string;          // HTML (RichTextEditor)
  createdBy: string;        // uid de qui l'ha creada (qualsevol usuari)
  createdByName: string;
  createdAt: string;        // ISO
  updatedAt?: string;       // ISO — present si s'ha editat
  status: InfoNoteStatus;   // "draft" = nomes visible per l'autor/admins; "scheduled" = es publicara sola a scheduledFor; "published" = ja visible per tothom
  scheduledFor?: string;    // ISO amb data i hora — moment en que una nota "scheduled" passa a ser visible per tothom
  acknowledgedBy: InfoNoteAck[]; // Qui l'ha llegida i acceptada (nomes te sentit un cop publicada)
  attachments?: InfoNoteAttachment[]; // Enllaços externs (Google Drive, etc.) — el pla gratuït no permet pujar fitxers directament
  targetDepartmentIds?: string[]; // Si buit/absent (i sense targetUserIds) = tothom. Si té valors, membres d'aquests departaments la veuen.
  targetUserIds?: string[]; // Usuaris concrets afegits com a destinataris, a més (o en lloc) dels departaments.
  reminders?: InfoNoteReminder[]; // Recordatoris ja enviats (per no repetir-los cada dia)
}

// ----------------------------------------------------------------------------
// GOLFREPU — Reputació online (puntuació i ressenyes de Google Maps)
// ----------------------------------------------------------------------------
export interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface ReputationSnapshot {
  id: string;               // sempre "current" — només es desa l'últim snapshot (no calen totes les còpies històriques a Firestore)
  scrapedAt: string;        // ISO — quan es va fer la darrera sincronització
  placeName: string;        // Nom oficial de la fitxa a Google Maps
  mapsUrl: string;          // Enllaç directe a la fitxa (per "Veure totes les ressenyes")
  overallRating: number | null;   // ex: 4.3
  reviewCount: number | null;     // ex: 128
  ratingBreakdown: RatingBreakdown | null; // Quantes ressenyes de cada puntuació (5→1 estrelles)
  source: "live" | "error"; // "live" = dades reals acabades de llegir; "error" = no s'ha pogut llegir (es manté l'últim snapshot bo)
  scrapeDebug?: string;     // Motiu exacte si source==="error" (HTTP xxx, timeout, format no reconegut...)
  history?: { date: string; overallRating: number; reviewCount: number }[]; // Un punt per sincronització, per mostrar la tendència
}

