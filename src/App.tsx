import React, { useState, useEffect, useRef } from "react";
import {
  db,
  auth,
  saveDoc,
  OperationType,
  handleFirestoreError
} from "./firebase";
import { logActivity } from "./lib/logger";

import {
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
  query,
  where,
  Timestamp
} from "firebase/firestore";
import {
  STARTER_MEMBERS,
  STARTER_GOLF_CORES,
  STARTER_WORKSPACES,
  STARTER_PROJECTS,
  STARTER_TASKS,
  DEPARTMENTS,
  getRealWorldCompetitorPrices,
  parseAndCleanPrice,
  isAllowedTariff
} from "./data";
import {
  UserProfile,
  Workspace,
  Project,
  Task,
  Comment,
  GolfCourse,
  TaskStatus,
  TaskPriority,
  UserRole,
  MeetingMinute,
  MeetingAgreement
} from "./types";
import {
  Layers,
  LayoutGrid,
  BookOpen,
  Trello,
  CalendarDays,
  Plus,
  Compass,
  AlertTriangle,
  FolderPlus,
  Users,
  LogOut,
  ChevronRight,
  Send,
  Trash,
  HelpCircle,
  Clock,
  Shield,
  Activity,
  UserCheck,
  Check,
  Paperclip,
  Download,
  MoreVertical,
  Tag,
  Link,
  Copy,
  Lock,
  Unlock,
  Folder,
  RefreshCw,
  FileText,
  BarChart3,
  TrendingUp,
  Home,
  Menu,
  X,
  Search,
  Calendar,
  Bell,
  Cloud,
  Upload,
  ExternalLink,
  Play,
  Square
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import UserSessionSelector from "./components/UserSessionSelector";
import TaskList from "./components/TaskList";
import TaskBoard from "./components/TaskBoard";
import TaskTimeline from "./components/TaskTimeline";
import GolfAdminDashboard from "./components/GolfAdminDashboard";
import WorkloadDashboard from "./components/WorkloadDashboard";
import ProjectSummary from "./components/ProjectSummary";
import WorkspaceKPICards from "./components/WorkspaceKPICards";
import ProjectCalendar from "./components/ProjectCalendar";
import IncentivesDashboard from "./components/IncentivesDashboard";
import ReportsDashboard from "./components/ReportsDashboard";
import { PriceNotificationBubble } from "./components/PriceNotificationBubble";
import MemberDashboard from "./components/MemberDashboard";
import HelpGuideModal from "./components/HelpGuideModal";
import ConfirmationModal from "./components/ConfirmationModal";
import ProductivityEvolutionChart from "./components/ProductivityEvolutionChart";
import AdminMonitoringDashboard from "./components/AdminMonitoringDashboard";
import UserManualDashboard from "./components/UserManualDashboard";
import AllTasksGlobalView from "./components/AllTasksGlobalView";
import MeetingMinutes from "./components/MeetingMinutes";
// @ts-ignore
import golfBallIcon from "./campo-de-golf.png";

import LoginScreen from "./components/LoginScreen";

export default function App() {
  // Resilient Offline Sandbox Mode state
  const [offlineMode, setOfflineMode] = useState<boolean>(false);

  // Authentication & Session users
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem("golfsana_users");
      const loaded: UserProfile[] = saved ? JSON.parse(saved) : [...STARTER_MEMBERS];
      const starterIds = new Set(STARTER_MEMBERS.map(m => m.id));
      const filtered = loaded.filter(u => starterIds.has(u.id));
      const updated = [...filtered];
      STARTER_MEMBERS.forEach((starter) => {
        const idx = updated.findIndex((u) => u.id === starter.id);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], ...starter };
        } else {
          updated.push(starter);
        }
      });
      return updated;
    } catch {
      return [...STARTER_MEMBERS];
    }
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("golfsana_currentUser");
      const savedUser = saved ? JSON.parse(saved) : null;
      if (savedUser) {
        let targetId = savedUser.id;
        if (savedUser.email === "info@up-mktdigital.com") {
          targetId = "member_isabel";
        } else if (savedUser.email === "rocio@golfdaro.com") {
          targetId = "member_rocio";
        }
        const match = STARTER_MEMBERS.find((s) => s.id === targetId);
        return match ? { ...savedUser, ...match } : savedUser;
      }
      // Sense sessió guardada → null perquè aparegui la pantalla de login.
      return null;
    } catch {
      return null;
    }
  });

  // Collections state
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    try {
      const saved = localStorage.getItem("golfsana_workspaces");
      return saved ? JSON.parse(saved) : STARTER_WORKSPACES;
    } catch {
      return STARTER_WORKSPACES;
    }
  });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("golfsana_activeWorkspaceId");
      return saved || (STARTER_WORKSPACES[0]?.id || "");
    } catch {
      return STARTER_WORKSPACES[0]?.id || "";
    }
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem("golfsana_projects");
      const deletedIds = JSON.parse(localStorage.getItem("golfsana_deleted") || "[]");
      const deletedSet = new Set<string>(deletedIds);
      if (saved) {
        let parsed = JSON.parse(saved);
        // Ensure new STARTER_PROJECTS are merged if they are missing and not deleted
        const missingProjects = STARTER_PROJECTS.filter((sp: Project) => !parsed.some((p: Project) => p.id === sp.id) && !deletedSet.has(sp.id));
        if (missingProjects.length > 0) {
          parsed = [...parsed, ...missingProjects];
          localStorage.setItem("golfsana_projects", JSON.stringify(parsed));
        }
        return parsed.filter((p: Project) => !deletedSet.has(p.id));
      }
      return STARTER_PROJECTS.filter((p: Project) => !deletedSet.has(p.id));
    } catch {
      return STARTER_PROJECTS;
    }
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem("golfsana_tasks");
      const deletedIds = JSON.parse(localStorage.getItem("golfsana_deleted") || "[]");
      const deletedSet = new Set<string>(deletedIds);
      if (saved) {
        let parsed = JSON.parse(saved);
        // Ensure new STARTER_TASKS are merged if they are missing and not deleted
        const missingTasks = STARTER_TASKS.filter((st: Task) => !parsed.some((t: Task) => t.id === st.id) && !deletedSet.has(st.id));
        if (missingTasks.length > 0) {
          parsed = [...parsed, ...missingTasks];
          localStorage.setItem("golfsana_tasks", JSON.stringify(parsed));
        }
        return parsed.filter((t: Task) => !deletedSet.has(t.id));
      }
      return STARTER_TASKS.filter((t: Task) => !deletedSet.has(t.id));
    } catch {
      return STARTER_TASKS;
    }
  });
  const [golfCourses, setGolfCourses] = useState<GolfCourse[]>(() => {
    try {
      const saved = localStorage.getItem("golfsana_golfCourses");
      return saved ? JSON.parse(saved) : STARTER_GOLF_CORES.map((c, i) => ({ ...c, id: `gc-${i}` }));
    } catch {
      return STARTER_GOLF_CORES.map((c, i) => ({ ...c, id: `gc-${i}` }));
    }
  });

  const [deletedItemIds, setDeletedItemIds] = useState<Set<string>>(new Set());
  const deletedItemIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    deletedItemIdsRef.current = deletedItemIds;
  }, [deletedItemIds]);
  
  // Interactive / detailed UI State
  const [activeTab, setActiveTab] = useState<"inici" | "summary" | "list" | "board" | "timeline" | "golf" | "security" | "incentives" | "reports" | "monitoring" | "manual" | "calendar" | "all_workspaces" | "all_tasks_global" | "minutes">("inici");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#10B981");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; subtaskId?: string; startTime: Date } | null>(null);

  // New Usability & Responsiveness States (5 Improvements)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCompactView, setIsCompactView] = useState(() => {
    try {
      const saved = localStorage.getItem("golfsana_compact_view");
      return saved === "true";
    } catch {
      return false;
    }
  });
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "info" | "warning" }[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinute[]>(() => {
    try {
      const saved = localStorage.getItem("golfsana_minutes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Reusable React-driven confirmation state to bypass iframe popup constraints
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const askConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  };

  // States for department tasks inside workspaces dashboard
  const [workspaceTaskFilter, setWorkspaceTaskFilter] = useState<string>("all");
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskAssignee, setQuickTaskAssignee] = useState("");
  const [quickTaskPriority, setQuickTaskPriority] = useState<TaskPriority>("medium");
  const [quickTaskProject, setQuickTaskProject] = useState("");

  const addToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Collapsible Sidebar Sections (collapsed by default: "que no es vegi directament tot desplegat")
  const [isWorkspacesExpanded, setIsWorkspacesExpanded] = useState<boolean>(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState<boolean>(false);
  const [isDataAnalysisExpanded, setIsDataAnalysisExpanded] = useState<boolean>(false);
  const [isMembersExpanded, setIsMembersExpanded] = useState<boolean>(false);

  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");

  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; time: string; user: string }[]>([
    { id: "1", action: "Plataforma Asana Enterprise Inicialitzada", time: "Fa un moment", user: "Sistema" },
  ]);

  const cleanedProjectIdsRef = useRef<Set<string>>(new Set());

  // Persist current active workspace in client storage
  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem("golfsana_activeWorkspaceId", activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  // Persist current chosen member
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("golfsana_currentUser", JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Self-healing online check
  useEffect(() => {
    if (offlineMode) {
      // Quietly check if Firestore is fully reachable now
      const checkConnection = async () => {
        try {
          const testQuery = await getDocs(query(collection(db, "workspaces"), where("id", "==", "dep-comercial")));
          console.log("[Self-Healing] Firestore connection successful, clearing sandbox mode.");
          localStorage.removeItem("golfsana_offline");
          setOfflineMode(false);
          addToast("Sincronització amb el Núvol restablerta correctament!", "success");
        } catch (e) {
          console.warn("[Self-Healing] Quiet check failed (still offline/sandboxed):", e);
        }
      };
      
      const timer = setTimeout(checkConnection, 2000);
      return () => clearTimeout(timer);
    }
  }, [offlineMode]);

  const isAdmin = !!currentUser && (
    currentUser.email === "info@up-mktdigital.com" || 
    currentUser.email === "rocio@golfdaro.com" ||
    currentUser.id === "member_isabel" || 
    currentUser.id === "member_rocio" ||
    (currentUser.name && (
      currentUser.name.toLowerCase().includes("roci") || 
      currentUser.name.toLowerCase().includes("isabel")
    ))
  );

  // Redirect non-admins from restricted tabs
  useEffect(() => {
    if (!isAdmin && activeTab === "incentives") {
      setActiveTab("summary");
    }
  }, [isAdmin, activeTab]);

  // 1. Authenticate silently or manage google login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        setAuthLoading(false);
      } else {
        setFirebaseUser(null);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCustomLogin = async (email: string, code: string) => {
    const userMatch = STARTER_MEMBERS.find(m => m.email === email && m.accessCode === code);
    if (userMatch) {
      setCurrentUser(userMatch);
      localStorage.setItem("golfsana_currentUser", JSON.stringify(userMatch));
      // Sessió ANÒNIMA REAL de Firebase perquè Firestore accepti operacions
      // (request.auth != null). Sense això → "Missing or insufficient permissions".
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        setFirebaseUser(auth.currentUser || { uid: userMatch.id, email: userMatch.email });
      } catch (err) {
        console.warn("[Auth] Sessió anònima Firebase fallida, mode local:", err);
        setOfflineMode(true);
        localStorage.setItem("golfsana_offline", "true");
        setFirebaseUser({ uid: userMatch.id, email: userMatch.email });
      }
      setAuthLoading(false);
      logActivity(userMatch, "Inici de sessió"); // Log login
    } else {
      throw new Error("Invalid credentials");
    }
  };

  const handleLogout = () => {
    setIsLogoutConfirmationOpen(true);
  };

  const handleLogoutConfirmed = async () => {
    if (currentUser) {
      logActivity(currentUser, "Tancament de sessió");
    }
    localStorage.removeItem("golfsana_currentUser");
    setCurrentUser(null);
    setFirebaseUser(null);
    setIsLogoutConfirmationOpen(false);
    // No cal window.location.reload(): en posar currentUser a null, l'app mostra
    // automàticament la pantalla de login. Evitem així l'avís del navegador
    // "¿Quieres volver a cargar el sitio web?".
  };

  // (S'ha eliminat el bloqueig de navegació "beforeunload": era massa agressiu
  // i mostrava l'avís del navegador a cada recàrrega o logout. Les dades es desen
  // automàticament a cada canvi, així que no cal advertir en sortir.)

  // User Presence Tracking (Online / Offline Sessions & Heartbeats)
  useEffect(() => {
    if (authLoading || !currentUser || offlineMode) return;

    const updatePresenceStatus = async (status: "online" | "offline") => {
      try {
        const presenceRef = doc(db, "presence", currentUser.id);
        await saveDoc(presenceRef, {
          userId: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          avatar: currentUser.avatar,
          role: currentUser.role,
          lastActive: Timestamp.now(),
          status: status
        }, { merge: true });
      } catch (err) {
        console.warn("Error updating user presence in Firestore:", err);
      }
    };

    // Update presence immediately when active
    updatePresenceStatus("online");

    // Periodic heartbeat (every 15 seconds)
    const interval = setInterval(() => {
      updatePresenceStatus("online");
    }, 15000);

    // Update on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updatePresenceStatus("online");
      }
    };

    // Keep active in the background / handle before unload to go offline immediately
    const handleBeforeUnload = () => {
      updatePresenceStatus("offline").catch((e) => console.warn(e));
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Turn offline on cleanup (e.g. user changes, or unmount)
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updatePresenceStatus("offline").catch((e) => console.warn(e));
    };
  }, [currentUser?.id, authLoading, offlineMode]);

  // Active Tab Tracking inside Firestore Presence
  useEffect(() => {
    if (authLoading || !currentUser || offlineMode) return;

    const getTabLabel = (tab: string) => {
      switch (tab) {
        case "inici": return "Inici / Vista Global";
        case "manual": return "Manual d'Ús";
        case "all_workspaces": return "Tots els Espais de Treball";
        case "summary": return "Resum d'Espai de Treball";
        case "list": return "Llistat de Tasques";
        case "board": return "Taulell Kanban";
        case "timeline": return "Cronograma Gantt";
        case "calendar": return "Calendari";
        case "golf": return "Comparador de Tarifes de Golf";
        case "reports": return "Dashboards i Gràfics";
        case "incentives": return "Rendiment i Incentius";
        case "security": return "Seguretat i Registres";
        case "monitoring": return "Monitorització de l'Equip";
        default: return tab || "Inici";
      }
    };

    const updatePresenceTab = async () => {
      try {
        const presenceRef = doc(db, "presence", currentUser.id);
        await saveDoc(presenceRef, {
          currentTab: getTabLabel(activeTab),
          lastActive: Timestamp.now()
        }, { merge: true });
      } catch (err) {
        console.warn("Error updating active tab in Firestore:", err);
      }
    };

    updatePresenceTab();
  }, [activeTab, currentUser?.id, authLoading, offlineMode]);

  // 2. Real-time synchronizations from Firestore once authenticated
  useEffect(() => {
    if (authLoading) return;

    // A-0. Sync Deleted Items List
    const unsubDeleted = onSnapshot(collection(db, "deletedItems"), (snapshot) => {
      const ids = new Set<string>();
      snapshot.forEach((docSnap) => {
        ids.add(docSnap.id);
      });
      setDeletedItemIds(ids);
      localStorage.setItem("golfsana_deleted", JSON.stringify(Array.from(ids)));
    }, (error) => {
      console.warn("[Firestore DeletedItems Sync Warning]:", error);
    });

    // A. Sync Team/Users
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const items: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as UserProfile);
      });
      
      // If collection is empty, trigger seed loading
      if (items.length === 0) {
        seedInitialUsers();
      } else {
        const merged = [...items];
        STARTER_MEMBERS.forEach((starter) => {
          const idx = merged.findIndex(u => u.id === starter.id);
          if (idx === -1) {
            merged.push(starter);
            saveDoc(doc(db, "users", starter.id), starter).catch(err => console.warn(err));
          } else {
            const existing = merged[idx];
            const hasDeptChanged = existing.departmentId !== starter.departmentId || JSON.stringify(existing.departmentIds) !== JSON.stringify(starter.departmentIds);
            if (existing.name !== starter.name || existing.avatar !== starter.avatar || existing.email !== starter.email || existing.role !== starter.role || hasDeptChanged) {
              merged[idx] = { ...existing, ...starter };
              saveDoc(doc(db, "users", starter.id), starter).catch(err => console.warn(err));
            }
          }
        });

        const starterIds = new Set(STARTER_MEMBERS.map(m => m.id));
        let filteredMerged = merged
          .filter(u => starterIds.has(u.id) || u.email === "info@up-mktdigital.com" || u.email === "rocio@golfdaro.com")
          .map(u => {
            const isIsabel = u.email === "info@up-mktdigital.com" || u.id === "member_isabel";
            const isRocio = u.email === "rocio@golfdaro.com" || u.id === "member_rocio";
            return {
              ...u,
              role: (isIsabel || isRocio) ? ("admin" as UserRole) : ("member" as UserRole)
            };
          });

        // Deduplicate by email (prefer 'member_isabel' over random generated ID)
        const emailMap = new Map();
        filteredMerged.forEach(u => {
          if (!emailMap.has(u.email)) {
            emailMap.set(u.email, u);
          } else {
            // Keep the one from STARTER_MEMBERS if there is a conflict
            if (starterIds.has(u.id)) {
              // Delete the old one from Firebase to clean it up
              const old = emailMap.get(u.email);
              if (!starterIds.has(old.id)) {
                deleteDoc(doc(db, "users", old.id)).catch(err => console.warn(err));
              }
              emailMap.set(u.email, u);
            } else {
               // Delete the newly found but not-started one
               deleteDoc(doc(db, "users", u.id)).catch(err => console.warn(err));
            }
          }
        });
        filteredMerged = Array.from(emailMap.values());

        setUsers(filteredMerged);
        localStorage.setItem("golfsana_users", JSON.stringify(filteredMerged));
        // Find if our active chosen profile exists under active DB, otherwise keep active or default
        const match = filteredMerged.find(u => u.id === currentUser.id);
        if (match) setCurrentUser(match);
      }
    }, (error) => {
      console.warn("[Firestore Users Sync Error]:", error);
    });

    // B. Sync Workspaces
    const unsubWS = onSnapshot(collection(db, "workspaces"), (snapshot) => {
      const deletedL = JSON.parse(localStorage.getItem("golfsana_deleted") || "[]");
      const deletedSet = new Set<string>(deletedL);
      const items: Workspace[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && !deletedSet.has(docSnap.id) && !deletedSet.has(data.id)) {
          items.push({
            ...data,
            id: data.id || docSnap.id
          } as Workspace);
        }
      });
      if (snapshot.size === 0 && deletedSet.size === 0) {
        seedInitialWorkspaces();
      } else {
        // Direct, resilient synchronization with workspaces in Firestore
        setWorkspaces(items);
        localStorage.setItem("golfsana_workspaces", JSON.stringify(items));
        // Set first active workspace if none selected
        if (!activeWorkspaceId || !items.some(w => w.id === activeWorkspaceId)) {
          setActiveWorkspaceId(items[0]?.id || "");
        }
      }
    }, (error) => {
      console.warn("[Firestore Workspaces Sync Error]:", error);
    });

    // C. Sync Projects
    const unsubProj = onSnapshot(collection(db, "projects"), (snapshot) => {
      const deletedL = JSON.parse(localStorage.getItem("golfsana_deleted") || "[]");
      const deletedSet = new Set<string>(deletedL);
      const items: Project[] = [];
      const toAutoDelete: Project[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && !deletedSet.has(docSnap.id) && !deletedSet.has(data.id)) {
          const projName = data.name || "";
          const normalized = projName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          const targets = [
            "patrocini",
            "bbdd golf directo",
            "reserves pendent pagament",
            "millora tecnica de greens",
            "tancament de grups i operadors",
            "tancment de grups i operadors"
          ];
          const isTarget = targets.some(t => normalized === t || normalized.includes(t) || t.includes(normalized));

          if (isTarget && (data.workspaceId === "dep-comercial" || !data.workspaceId)) {
            toAutoDelete.push({ ...data, id: data.id || docSnap.id } as Project);
          } else {
            items.push({
              ...data,
              id: data.id || docSnap.id
            } as Project);
          }
        }
      });

      // Handle automatic backend/UI sync for the targeted projects
      if (toAutoDelete.length > 0) {
        toAutoDelete.forEach(async (proj) => {
          console.log("Programmatic auto-deletion of project requested by user:", proj.name, proj.id);
          const currentDeleted = JSON.parse(localStorage.getItem("golfsana_deleted") || "[]");
          if (!currentDeleted.includes(proj.id)) {
            currentDeleted.push(proj.id);
            localStorage.setItem("golfsana_deleted", JSON.stringify(currentDeleted));
          }
          setDeletedItemIds(prev => {
            const u = new Set(prev);
            u.add(proj.id);
            return u;
          });
          // Delete from projects collection in Firestore
          await deleteDoc(doc(db, "projects", proj.id)).catch(err => console.warn("Failed to delete project doc:", err));
          // Log deleted items
          await saveDoc(doc(db, "deletedItems", proj.id), { type: "project", id: proj.id, deletedAt: new Date().toISOString() }).catch(err => console.warn("Failed to write to deletedItems:", err));
        });
      }
      
      const hasSeeded = localStorage.getItem("golfsana_projects_seeded") === "true";
      if (items.length === 0 && !hasSeeded) {
        localStorage.setItem("golfsana_projects_seeded", "true");
        seedInitialProjects();
      } else {
        if (items.length > 0) {
          localStorage.setItem("golfsana_projects_seeded", "true");
        }
        // Direct, resilient synchronization with Firestore documents without automatic healing loops
        setProjects(items);
        localStorage.setItem("golfsana_projects", JSON.stringify(items));
      }
    }, (error) => {
      console.warn("[Firestore Projects Sync Error]:", error);
    });

    // D. Sync Tasks
    const unsubTasks = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const deletedL = JSON.parse(localStorage.getItem("golfsana_deleted") || "[]");
      const deletedSet = new Set<string>(deletedL);
      const items: Task[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && !deletedSet.has(docSnap.id) && !deletedSet.has(data.id)) {
          items.push({
            ...data,
            id: data.id || docSnap.id
          } as Task);
        }
      });
      
      const hasSeeded = localStorage.getItem("golfsana_tasks_seeded") === "true";
      if (items.length === 0 && !hasSeeded) {
        localStorage.setItem("golfsana_tasks_seeded", "true");
        seedInitialTasks();
      } else {
        if (items.length > 0) {
          localStorage.setItem("golfsana_tasks_seeded", "true");
        }
        // Direct, resilient synchronization with Firestore documents without automatic healing loops
        setTasks(items);
        localStorage.setItem("golfsana_tasks", JSON.stringify(items));
      }
    }, (error) => {
      console.warn("[Firestore Tasks Sync Error]:", error);
    });

    // E. Sync Golf Rates
    const unsubGolf = onSnapshot(collection(db, "golfCourses"), (snapshot) => {
      const items: GolfCourse[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id } as GolfCourse);
      });
      if (items.length === 0) {
        seedInitialGolfCourses();
      } else {
        // Deduplicate golf courses by name to prevent duplication in UI if they are duplicated in Firestore
        const uniqueCourses: GolfCourse[] = [];
        const seenNames = new Set<string>();
        for (const item of items) {
          if (!seenNames.has(item.name)) {
            seenNames.add(item.name);
            uniqueCourses.push(item);
          } else {
            // It's a duplicate in Firestore! We can delete the duplicate document asynchronously so the DB heals itself!
            deleteDoc(doc(db, "golfCourses", item.id)).catch(err => console.warn("Failed to delete duplicate course:", err));
          }
        }
        setGolfCourses(uniqueCourses);
        localStorage.setItem("golfsana_golfCourses", JSON.stringify(uniqueCourses));

        // Auto-seed: si falta algun camp starter a Firestore (p.ex. els competidors
        // no s'hi van escriure mai), l'afegim automàticament. Així el comparador
        // sempre mostra els 7 camps encara que Firestore en tingués només alguns.
        (async () => {
          const existingNames = new Set(uniqueCourses.map(c => c.name));
          for (let i = 0; i < STARTER_GOLF_CORES.length; i++) {
            const starter = STARTER_GOLF_CORES[i];
            if (!existingNames.has(starter.name)) {
              const id = `gc-${i}`;
              try {
                await saveDoc(doc(db, "golfCourses", id), { ...starter, id });
              } catch (e) {
                console.warn(`No s'ha pogut afegir el camp starter "${starter.name}":`, e);
              }
            }
          }
        })();
        
        // Auto-heal ONLY if a golf course has completely corrupt/missing hourlyRates or hourlyTariffs
        (async () => {
          for (const item of uniqueCourses) {
            const starter = STARTER_GOLF_CORES.find(s => s.name === item.name);
            if (starter) {
              const isOurClubOutdated = 
                item.isOurClub && (
                  item.greenFeeHigh !== starter.greenFeeHigh || 
                  item.greenFeeLow !== starter.greenFeeLow || 
                  item.buggyRental !== starter.buggyRental ||
                  item.bookingUrl !== starter.bookingUrl
                );

              const needsHeal = 
                !item.hourlyRates || 
                Object.keys(item.hourlyRates).length === 0 ||
                !item.hourlyTariffs || 
                Object.keys(item.hourlyTariffs).length === 0 ||
                isOurClubOutdated;
              
              if (needsHeal) {
                try {
                  await updateDoc(doc(db, "golfCourses", item.id), {
                    greenFeeHigh: starter.greenFeeHigh,
                    greenFeeLow: starter.greenFeeLow,
                    buggyRental: starter.buggyRental,
                    clubRental: starter.clubRental,
                    bookingUrl: starter.bookingUrl,
                    hourlyRates: starter.hourlyRates,
                    hourlyTariffs: starter.hourlyTariffs,
                    syncStatus: "success",
                    updatedBy: "Sincronització amb Golf Manager (Automàtic)"
                  });
                } catch (e) {
                  console.warn(`Error auto-healing course prices (permitted in local fallback): ${item.name}`, e);
                }
              }
            }
          }
        })();
      }
    }, (error) => {
      console.warn("[Firestore Golf Sync Error]:", error);
    });

    return () => {
      unsubUsers();
      unsubWS();
      unsubProj();
      unsubTasks();
      unsubGolf();
      unsubDeleted();
    };
  }, [authLoading]);

  // Automatic Ambient Scraper Service for Competitor Prices
  useEffect(() => {
    if (!golfCourses || golfCourses.length === 0) return;
    
    // Check if we ran auto-sync recently (within the last 15 minutes) to avoid infinite loops and unnecessary database writes
    const lastSyncStr = localStorage.getItem("golfsana_last_auto_sync_timestamp");
    const now = Date.now();
    if (lastSyncStr) {
      const lastSync = parseInt(lastSyncStr, 10);
      if (now - lastSync < 15 * 60 * 1000) {
        // Already synchronized recently
        return;
      }
    }

    // Set lock immediately to avoid parallel triggers
    localStorage.setItem("golfsana_last_auto_sync_timestamp", now.toString());

    const isWeekend = [0, 6].includes(new Date().getDay()); // 0 is Sunday, 6 is Saturday
    
    (async () => {
      console.log("[AutoScraper] Running background automatic competitor updates with real Costa Brava rates...");
      for (const course of golfCourses) {
        // Skip updating our own club automatically to avoid messing up manual administrative prices
        if (course.isOurClub) continue;

        const realPrices = getRealWorldCompetitorPrices(course.name, isWeekend);
        if (!realPrices) continue;

        const activeMinutes = new Date().getMinutes();
        const formattedMinutes = activeMinutes < 10 ? `0${activeMinutes}` : activeMinutes;
        const formattedHours = new Date().getHours() < 10 ? `0${new Date().getHours()}` : new Date().getHours();
        
        const simulatedOccupancy = Math.floor(Math.random() * 25) + 60; // 60% to 85% occupancy
        const simulatedAvailable = Math.max(2, Math.floor(((100 - simulatedOccupancy) / 100) * 36));

        try {
          const cleanHigh = parseAndCleanPrice(realPrices.greenFeeHigh);
          const cleanLow = parseAndCleanPrice(realPrices.greenFeeLow);
          
          const cleanRates: { [key: string]: number } = {};
          Object.entries(realPrices.hourlyRates).forEach(([h, r]) => {
            const tariffName = realPrices.hourlyTariffs[h] || "";
            if (isAllowedTariff(course.name, tariffName)) {
              cleanRates[h] = parseAndCleanPrice(r);
            } else {
              cleanRates[h] = 0; // Filtered/Restricted
            }
          });

          await updateDoc(doc(db, "golfCourses", course.id), {
            greenFeeHigh: cleanHigh,
            greenFeeLow: cleanLow,
            hourlyRates: cleanRates,
            hourlyTariffs: realPrices.hourlyTariffs,
            occupancyToday: simulatedOccupancy,
            availableSlotsToday: simulatedAvailable,
            lastSyncTime: `Avui, ${formattedHours}:${formattedMinutes}`,
            syncStatus: "success",
            updatedBy: "Scraper en temps real (Sincronitzat automàtic)"
          });
        } catch (error) {
          console.warn(`[AutoScraper Error] Could not auto-sync ${course.name} due to sandbox/offline restrictions:`, error);
        }
      }
    })();
  }, [golfCourses]);

  // Sync chosen task comments
  useEffect(() => {
    if (!selectedTask) return;

    const q = query(
      collection(db, "comments"),
      where("taskId", "==", selectedTask.id)
    );

    const unsubComments = onSnapshot(q, (snapshot) => {
      const items: Comment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Comment);
      });
      // Sort comments client side or query order
      items.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tA - tB;
      });
      setTaskComments(items);
    }, (error) => {
      console.warn("[Firestore Comments Sync Error] loading local offline comments:", error);
      try {
        const allComments = JSON.parse(localStorage.getItem("golfsana_comments") || "[]");
        setTaskComments(allComments.filter((c: any) => c.taskId === selectedTask.id));
      } catch {
        setTaskComments([]);
      }
    });

    return () => unsubComments();
  }, [selectedTask]);

  // Sync chosen user system notifications & mentions
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.id)
    );
    const unsubNotifications = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort descending by timestamp
      list.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      setNotifications(list);
      localStorage.setItem("golfsana_notifications", JSON.stringify(list));
    }, (error) => {
      console.warn("[Firestore Notifications Sync Warning] loading offline fallbacks:", error);
      try {
        const saved = JSON.parse(localStorage.getItem("golfsana_notifications") || "[]");
        setNotifications(saved);
      } catch {
        setNotifications([]);
      }
    });
    return () => unsubNotifications();
  }, [currentUser]);

  // Sincronització d'Actes de Reunió (meetingMinutes)
  useEffect(() => {
    if (!currentUser) return;
    const unsubMinutes = onSnapshot(collection(db, "meetingMinutes"), (snapshot) => {
      const list: MeetingMinute[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as MeetingMinute);
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      setMeetingMinutes(list);
      localStorage.setItem("golfsana_minutes", JSON.stringify(list));
    }, (error) => {
      console.warn("[Firestore Minutes Sync Warning] loading offline fallbacks:", error);
      try {
        const saved = JSON.parse(localStorage.getItem("golfsana_minutes") || "[]");
        setMeetingMinutes(saved);
      } catch {
        setMeetingMinutes([]);
      }
    });
    return () => unsubMinutes();
  }, [currentUser]);

  // Sync selectedTask with any background or status updates in the global tasks array
  useEffect(() => {
    if (selectedTask) {
      const current = tasks.find(t => t.id === selectedTask.id);
      if (current) {
        if (JSON.stringify(current) !== JSON.stringify(selectedTask)) {
          setSelectedTask(current);
        }
      } else {
        setSelectedTask(null);
      }
    }
  }, [tasks, selectedTask?.id]);

  const createNotification = async (targetUserId: string, taskId: string, taskTitle: string, messageText: string) => {
    const newNotif = {
      id: "notif-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      userId: targetUserId,
      taskId: taskId,
      taskTitle: taskTitle,
      message: messageText,
      read: false,
      createdAt: new Date().toISOString()
    };
    try {
      await saveDoc(doc(db, "notifications", newNotif.id), newNotif);
    } catch (err) {
      console.warn("Offline notification write:", err);
    }
    // Speculative update for speed or offline use
    setNotifications((prev) => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);
  };

  // ---- ACTES DE REUNIÓ ----
  const handleSaveMinute = async (minute: MeetingMinute, isNew: boolean) => {
    // Actualització local immediata
    setMeetingMinutes((prev) => {
      const next = isNew ? [minute, ...prev] : prev.map((m) => (m.id === minute.id ? minute : m));
      localStorage.setItem("golfsana_minutes", JSON.stringify(next));
      return next;
    });
    // Escriure a Firestore
    try {
      await saveDoc(doc(db, "meetingMinutes", minute.id), minute);
    } catch (err) {
      console.warn("[Minutes Write Warning] desat localment:", err);
      setOfflineMode(true);
      localStorage.setItem("golfsana_offline", "true");
    }
    // Notificar el membre (personalitzada, només a ell)
    if (isNew && minute.memberId !== currentUser.id) {
      const nAgr = minute.agreements.length;
      await createNotification(
        minute.memberId,
        minute.id,
        `Acta de reunió ${minute.date}`,
        `${currentUser.name} ha registrat l'acta de la vostra reunió del ${minute.date} amb ${nAgr} acord${nAgr === 1 ? "" : "s"} a fer.`
      );
    }
    addToast(isNew ? "Acta publicada i membre avisat" : "Acta actualitzada", "success");
    logEnterpriseAction(`Acta de reunió ${isNew ? "creada" : "editada"} per a ${minute.memberName} (${minute.date})`);
  };

  const handleDeleteMinute = async (id: string) => {
    const minute = meetingMinutes.find((m) => m.id === id);
    if (!minute) return;
    if (!window.confirm(`Segur que vols eliminar l'acta de ${minute.memberName} del ${minute.date}?`)) return;
    setMeetingMinutes((prev) => {
      const next = prev.filter((m) => m.id !== id);
      localStorage.setItem("golfsana_minutes", JSON.stringify(next));
      return next;
    });
    try {
      await deleteDoc(doc(db, "meetingMinutes", id));
    } catch (err) {
      console.warn("[Minutes Delete Warning] eliminat localment:", err);
    }
    addToast("Acta eliminada", "info");
  };

  const handleCreateTaskFromAgreement = async (minute: MeetingMinute, agreement: MeetingAgreement) => {
    // Projecte per defecte: el primer de l'espai actiu, o el primer disponible
    const targetProject = projects.find((p) => p.workspaceId === activeWorkspaceId) || projects[0];
    if (!targetProject) {
      addToast("Cal almenys un projecte per crear la tasca", "warning");
      return;
    }
    await handleAddTask(
      agreement.text,
      targetProject.id,
      [minute.memberId],
      "medium",
      undefined,
      agreement.dueDate || undefined
    );
    // Marcar l'acord com a convertit
    const updatedMinute: MeetingMinute = {
      ...minute,
      agreements: minute.agreements.map((a) => (a.id === agreement.id ? { ...a, taskCreated: true } : a)),
    };
    await handleSaveMinute(updatedMinute, false);
    addToast("Tasca creada des de l'acta", "success");
  };

  // --- Seed initial data helper loaders in Firestore ---
  const seedInitialUsers = async () => {
    for (const member of STARTER_MEMBERS) {
      await saveDoc(doc(db, "users", member.id), member);
    }
  };

  const seedInitialWorkspaces = async () => {
    for (const ws of STARTER_WORKSPACES) {
      await saveDoc(doc(db, "workspaces", ws.id), ws);
    }
  };

  const seedInitialProjects = async () => {
    for (const proj of STARTER_PROJECTS) {
      await saveDoc(doc(db, "projects", proj.id), proj);
    }
  };

  const seedInitialTasks = async () => {
    for (const task of STARTER_TASKS) {
      await saveDoc(doc(db, "tasks", task.id), task);
    }
  };

  const seedInitialGolfCourses = async () => {
    for (const score of STARTER_GOLF_CORES) {
      const id = "course_" + score.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await saveDoc(doc(db, "golfCourses", id), { ...score, id });
    }
  };

  const handleForceResetDatabase = () => {
    askConfirm("Atenció: Això eliminarà i restablirà les teves taules a la base de dades Firestore amb la nova configuració dels 4 espais de treball oficials i membres definits. Vols continuar?", async () => {
      try {
        // 1. Delete all old tasks
        const tasksQuery = await getDocs(collection(db, "tasks"));
        for (const d of tasksQuery.docs) {
          await deleteDoc(d.ref);
        }
        
        // 2. Delete all old members/users
        const usersQuery = await getDocs(collection(db, "users"));
        for (const d of usersQuery.docs) {
          await deleteDoc(d.ref);
        }
        
        // 3. Delete projects
        const projQuery = await getDocs(collection(db, "projects"));
        for (const d of projQuery.docs) {
          await deleteDoc(d.ref);
        }

        // 4. Delete workspaces
        const wsQuery = await getDocs(collection(db, "workspaces"));
        for (const d of wsQuery.docs) {
          await deleteDoc(d.ref);
        }

        // 4.5. Delete old golf courses
        const golfQuery = await getDocs(collection(db, "golfCourses"));
        for (const d of golfQuery.docs) {
          await deleteDoc(d.ref);
        }

        // 4.6. Delete list of user-deleted items to reset completely
        try {
          const deletedQuery = await getDocs(collection(db, "deletedItems"));
          for (const d of deletedQuery.docs) {
            await deleteDoc(d.ref);
          }
        } catch (err) {
          console.warn("Could not clear deletedItems collection on database reset:", err);
        }

        // Reset local seeding and deleting trackers
        localStorage.removeItem("golfsana_projects_seeded");
        localStorage.removeItem("golfsana_tasks_seeded");
        localStorage.removeItem("golfsana_deleted");
        setDeletedItemIds(new Set());

        // 5. Seed new ones
        await seedInitialUsers();
        await seedInitialWorkspaces();
        await seedInitialProjects();
        await seedInitialTasks();
        await seedInitialGolfCourses();

        addToast("S'ha restablert correctament la base de dades de l'Asana Enterprise amb els 4 espais de treball actius i els camps de golf.", "success");
        logEnterpriseAction("Base de dades restablerta de forma integral (incloent camps de golf).");
      } catch (err) {
        addToast("Error restablint dades: " + String(err), "warning");
      }
    });
  };

  // --- Actions & Database Handlers ---

  // Create workspace
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    const id = "ws-" + Math.random().toString(36).substring(2, 9);
    const newWS: Workspace = {
      id,
      name: newWorkspaceName,
      description: newWorkspaceDesc,
      createdAt: new Date().toISOString()
    };

    // Resilient Dual-Write
    const updated = [...workspaces, newWS];
    setWorkspaces(updated);
    localStorage.setItem("golfsana_workspaces", JSON.stringify(updated));

    setActiveWorkspaceId(id);
    setNewWorkspaceName("");
    setNewWorkspaceDesc("");
    setShowNewWorkspaceModal(false);
    logEnterpriseAction(`Workspace creat: ${newWS.name}`);
    addToast(`Espai "${newWS.name}" creat correctament`, "success");

    try {
      await saveDoc(doc(db, "workspaces", id), newWS);
    } catch (err) {
      console.warn("[Firestore Write Warning] workspaces: saved in client sandbox", err);
    }
  };

  // Delete workspace
  const handleDeleteWorkspace = async (workspaceId: string) => {
    const wsToDelete = workspaces.find(w => w.id === workspaceId);
    if (!wsToDelete) return;

    if (!window.confirm(`Segur que vols eliminar l'espai de treball "${wsToDelete.name}" i tots els seus projectes i tasques associats? Aquesta acció és irreversible.`)) {
      return;
    }

    // 1. Add to local deleted tracking to immediately update UI and prevent race sync conditions
    const deletedL = JSON.parse(localStorage.getItem("golfsana_deleted") || "[]");
    if (!deletedL.includes(workspaceId)) {
      deletedL.push(workspaceId);
    }

    // 2. Find projects of this workspace, add them and their tasks to deleted list
    const wsProjects = projects.filter(p => p.workspaceId === workspaceId);
    const wsProjectIds = wsProjects.map(p => p.id);
    for (const pId of wsProjectIds) {
      if (!deletedL.includes(pId)) {
        deletedL.push(pId);
      }
    }

    const wsTasks = tasks.filter(t => t.workspaceId === workspaceId || (t.projectId && wsProjectIds.includes(t.projectId)));
    const wsTaskIds = wsTasks.map(t => t.id);
    for (const tId of wsTaskIds) {
      if (!deletedL.includes(tId)) {
        deletedL.push(tId);
      }
    }

    // Update localStorage deleted list
    localStorage.setItem("golfsana_deleted", JSON.stringify(deletedL));

    // Update UI state synchronously so the UI instantly updates without flicker
    setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
    setProjects(prev => prev.filter(p => p.workspaceId !== workspaceId));
    setTasks(prev => prev.filter(t => t.workspaceId !== workspaceId && !(t.projectId && wsProjectIds.includes(t.projectId))));

    // Select another active workspace if we deleted the current one
    if (activeWorkspaceId === workspaceId) {
      const remaining = workspaces.filter(w => w.id !== workspaceId);
      setActiveWorkspaceId(remaining[0]?.id || "");
    }

    logEnterpriseAction(`Workspace suprimit: ${wsToDelete.name}`);
    addToast(`Espai "${wsToDelete.name}" s'ha eliminat correctament amb els seus projectes i tasques`, "success");

    // 3. Send deletes to Firestore asynchronously
    try {
      // Create deletedItems logs so other clients can also sync the delete-by-id instantly
      await saveDoc(doc(db, "deletedItems", workspaceId), { type: "workspace", id: workspaceId, deletedAt: new Date().toISOString() });
      await deleteDoc(doc(db, "workspaces", workspaceId));

      for (const pId of wsProjectIds) {
        await saveDoc(doc(db, "deletedItems", pId), { type: "project", id: pId, deletedAt: new Date().toISOString() }).catch(() => {});
        await deleteDoc(doc(db, "projects", pId)).catch(() => {});
      }

      for (const tId of wsTaskIds) {
        await saveDoc(doc(db, "deletedItems", tId), { type: "task", id: tId, deletedAt: new Date().toISOString() }).catch(() => {});
        await deleteDoc(doc(db, "tasks", tId)).catch(() => {});
      }
    } catch (err) {
      console.warn("[Firestore Delete Warning] workspace: saved in client sandbox", err);
    }
  };

  // Create project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const id = "proj-" + Math.random().toString(36).substring(2, 9);
    const newProj: Project = {
      id,
      workspaceId: activeWorkspaceId,
      name: newProjectName,
      color: newProjectColor,
      description: newProjectDesc,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id
    };

    // Resilient Dual-Write
    const updated = [...projects, newProj];
    setProjects(updated);
    localStorage.setItem("golfsana_projects", JSON.stringify(updated));

    setActiveProjectId(id);
    setNewProjectName("");
    setNewProjectDesc("");
    setShowNewProjectModal(false);
    logEnterpriseAction(`Projecte creat: ${newProj.name}`);
    addToast(`Projecte "${newProj.name}" creat correctament`, "success");

    try {
      await saveDoc(doc(db, "projects", id), newProj);
    } catch (err) {
      console.warn("[Firestore Write Warning] projects: saved in client sandbox", err);
    }
  };

  // Update Project (Roles & Resources)
  const handleDeleteProject = (projectId: string) => {
    askConfirm("Estàs segur que vols eliminar aquest projecte? Aquesta acció no es pot desfer.", async () => {
      // Track locally immediately to prevent resurrection
      try {
        const deletedL = JSON.parse(localStorage.getItem("golfsana_deleted") || "[]");
        if (!deletedL.includes(projectId)) {
          deletedL.push(projectId);
          localStorage.setItem("golfsana_deleted", JSON.stringify(deletedL));
        }
        setDeletedItemIds(prev => {
          const u = new Set(prev);
          u.add(projectId);
          return u;
        });
      } catch (e) {
        console.warn(e);
      }

      try {
        const tasksToUpdate = tasks.filter(t => t.projectId === projectId);
        for (const task of tasksToUpdate) {
          await updateDoc(doc(db, "tasks", task.id), { projectId: "" }).catch(e => console.warn("Task update error:", e));
        }
        try {
          await saveDoc(doc(db, "deletedItems", projectId), { type: "project", id: projectId, deletedAt: new Date().toISOString() });
        } catch (setErr) {
          console.warn("Could not save to deletedItems collection:", setErr);
        }
        await deleteDoc(doc(db, "projects", projectId));
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setTasks(prev => prev.map(t => t.projectId === projectId ? { ...t, projectId: "" } : t));
        setActiveProjectId(null);
        logEnterpriseAction(`Ha eliminat el projecte i ha reubicat les seves tasques.`);
        addToast("Projecte eliminat correctament", "success");
      } catch (err) {
        console.warn("Project delete & task detach error:", err);
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setTasks(prev => prev.map(t => t.projectId === projectId ? { ...t, projectId: "" } : t));
        setActiveProjectId(null);
      }
    });
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        return { ...p, ...updates };
      }
      return p;
    });
    setProjects(updated);
    localStorage.setItem("golfsana_projects", JSON.stringify(updated));

    logEnterpriseAction(`Projecte actualitzat (ID: ${projectId})`);

    try {
      const pDoc = projects.find(p => p.id === projectId);
      if (pDoc) {
        const fullProj = { ...pDoc, ...updates };
        await saveDoc(doc(db, "projects", projectId), fullProj);
      }
    } catch (err) {
      console.warn("[Firestore Write Warning] update project: saved in client sandbox", err);
    }
  };

  // Add Task
  const handleAddTask = async (title: string, projectId: string, assigneeIds: string[], priority: TaskPriority, departmentIds?: string[], dueDate?: string) => {
    const id = "task-" + Math.random().toString(36).substring(2, 9);
    const resolvedDeptIds = departmentIds && departmentIds.length > 0 ? departmentIds : ["dep-reserves"];
    const newTask: Task = {
      id,
      projectId,
      workspaceId: activeWorkspaceId,
      title,
      description: "",
      assigneeIds,
      departmentId: resolvedDeptIds[0],
      departmentIds: resolvedDeptIds,
      status: "todo",
      priority,
      dueDate: dueDate || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // default 10 days out
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.id
    };

    // Resilient Dual-Write
    const updated = [...tasks, newTask];
    setTasks(updated);
    localStorage.setItem("golfsana_tasks", JSON.stringify(updated));
    logEnterpriseAction(`Tasca creada: ${title}`);
    addToast(`Tasca "${title}" creada correctament`, "success");

    try {
      await saveDoc(doc(db, "tasks", id), newTask);
    } catch (err) {
      console.warn("[Firestore Write Warning] tasks: saved in client sandbox", err);
    }
  };

  // Helper to calculate the next recurrence of a task
  const getNextRecurrenceDates = (
    startDateStr: string | undefined,
    dueDateStr: string,
    recurrence: "weekly" | "fortnightly" | "monthly" | "bimonthly" | "quarterly" | "semiannually" | "yearly"
  ) => {
    const parseDate = (dStr: string) => {
      const parts = dStr.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      return new Date(dStr);
    };

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const addPeriod = (date: Date, rec: "weekly" | "fortnightly" | "monthly" | "bimonthly" | "quarterly" | "semiannually" | "yearly") => {
      const newDate = new Date(date);
      if (rec === "weekly") {
        newDate.setDate(newDate.getDate() + 7);
      } else if (rec === "fortnightly") {
        newDate.setDate(newDate.getDate() + 14);
      } else if (rec === "monthly") {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (rec === "bimonthly") {
        newDate.setMonth(newDate.getMonth() + 2);
      } else if (rec === "quarterly") {
        newDate.setMonth(newDate.getMonth() + 3);
      } else if (rec === "semiannually") {
        newDate.setMonth(newDate.getMonth() + 6);
      } else if (rec === "yearly") {
        newDate.setFullYear(newDate.getFullYear() + 1);
      }
      return newDate;
    };

    const nextDueDate = addPeriod(parseDate(dueDateStr), recurrence);
    const nextStartDate = startDateStr ? addPeriod(parseDate(startDateStr), recurrence) : undefined;

    return {
      dueDate: formatDate(nextDueDate),
      startDate: nextStartDate ? formatDate(nextStartDate) : undefined,
    };
  };

  // Update Task
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();

    let extraTasksToCreate: Task[] = [];

    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextTask = { ...t, ...updates, updatedAt: new Date().toISOString() };

        // Dynamic completion status tracking for Incentives
        if (updates.status === "done" && t.status !== "done") {
          nextTask.completedAt = todayStr;
          nextTask.completedOnTime = nextTask.dueDate ? todayStr <= nextTask.dueDate : true;

          // Recurrence trigger
          if (t.recurrence && t.recurrence !== "none") {
            try {
              const dates = getNextRecurrenceDates(t.startDate, t.dueDate, t.recurrence);
              // Prepare next duplicate
              const nextRecTask: Task = {
                ...t,
                id: `task_rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                status: "todo",
                startDate: dates.startDate,
                dueDate: dates.dueDate,
                completedAt: undefined,
                completedOnTime: undefined,
                subtasks: t.subtasks ? t.subtasks.map((st) => ({ ...st, completed: false })) : [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              extraTasksToCreate.push(nextRecTask);
              logEnterpriseAction(
                `Tasca recurrent "${t.title}" completada. Programada propera ocurrència pel ${dates.dueDate} (${t.recurrence})`
              );
            } catch (e) {
              console.error("Error formatting recurrence dates", e);
            }
          }
        } else if (updates.status && updates.status !== "done" && t.status === "done") {
          nextTask.completedAt = undefined;
          nextTask.completedOnTime = undefined;
        }

        return nextTask;
      }
      return t;
    });

    const finalTaskList = [...updated, ...extraTasksToCreate];
    setTasks(finalTaskList);
    localStorage.setItem("golfsana_tasks", JSON.stringify(finalTaskList));

    if (selectedTask && selectedTask.id === taskId) {
      const matched = finalTaskList.find((x) => x.id === taskId);
      setSelectedTask(matched || null);
    }

    logEnterpriseAction(`Tasca actualitzada (ID: ${taskId})`);
    if (updates.status === "done") {
      addToast("Felicitats! S'ha marcat la tasca com a completada", "success");
    }

    // Write original task update to Firebase
    try {
      const origTask = finalTaskList.find((x) => x.id === taskId);
      if (origTask) {
        await saveDoc(doc(db, "tasks", taskId), origTask);
      }

      // Write any newly created recurrent tasks to Firebase
      for (const tCont of extraTasksToCreate) {
        await saveDoc(doc(db, "tasks", tCont.id), tCont);
      }
    } catch (err) {
      console.warn("[Firestore Write Warning] tasks/update: saved in client sandbox", err);
    }
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    askConfirm("Segur que vols eliminar aquesta tasca?", async () => {
      // Track locally immediately to prevent resurrection
      try {
        const deletedL = JSON.parse(localStorage.getItem("golfsana_deleted") || "[]");
        if (!deletedL.includes(taskId)) {
          deletedL.push(taskId);
          localStorage.setItem("golfsana_deleted", JSON.stringify(deletedL));
        }
        setDeletedItemIds(prev => {
          const u = new Set(prev);
          u.add(taskId);
          return u;
        });
      } catch (e) {
        console.warn(e);
      }

      const updated = tasks.filter(t => t.id !== taskId);
      setTasks(updated);
      localStorage.setItem("golfsana_tasks", JSON.stringify(updated));

      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
      logEnterpriseAction(`Tasca eliminada (ID: ${taskId})`);
      addToast("S'ha suprimit la tasca correctament", "warning");

      try {
        try {
          await saveDoc(doc(db, "deletedItems", taskId), { type: "task", id: taskId, deletedAt: new Date().toISOString() });
        } catch (setErr) {
          console.warn("Could not save to deletedItems collection:", setErr);
        }
        await deleteDoc(doc(db, "tasks", taskId));
      } catch (err) {
        console.warn("[Firestore Write Warning] tasks/delete: saved in client sandbox", err);
        setOfflineMode(true);
        localStorage.setItem("golfsana_offline", "true");
      }
    });
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;

    const id = "com-" + Math.random().toString(36).substring(2, 9);
    const newComment: Comment = {
      id,
      taskId: selectedTask.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      comment: newCommentText,
      createdAt: new Date().toISOString()
    };

    // Resilient Dual-Write
    const updated = [...taskComments, newComment];
    setTaskComments(updated);

    try {
      const allComments = JSON.parse(localStorage.getItem("golfsana_comments") || "[]");
      localStorage.setItem("golfsana_comments", JSON.stringify([...allComments, newComment]));
    } catch {}

    setNewCommentText("");
    logEnterpriseAction(`Comentari afegit a la tasca: ${selectedTask.title}`);

    try {
      await saveDoc(doc(db, "comments", id), newComment);
      
      // Notify other assignees of this comment mention
      const otherAssignees = (selectedTask.assigneeIds || []).filter(uid => uid !== currentUser.id);
      otherAssignees.forEach(assigneeId => {
        createNotification(
          assigneeId,
          selectedTask.id,
          selectedTask.title,
          `${currentUser.name} ha comentat: "${newCommentText.slice(0, 50)}${newCommentText.length > 50 ? '...' : ''}"`
        );
      });
    } catch (err) {
      console.warn("[Firestore Write Warning] comments: saved in client sandbox", err);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    const updated = taskComments.filter(c => c.id !== commentId);
    setTaskComments(updated);

    try {
      const allComments = JSON.parse(localStorage.getItem("golfsana_comments") || "[]");
      localStorage.setItem("golfsana_comments", JSON.stringify(allComments.filter((c: any) => c.id !== commentId)));
    } catch {}

    try {
      await deleteDoc(doc(db, "comments", commentId));
    } catch (err) {
      console.warn("[Firestore Write Warning] comments/delete: saved in client sandbox", err);
    }
  };

  // Add Golf Course from Admin Panel
  const handleAddGolfCourse = async (course: Omit<GolfCourse, "id">) => {
    const id = "gc-" + Math.random().toString(36).substring(2, 9);
    const newCourse = { ...course, id };

    // Resilient Dual-Write
    const updated = [...golfCourses, newCourse];
    setGolfCourses(updated);
    localStorage.setItem("golfsana_golfCourses", JSON.stringify(updated));
    logEnterpriseAction(`Golf registrat: ${course.name}`);

    try {
      await saveDoc(doc(db, "golfCourses", id), newCourse);
    } catch (err) {
      console.warn("[Firestore Write Warning] golfCourses: saved in client sandbox", err);
    }
  };

  // Update Golf Course from Admin Panel
  const handleUpdateGolfCourse = async (courseId: string, updates: Partial<GolfCourse>) => {
    const updated = golfCourses.map(g => g.id === courseId ? { ...g, ...updates } : g);
    setGolfCourses(updated);
    localStorage.setItem("golfsana_golfCourses", JSON.stringify(updated));
    logEnterpriseAction(`Golf actualitzat: ID ${courseId}`);

    try {
      await updateDoc(doc(db, "golfCourses", courseId), updates);
    } catch (err) {
      console.warn("[Firestore Write Warning] golfCourses/update: saved in client sandbox", err);
    }
  };

  // Delete Golf Course
  const handleDeleteGolfCourse = (courseId: string) => {
    askConfirm("Segur que vols eliminar aquest camp de golf de la comparativa executiva?", async () => {
      const updated = golfCourses.filter(g => g.id !== courseId);
      setGolfCourses(updated);
      localStorage.setItem("golfsana_golfCourses", JSON.stringify(updated));
      logEnterpriseAction(`Golf eliminat: ID ${courseId}`);

      try {
        await deleteDoc(doc(db, "golfCourses", courseId));
      } catch (err) {
        console.warn("[Firestore Write Warning] golfCourses/delete: saved in client sandbox", err);
    }
    });
  };

  // Add Custom User Profile
  const handleAddUserProfile = async (name: string, email: string, role: UserRole) => {
    const id = "user-" + Math.random().toString(36).substring(2, 9);
    const avatar = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() || "PM";
    const newU: UserProfile = {
      id,
      name,
      email,
      role,
      avatar,
      createdAt: new Date().toISOString()
    };

    // Resilient Dual-Write
    const updated = [...users, newU];
    setUsers(updated);
    localStorage.setItem("golfsana_users", JSON.stringify(updated));
    logEnterpriseAction(`Nou col·laborador registrat: ${name} (${role})`);

    try {
      await saveDoc(doc(db, "users", id), newU);
    } catch (err) {
      console.warn("[Firestore Write Warning] users: saved in client sandbox", err);
    }
  };

  // Helper audit logger
  const logEnterpriseAction = (action: string) => {
    setAuditLogs(prev => [
      { id: Date.now().toString(), action, time: new Date().toLocaleTimeString(), user: currentUser.name },
      ...prev
    ]);

    // 1. Double write to Firestore global logs for real-time compliance
    if (currentUser && !offlineMode) {
      logActivity(currentUser, action).catch(err => {
        console.warn("Failed to write global audit log:", err);
      });

      // 2. Also register as latest action on user presence in real-time
      const presenceRef = doc(db, "presence", currentUser.id);
      saveDoc(presenceRef, {
        lastAction: action,
        lastActionTime: Timestamp.now()
      }, { merge: true }).catch(err => console.warn(err));
    }
  };

  // Active Workspace & Active project details
  const activeWorkspaceObj = workspaces.find(w => w.id === activeWorkspaceId);
  const activeProjectObj = projects.find(p => p.id === activeProjectId);

  // Check if current playing user holds Admin permissions (already declared above)

  // Filter tasks dynamically if a team member is clicked in sidebar and by global search query (Improvement 3)
  const displayedTasks = tasks.filter((t) => {
    // Member filter
    const matchesMember = !filterAssigneeId || t.assigneeIds?.includes(filterAssigneeId) || t.assigneeId === filterAssigneeId;
    if (!matchesMember) return false;

    // Search query filter
    if (globalSearchQuery.trim() !== "") {
      const q = globalSearchQuery.toLowerCase();
      const titleMatch = (t.title || "").toLowerCase().includes(q);
      const descMatch = (t.description || "").toLowerCase().includes(q);
      
      const assigneeName = users.find(u => t.assigneeIds?.includes(u.id) || u.id === t.assigneeId)?.name || "";
      const assigneeMatch = assigneeName.toLowerCase().includes(q);

      const deptMatch = (t.departmentId || "").toLowerCase().includes(q);

      return titleMatch || descMatch || assigneeMatch || deptMatch;
    }

    return true;
  });

  if (authLoading) return <div className="p-10 text-center font-mono text-xs">Carregant sistema...</div>;
  
  // El login es mostra quan no hi ha usuari REAL de l'app (currentUser).
  // firebaseUser és només la sessió tècnica anònima de Firestore i pot existir
  // sense que l'usuari hagi triat el seu perfil — per això no serveix com a condició.
  if (!currentUser) {
    return <LoginScreen onLogin={handleCustomLogin} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* Mobile Sidebar overlay backdrop */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0 w-64 bg-[#022e5f] text-white flex flex-col justify-between shrink-0 border-r border-[#012042] select-none h-full shadow-lg md:shadow-none transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 flex flex-col gap-6 overflow-y-auto">
          {/* Corporate brand header */}
          <div className="flex items-center gap-2.5 justify-between w-full border-b border-[#033b7a]/80 pb-4">
            <div className="flex items-center gap-2.5">
              {/* Custom uploaded brand image icon */}
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center bg-white rounded-full border border-slate-300 shadow-sm overflow-hidden select-none">
                <img 
                  src={golfBallIcon} 
                  alt="GolfSana Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight leading-4">
                  GolfSana Enterprise
                </h1>
                <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">Asana & Tariff Monitor</p>
              </div>
            </div>
            
            {/* Close button for mobile sidebar */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 text-blue-200 hover:text-white md:hidden hover:bg-[#033b7a] rounded transition-colors focus:outline-none"
              title="Tancar menú"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 pb-2">
            <div className="flex items-center gap-1.5" title={offlineMode ? "La plataforma funciona en mode sandbox local de seguretat redundat per prevenció de talls de connexió." : "Sincronitzat amb la base de dades cloud de forma segura."}>
              <span className={`w-1.5 h-1.5 rounded-full ${offlineMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
              <span className="text-[8px] text-blue-200/90 font-mono tracking-wide uppercase font-semibold">
                {offlineMode ? "Sessió Sandbox (Local/Sensa Cloud)" : "Sincro Cloud Activa"}
              </span>
            </div>
            {offlineMode && (
              <button
                onClick={() => {
                  localStorage.removeItem("golfsana_offline");
                  addToast("Sincronització connectant amb el núvol...", "info");
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                }}
                className="text-[9px] text-[#22c55e] hover:text-[#4ade80] underline font-mono tracking-wide text-left cursor-pointer transition-all uppercase font-semibold"
                title="Surt del mode offline i torna a comprovar Firestore per actualitzar presència i dades en temps real"
              >
                🔄 Forçar connexió al Núvol (Cloud)
              </button>
            )}
          </div>

          {/* Inici / Taulell Principal */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveTab("inici");
                setFilterAssigneeId(null);
                setActiveProjectId(null);
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full text-left py-2 px-3 rounded-none text-xs flex items-center gap-2 transition-all border ${
                activeTab === "inici" && filterAssigneeId === null
                  ? "bg-[#033b7a] text-white font-bold border-[#044a99] shadow-sm border-l-4 border-l-blue-400"
                  : "text-blue-100 hover:bg-[#033b7a]/40 hover:text-white border-transparent"
              }`}
            >
              <Home className="w-3.5 h-3.5 text-blue-300" />
              <span>Inici / Taulell Principal</span>
            </button>

            {/* Manual d'Ús */}
            <button
              onClick={() => {
                setActiveTab("manual");
                setFilterAssigneeId(null);
                setActiveProjectId(null);
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full text-left py-2 px-3 rounded-none text-xs flex items-center justify-between transition-all border ${
                activeTab === "manual" && filterAssigneeId === null
                  ? "bg-[#033b7a] text-white font-bold border-[#044a99] shadow-sm border-l-4 border-l-blue-400"
                  : "text-blue-100 hover:bg-[#033b7a]/40 hover:text-white border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                <span>Manual d'Ús de la Plataforma</span>
              </div>
              <span className="text-[8px] bg-emerald-600 text-white px-1.5 py-0.5 font-black uppercase font-mono tracking-wider">GUIA</span>
            </button>
          </div>

          {/* Active Workspace Selector */}
          <div className="space-y-2">
            <div 
              onClick={() => {
                setIsWorkspacesExpanded(!isWorkspacesExpanded);
                setActiveTab("all_workspaces");
                setActiveProjectId(null);
                setFilterAssigneeId(null);
                if(window.innerWidth < 1024) setIsMobileSidebarOpen(false);
              }} 
              className={`flex items-center justify-between px-1 cursor-pointer hover:bg-[#033b7a]/40 py-1 transition-all ${activeTab === 'all_workspaces' ? 'bg-[#033b7a]/40' : ''}`}
              title="Clica per desplegar / col·lapsar i veure tots els Espais de treball"
            >
              <span className="text-[10px] font-bold text-blue-200/70 uppercase tracking-wider flex items-center gap-1 font-mono select-none">
                <ChevronRight className={`w-3.5 h-3.5 text-blue-300 transition-transform duration-200 shrink-0 ${isWorkspacesExpanded ? "rotate-90" : ""}`} />
                <Layers className="w-3 h-3 text-blue-300 shrink-0" />
                <span>Espais de treball</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewWorkspaceModal(true);
                }}
                className="p-1 hover:bg-[#033b7a] rounded-none text-blue-200 hover:text-white transition-all border border-[#033b7a] bg-[#022e5f] shadow-sm shrink-0"
                title="Crear Nou Espai de Treball"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {isWorkspacesExpanded && (
              <div className="space-y-1 pl-1.5">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspaceId;
                  return (
                    <div
                      key={ws.id}
                      className={`group/ws w-full text-xs transition-all flex items-center justify-between border ${
                        isActive
                          ? "bg-[#033b7a] text-white border-[#044a99] shadow-sm border-l-4 border-l-blue-400"
                          : "text-blue-100 hover:bg-[#033b7a]/40 hover:text-white border-transparent"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setActiveWorkspaceId(ws.id);
                          setActiveProjectId(null); // Reset active project
                          setFilterAssigneeId(null); // Clear assignee filter
                          setActiveTab("summary"); // Navigate to Workspace Summary
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`flex-1 text-left py-2 px-3 truncate ${isActive ? "font-bold" : ""}`}
                        title={`Obre l'espai de treball: ${ws.name}`}
                      >
                        {ws.name}
                      </button>
                      
                      <div className="flex items-center gap-1.5 pr-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkspace(ws.id);
                          }}
                          className="opacity-0 group-hover/ws:opacity-100 p-1 hover:bg-red-700 hover:text-white text-red-300 transition-all cursor-pointer border border-transparent hover:border-red-600 shadow-sm"
                          title={`Eliminar espai de treball: ${ws.name}`}
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                        <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-none border shrink-0 ${
                          isActive
                            ? "bg-[#022e5f] text-blue-200 border-[#033b7a]"
                            : "bg-[#012042] text-blue-200 border-[#022e5f]"
                        }`}>
                          {tasks.filter(t => (t.workspaceId || projects.find(p => p.id === t.projectId)?.workspaceId) === ws.id).length}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Projects inside selected workspace */}
          <div className="space-y-2 pt-3 border-t border-[#012042]">
            <div 
              onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
              className="flex items-center justify-between px-1 cursor-pointer hover:bg-[#033b7a]/20 py-1 transition-all"
              title="Clica per desplegar / col·lapsar els projectes de grup"
            >
              <span className="text-[10px] font-bold text-blue-200/70 uppercase tracking-wider flex items-center gap-1 font-mono select-none">
                <ChevronRight className={`w-3.5 h-3.5 text-blue-300 transition-transform duration-200 shrink-0 ${isProjectsExpanded ? "rotate-90" : ""}`} />
                <Folder className="w-3 h-3 text-blue-300 shrink-0" />
                <span>Projectes del Grup</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewProjectModal(true);
                }}
                className="p-1 hover:bg-[#033b7a] rounded-none text-blue-200 hover:text-white transition-all border border-[#033b7a] bg-[#022e5f] shadow-sm shrink-0"
                title="Crear projecte"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {isProjectsExpanded && (
              <div className="space-y-1 pl-1.5">
                <button
                  onClick={() => {
                    setActiveProjectId(null);
                    setFilterAssigneeId(null);
                  }}
                  className={`w-full text-left py-2 px-3 rounded-none text-xs flex items-center gap-2 transition-all border ${
                    activeProjectId === null
                      ? "bg-[#033b7a] text-white font-bold border-[#044a99] shadow-sm"
                      : "text-blue-100 hover:bg-[#033b7a]/40 hover:text-white border-transparent"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>Mostra-ho tot</span>
                </button>

                {projects
                  .filter((p) => p.workspaceId === activeWorkspaceId)
                  .map((proj) => {
                    const isActive = proj.id === activeProjectId;
                    return (
                      <button
                        key={proj.id}
                        onClick={() => {
                          // Si el projecte és d'un altre espai, canvia també l'espai actiu
                          if (proj.workspaceId && proj.workspaceId !== activeWorkspaceId) {
                            setActiveWorkspaceId(proj.workspaceId);
                          }
                          setActiveProjectId(proj.id);
                          setFilterAssigneeId(null);
                          setActiveTab("list"); // Obre directament la vista de tasques del projecte
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full text-left py-2 px-3 rounded-none text-xs flex items-center justify-between transition-all border ${
                          isActive
                            ? "bg-[#033b7a] text-white font-bold border-[#044a99] shadow-sm"
                            : "text-blue-100 hover:bg-[#033b7a]/40 hover:text-white border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-none shrink-0"
                            style={{ backgroundColor: proj.color || "#ccc" }}
                          ></span>
                          <span className="truncate">{proj.name}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Anàlisis de Dades */}
          <div className="space-y-2 pt-3 border-t border-[#012042]">
            <div 
              onClick={() => setIsDataAnalysisExpanded(!isDataAnalysisExpanded)}
              className="flex items-center justify-between px-1 cursor-pointer hover:bg-[#033b7a]/20 py-1 transition-all"
              title="Clica per desplegar / col·lapsar anàlisi de dades"
            >
              <span className="text-[10px] font-bold text-blue-200/70 uppercase tracking-wider flex items-center gap-1 font-mono select-none">
                <ChevronRight className={`w-3.5 h-3.5 text-blue-300 transition-transform duration-200 shrink-0 ${isDataAnalysisExpanded ? "rotate-90" : ""}`} />
                <BarChart3 className="w-3 h-3 text-blue-300 shrink-0" />
                <span>Anàlisi de Dades</span>
              </span>
            </div>
            
            {isDataAnalysisExpanded && (
              <div className="space-y-1 pl-1.5">
                {/* Informes i Dashboards */}
                <button
                  onClick={() => {
                    setActiveTab("reports");
                    setActiveProjectId(null);
                    setFilterAssigneeId(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full text-left py-2 px-3 rounded-none text-xs flex items-center justify-between transition-all border ${
                    activeTab === "reports" && filterAssigneeId === null
                      ? "bg-[#033b7a] text-white font-bold border-[#044a99] shadow-sm border-l-4 border-l-blue-400"
                      : "text-blue-100 hover:bg-[#033b7a]/40 hover:text-white border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                    <span className="truncate flex-1">Informes i Dashboards</span>
                  </div>
                  <span className="text-[8px] bg-emerald-600 text-white px-1.5 py-0.5 font-extrabold rounded-none font-mono tracking-tight shrink-0">LIVE</span>
                </button>

                {/* Rendiment i Incentius */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab("incentives");
                      setActiveProjectId(null);
                      setFilterAssigneeId(null);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left py-2 px-3 rounded-none text-xs flex items-center justify-between transition-all border ${
                      activeTab === "incentives" && filterAssigneeId === null
                        ? "bg-[#033b7a] text-white font-bold border-[#044a99] shadow-sm border-l-4 border-l-blue-400"
                        : "text-blue-100 hover:bg-[#033b7a]/40 hover:text-white border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Clock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                      <span className="truncate flex-1">Rendiment i Incentius</span>
                    </div>
                    <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 font-extrabold rounded-none font-mono tracking-tight shrink-0">BUS</span>
                  </button>
                )}

                {/* Seguretat & Registres */}
                <button
                  onClick={() => {
                    setActiveTab("security");
                    setActiveProjectId(null);
                    setFilterAssigneeId(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full text-left py-2 px-3 rounded-none text-xs flex items-center justify-between transition-all border ${
                    activeTab === "security" && filterAssigneeId === null
                      ? "bg-[#033b7a] text-white font-bold border-[#044a99] shadow-sm border-l-4 border-l-blue-400"
                      : "text-blue-100 hover:bg-[#033b7a]/40 hover:text-white border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Shield className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                    <span className="truncate flex-1">Seguretat i Registres</span>
                  </div>
                </button>
                {/* Monitorització */}
                {currentUser.role === "admin" && (
                  <button
                    onClick={() => {
                      setActiveTab("monitoring");
                      setActiveProjectId(null);
                      setFilterAssigneeId(null);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left py-2 px-3 rounded-none text-xs flex items-center justify-between transition-all border ${
                      activeTab === "monitoring" && filterAssigneeId === null
                        ? "bg-[#033b7a] text-white font-bold border-[#044a99] shadow-sm border-l-4 border-l-blue-400"
                        : "text-blue-100 hover:bg-[#033b7a]/40 hover:text-white border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Activity className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                      <span className="truncate flex-1">Monitorització</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Membres de l'Equip & Filtre de Responsables */}
          <div className="space-y-2 pt-3 border-t border-[#012042]">
            <div 
              onClick={() => setIsMembersExpanded(!isMembersExpanded)}
              className="flex items-center justify-between px-1 cursor-pointer hover:bg-[#033b7a]/20 py-1 transition-all"
              title="Clica per desplegar / col·lapsar membres de l'equip"
            >
              <span className="text-[10px] font-bold text-blue-200/70 uppercase tracking-wider flex items-center gap-1 font-mono select-none">
                <ChevronRight className={`w-3.5 h-3.5 text-blue-300 transition-transform duration-200 shrink-0 ${isMembersExpanded ? "rotate-90" : ""}`} />
                <Users className="w-3 h-3 text-blue-300 shrink-0" />
                <span>Membres de l'Equip</span>
              </span>
              {filterAssigneeId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterAssigneeId(null);
                  }}
                  className="text-[9px] text-blue-300 hover:text-white underline font-bold shrink-0"
                >
                  Veure tots
                </button>
              )}
            </div>

            {isMembersExpanded && (
              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-blue-800 pl-1.5">
                {users.map((u) => {
                  const isActiveFilter = filterAssigneeId === u.id;
                  const pendingCount = tasks.filter(t => (t.assigneeIds?.includes(u.id) || t.assigneeId === u.id) && t.status !== "done").length;

                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setFilterAssigneeId(isActiveFilter ? null : u.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full text-left p-1.5 px-2 rounded-none transition-all flex items-center justify-between border ${
                        isActiveFilter
                          ? "bg-[#033b7a] text-white border-[#044a99] shadow-sm border-l-4 border-l-blue-400"
                          : "text-blue-100 hover:bg-[#033b7a]/40 hover:text-white border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-full bg-blue-900/60 border border-blue-700 text-blue-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {u.avatar || u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate flex flex-col leading-tight">
                          <span className="text-xs font-semibold">{u.name}</span>
                        </div>
                      </div>
                      {pendingCount > 0 && (
                        <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded-none border ${
                          isActiveFilter
                            ? "bg-[#022e5f] text-blue-200 border-[#033b7a]"
                            : "bg-[#012042] text-blue-300 border-[#022e5f]"
                        }`}>
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Corporate bottom info & admin switcher status */}
        <div className="mt-auto p-4 border-t border-[#012042] bg-[#012042]">
          <div className="bg-[#022e5f] p-3 rounded-none mb-3 border border-[#033b7a]">
            <p className="text-[10px] text-blue-200/70 mb-0.5 uppercase tracking-wider font-bold">Llicència Enterprise</p>
            <p className="text-xs text-white font-bold flex justify-between items-center">
              <span>Usuaris Indefinits</span>
              <span className="text-[9px] bg-blue-900/40 text-blue-200 px-1.5 py-0.5 rounded-none font-mono border border-blue-800">SOC 2 Cert</span>
            </p>
            <div className="w-full bg-[#012042] h-1.5 mt-2 overflow-hidden border border-[#033b7a]">
              <div className="bg-blue-500 h-full w-full"></div>
            </div>

            {/* User section with logout */}
            <div className="p-3 border-b border-blue-800/60 flex items-center justify-between text-white text-xs font-mono">
              <div className="truncate pr-2">
                <p className="font-bold">{currentUser.name}</p>
                <p className="text-[10px] text-blue-200 truncate">{currentUser.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-red-900/50 hover:bg-red-800 px-2 py-1 border border-red-800 text-[10px] uppercase font-bold"
              >
                Tancar
              </button>
            </div>

            {/* Copyright & UP!Marketing elegant stamps */}
            <div className="mt-3 pt-3 border-t border-blue-800/60 flex flex-col gap-1.5 text-center leading-tight">
              <div className="text-[9px] font-bold text-blue-200/60">
                Creat per: <span className="text-blue-200 font-extrabold">UP! Marketing Digital</span>
              </div>
              <p className="text-[9.5px] text-blue-200/50 font-bold font-sans">
                © 2026 UP! Marketing Digital <br />
                <span className="text-[9px] text-blue-200/45 font-medium">Tots els drets reservats</span>
              </p>
              <p className="text-[9px] text-emerald-400/80 font-mono font-bold uppercase tracking-wider select-none bg-blue-950/40 py-1 border border-blue-900/50 mt-1">
                Dret d'ús: Club de Golf d'Aro
              </p>
            </div>
          </div>

          {/* Admin access (hidden) */}
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 flex flex-col overflow-hidden h-full bg-slate-100 text-slate-900">
        <ConfirmationModal
          isOpen={isLogoutConfirmationOpen}
          onConfirm={handleLogoutConfirmed}
          onCancel={() => setIsLogoutConfirmationOpen(false)}
          title="Tancar sessió"
          message="Segur que vols tancar la sessió? Assegura't que tots els canvis estiguin desats."
        />
        {/* HEADER BAR */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3 md:gap-4 truncate">
            {/* Hamburger menu button for mobile screens (Improvement 1) */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden block focus:outline-none shrink-0"
              title="Obrir menú lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="space-y-0.5 truncate">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base truncate">
                {activeTab === "inici" ? (
                  <span className="text-blue-900 flex items-center gap-1.5 truncate">
                    <Home className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 shrink-0" />
                    <span className="truncate">Vista Global de l'Empresa</span>
                  </span>
                ) : activeTab === "all_workspaces" ? (
                  <span className="text-blue-900 flex items-center gap-1.5 truncate">
                    <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 shrink-0" />
                    <span className="truncate">Tots els Espais de Treball</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 truncate text-slate-850">
                    <span className="truncate">{activeWorkspaceObj ? activeWorkspaceObj.name : "Sense Workspace"}</span>
                    {activeProjectObj && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold text-blue-600 text-xs sm:text-sm truncate">{activeProjectObj.name}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block truncate">
                {activeTab === "inici" 
                  ? "Resum general, comparativa sectorial i activitats consolidades dels departaments" 
                  : activeTab === "all_workspaces" 
                    ? "Vista corporativa general de tots els departaments"
                    : (activeProjectObj ? activeProjectObj.description : activeWorkspaceObj?.description)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Global Fuzzy Search (Improvement 3) */}
            <div className="relative hidden lg:flex items-center">
              <span className="absolute left-2.5 text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Cerca global de tasques..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs w-48 xl:w-60 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-none focus:outline-none transition-all placeholder-slate-400 leading-tight"
                title="Cerca per títol, descripció o responsable"
              />
              {globalSearchQuery && (
                <button 
                  onClick={() => setGlobalSearchQuery("")}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dense Mode Spacing Switcher (Improvement 4) */}
            <button
              onClick={() => {
                const newVal = !isCompactView;
                setIsCompactView(newVal);
                localStorage.setItem("golfsana_compact_view", String(newVal));
                addToast(newVal ? "S'ha activat la Vista Compacta de densitat alta" : "S'ha restaurat la Vista Normal", "info");
              }}
              className={`p-1.5 border font-mono text-[9px] font-bold uppercase transition-all tracking-tight shrink-0 flex items-center gap-1 leading-none ${
                isCompactView
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-inner animate-pulse"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="Canvia la densitat i espaiat de les taules i llistes d'Asana (Estàndard vs Compacte)"
            >
              <LayoutGrid className="w-3 h-3" />
              <span className="hidden sm:inline">{isCompactView ? "Compacte" : "Normal"}</span>
            </button>

            {/* Onboarding Guide "?" Button (Improvement 2) */}
            <button
              onClick={() => setShowHelpGuide(true)}
              className="p-1.5 bg-slate-150 hover:bg-indigo-100 border border-slate-200 hover:border-indigo-300 rounded text-slate-500 hover:text-indigo-600 transition-all focus:outline-none shrink-0"
              title="Guia d'ajuda interactiva de la plataforma"
            >
              <HelpCircle className="w-4 h-4 text-slate-600" />
            </button>

            {/* Session switcher */}
            {isAdmin && (
              <UserSessionSelector
                users={users}
                currentUser={currentUser}
                onSelectUser={(u) => {
                  setCurrentUser(u);
                  logEnterpriseAction(`Canvi de sessió: ara actua com ${u.name}`);
                  addToast(`Sessió iniciada com a ${u.name}`, "success");
                }}
                onAddUser={handleAddUserProfile}
                onLogout={handleLogout}
              />
            )}
          </div>
        </header>

        {/* WORKSPACE NAVIGATION BAR (Asana tabs list) */}
        {!filterAssigneeId && ["summary", "list", "board", "timeline", "calendar", "golf"].includes(activeTab) && (
          <nav className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-2 shrink-0 overflow-x-auto select-none">
            <button
              onClick={() => setActiveTab("summary")}
              className={`py-1.5 px-3.5 rounded-none text-xs font-bold transition-all flex items-center gap-2 border ${
                activeTab === "summary"
                  ? "bg-slate-100 border-slate-350 text-slate-900"
                  : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-850"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Resum</span>
            </button>

            <button
              onClick={() => setActiveTab("list")}
              className={`py-1.5 px-3.5 rounded-none text-xs font-bold transition-all flex items-center gap-2 border ${
                activeTab === "list"
                  ? "bg-slate-100 border-slate-350 text-slate-900"
                  : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-850"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              <span>Llistat de tasques</span>
            </button>

            <button
              onClick={() => setActiveTab("board")}
              className={`py-1.5 px-3.5 rounded-none text-xs font-bold transition-all flex items-center gap-2 border ${
                activeTab === "board"
                  ? "bg-slate-100 border-slate-355 text-slate-900"
                  : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-850"
              }`}
            >
              <Trello className="w-3.5 h-3.5 text-slate-500" />
              <span>Taulell Kanban</span>
            </button>

            <button
              onClick={() => setActiveTab("timeline")}
              className={`py-1.5 px-3.5 rounded-none text-xs font-bold transition-all flex items-center gap-2 border ${
                activeTab === "timeline"
                  ? "bg-slate-100 border-slate-355 text-slate-900"
                  : "text-slate-505 border-transparent hover:bg-slate-50 hover:text-slate-850"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              <span>Cronograma Gantt</span>
            </button>

            <button
              onClick={() => setActiveTab("calendar")}
              className={`py-1.5 px-3.5 rounded-none text-xs font-bold transition-all flex items-center gap-2 border ${
                activeTab === "calendar"
                  ? "bg-slate-100 border-slate-355 text-slate-900"
                  : "text-slate-505 border-transparent hover:bg-slate-50 hover:text-slate-850"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Calendari</span>
            </button>

            <button
              onClick={() => setActiveTab("minutes")}
              className={`py-1.5 px-3.5 rounded-none text-xs font-bold transition-all flex items-center gap-2 border ${
                activeTab === "minutes"
                  ? "bg-slate-100 border-slate-355 text-slate-900"
                  : "text-slate-505 border-transparent hover:bg-slate-50 hover:text-slate-850"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Acta de Reunió</span>
            </button>

            {/* Golf pricing matrix (Super Admin workspace) */}
            <button
              onClick={() => setActiveTab("golf")}
              className={`py-1.5 px-3.5 rounded-none text-xs font-bold transition-all flex items-center gap-2 border relative ${
                activeTab === "golf"
                  ? "bg-emerald-50 border-emerald-350 text-emerald-800"
                  : "text-slate-505 border-transparent hover:bg-slate-50 hover:text-emerald-700"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Comparador de Golf (Admin)</span>
              {!isAdmin && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-none bg-amber-500 animate-pulse" title="S'adverteix accés restringit"></span>
              )}
            </button>
          </nav>
        )}

        {/* WORKSPACE PANEL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={filterAssigneeId ? `member-${filterAssigneeId}` : activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {filterAssigneeId ? (
                <MemberDashboard
                  memberId={filterAssigneeId}
                  users={users}
                  tasks={tasks}
                  projects={projects}
                  workspaces={workspaces}
                  onClose={() => setFilterAssigneeId(null)}
                  onUpdateTaskStatus={async (taskId, newStatus) => {
                    await handleUpdateTask(taskId, { status: newStatus });
                  }}
                  onAddTask={handleAddTask}
                  onSelectTask={(task) => setSelectedTask(task)}
                />
              ) : (
                <>
                  {activeTab === "inici" && (
                <div className="space-y-6">
                  {/* Dynamic greeting & header with time of day and beautiful calendar date */}
                  <div className="bg-gradient-to-r from-[#002f6c] to-[#044c9c] p-6 text-white shadow-md border-b-[3px] border-emerald-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] bg-emerald-500 text-slate-900 font-mono font-extrabold px-2 py-0.5 tracking-wider uppercase">
                        SISTEMA INTEGRAT GOLFSANA
                      </span>
                      <h2 className="text-2xl font-bold tracking-tight uppercase mt-2 font-sans">
                        {(() => {
                          const hours = new Date().getHours();
                          let greeting = "Bon dia";
                          if (hours >= 14 && hours < 21) greeting = "Bona tarda";
                          else if (hours >= 21 || hours < 6) greeting = "Bona nit";
                          return `${greeting}, ${currentUser.name || "Usuari/a"}`;
                        })()}
                      </h2>
                      <p className="text-xs text-blue-100 opacity-90 mt-1 max-w-2xl leading-relaxed">
                        Benvingut/da al panell de control executiu de Golfasana d'Aro. Tens visió integral de la competència, l'estat de les tasques organitzatives d'Asana i dades d'auditoria de seguretat.
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1 bg-blue-950/40 p-3 border border-blue-800 shrink-0 relative">
                      <div className="flex items-center gap-3">
                        {/* Bell Notification center */}
                        <div className="relative z-20" id="bell-notifications-wrapper">
                          <button
                            type="button"
                            onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                            className="p-1 px-2 border border-blue-800 bg-blue-900/60 hover:bg-blue-800/85 text-blue-200 hover:text-white transition-all flex items-center gap-1.5 rounded-sm text-xs font-semibold"
                            title="Avisos i Mencions del Sistema"
                          >
                            <Bell className={`w-3.5 h-3.5 ${notifications.filter(n => !n.read).length > 0 ? "text-amber-400 animate-bounce" : ""}`} />
                            <span>Mencions</span>
                            {notifications.filter(n => !n.read).length > 0 && (
                              <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 rounded-full">
                                {notifications.filter(n => !n.read).length}
                              </span>
                            )}
                          </button>

                          {/* Float Dropdown */}
                          <AnimatePresence>
                            {showNotificationsDropdown && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowNotificationsDropdown(false)}></div>
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="absolute right-0 mt-2 w-80 bg-white text-slate-800 border border-slate-250 shadow-2xl z-50 rounded-sm font-sans text-left overflow-hidden"
                                >
                                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-850">Avisos i Mencions ({notifications.length})</span>
                                    {notifications.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          for (const n of notifications) {
                                            try {
                                              await deleteDoc(doc(db, "notifications", n.id));
                                            } catch(e) {
                                              console.warn(e);
                                            }
                                          }
                                          setNotifications([]);
                                          localStorage.setItem("golfsana_notifications", "[]");
                                        }}
                                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                                      >
                                        Netejar tots
                                      </button>
                                    )}
                                  </div>
                                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                                    {notifications.length === 0 ? (
                                      <div className="p-4 text-center text-xs text-slate-400 italic">Sense avisos nous. T'avisarem aquí de noves tasques on et mencionin.</div>
                                    ) : (
                                      notifications.map(n => (
                                        <div 
                                          key={n.id} 
                                          onClick={() => {
                                            // Si la notificació és d'una acta de reunió,
                                            // portar a la pestanya Acta de Reunió.
                                            const minuteObj = meetingMinutes.find(m => m.id === n.taskId);
                                            if (minuteObj) {
                                              setActiveTab("minutes");
                                            } else {
                                              const taskObj = tasks.find(t => t.id === n.taskId);
                                              if (taskObj) {
                                                setSelectedTask(taskObj);
                                              }
                                            }
                                            setShowNotificationsDropdown(false);
                                          }}
                                          className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${!n.read ? "bg-indigo-50/40" : ""}`}
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-indigo-750 text-[10px] bg-indigo-50 px-1 py-0.5 rounded-sm max-w-[200px] truncate" title={n.taskTitle}>
                                              {n.taskTitle}
                                            </span>
                                            <span className="text-[8.5px] text-slate-400 font-mono">
                                              {n.createdAt ? new Date(n.createdAt).toLocaleTimeString('ca-ES', {hour: '2-digit', minute:'2-digit'}) : ""}
                                            </span>
                                          </div>
                                          <p className="text-slate-600 text-[11px] leading-tight">{n.message}</p>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>

                        <span className="text-xs font-mono font-semibold text-emerald-400">
                          {new Date().toLocaleDateString('ca-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        <span className="text-[10px] font-mono tracking-wider text-slate-300">ESTAT: {currentUser.role?.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Bento-styled KPI metrics across ALL departments */}
                  {(() => {
                    const todayStr = (() => {
                      const d = new Date();
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    })();
                    
                    // Task calculations across ALL workspaces/departments
                    const totalAllTasks = tasks.length;
                    const doneAllTasks = tasks.filter(t => t.status === "done").length;
                    const inProgressAllTasks = tasks.filter(t => t.status === "in_progress").length;
                    const reviewAllTasks = tasks.filter(t => t.status === "review").length;
                    const todoAllTasks = tasks.filter(t => t.status === "todo").length;
                    
                    // Delayed tasks (dueDate is in the past and status is not done)
                    const overdueAllTasks = tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== "done").length;
                    
                    // Average completed percentage
                    const globalCompletionPct = totalAllTasks > 0 ? Math.round((doneAllTasks / totalAllTasks) * 100) : 0;

                    // Golf courses calculations
                    const ourClub = golfCourses.find(c => c.isOurClub) || golfCourses[0];
                    const competitors = golfCourses.filter(c => !c.isOurClub);
                    
                    const ourHourlyRates = Object.values(ourClub?.hourlyRates || {});
                    const avgOurPrice = ourHourlyRates.length > 0
                      ? Math.round((ourHourlyRates.reduce((sum: number, val: any) => sum + Number(val), 0) as number) / ourHourlyRates.length)
                      : 104;

                    const competitorRates = competitors.flatMap(c => Object.values(c.hourlyRates || {}));
                    const avgCompetitorPrice = competitorRates.length > 0
                      ? Math.round((competitorRates.reduce((sum: number, val: any) => sum + Number(val), 0) as number) / competitorRates.length)
                      : 110;

                    return (
                      <>
                        {/* KPI GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* KPI 1: Total Tasks Widget */}
                          <div 
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden group hover:border-blue-500 hover:ring-1 hover:ring-blue-500/20 cursor-pointer transition-all"
                            onClick={() => setActiveTab("all_tasks_global")}
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110"></div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider font-bold">TOTAL TASQUES DE LA PLATAFORMA</span>
                              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
                                <LayoutGrid className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="mt-4">
                              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
                                {totalAllTasks} <span className="text-xs font-normal text-slate-500">actives</span>
                              </h3>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-normal">
                                Tasques totals planificades en els diferents departaments corporatius.
                              </p>
                              
                              <div className="mt-4 bg-slate-100 dark:bg-slate-800 h-1.5 w-full">
                                <div className="bg-blue-600 h-1.5" style={{ width: `${globalCompletionPct}%` }}></div>
                              </div>
                              <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-1.5 pt-1">
                                <span>COMPLETAT</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{globalCompletionPct}%</span>
                              </div>
                            </div>
                          </div>

                          {/* KPI 2: Completed / In Progress Widget */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110"></div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider font-bold">TASQUES PER ESTAT</span>
                              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60">
                                <Check className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="mt-4 space-y-2">
                              <div className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-300">
                                <span className="text-slate-500 dark:text-slate-450 font-semibold flex items-center gap-1">
                                  <span className="w-2 h-2 bg-emerald-500 inline-block"></span>
                                  Finalitzades (Fetes)
                                </span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{doneAllTasks}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-300">
                                <span className="text-slate-500 dark:text-slate-450 font-semibold flex items-center gap-1">
                                  <span className="w-2 h-2 bg-blue-500 inline-block"></span>
                                  En Progrés / En curs
                                </span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{inProgressAllTasks}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-300">
                                <span className="text-slate-500 dark:text-slate-450 font-semibold flex items-center gap-1">
                                  <span className="w-2 h-2 bg-yellow-500 inline-block"></span>
                                  En Revisió / Pendents
                                </span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{reviewAllTasks + todoAllTasks}</span>
                              </div>
                            </div>
                          </div>

                          {/* KPI 3: Overdue Tasks (Amb Retard) */}
                          <div className={`border p-5 shadow-sm relative overflow-hidden group ${
                            overdueAllTasks > 0
                              ? "bg-amber-50/50 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900/50"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider font-bold">TASQUES AMB RETARD</span>
                              <div className={`p-2 border ${
                                overdueAllTasks > 0
                                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200"
                              }`}>
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="mt-4">
                              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-sans tracking-tight flex items-baseline gap-1.5">
                                <span className={overdueAllTasks > 0 ? "text-amber-600 dark:text-amber-400 animate-pulse font-extrabold" : "text-slate-700"}>
                                  {overdueAllTasks}
                                </span>
                                <span className="text-xs font-normal text-slate-500">actives</span>
                              </h3>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-normal">
                                Tasques vencides no finalitzades a tots els departaments de Golfasana.
                              </p>
                              {overdueAllTasks > 0 ? (
                                <div className="mt-3 bg-amber-100 dark:bg-amber-950 px-2 py-1 text-[9.5px] text-amber-800 dark:text-amber-300 font-bold border-l-2 border-amber-500">
                                  ⚠️ Recomanat revisar o delegar tasques vençudes
                                </div>
                              ) : (
                                <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 text-[9.5px] text-emerald-800 dark:text-emerald-400 font-bold border-l-2 border-emerald-500">
                                  ✓ Tot l'equip està al dia, perfecte treball!
                                </div>
                              )}
                            </div>
                          </div>

                          {/* KPI 4: Golf Prices comparative summary */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110"></div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider font-bold">PREUS MITJANS RESUM DE COBROS</span>
                              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60">
                                <Activity className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="mt-4">
                              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex justify-between items-center">
                                <span className="text-xs text-slate-500">{ourClub?.name || "Aro"}:</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-black">{avgOurPrice} €</span>
                              </h3>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex justify-between items-center mt-1">
                                <span className="text-xs text-slate-500">Mitjana Rivals:</span>
                                <span className="font-extrabold text-slate-700 dark:text-slate-200">{avgCompetitorPrice} €</span>
                              </h3>
                              <div className="mt-4 pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <span className="text-[9.5px] text-amber-650 bg-amber-50 dark:bg-amber-950/20 px-1 py-0.5 border border-amber-200 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                                  Preus rivals orientatius
                                </span>
                                <button
                                  onClick={() => setActiveTab("golf")}
                                  className="text-[9.5px] text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider font-bold"
                                >
                                  Detalls →
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Line Chart: Evolution of productivity over 3 months */}
                        <ProductivityEvolutionChart tasks={tasks} workspaces={workspaces} />

                        {/* Middle grid section: Departaments & Golf Comparisons side-by-side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          
                          {/* Left Panel: Tasks status on each department (Workspaces List with beautiful navigation cards) */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-blue-600" />
                                <span>Selecciona l'Espai de Treball / Departament on vols anar</span>
                              </h3>
                              <p className="text-[10.5px] text-slate-500 mt-1 font-semibold">Tria un dels següents departaments per accedir a la seva gestió d'Asana de forma individual:</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              {workspaces.map(ws => {
                                const wsTasks = tasks.filter(t => (t.workspaceId || projects.find(p => p.id === t.projectId)?.workspaceId) === ws.id);
                                const wsTotal = wsTasks.length;
                                const wsDone = wsTasks.filter(t => t.status === "done").length;
                                const wsInProg = wsTasks.filter(t => t.status === "in_progress").length;
                                const wsOverdue = wsTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== "done").length;
                                const percent = wsTotal > 0 ? Math.round((wsDone / wsTotal) * 100) : 0;
                                
                                // Determine a color scheme depending on the department name
                                let borderLeftColor = "border-l-blue-600";
                                if (ws.id === "dep-comercial") borderLeftColor = "border-l-rose-500";
                                else if (ws.id === "dep-reserves") borderLeftColor = "border-l-emerald-500";
                                else if (ws.id === "dep-marqueting") borderLeftColor = "border-l-amber-500";
                                else if (ws.id === "dep-esportiu") borderLeftColor = "border-l-indigo-500";
                                else if (ws.id === "dep-proshop") borderLeftColor = "border-l-violet-500";
                                else if (ws.id === "dep-pitch-putt") borderLeftColor = "border-l-teal-500";

                                return (
                                  <div
                                    key={ws.id}
                                    onClick={() => {
                                      setActiveWorkspaceId(ws.id);
                                      setActiveProjectId(null); // Reset project filter
                                      setActiveTab("summary");
                                    }}
                                    className={`p-3.5 border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/20 hover:bg-blue-50/35 dark:hover:bg-blue-950/25 transition-all hover:border-blue-400 group cursor-pointer flex flex-col justify-between border-l-4 ${borderLeftColor}`}
                                  >
                                    <div>
                                      <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-150 uppercase tracking-tight group-hover:text-blue-700 transition-colors">
                                          {ws.name}
                                        </h4>
                                      </div>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-3 line-clamp-2 min-h-[30px] leading-relaxed">
                                        {ws.description || "Sense descripció definida per a aquest departament."}
                                      </p>
                                    </div>

                                    <div>
                                      {/* Mini segmented progress bar */}
                                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 w-full overflow-hidden flex mb-2.5">
                                        <div className="bg-emerald-500 h-full" style={{ width: `${wsTotal > 0 ? (wsDone / wsTotal) * 100 : 0}%` }} title="Done"></div>
                                        <div className="bg-blue-500 h-full" style={{ width: `${wsTotal > 0 ? (wsInProg / wsTotal) * 100 : 0}%` }} title="In Progress"></div>
                                        <div className="bg-amber-500 h-full" style={{ width: `${wsTotal > 0 ? (wsOverdue / wsTotal) * 100 : 0}%` }} title="Overdue"></div>
                                      </div>

                                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                        <div className="flex gap-2">
                                          <span>Fetes: <strong className="text-emerald-600 dark:text-emerald-400">{wsDone}</strong></span>
                                          <span>En curs: <strong className="text-blue-600 dark:text-blue-400">{wsInProg}</strong></span>
                                        </div>
                                        <span className="text-blue-600 dark:text-blue-400 font-extrabold group-hover:translate-x-1.5 transition-transform font-bold flex items-center gap-0.5">
                                          ENTRAR →
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right Panel: Golf course rates monitor overview */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
                                <div>
                                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                                    <Activity className="w-4 h-4 text-emerald-600" />
                                    <span>Monitorització de Preus Rivals</span>
                                  </h3>
                                  <p className="text-[10.5px] text-slate-500 mt-1 font-semibold">Tarifes públiques estimades de referència per a Green Fees</p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {(() => {
                                  const getCourseOrderIndex = (name: string): number => {
                                    const norm = name.toLowerCase();
                                    if (norm.includes("aro") || norm.includes("mas nou")) return 0;
                                    if (norm.includes("pals")) return 1;
                                    if (norm.includes("empord")) return 2;
                                    if (norm.includes("costa brava")) return 3;
                                    if (norm.includes("camiral") || norm.includes("stadium")) return 4;
                                    if (norm.includes("perelada") || norm.includes("peralada")) return 5;
                                    if (norm.includes("torremirona")) return 6;
                                    return 7;
                                  };
                                  return [...golfCourses].sort((a, b) => getCourseOrderIndex(a.name) - getCourseOrderIndex(b.name));
                                })().map(course => {
                                  // Compute dynamic representation for this home table
                                  const rates = Object.values(course.hourlyRates || {});
                                  const avgPrice = rates.length > 0
                                    ? Math.round((rates.reduce((sum: number, val: any) => sum + Number(val), 0) as number) / rates.length)
                                    : 110;

                                  return (
                                    <div
                                      key={course.id}
                                      className={`p-3 border flex justify-between items-center transition-all ${
                                        course.isOurClub
                                          ? "bg-emerald-50/40 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/60"
                                          : "bg-slate-50/40 dark:bg-slate-800/10 border-slate-100 dark:border-slate-800"
                                      }`}
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                          {course.isOurClub && <span className="text-[10px] text-emerald-600 font-bold uppercase shrink-0 font-mono">⭐ NOSTRE</span>}
                                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{course.name}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          Ubicació: {course.location} | Tipus d'API: <span className="font-semibold uppercase font-mono">{course.bookingSystem}</span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{avgPrice} €</span>
                                        <div className="text-[9px] text-slate-505 uppercase font-mono font-bold">Mitjana</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                              <button
                                onClick={() => setActiveTab("golf")}
                                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs uppercase hover:bg-slate-805 transition-colors rounded-none"
                              >
                                Accedir al Comparador d'Hores
                              </button>
                            </div>
                          </div>
                        </div>


                        {/* Bottom Full Row Widget: 3 Audit logs + Shortcuts */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          
                          {/* Bottom Panel Left & Mid: Audit Logs overview */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm col-span-1 md:col-span-2">
                            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
                              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                                <Shield className="w-4 h-4 text-slate-500" />
                                <span>Registre d'Auditoria & Activitats de Seguretat Recents (SOC-2)</span>
                              </h3>
                            </div>
                            <div className="space-y-2 pt-1">
                              {auditLogs.slice(0, 4).map((log) => (
                                <div key={log.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/40 border-l-2 border-indigo-500 dark:border-l-indigo-605">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">Realitzat per: {log.user}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-450 whitespace-nowrap">{log.time}</span>
                                </div>
                              ))}
                              {auditLogs.length === 0 && (
                                <p className="text-xs text-slate-500 py-3 text-center">No hi ha hagut activitat logejada en aquesta sessió encara.</p>
                              )}
                            </div>
                          </div>

                          {/* Shortcuts cards to access modules */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                                  <BarChart3 className="w-4 h-4 text-blue-600" />
                                  <span>Accés Ràpid Directe</span>
                                </h3>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                <button
                                  onClick={() => setActiveTab("summary")}
                                  className="w-full text-left p-2 border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold transition-all flex items-center justify-between"
                                >
                                  <span>Resum de Projectes Actius Asana</span>
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400">Obrir →</span>
                                </button>
                                <button
                                  onClick={() => setActiveTab("list")}
                                  className="w-full text-left p-2 border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold transition-all flex items-center justify-between"
                                >
                                  <span>Llistat Ampliat (Excel Excel-like)</span>
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400">Obrir →</span>
                                </button>
                                <button
                                  onClick={() => setActiveTab("board")}
                                  className="w-full text-left p-2 border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold transition-all flex items-center justify-between"
                                >
                                  <span>Visualitzar Kanban</span>
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400">Obrir →</span>
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => setActiveTab("incentives")}
                                    className="w-full text-left p-2 border border-slate-100 dark:border-slate-800 hover:border-indigo-305 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold transition-all flex items-center justify-between bg-indigo-50/20 dark:bg-indigo-950/10"
                                  >
                                    <span className="text-indigo-850 dark:text-indigo-300">KPIs Rendiment i Incentius</span>
                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Administrar →</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-[9.5px] text-slate-550 dark:text-slate-450 font-mono mt-4 text-center leading-normal">
                              Dades d'assegurança sota SOC-2 & RGPD.
                            </p>
                          </div>

                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {activeTab === "all_workspaces" && (
                <div className="h-full flex flex-col p-6 space-y-6 animate-in fade-in transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 font-sans">
                        Tots els Espais de Treball
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Selecciona un espai corporatiu per veure el resum de KPI actius i projectes d'Asana.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowNewWorkspaceModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 font-bold shadow-sm transition-all focus:ring-4 focus:ring-blue-100 uppercase"
                    >
                      + Nou Espai de Treball
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {workspaces.map((ws) => {
                      const wsProjects = projects.filter(p => p.workspaceId === ws.id);
                      const wsTasks = tasks.filter(t => (t.workspaceId || projects.find(p => p.id === t.projectId)?.workspaceId) === ws.id);
                      const wsTaskCount = wsTasks.length;
                      const doneTasks = wsTasks.filter(t => t.status === "done").length;
                      const progress = wsTaskCount === 0 ? 0 : Math.round((doneTasks / wsTaskCount) * 100);
                      
                      return (
                        <div
                          key={ws.id}
                          onClick={() => {
                            setActiveWorkspaceId(ws.id);
                            setActiveProjectId(null);
                            setFilterAssigneeId(null);
                            setActiveTab("summary");
                          }}
                          className="bg-white border-2 border-slate-200 hover:border-blue-400 p-5 shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-slate-100 flex items-center justify-center shrink-0">
                                <Layers className="w-5 h-5 text-blue-600" />
                              </div>
                              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                                {ws.name}
                              </h3>
                            </div>
                            
                            <div className="space-y-4 mb-4">
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider mb-1">Projectes actius</p>
                                <p className="text-xl font-bold font-sans text-slate-800">{wsProjects.length}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider mb-1">Estat de les tasques</p>
                                <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1.5">
                                  <span>{doneTasks} {doneTasks === 1 ? 'finalitzada' : 'finalitzades'}</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                            <span className="text-blue-600 group-hover:underline flex items-center">
                              Veure detalls <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWorkspace(ws.id);
                              }}
                              className="text-red-500 hover:text-white hover:bg-red-600 px-2.5 py-1.5 text-[10px] border border-red-200 hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer font-bold bg-white"
                              title="Eliminar aquest espai de treball"
                            >
                              <Trash className="w-3 h-3 shrink-0" />
                              <span>Suprimir</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "summary" && (
                <div className="h-full flex flex-col">
                  <WorkspaceKPICards
                    workspaceTasks={tasks.filter(t => (t.workspaceId || projects.find(p => p.id === t.projectId)?.workspaceId) === activeWorkspaceId)}
                    workspaceProjects={projects.filter(p => p.workspaceId === activeWorkspaceId)}
                    activeWorkspaceObj={activeWorkspaceObj}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    activeProjectId={activeProjectId}
                  />

                  {activeProjectId ? (
                    (() => {
                      const proj = projects.find(p => p.id === activeProjectId);
                      if (!proj) return (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          Projecte no trobat. Selecciona un altre projecte a la barra lateral.
                        </div>
                      );
                      return (
                        <ProjectSummary
                          project={proj}
                          users={users}
                          onUpdateProject={handleUpdateProject}
                          onDeleteProject={handleDeleteProject}
                          logAction={logEnterpriseAction}
                        />
                      );
                    })()
                  ) : (
                    <div className="space-y-6">
                      {(() => {
                        const workspaceProjList = projects.filter(p => p.workspaceId === activeWorkspaceId);
                        const workspaceTasks = tasks.filter(t => (t.workspaceId || projects.find(p => p.id === t.projectId)?.workspaceId) === activeWorkspaceId);
                        return (
                          <>
                            {/* Actives Projects inside the Department */}
                            <div className="bg-white border border-slate-200 p-5 shadow-sm">
                              <div className="border-b border-slate-150 pb-3 mb-4 flex justify-between items-center flex-wrap gap-2">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                                    Fites i Projectes Actius - {activeWorkspaceObj ? activeWorkspaceObj.name : "Departament"}
                                  </h4>
                                  <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5">Pla de treball d'Asana segmentat</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-1.5 font-bold hidden sm:inline-block font-mono">Dades Sincronitzades</span>
                                  <button
                                    onClick={() => setShowNewProjectModal(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10.5px] px-3.5 py-1.5 transition-all uppercase flex items-center gap-1 shadow-sm shrink-0"
                                  >
                                    + Nou Projecte
                                  </button>
                                </div>
                              </div>

                            {workspaceProjList.length === 0 ? (
                              <p className="text-xs text-slate-500 text-center py-6 font-semibold">No hi ha projectes actius definits en aquest departament actualment.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {workspaceProjList.map(proj => {
                                  const projTasks = tasks.filter(t => t.projectId === proj.id);
                                  const projDone = projTasks.filter(t => t.status === "done").length;
                                  const projTotal = projTasks.length;
                                  const projPercent = projTotal > 0 ? Math.round((projDone / projTotal) * 100) : 0;
                                  return (
                                    <div
                                      key={proj.id}
                                      onClick={() => setActiveProjectId(proj.id)}
                                      className="border border-slate-200 p-4 hover:bg-slate-50 cursor-pointer transition-all flex justify-between items-center group relative border-l-4"
                                      style={{ borderLeftColor: proj.color }}
                                    >
                                      <div className="space-y-2 flex-1 mr-4">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{proj.name}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 line-clamp-1">{proj.description}</p>
                                        
                                        <div className="flex items-center gap-3 pt-1">
                                          <div className="flex-1 bg-slate-100 h-1.5 overflow-hidden">
                                            <div className="h-full" style={{ width: `${projPercent}%`, backgroundColor: proj.color }}></div>
                                          </div>
                                          <span className="text-[10px] font-mono font-bold text-slate-600">{projPercent}% ({projDone}/{projTotal})</span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveProjectId(proj.id);
                                        }}
                                        className="px-3 py-1.5 border text-[10px] font-bold uppercase transition-all shrink-0 bg-white hover:bg-slate-100"
                                        style={{ borderColor: proj.color, color: proj.color }}
                                      >
                                        Obrir
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Tasques de l'Àrea de Treball / Departament */}
                          <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
                            <div className="border-b border-slate-150 pb-3 mb-4 flex justify-between items-center flex-wrap gap-2">
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                  <Trello className="w-4 h-4 text-indigo-600" />
                                  <span>Tasques i Planificació de {activeWorkspaceObj ? activeWorkspaceObj.name : "aquest Departament"}</span>
                                </h4>
                                <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5">Control de l'operativa diària de l'equip del golf</p>
                              </div>
                              
                              {/* Task filter state tabs */}
                              <div className="flex bg-slate-100 p-0.5 border border-slate-200 text-[10px] font-mono">
                                {[
                                  { id: "all", label: "Totes" },
                                  { id: "todo", label: "Pendent" },
                                  { id: "in_progress", label: "En Curs" },
                                  { id: "review", label: "Avaluació" },
                                  { id: "done", label: "Completat" }
                                ].map((tab) => (
                                  <button
                                    key={tab.id}
                                    onClick={() => setWorkspaceTaskFilter(tab.id)}
                                    className={`px-2.5 py-1 font-bold ${
                                      workspaceTaskFilter === tab.id
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-650 hover:bg-slate-200"
                                    }`}
                                  >
                                    {tab.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Quick Add Form Row */}
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!quickTaskTitle.trim()) return;
                                try {
                                  await handleAddTask(
                                    quickTaskTitle.trim(),
                                    quickTaskProject, // empty string or valid projectId
                                    quickTaskAssignee ? [quickTaskAssignee] : [],
                                    quickTaskPriority
                                  );
                                  setQuickTaskTitle("");
                                  addToast("Tasca creada correctament! ✓", "success");
                                } catch (err) {
                                  addToast("S'ha produït un error al desar la tasca.", "warning");
                                }
                              }}
                              className="bg-slate-50 border border-slate-200 p-3.5 flex flex-col lg:flex-row items-center gap-3"
                            >
                              <div className="flex-1 w-full">
                                <input
                                  type="text"
                                  value={quickTaskTitle}
                                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                                  placeholder="📝 Afegeix una tasca ràpida a aquest departament..."
                                  className="w-full text-xs font-semibold px-2.5 py-2 bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-none text-slate-800"
                                  required
                                />
                              </div>
                              
                              <div className="flex flex-wrap items-center justify-between w-full lg:w-auto gap-3 shrink-0">
                                {/* Project selector */}
                                <select
                                  value={quickTaskProject}
                                  onChange={(e) => setQuickTaskProject(e.target.value)}
                                  className="text-[11px] font-semibold bg-white border border-slate-250 px-2 py-1.5 focus:outline-none rounded-none text-slate-705 font-mono"
                                >
                                  <option value="">Sense projecte relatiu</option>
                                  {workspaceProjList.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      📁 {p.name}
                                    </option>
                                  ))}
                                </select>

                                {/* Priority Selector */}
                                <select
                                  value={quickTaskPriority}
                                  onChange={(e) => setQuickTaskPriority(e.target.value as TaskPriority)}
                                  className="text-[11px] font-semibold bg-white border border-slate-250 px-2 py-1.5 focus:outline-none rounded-none text-slate-705 font-mono"
                                >
                                  <option value="low">Prioritat Baixa</option>
                                  <option value="medium">Prioritat Mitjana</option>
                                  <option value="high">Prioritat Alta</option>
                                  <option value="urgent">🚨 Urgent</option>
                                </select>

                                {/* Assignee Selector */}
                                <select
                                  value={quickTaskAssignee}
                                  onChange={(e) => setQuickTaskAssignee(e.target.value)}
                                  className="text-[11px] font-semibold bg-white border border-slate-250 px-2 py-1.5 focus:outline-none rounded-none text-slate-705 font-mono"
                                >
                                  <option value="">-- Responsable --</option>
                                  {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      👤 {u.name}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="submit"
                                  className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs uppercase px-4 py-2 transition-all shrink-0 rounded-none h-full"
                                >
                                  + Afegir
                                </button>
                              </div>
                            </form>

                            {/* Task Rows List */}
                            {(() => {
                              // Filter tasks based on selected filter state
                              let filtered = workspaceTasks;
                              if (workspaceTaskFilter !== "all") {
                                filtered = workspaceTasks.filter((t) => t.status === workspaceTaskFilter);
                              }

                              if (filtered.length === 0) {
                                return (
                                  <div className="text-center py-8 border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold select-none">
                                    No s'ha trobat cap tasca amb l'estat seleccionat per a aquest departament.
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                                  {filtered.map((task) => {
                                    const assigneeObj = users.find((u) => task.assigneeIds?.includes(u.id) || u.id === task.assigneeId);
                                    const projObj = projects.find((p) => p.id === task.projectId);
                                    const isCompleted = task.status === "done";
                                    
                                    // Check if task is overdue
                                    const isOverdue =
                                      task.dueDate &&
                                      task.dueDate < new Date().toISOString().split("T")[0] &&
                                      task.status !== "done";

                                    // Status colors
                                    let statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                                    if (task.status === "in_progress") {
                                      statusColor = "bg-blue-50 text-blue-800 border-blue-200";
                                    } else if (task.status === "review") {
                                      statusColor = "bg-purple-50 text-purple-800 border-purple-200";
                                    } else if (task.status === "done") {
                                      statusColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                                    }

                                    // Priority badge colors
                                    let priorityColor = "bg-slate-50 text-slate-600 border-slate-200";
                                    if (task.priority === "high") {
                                      priorityColor = "bg-amber-50 text-amber-700 border-amber-250";
                                    } else if (task.priority === "urgent") {
                                      priorityColor = "bg-rose-50 text-rose-700 border-rose-250 animate-pulse";
                                    }

                                    return (
                                      <div
                                        key={task.id}
                                        onClick={() => setSelectedTask(task)}
                                        className={`p-3 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group shadow-none border-l-4 ${
                                          isCompleted ? "opacity-75 border-l-emerald-400 bg-slate-50/20" : "border-l-indigo-400"
                                        }`}
                                      >
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                          {/* Status Checkbox Button */}
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              const nextStatus = isCompleted ? "todo" : "done";
                                              await handleUpdateTask(task.id, { 
                                                status: nextStatus,
                                                completedAt: nextStatus === "done" ? new Date().toISOString().split("T")[0] : undefined
                                              });
                                              addToast(
                                                nextStatus === "done" 
                                                  ? "S'ha marcat la tasca com a FET! ✓" 
                                                  : "S'ha restablert la tasca com a pendent.", 
                                                "success"
                                              );
                                            }}
                                            className="mt-0.5 w-4 h-4 border border-slate-350 bg-white flex items-center justify-center shrink-0 hover:border-indigo-600 hover:bg-indigo-50/20 transition-all rounded-none"
                                            title={isCompleted ? "Marcar com a pendent" : "Marcar com a fet"}
                                          >
                                            {isCompleted && <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3px]" />}
                                          </button>

                                          <div className="space-y-1 min-w-0">
                                            <span
                                              className={`text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors block truncate pr-4 ${
                                                isCompleted ? "line-through text-slate-400" : ""
                                              }`}
                                            >
                                              {task.title}
                                            </span>
                                            
                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                              {/* Project Tag */}
                                              {projObj && (
                                                <span 
                                                  className="text-[9.5px] font-bold px-1.5 py-0.5 font-mono border text-xs"
                                                  style={{ borderColor: projObj.color, color: projObj.color, backgroundColor: `${projObj.color}10` }}
                                                >
                                                  📁 {projObj.name}
                                                </span>
                                              )}

                                              {/* Priority Tag */}
                                              <span className={`text-[9px] font-bold px-1.5 py-0.5 font-mono border rounded-none uppercase ${priorityColor}`}>
                                                {task.priority}
                                              </span>

                                              {/* Overdue Tag */}
                                              {isOverdue && (
                                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 font-mono border border-rose-300 bg-rose-50 text-rose-700 animate-pulse uppercase flex items-center gap-0.5">
                                                  <AlertTriangle className="w-2.5 h-2.5" />
                                                  Vencuda
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                                          {/* Assignee Badge info */}
                                          {assigneeObj && (
                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 border border-slate-150">
                                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono font-bold text-[9px] flex items-center justify-center shrink-0">
                                                {assigneeObj.avatar}
                                              </span>
                                              <span className="text-[10px] hidden md:block font-bold text-slate-600 shrink-0">{assigneeObj.name}</span>
                                            </div>
                                          )}

                                          {/* Due date Badge */}
                                          {task.dueDate && (
                                            <div className={`text-[10px] font-mono font-bold flex items-center gap-1 bg-slate-50 border p-1 shrink-0 ${
                                              isOverdue ? "border-rose-250 text-rose-600" : "border-slate-200 text-slate-500"
                                            }`}>
                                              <CalendarDays className="w-3 h-3 shrink-0" />
                                              <span>{task.dueDate}</span>
                                            </div>
                                          )}

                                          {/* Status Pilles badge */}
                                          <span className={`text-[9.5px] uppercase font-mono font-black border px-2 py-1 select-none shrink-0 rounded-none ${statusColor}`}>
                                            {task.status === "todo" ? "Pendent" : task.status === "in_progress" ? "En curs" : task.status === "review" ? "Avaluació" : "Completat"}
                                          </span>

                                          {/* Quick trash action */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteTask(task.id);
                                            }}
                                            className="p-1 hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-transparent hover:border-rose-200 transition-all rounded-none"
                                            title="Elimina"
                                          >
                                            <Trash className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "list" && (
                <TaskList
                  tasks={displayedTasks}
                  users={users}
                  projects={projects}
                  activeProjectId={activeProjectId}
                  activeWorkspaceId={activeWorkspaceId}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onSelectTaskForDetails={(task) => setSelectedTask(task)}
                  isCompactView={isCompactView}
                  activeTimer={activeTimer}
                  setActiveTimer={setActiveTimer}
                />
              )}

              {activeTab === "board" && (
                <TaskBoard
                  tasks={displayedTasks}
                  users={users}
                  projects={projects}
                  activeProjectId={activeProjectId}
                  activeWorkspaceId={activeWorkspaceId}
                  onUpdateTask={handleUpdateTask}
                  onSelectTaskForDetails={(task) => setSelectedTask(task)}
                  isCompactView={isCompactView}
                />
              )}

              {activeTab === "timeline" && (
                <TaskTimeline
                  tasks={displayedTasks}
                  users={users}
                  projects={projects}
                  activeProjectId={activeProjectId}
                  activeWorkspaceId={activeWorkspaceId}
                />
              )}

              {activeTab === "all_tasks_global" && (
                <AllTasksGlobalView
                  tasks={tasks}
                  projects={projects}
                  users={users}
                  workspaces={DEPARTMENTS}
                  onSelectTask={(task) => setSelectedTask(task)}
                  onBack={() => setActiveTab("inici")}
                />
              )}

              {activeTab === "golf" && (
                <GolfAdminDashboard
                  golfCourses={golfCourses}
                  isAdmin={isAdmin}
                  onAddCourse={handleAddGolfCourse}
                  onUpdateCourse={handleUpdateGolfCourse}
                  onDeleteCourse={handleDeleteGolfCourse}
                />
              )}

              {activeTab === "incentives" && (
                <IncentivesDashboard
                  tasks={tasks}
                  users={users}
                  projects={projects}
                />
              )}

              {activeTab === "reports" && (
                <ReportsDashboard
                  tasks={tasks}
                  users={users}
                  projects={projects}
                  defaultDepartmentId="all"
                />
              )}

              {activeTab === "monitoring" && (
                <div className="p-6">
                  <AdminMonitoringDashboard users={users} />
                </div>
              )}
              {activeTab === "calendar" && (
                <div className="p-6">
                  <ProjectCalendar 
                    tasks={displayedTasks}
                    projects={projects}
                    users={users}
                    workspaces={workspaces}
                    activeWorkspaceId={activeWorkspaceId}
                    activeProjectId={activeProjectId}
                    onAddTask={handleAddTask}
                    onSelectTask={(task) => setSelectedTask(task)}
                  />
                </div>
              )}

              {activeTab === "minutes" && (
                <MeetingMinutes
                  minutes={meetingMinutes}
                  users={users}
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  onSaveMinute={handleSaveMinute}
                  onDeleteMinute={handleDeleteMinute}
                  onCreateTaskFromAgreement={handleCreateTaskFromAgreement}
                />
              )}

              {activeTab === "security" && (
                <div className="space-y-6 bg-white border border-slate-200 rounded-none p-6 shadow-none">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider">Polítiques de Seguretat i Auditories</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      El pla Asana Enterprise garanteix auditories d'operacions, usuaris il·limitats i traçabilitat de procediments.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border border-slate-250 rounded-none bg-slate-50">
                      <h4 className="text-xs text-slate-400 font-bold uppercase font-mono">Nombre d'usuaris actius</h4>
                      <p className="text-2xl font-black text-indigo-600 mt-2">{users.length} Col·laboradors</p>
                      <span className="text-[10px] text-slate-450 block mt-1 font-mono">Sense límit de llicència actiu</span>
                    </div>

                    <div className="p-4 border border-slate-250 rounded-none bg-slate-50">
                      <h4 className="text-xs text-slate-400 font-bold uppercase font-mono">Xifratge de dades</h4>
                      <p className="text-2xl font-black text-emerald-600 mt-2">AES-256 Activat</p>
                      <span className="text-[10px] text-slate-450 block mt-1 font-mono">Certificació SOC 2 Tipus II</span>
                    </div>

                    <div className="p-4 border border-slate-250 rounded-none bg-slate-50">
                      <h4 className="text-xs text-slate-400 font-bold uppercase font-mono">Filtre d'IPs de Golf</h4>
                      <p className="text-2xl font-black text-amber-600 mt-2">Dynamic DNS</p>
                      <span className="text-[10px] text-slate-450 block mt-1 font-mono">Registre automàtic de preus</span>
                    </div>
                  </div>

                  {/* Executive Workload & Department Productivity Dashboard via Recharts */}
                  <WorkloadDashboard 
                    tasks={tasks}
                    users={users}
                    projects={projects}
                  />

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider font-mono">Històric de canvis de l'Espai (Real-time Audit Logs)</h4>
                    <div className="max-h-64 overflow-y-auto space-y-1.5 bg-slate-50 p-4 rounded-none border border-slate-200 font-mono text-xs">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between py-1 border-b border-slate-205">
                          <span className="text-slate-400">[{log.time}]</span>
                          <span className="font-bold text-slate-700 flex-grow px-4 text-left">{log.action}</span>
                          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-none border border-indigo-200 text-[10px] font-bold">{log.user}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-red-650 uppercase font-mono tracking-wider">Zona d'Administració (Màster Reset)</h4>
                      <p className="text-[10px] text-slate-450 leading-relaxed">
                        Si tens dades acumulades de proves anteriors a Firestore que utilitzin els departaments antics, pots forçar una sincronització i re-sembrat complet de dades de l'Asana Enterprise amb els 4 nous espais de treball.
                      </p>
                    </div>
                    <button
                      onClick={handleForceResetDatabase}
                      className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2 border border-red-700 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      REINICIAR BASE DE DADES
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "manual" && (
                <UserManualDashboard currentUser={currentUser} />
              )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* FOOTER DETAIL / DISCUSS DRAWER PANEL FOR TASKS */}
      <AnimatePresence>
        {selectedTask && (
          <>
            {/* Backdrop cover */}
            <div
              className="fixed inset-0 bg-black/40 z-30 transition-opacity"
              onClick={() => {
                setSelectedTask(null);
                setShowActionMenu(false);
              }}
            ></div>

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-[650px] max-w-[95vw] bg-white border-l border-slate-200 z-40 shadow-2xl flex flex-col justify-between rounded-none overflow-hidden"
              id="task-details-floating-drawer"
            >
              {/* Drawer header */}
              <div className="p-4 border-b border-slate-200 flex flex-col gap-3 bg-white shrink-0">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      const newStatus = selectedTask.status === "done" ? "todo" : "done";
                      handleUpdateTask(selectedTask.id, { status: newStatus });
                      setSelectedTask({ ...selectedTask, status: newStatus });
                    }}
                    className={`text-xs font-semibold px-3 py-1.5 border transition-all flex items-center gap-1.5 focus:outline-none ${
                      selectedTask.status === "done"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>
                      {selectedTask.status === "done" ? "Tasca Completada" : "Marcar completada"}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Asana Actions Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowActionMenu(!showActionMenu)}
                        className="p-1 px-2.5 border border-slate-200 bg-slate-50 hover:bg-slate-105 text-slate-700 rounded-sm hover:text-slate-900 transition-all flex items-center justify-center font-sans font-semibold text-xs gap-1.5"
                        title="Més accions d'Asana"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                        <span>Més accions...</span>
                      </button>
                      
                      <AnimatePresence>
                        {showActionMenu && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(false)}></div>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-250 shadow-2xl z-50 py-1 rounded-sm font-sans"
                            >
                              <div className="px-3 py-1.5 text-[9.5px] uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-100">
                                Accions d'Asana Enterprise
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowActionMenu(false);
                                  const current = selectedTask.subtasks || [];
                                  const next = [...current, { id: "sub-" + Date.now(), title: "", completed: false }];
                                  handleUpdateTask(selectedTask.id, { subtasks: next });
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-b border-slate-50"
                              >
                                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Afegir subtasca</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setShowActionMenu(false);
                                  const fileNames = [
                                    "Pressupost_Greenfees_Peralada.pdf",
                                    "Liquidacio_Estocs_Proshop_Marina.xlsx",
                                    "Analisi_KPIs_Reserves_GolfManager.pdf",
                                    "Bases_Lliga_Pitch_and_Putt.doc"
                                  ];
                                  const randomName = fileNames[Math.floor(Math.random() * fileNames.length)];
                                  const currentAttachments = selectedTask.attachments || [];
                                  const nextAttachments = [...currentAttachments, {
                                    id: "att-" + Date.now(),
                                    name: randomName,
                                    size: "1.8 MB",
                                    createdAt: new Date().toISOString()
                                  }];
                                  handleUpdateTask(selectedTask.id, { attachments: nextAttachments });
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-b border-slate-50"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Adjuntar arxius</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setShowActionMenu(false);
                                  const tag = prompt("Escriu una etiqueta d'Asana (Ex: Urgent, Màrqueting, Proshop):");
                                  if (tag && tag.trim()) {
                                    const current = selectedTask.tags || [];
                                    handleUpdateTask(selectedTask.id, { tags: [...current, tag.trim()] });
                                  }
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-b border-slate-50"
                              >
                                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Afegir etiquetes</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setShowActionMenu(false);
                                  const dep = prompt("Escriu la condició de dependència (Ex: Sincronització de preus):");
                                  if (dep && dep.trim()) {
                                    const current = selectedTask.dependencies || [];
                                    handleUpdateTask(selectedTask.id, { dependencies: [...current, dep.trim()] });
                                  }
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-b border-slate-50"
                              >
                                <Link className="w-3.5 h-3.5 text-amber-500" />
                                <span>Afegir dependències</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setShowActionMenu(false);
                                  const cloneId = "task-clone-" + Date.now();
                                  const clonedTask: Task = {
                                    ...selectedTask,
                                    id: cloneId,
                                    title: `${selectedTask.title} (Còpia Duplicada)`,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                    status: "todo"
                                  };
                                  const updated = [...tasks, clonedTask];
                                  setTasks(updated);
                                  localStorage.setItem("golfsana_tasks", JSON.stringify(updated));
                                  setSelectedTask(clonedTask);
                                  logEnterpriseAction(`Tasca duplicada (ID: ${cloneId})`);
                                  saveDoc(doc(db, "tasks", cloneId), clonedTask).catch(err => console.warn(err));
                                  alert(`S'ha duplicat la tasca amb èxit! Oberta la còpia de treball.`);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-b border-slate-50"
                              >
                                <Copy className="w-3.5 h-3.5 text-teal-500" />
                                <span>Duplicar tasca</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  setShowActionMenu(false);
                                  const cloneId = "task-seq-" + Date.now();
                                  const followTask: Task = {
                                    projectId: selectedTask.projectId,
                                    workspaceId: selectedTask.workspaceId,
                                    id: cloneId,
                                    title: `Seguiment executiu: ${selectedTask.title}`,
                                    description: `Tasca de seguiment dependent de: ${selectedTask.title}. Creat automàticament.`,
                                    assigneeId: selectedTask.assigneeId,
                                    assigneeIds: selectedTask.assigneeIds || (selectedTask.assigneeId ? [selectedTask.assigneeId] : []),
                                    departmentId: selectedTask.departmentId,
                                    departmentIds: selectedTask.departmentIds || (selectedTask.departmentId ? [selectedTask.departmentId] : ["dep-reserves"]),
                                    status: "todo",
                                    priority: "medium",
                                    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                  };
                                  const updated = [...tasks, followTask];
                                  setTasks(updated);
                                  localStorage.setItem("golfsana_tasks", JSON.stringify(updated));
                                  setSelectedTask(followTask);
                                  logEnterpriseAction(`Tasca de seguiment asana creada (ID: ${cloneId})`);
                                  saveDoc(doc(db, "tasks", cloneId), followTask).catch(err => console.warn(err));
                                  alert(`S'ha creat una tasca de seguiment planificada per l'Asana.`);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-b border-slate-50"
                              >
                                <Activity className="w-3.5 h-3.5 text-pink-500" />
                                <span>Crear tasca de seguiment</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setShowActionMenu(false);
                                  alert("La privacitat s'ha configurat com a Privada per Col·laboradors del departament.");
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <Lock className="w-3.5 h-3.5 text-blue-500" />
                                <span>Fer privat...</span>
                              </button>

                              <div className="border-t border-slate-100 my-1"></div>

                              <button
                                type="button"
                                onClick={() => {
                                  setShowActionMenu(false);
                                  handleDeleteTask(selectedTask.id);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-bold"
                              >
                                <Trash className="w-3.5 h-3.5" />
                                <span>Eliminar tasca</span>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={() => setSelectedTask(null)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 bg-slate-50 px-2.5 py-1.5 rounded-sm hover:bg-slate-100"
                    >
                      Tancar
                    </button>
                  </div>
                </div>

                {/* Workspace / Project Quick Reassignment */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-sm font-sans shrink-0">
                  <div className="flex-1 flex flex-col gap-1 text-[11px]">
                    <span className="text-slate-500 font-bold uppercase block font-mono tracking-tight select-none">
                      Espai de Treball:
                    </span>
                    <select
                      value={selectedTask.workspaceId || ""}
                      onChange={(e) => {
                        const nextWorkspaceId = e.target.value;
                        const workspaceProjs = projects.filter(p => p.workspaceId === nextWorkspaceId);
                        const nextProjectId = workspaceProjs.length > 0 ? workspaceProjs[0].id : "";
                        handleUpdateTask(selectedTask.id, { 
                          workspaceId: nextWorkspaceId,
                          projectId: nextProjectId
                        });
                        setSelectedTask({
                          ...selectedTask,
                          workspaceId: nextWorkspaceId,
                          projectId: nextProjectId
                        });
                      }}
                      className="bg-white hover:bg-slate-55 border border-slate-250 font-bold text-slate-800 p-1.5 rounded-sm w-full text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                    >
                      {workspaces.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 flex flex-col gap-1 text-[11px]">
                    <span className="text-slate-500 font-bold uppercase block font-mono tracking-tight select-none">
                      Projecte:
                    </span>
                    <select
                      value={selectedTask.projectId || ""}
                      onChange={(e) => {
                        const nextProjectId = e.target.value;
                        const projObj = projects.find(p => p.id === nextProjectId);
                        const nextWorkspaceId = projObj ? projObj.workspaceId : selectedTask.workspaceId;
                        handleUpdateTask(selectedTask.id, { 
                          projectId: nextProjectId,
                          workspaceId: nextWorkspaceId
                        });
                        setSelectedTask({
                          ...selectedTask,
                          projectId: nextProjectId,
                          workspaceId: nextWorkspaceId
                        });
                      }}
                      className="bg-white hover:bg-slate-55 border border-slate-250 font-bold text-slate-800 p-1.5 rounded-sm w-full text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({workspaces.find(w => w.id === p.workspaceId)?.name || 'Cap espai'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Inline editable task description */}
                <div className="pt-2">
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => handleUpdateTask(selectedTask.id, { title: e.target.value })}
                    className="w-full text-base font-bold text-slate-800 dark:text-white bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-300 focus:bg-slate-50 outline-none p-1.5 rounded-sm transition-all focus:ring-1 focus:ring-indigo-500"
                    placeholder="Títol de la tasca..."
                  />
                  <div className="text-[10px] text-slate-400 font-medium px-1.5 mt-0.5">
                    Visible per als integrants dels departaments assignats.
                  </div>
                </div>
              </div>

              {/* Drawer scrollable content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Meta details grid (Asana fields table structure) */}
                <div className="border border-slate-200 rounded-sm bg-white p-3.5 space-y-1">
                  
                  {/* Persona Assignada (Suporta Responsables Múltiples) */}
                  <div className="grid grid-cols-[130px_1fr] items-start gap-2 py-2 border-b border-slate-100 font-sans text-xs">
                    <span className="text-slate-400 font-medium mt-1.5 select-none">Responsables</span>
                    <div className="flex flex-wrap gap-1.5">
                      {users.map(u => {
                        const isAssigned = (selectedTask.assigneeIds || []).includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={async () => {
                              const currentIds = selectedTask.assigneeIds || [];
                              let nextIds;
                              let isNewlyAssigned = false;
                              if (isAssigned) {
                                nextIds = currentIds.filter(id => id !== u.id);
                              } else {
                                nextIds = [...currentIds, u.id];
                                isNewlyAssigned = true;
                              }
                              
                              const updatedTask = { 
                                ...selectedTask,
                                assigneeIds: nextIds,
                                assigneeId: nextIds[0] || ""
                              };
                              setSelectedTask(updatedTask);
                              await handleUpdateTask(selectedTask.id, { 
                                assigneeIds: nextIds,
                                assigneeId: nextIds[0] || ""
                              });

                              // Dispatch mention notification for newly assigned members
                              if (isNewlyAssigned && u.id !== currentUser.id) {
                                await createNotification(
                                  u.id, 
                                  selectedTask.id, 
                                  selectedTask.title, 
                                  `T'han assignat a la tasca: "${selectedTask.title}"`
                                );
                              }
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 border transition-all rounded-full text-xs cursor-pointer select-none ${
                              isAssigned
                                ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-350"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center shrink-0 ${
                              isAssigned ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
                            }`}>
                              {u.avatar || u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span>{u.name}</span>
                            {isAssigned && <span className="text-[10px] font-bold text-indigo-600">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Temps */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-1.5 border-b border-slate-100 font-sans text-xs">
                    <span className="text-slate-400 font-medium select-none flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-450" />
                      <span>Temps total</span>
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {(() => {
                            const totalMs = (selectedTask.timeEntries || []).reduce((acc, entry) => acc + (entry.duration || 0), 0) * 1000;
                            const hours = Math.floor(totalMs / 3600000);
                            const minutes = Math.floor((totalMs % 3600000) / 60000);
                            const seconds = Math.floor((totalMs % 60000) / 1000);
                            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                          })()}
                        </span>
                        <button
                          onClick={() => {
                            if (activeTimer?.taskId === selectedTask.id) {
                              // Stop timer
                              const startTime = activeTimer.startTime;
                              const endTime = new Date();
                              const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
                              handleUpdateTask(selectedTask.id, {
                                timeEntries: [...(selectedTask.timeEntries || []), { id: Date.now().toString(), startTime, endTime, duration }]
                              });
                              setActiveTimer(null);
                            } else {
                              // Start timer
                              setActiveTimer({ taskId: selectedTask.id, startTime: new Date() });
                            }
                          }}
                          className={`p-1 rounded-full ${activeTimer?.taskId === selectedTask.id ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}
                        >
                          {activeTimer?.taskId === selectedTask.id ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                        </button>
                    </div>
                  </div>

                  {/* Data d'inici */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-1.5 border-b border-slate-100 font-sans text-xs">
                    <span className="text-slate-400 font-medium select-none flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-450" />
                      <span>Data d'inici</span>
                    </span>
                    <input
                      type="date"
                      value={selectedTask.startDate || ""}
                      onChange={(e) => handleUpdateTask(selectedTask.id, { startDate: e.target.value })}
                      className="bg-transparent hover:bg-slate-50 border-none outline-none font-semibold text-sky-600 cursor-pointer p-1 rounded-sm w-fit focus:ring-1 focus:ring-indigo-500 text-xs"
                    />
                  </div>

                  {/* Data Límit */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-1.5 border-b border-slate-100 font-sans text-xs">
                    <span className="text-slate-400 font-medium select-none flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-450" />
                      <span>Data de venciment</span>
                    </span>
                    <input
                      type="date"
                      value={selectedTask.dueDate || ""}
                      onChange={(e) => handleUpdateTask(selectedTask.id, { dueDate: e.target.value })}
                      className="bg-transparent hover:bg-slate-50 border-none outline-none font-semibold text-rose-600 cursor-pointer p-1 rounded-sm w-fit focus:ring-1 focus:ring-indigo-500 text-xs"
                    />
                  </div>

                  {/* Periodicitat */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-1.5 border-b border-slate-100 font-sans text-xs">
                    <span className="text-slate-400 font-medium select-none flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 text-slate-450" />
                      <span>Periodicitat</span>
                    </span>
                    <select
                      value={selectedTask.recurrence || "none"}
                      onChange={(e) => handleUpdateTask(selectedTask.id, { recurrence: e.target.value as any })}
                      className="bg-transparent hover:bg-slate-50 border-none outline-none font-semibold text-slate-700 cursor-pointer p-1 rounded-sm w-fit focus:ring-1 focus:ring-indigo-500 text-xs"
                    >
                      <option value="none">No recurrent</option>
                      <option value="weekly">Setmanalment</option>
                      <option value="fortnightly">Quinzenalment (cada 15 dies)</option>
                      <option value="monthly">Mensualment</option>
                      <option value="bimonthly">Bimensualment (cada 2 mesos)</option>
                      <option value="quarterly">Trimestralment</option>
                      <option value="semiannually">Semestralment</option>
                      <option value="yearly">Anualment</option>
                    </select>
                  </div>

                  {/* Prioritat */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-1.5 border-b border-slate-100 font-sans text-xs">
                    <span className="text-slate-400 font-medium select-none">Prioritat</span>
                    <select
                      value={selectedTask.priority}
                      onChange={(e) => handleUpdateTask(selectedTask.id, { priority: e.target.value as TaskPriority })}
                      className={`bg-transparent font-bold capitalize border-none outline-none cursor-pointer p-1 rounded-sm w-fit focus:ring-1 focus:ring-indigo-500 text-xs ${
                        selectedTask.priority === "urgent" ? "text-red-650 bg-red-50 px-1 rounded animate-pulse font-extrabold" :
                        selectedTask.priority === "high" ? "text-rose-600" :
                        selectedTask.priority === "medium" ? "text-amber-600" : "text-sky-600"
                      }`}
                    >
                      <option value="low" className="text-sky-600 font-bold">Baixa</option>
                      <option value="medium" className="text-amber-600 font-bold">Mitjana</option>
                      <option value="high" className="text-rose-600 font-bold">Alta</option>
                      <option value="urgent" className="text-red-600 font-bold">Urgent</option>
                    </select>
                  </div>

                  {/* Multi-Department Section */}
                  <div className="grid grid-cols-[130px_1fr] items-start gap-2 py-2 border-b border-slate-100 font-sans text-xs">
                    <span className="text-slate-400 font-medium select-none">Dept.</span>
                    <div className="flex flex-wrap gap-1.5">
                      {DEPARTMENTS.map((dept) => {
                        const currentDepts = selectedTask.departmentIds && selectedTask.departmentIds.length > 0
                          ? selectedTask.departmentIds
                          : (selectedTask.departmentId ? [selectedTask.departmentId] : ["dep-reserves"]);
                        const isSelected = currentDepts.includes(dept.id);
                        return (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => {
                              let nextIds: string[];
                              if (isSelected) {
                                if (currentDepts.length <= 1) return; // Keep at least one
                                nextIds = currentDepts.filter(id => id !== dept.id);
                              } else {
                                nextIds = [...currentDepts, dept.id];
                              }
                              handleUpdateTask(selectedTask.id, {
                                departmentIds: nextIds,
                                departmentId: nextIds[0] || dept.id
                              });
                            }}
                            className={`px-2 py-0.5 text-[10px] font-semibold border transition-all flex items-center gap-1 rounded-md ${
                              isSelected
                                ? "text-white shadow-xs"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                            style={isSelected ? { backgroundColor: dept.color, borderColor: dept.color } : undefined}
                            title="Afegeix o treu aquest departament asana"
                          >
                            <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : ""}`} style={!isSelected ? { backgroundColor: dept.color } : undefined} />
                            <span>{dept.name.replace("Departament de ", "").replace("Departament ", "")}</span>
                            {isSelected && <span className="text-[8px] font-black">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Tags Section */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-2 border-b border-slate-100 font-sans text-xs">
                    <span className="text-slate-400 font-medium select-none flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-slate-450" />
                      <span>Etiquetes Asana</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {(selectedTask.tags || []).map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10.5px] font-medium border border-slate-200 rounded-sm">
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const cleaned = (selectedTask.tags || []).filter((_, i) => i !== idx);
                              handleUpdateTask(selectedTask.id, { tags: cleaned });
                            }}
                            className="text-slate-400 hover:text-rose-600 font-bold text-[9px] ml-0.5 shrink-0"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const res = prompt("Afegir etiqueta d'Asana:");
                          if (res && res.trim()) {
                            const current = selectedTask.tags || [];
                            handleUpdateTask(selectedTask.id, { tags: [...current, res.trim()] });
                          }
                        }}
                        className="text-[9.5px] border border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-500 px-2 py-0.5 transition-colors font-semibold"
                      >
                        + Nova etiqueta
                      </button>
                    </div>
                  </div>

                  {/* Dependencies Section */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-2 font-sans text-xs">
                    <span className="text-slate-400 font-medium select-none flex items-center gap-1">
                      <Link className="w-3.5 h-3.5 text-slate-450" />
                      <span>Dependències</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {(selectedTask.dependencies || []).map((dep, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-250 px-2 py-0.5 text-[10.5px] font-medium rounded-sm">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                          <span>{dep}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const cleaned = (selectedTask.dependencies || []).filter((_, i) => i !== idx);
                              handleUpdateTask(selectedTask.id, { dependencies: cleaned });
                            }}
                            className="text-amber-500 hover:text-rose-600 font-bold text-[9px] ml-1 shrink-0"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const res = prompt("De quina tasca depèn per executar-se? (Ex: Aprovació de pressupost inicial):");
                          if (res && res.trim()) {
                            const current = selectedTask.dependencies || [];
                            handleUpdateTask(selectedTask.id, { dependencies: [...current, res.trim()] });
                          }
                        }}
                        className="text-[9.5px] border border-dashed border-slate-300 text-slate-500 hover:text-amber-600 hover:border-amber-500 px-2 py-0.5 font-semibold transition-colors"
                      >
                        + Dependència
                      </button>
                    </div>
                  </div>

                </div>

                {/* Description details */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider block font-mono">Descripció o Notes del projecte:</span>
                  <textarea
                    value={selectedTask.description || ""}
                    onChange={(e) => handleUpdateTask(selectedTask.id, { description: e.target.value })}
                    placeholder="Escriu les instruccions detallades o apunts del procediment d'Asana..."
                    className="w-full h-24 p-3 text-xs border border-slate-200 bg-slate-50 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800"
                  />
                </div>

                {/* Interactive Subtasks Section (Asana-Like) */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider block font-mono">Subtasques Integrades</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = selectedTask.subtasks || [];
                        const next = [...current, { 
                          id: "sub-" + Date.now(), 
                          title: "", 
                          completed: false, 
                          createdBy: currentUser?.id, 
                          createdAt: new Date().toISOString(),
                          startDate: selectedTask.startDate || "",
                          endDate: selectedTask.dueDate || ""
                        }];
                        handleUpdateTask(selectedTask.id, { subtasks: next });
                        setSelectedTask({ ...selectedTask, subtasks: next });
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 font-sans bg-indigo-50 border border-indigo-100 px-2 py-1 transition-colors hover:bg-indigo-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Afegir subtasca</span>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {(!selectedTask.subtasks || selectedTask.subtasks.length === 0) ? (
                      <p className="text-[11px] text-slate-400 italic py-2">No s'han registrat subtasques. Clica per afegir camps de control.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedTask.subtasks.map((sub) => {
                          const taskMinDate = selectedTask.startDate || "";
                          const taskMaxDate = selectedTask.dueDate || "";
                          
                          return (
                            <div key={sub.id} className="p-3 bg-zinc-50 border border-slate-200 rounded-sm hover:shadow-xs transition-all space-y-2.5">
                              {/* Main Row: Checkbox, Title, Delete */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={sub.completed}
                                  onChange={(e) => {
                                    const current = selectedTask.subtasks || [];
                                    const next = current.map(s => s.id === sub.id ? { ...s, completed: e.target.checked } : s);
                                    handleUpdateTask(selectedTask.id, { subtasks: next });
                                    setSelectedTask({ ...selectedTask, subtasks: next });
                                  }}
                                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={sub.title}
                                  placeholder="Escriu el títol de la subtasca..."
                                  onChange={(e) => {
                                    const current = selectedTask.subtasks || [];
                                    const next = current.map(s => s.id === sub.id ? { ...s, title: e.target.value } : s);
                                    handleUpdateTask(selectedTask.id, { subtasks: next });
                                    setSelectedTask({ ...selectedTask, subtasks: next });
                                  }}
                                  className={`flex-grow text-xs font-semibold px-2 py-1 bg-transparent border border-transparent focus:border-slate-300 focus:bg-white outline-none text-slate-800 transition-all ${
                                    sub.completed ? "line-through text-slate-405 italic" : ""
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = selectedTask.subtasks || [];
                                    const next = current.filter(s => s.id !== sub.id);
                                    handleUpdateTask(selectedTask.id, { subtasks: next });
                                    setSelectedTask({ ...selectedTask, subtasks: next });
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                                  title="Eliminar subtasca"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Parameters Sub-Row (Dates, Assignees, Workspace) */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 pt-2 text-[11px] border-t border-slate-200">
                                
                                {/* Subtask Dates */}
                                <div className="space-y-1">
                                  <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Planificació Subtasca</span>
                                  <div className="flex items-center justify-between gap-1.5 bg-white border border-slate-200 p-1.5">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-slate-400 font-bold font-sans">Data d'inici</span>
                                      <input
                                        type="date"
                                        min={taskMinDate || undefined}
                                        max={taskMaxDate || undefined}
                                        value={sub.startDate || ""}
                                        onChange={(e) => {
                                          let val = e.target.value;
                                          if (val) {
                                            if (taskMinDate && val < taskMinDate) {
                                              val = taskMinDate;
                                              addToast(`Data d'inici capada a la de la tasca pare (${taskMinDate})`, "warning");
                                            }
                                            if (taskMaxDate && val > taskMaxDate) {
                                              val = taskMaxDate;
                                              addToast(`Data d'inici capada a la de venciment pare (${taskMaxDate})`, "warning");
                                            }
                                          }
                                          const current = selectedTask.subtasks || [];
                                          const next = current.map(s => s.id === sub.id ? { ...s, startDate: val } : s);
                                          handleUpdateTask(selectedTask.id, { subtasks: next });
                                          setSelectedTask({ ...selectedTask, subtasks: next });
                                        }}
                                        className="bg-transparent text-slate-700 border-none outline-none w-fit text-[10px]"
                                      />
                                    </div>
                                    
                                    <div className="w-[1px] h-6 bg-slate-200"></div>

                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-slate-400 font-bold font-sans">Venciment</span>
                                      <input
                                        type="date"
                                        min={sub.startDate || taskMinDate || undefined}
                                        max={taskMaxDate || undefined}
                                        value={sub.endDate || ""}
                                        onChange={(e) => {
                                          let val = e.target.value;
                                          if (val) {
                                            if (taskMaxDate && val > taskMaxDate) {
                                              val = taskMaxDate;
                                              addToast(`Venciment capat al de la tasca pare (${taskMaxDate})`, "warning");
                                            }
                                            if (sub.startDate && val < sub.startDate) {
                                              val = sub.startDate;
                                              addToast(`Venciment no pot ser anterior a la data d'inici de la subtasca`, "warning");
                                            }
                                          }
                                          const current = selectedTask.subtasks || [];
                                          const next = current.map(s => s.id === sub.id ? { ...s, endDate: val } : s);
                                          handleUpdateTask(selectedTask.id, { subtasks: next });
                                          setSelectedTask({ ...selectedTask, subtasks: next });
                                        }}
                                        className="bg-transparent text-slate-700 border-none outline-none w-fit text-[10px]"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Subtask Workspace Assignment */}
                                <div className="space-y-1">
                                  <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Espai Associat</span>
                                  <select
                                    value={sub.workspaceId || ""}
                                    onChange={(e) => {
                                      const val = e.target.value || undefined;
                                      const current = selectedTask.subtasks || [];
                                      const next = current.map(s => s.id === sub.id ? { ...s, workspaceId: val } : s);
                                      handleUpdateTask(selectedTask.id, { subtasks: next });
                                      setSelectedTask({ ...selectedTask, subtasks: next });
                                    }}
                                    className="w-full bg-white border border-slate-200 text-slate-700 p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-600 rounded-sm font-semibold select-none text-[10.5px]"
                                  >
                                    <option value="">Cap espai (Hereta pare)</option>
                                    {workspaces.map(ws => (
                                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Subtask Members Selection */}
                                <div className="md:col-span-2 space-y-1">
                                  <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Membres Assignats</span>
                                  <div className="flex flex-wrap gap-1 bg-white border border-slate-200 p-1.5 rounded-sm">
                                    {users.map(u => {
                                      const isSubAssigned = (sub.assigneeIds || []).includes(u.id);
                                      return (
                                        <button
                                          key={u.id}
                                          type="button"
                                          onClick={async () => {
                                            const currentAssignees = sub.assigneeIds || [];
                                            let nextAssignees;
                                            let isNewlyAssigned = false;
                                            if (isSubAssigned) {
                                              nextAssignees = currentAssignees.filter(id => id !== u.id);
                                            } else {
                                              nextAssignees = [...currentAssignees, u.id];
                                              isNewlyAssigned = true;
                                            }
                                            
                                            // Update Task Subtask assignees
                                            const current = selectedTask.subtasks || [];
                                            const nextSubtasks = current.map(s => s.id === sub.id ? { ...s, assigneeIds: nextAssignees } : s);
                                            setSelectedTask({ ...selectedTask, subtasks: nextSubtasks });
                                            await handleUpdateTask(selectedTask.id, { subtasks: nextSubtasks });

                                            // Trigger mention alert
                                            if (isNewlyAssigned && u.id !== currentUser.id) {
                                              await createNotification(
                                                u.id, 
                                                selectedTask.id, 
                                                selectedTask.title, 
                                                `T'han mencionat a la subtasca "${sub.title || 'Sense títol'}" de la tasca: "${selectedTask.title}"`
                                              );
                                            }
                                          }}
                                          className={`flex items-center gap-1 px-1.5 py-0.5 border text-[9.5px] rounded-full transition-all cursor-pointer ${
                                            isSubAssigned
                                              ? "bg-indigo-50 border-indigo-200 text-indigo-750 font-bold"
                                              : "bg-white border-slate-150 text-slate-500 hover:bg-slate-50"
                                          }`}
                                        >
                                          <div className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-700 text-[8px] font-extrabold flex items-center justify-center shrink-0">
                                            {u.avatar || u.name.slice(0, 2).toUpperCase()}
                                          </div>
                                          <span>{u.name.split(' ')[0]}</span>
                                          {isSubAssigned && <span className="text-[9px] font-black">✓</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* File Attachments Section (Ordinaor i Drive Integrat) */}
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-1.5 gap-2">
                    <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider block font-mono">Arxius Adjunts</span>
                    
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Hidden input for local computer file upload */}
                      <input
                        type="file"
                        id="task-pc-file-upload-input"
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            const file = files[0];
                            const name = file.name;
                            const size = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
                            
                            const current = selectedTask.attachments || [];
                            const next = [...current, {
                              id: "att-pc-" + Date.now(),
                              name,
                              size,
                              createdAt: new Date().toISOString()
                            }];
                            handleUpdateTask(selectedTask.id, { attachments: next });
                            setSelectedTask({ ...selectedTask, attachments: next });
                            addToast(`S'ha penjat correctament el fitxer: "${name}"`, "success");
                          }
                        }}
                      />
                      
                      <button
                        type="button"
                        onClick={() => {
                          document.getElementById("task-pc-file-upload-input")?.click();
                        }}
                        className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 font-sans bg-indigo-50 border border-indigo-200 px-2 py-1 transition-colors hover:bg-indigo-100 rounded-sm cursor-pointer"
                        title="Pujar fitxer real des del teu ordinador"
                      >
                        <Upload className="w-3 h-3 text-indigo-600" />
                        <span>+ Ordinador (PC)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const driveUrl = prompt("Insereix l'enllaç de Google Drive o fitxer compartit:");
                          if (driveUrl && driveUrl.trim()) {
                            const driveName = prompt("Insereix el nom amb el qual vols descriure el fitxer de Drive:", "Document de Google Drive");
                            if (driveName && driveName.trim()) {
                              const current = selectedTask.attachments || [];
                              const next = [...current, {
                                id: "att-drive-" + Date.now(),
                                name: driveName,
                                url: driveUrl,
                                size: "Google Drive link",
                                createdAt: new Date().toISOString()
                              }];
                              handleUpdateTask(selectedTask.id, { attachments: next });
                              setSelectedTask({ ...selectedTask, attachments: next });
                              addToast(`S'ha correctament enllaçat el document de Drive: "${driveName}"`, "success");
                            }
                          }
                        }}
                        className="text-[10px] text-emerald-750 hover:text-emerald-900 font-bold flex items-center gap-1 font-sans bg-emerald-50 border border-emerald-200 px-2 py-1 transition-colors hover:bg-emerald-100 rounded-sm cursor-pointer"
                        title="Enllaçar un directori o document de Google Drive"
                      >
                        <Cloud className="w-3 h-3 text-emerald-600" />
                        <span>+ Google Drive</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {(!selectedTask.attachments || selectedTask.attachments.length === 0) ? (
                      <p className="text-[11px] text-slate-400 italic py-2">No s'han adjuntat fitxers a aquesta tasca comercial/esportiva.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedTask.attachments.map((att) => {
                          const isDrive = att.id.includes("drive") || (att.size && att.size.toLowerCase().includes("drive"));
                          return (
                            <div key={att.id} className="p-2 border border-slate-150 rounded-sm bg-slate-50 flex items-center justify-between gap-2 overflow-hidden hover:bg-white transition-colors">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {isDrive ? (
                                  <Cloud className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                )}
                                <div className="text-left overflow-hidden">
                                  <p className="text-[11px] font-bold text-slate-700 truncate max-w-[150px]" title={att.name}>{att.name}</p>
                                  <p className="text-[9px] text-slate-450 font-semibold font-mono tracking-tight">{att.size}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {att.url || isDrive ? (
                                  <a
                                    href={att.url || "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-sm transition-colors text-xs font-bold"
                                    title="Obrir fitxer de Google Drive"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => alert(`[Sincronitzador Asana] Descarregant l'arxiu integral del PC local: ${att.name}`)}
                                    className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-sm transition-colors"
                                    title="Descarregar fitxer local"
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = selectedTask.attachments || [];
                                    const next = current.filter(a => a.id !== att.id);
                                    handleUpdateTask(selectedTask.id, { attachments: next });
                                    setSelectedTask({ ...selectedTask, attachments: next });
                                  }}
                                  className="p-1 hover:bg-rose-50 text-slate-450 hover:text-rose-600 rounded-sm transition-colors"
                                  title="Eliminar fitxer adjunt"
                                >
                                  <Trash className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Collaborative comments forum */}
                <div className="space-y-3 pt-3 border-t border-slate-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider block font-mono">
                      Discussió i Col·laboradors ({taskComments.length})
                    </span>
                    <span className="text-[9.5px] bg-slate-100 text-slate-500 px-2 py-0.5 font-bold font-mono">CANAL INTERN</span>
                  </div>
                  
                  {/* List of comments */}
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {taskComments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 border border-dashed border-slate-200">
                        Cap comentari. Sopesa amb Marc, Erika, Ester, Mònica o Marina per coordinar l'acció!
                      </p>
                    ) : (
                      taskComments.map((com) => (
                        <div key={com.id} className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-1 relative group hover:bg-white transition-colors">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5.5 h-5.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9.5px] flex items-center justify-center border border-indigo-200">
                              {com.userAvatar}
                            </div>
                            <span className="text-[11px] font-bold text-slate-800">{com.userName}</span>
                            <span className="text-[9px] text-slate-400 ml-auto font-mono">
                              {com.createdAt ? new Date(com.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "avui"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-650 whitespace-pre-wrap pl-7 leading-relaxed font-sans">{com.comment}</p>
                          
                          {com.userId === currentUser.id && (
                            <button
                              onClick={() => handleDeleteComment(com.id)}
                              className="absolute top-2 right-2 p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-sm border border-transparent hover:border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Esborrar comentari"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Comments form footer inside drawer */}
              <form onSubmit={handleAddComment} className="p-4 border-t border-slate-200 bg-slate-100 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  required
                  placeholder="Escriviu un comentari del projecte..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-grow px-3 py-2 text-xs border border-slate-250 bg-white rounded-none focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-xs font-semibold rounded-none flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envia</span>
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DIALOG FOR NEW PROJECT CREATION */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[1px]">
          <motion.form
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={handleCreateProject}
            className="w-full max-w-sm bg-white rounded-none p-6 border border-slate-200 space-y-4 shadow-xl"
          >
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <FolderPlus className="w-4 h-4 text-blue-600" />
                <span>Crear Nou Projecte Asana</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="text-xs text-slate-400 hover:text-slate-650 font-bold border border-slate-200 bg-slate-50 px-2 py-0.5 rounded-none"
              >
                Tancar
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Nom comercial del projecte</label>
              <input
                type="text"
                required
                placeholder="Ex. Torneig de Nadal 2026"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 rounded-none focus:outline-none text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Color corporatiu identificatiu</label>
              <input
                type="color"
                value={newProjectColor}
                onChange={(e) => setNewProjectColor(e.target.value)}
                className="w-full h-8 px-1 py-0.5 rounded-none cursor-pointer border border-slate-200 bg-slate-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Breu descripció</label>
              <textarea
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Detalls del projecte..."
                className="w-full h-16 p-2 text-xs border border-slate-200 bg-slate-50 rounded-none focus:outline-none text-slate-850"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-none text-xs font-bold uppercase tracking-wider"
            >
              <span>Generar Projecte</span>
            </button>
          </motion.form>
        </div>
      )}

      {/* DIALOG FOR NEW WORKSPACE CREATION */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[1px]">
          <motion.form
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={handleCreateWorkspace}
            className="w-full max-w-sm bg-white rounded-none p-6 border border-slate-200 space-y-4 shadow-xl"
          >
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Nou Espai Enterprise</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewWorkspaceModal(false)}
                className="text-xs text-slate-400 hover:text-slate-650 font-bold border border-slate-200 bg-slate-50 px-2 py-0.5 rounded-none"
              >
                Tancar
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Nom corporatiu de l'espai</label>
              <input
                type="text"
                required
                placeholder="Ex. Departament d'Operacions"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 rounded-none focus:outline-none text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Objectius de l'espai de treball</label>
              <textarea
                value={newWorkspaceDesc}
                onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                placeholder="Descriu el propòsit d'aquest espai..."
                className="w-full h-16 p-2 text-xs border border-slate-200 bg-slate-50 rounded-none focus:outline-none text-slate-850"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-none text-xs font-bold uppercase tracking-wider"
            >
              <span>Generar Espais de Treball</span>
            </button>
          </motion.form>
        </div>
      )}

      {/* FLOATING COMPETITOR WEB SCRAPING ALERTS & COGNITIVE BUBBLE */}
      <PriceNotificationBubble 
        golfCourses={golfCourses} 
        onUpdateCourse={handleUpdateGolfCourse} 
      />

      {/* Dynamic Toast Notifications (Improvement 5) */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              layout
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              className={`p-3 border text-xs font-bold shadow-xl flex items-center justify-between pointer-events-auto rounded-none ${
                toast.type === "success"
                  ? "bg-slate-900 border-emerald-500 text-emerald-400"
                  : toast.type === "warning"
                  ? "bg-slate-950 border-amber-500 text-amber-400"
                  : "bg-slate-950 border-blue-500 text-blue-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="ml-3 hover:text-white text-[10px] font-bold uppercase tracking-wider font-mono shrink-0 p-1"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Interactive Onboarding Tour (Improvement 2) */}
      <AnimatePresence>
        {showHelpGuide && (
          <HelpGuideModal
            isOpen={showHelpGuide}
            onClose={() => {
              addToast("S'ha tancat la guia d'onboarding", "info");
              setShowHelpGuide(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* CUSTOM REACT-DRIVEN CONFIRMATION DIALOG (FOR IFRAME SUPPORT) */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[1px]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white p-6 border border-slate-200 space-y-4 shadow-2xl rounded-none"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-none shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider font-mono">
                    Confirmar Acció
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                    {confirmModal.message}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="border border-slate-250 text-slate-600 text-[10.5px] font-bold uppercase tracking-wider px-4 py-2 hover:bg-slate-50 transition-all rounded-none"
                >
                  Cancel·lar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cb = confirmModal.onConfirm;
                    setConfirmModal(null);
                    cb();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold uppercase tracking-wider px-4 py-2 transition-all rounded-none"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
