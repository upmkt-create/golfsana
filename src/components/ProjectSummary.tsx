import React, { useState } from "react";
import { Project, UserProfile, ProjectRole, KeyResource } from "../types";
import { Plus, Users, BookOpen, Link, Calendar, Check, Trash2, FileText, AlertTriangle, CheckCircle2, X, Edit3, MessageSquare, Clock } from "lucide-react";
import { DEPARTMENTS } from "../data";
import RichTextEditor from "./RichTextEditor";

interface ProjectSummaryProps {
  project: Project;
  users: UserProfile[];
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  logAction?: (actionText: string) => void;
}

export default function ProjectSummary({
  project,
  users,
  onUpdateProject,
  onDeleteProject,
  logAction
}: ProjectSummaryProps) {
  // Description editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameText, setNameText] = useState(project.name || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descText, setDescText] = useState(project.description || "");

  const handleSaveName = () => {
    onUpdateProject(project.id, { name: nameText });
    setIsEditingName(false);
    if (logAction) {
      logAction(`Ha canviat el nom del projecte a "${nameText}"`);
    }
  };

  // Roles states
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState("");

  // Resources states
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [briefText, setBriefText] = useState(() => {
    const brief = project.keyResources?.find(r => r.type === "brief");
    return brief?.content || "";
  });

  const [showAddResource, setShowAddResource] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");

  // Sync local editing states with props when active project or its content changes
  React.useEffect(() => {
    setNameText(project.name || "");
    setDescText(project.description || "");
    const brief = project.keyResources?.find(r => r.type === "brief");
    setBriefText(brief?.content || "");
  }, [project.id, project.name, project.description, project.keyResources]);

  // Initialize roles if undefined or empty
  const activeRoles = project.roles || [];
  const keyResources = project.keyResources || [];

  const handleSaveDesc = () => {
    onUpdateProject(project.id, { description: descText });
    setIsEditingDesc(false);
    if (logAction) {
      logAction(`Ha actualitzat la descripció del projecte "${project.name}"`);
    }
  };

  const handleAddRoleMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    // Check if already in roles
    if (activeRoles.some(r => r.userId === selectedUserId)) {
      alert("Aquest membre ja té un rol definit en el projecte.");
      return;
    }

    const newRole: ProjectRole = {
      userId: selectedUserId,
      roleName: newMemberRole.trim() || "+ Agregar rol"
    };

    const updatedRoles = [...activeRoles, newRole];
    onUpdateProject(project.id, { roles: updatedRoles });
    setShowAddMember(false);
    setSelectedUserId("");
    setNewMemberRole("");

    const targetUser = users.find(u => u.id === selectedUserId);
    if (logAction && targetUser) {
      logAction(`Ha afegit a ${targetUser.name} als rols del projecte "${project.name}"`);
    }
  };

  const handleRemoveRole = (userId: string) => {
    const updatedRoles = activeRoles.filter(r => r.userId !== userId);
    onUpdateProject(project.id, { roles: updatedRoles });
    
    const targetUser = users.find(u => u.id === userId);
    if (logAction && targetUser) {
      logAction(`Ha retirat a ${targetUser.name} de la taula de rols`);
    }
  };

  const handleStartEditRoleName = (userId: string, currentRole: string) => {
    setEditingRoleId(userId);
    setEditingRoleValue(currentRole === "+ Agregar rol" ? "" : currentRole);
  };

  const handleSaveRoleName = (userId: string) => {
    const updatedRoles = activeRoles.map(r => {
      if (r.userId === userId) {
        return { ...r, roleName: editingRoleValue.trim() || "+ Agregar rol" };
      }
      return r;
    });

    onUpdateProject(project.id, { roles: updatedRoles });
    setEditingRoleId(null);
    setEditingRoleValue("");
  };

  const handleSaveBrief = () => {
    // Find or create brief resource
    const existingBriefIdx = keyResources.findIndex(r => r.type === "brief");
    let updatedResources = [...keyResources];

    if (existingBriefIdx >= 0) {
      if (!briefText.trim()) {
        // Remove brief if empty
        updatedResources = updatedResources.filter((_, idx) => idx !== existingBriefIdx);
      } else {
        updatedResources[existingBriefIdx] = {
          ...updatedResources[existingBriefIdx],
          content: briefText
        };
      }
    } else if (briefText.trim()) {
      updatedResources.push({
        id: "res-brief-" + Math.random().toString(36).substring(2, 9),
        title: "Brief del projecte",
        type: "brief",
        content: briefText
      });
    }

    onUpdateProject(project.id, { keyResources: updatedResources });
    setIsEditingBrief(false);
    if (logAction) {
      logAction(`Ha editat el brief de projecte de "${project.name}"`);
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle.trim()) return;

    const newRes: KeyResource = {
      id: "res-link-" + Math.random().toString(36).substring(2, 9),
      title: resourceTitle,
      type: "link",
      url: resourceUrl.trim().startsWith("http") ? resourceUrl.trim() : "https://" + resourceUrl.trim()
    };

    const updatedResources = [...keyResources, newRes];
    onUpdateProject(project.id, { keyResources: updatedResources });
    setShowAddResource(false);
    setResourceTitle("");
    setResourceUrl("");

    if (logAction) {
      logAction(`Ha penjat el recurs "${newRes.title}" al projecte`);
    }
  };

  const handleRemoveResource = (id: string, name: string) => {
    const updatedResources = keyResources.filter(r => r.id !== id);
    onUpdateProject(project.id, { keyResources: updatedResources });
    if (logAction) {
      logAction(`Ha eliminat el recurs "${name}"`);
    }
  };

  // Status mapping
  const currentStatusState = project.status || "active"; // active, archived, completed

  const getStatusLabelCatalan = () => {
    switch (currentStatusState) {
      case "completed":
        return "Completat";
      case "archived":
        return "Arxivat";
      default:
        return "En curs";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="project-summary-panel">
      
      {/* LEFT COLUMN: Main Briefing & Project Info (Spans 2 cols) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Project Description Block */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <input
                    value={nameText}
                    onChange={(e) => setNameText(e.target.value)}
                    className="text-lg font-bold text-slate-800 border p-1 w-full"
                  />
                ) : (
                  <h2 className="text-lg font-bold text-slate-800">{project.name}</h2>
                )}
                {isEditingName ? (
                  <button onClick={handleSaveName} className="text-blue-600 font-bold text-sm">Desar</button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setIsEditingName(true)} className="text-slate-400"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDeleteProject(project.id)} className="text-rose-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-500">
                Creat per: <strong>{users.find(u => u.id === project.createdBy)?.name || "Sistema"}</strong> | Data: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "N/A"}
              </div>
            </div>
            {!isEditingDesc && (
              <button
                onClick={() => setIsEditingDesc(true)}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 focus:outline-none"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            )}
          </div>

          {isEditingDesc ? (
            <div className="space-y-3">
              <RichTextEditor
                value={descText}
                onChange={setDescText}
                placeholder="De què es tracta el projecte? Afegeix objectius clau, fites o resum per a l'equip..."
                minHeightClass="min-h-[8rem]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDescText(project.description || "");
                    setIsEditingDesc(false);
                  }}
                  className="px-3 py-1.5 border border-slate-250 dark:border-slate-705 text-slate-600 dark:text-slate-350 text-xs font-semibold hover:bg-slate-50 rounded-none"
                >
                  Cancel·lar
                </button>
                <button
                  type="button"
                  onClick={handleSaveDesc}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-none"
                >
                  Desar descripció
                </button>
              </div>
            </div>
          ) : project.description ? (
            <div
              className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium rte-content"
              dangerouslySetInnerHTML={{ __html: project.description }}
            />
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap font-medium">
              De què es tracta el projecte? Feu clic a "Editar" per definir el propòsit, la descripció o els objectius d'aquest pla de treball d'Asana.
            </p>
          )}
        </div>

        {/* Roles en el Proyecto Block */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
              Rols en el projecte
            </h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-0.5 rounded-full font-bold uppercase">
              {activeRoles.length} Membres assignats
            </span>
          </div>

          <div className="flex flex-wrap items-stretch gap-4 pb-1">
            
            {/* Agregar Miembro Card (Asana style) */}
            <div className="relative">
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="h-24 w-44 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/10 transition-all flex flex-col items-center justify-center gap-1.5 p-3 text-center cursor-pointer select-none"
              >
                <div className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-705 flex items-center justify-center text-slate-500 bg-slate-50 dark:bg-slate-850">
                  <Plus className="w-5 h-5 text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-650 dark:text-slate-408">Afegir membre</span>
              </button>

              {showAddMember && (
                <div className="absolute top-26 left-0 z-20 w-64 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 p-4 shadow-xl text-xs rounded-none">
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Nou membre del projecte</span>
                    <button onClick={() => setShowAddMember(false)} className="text-slate-400 hover:text-slate-650">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleAddRoleMember} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selecciona l'usuari</label>
                      <select
                        required
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border p-1 rounded-none text-xs"
                      >
                        <option value="">-- Tria un membre --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rol específic</label>
                      <input
                        type="text"
                        placeholder="Ex: Encargado del proyecto, Gestor de reserves"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border p-1 rounded-none text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-1 rounded-none mt-1"
                    >
                      Afegir al quadre
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Active Project Roles List */}
            {activeRoles.map(role => {
              const u = users.find(user => user.id === role.userId);
              if (!u) return null;

              const isEditingThis = editingRoleId === role.userId;

              return (
                <div
                  key={role.userId}
                  className="w-44 border border-slate-150 dark:border-slate-800 p-3 flex flex-col items-center text-center justify-between group relative bg-white dark:bg-slate-900"
                >
                  {/* Delete member role mapping button */}
                  <button
                    onClick={() => handleRemoveRole(role.userId)}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600"
                    title="Retirar rol de projecte"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  <div className="flex flex-col items-center gap-1.5">
                    {/* User profile avatar style */}
                    <div className="w-10 h-10 rounded-full font-bold text-sm bg-indigo-55 bg-indigo-50 dark:bg-slate-800 text-blue-600 border border-blue-200/50 flex items-center justify-center select-none shadow-xs">
                      {u.avatar}
                    </div>
                    
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-150 block truncate max-w-[130px]" title={u.name}>
                      {u.name}
                    </span>
                  </div>

                  {/* Role block */}
                  <div className="w-full mt-2 pt-1 border-t border-slate-100 dark:border-slate-850">
                    {isEditingThis ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingRoleValue}
                          onChange={(e) => setEditingRoleValue(e.target.value)}
                          className="w-full border border-slate-200 text-[10px] p-0.5 rounded-none font-semibold text-slate-800 bg-slate-50 dark:bg-slate-800"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRoleName(role.userId);
                            if (e.key === "Escape") setEditingRoleId(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveRoleName(role.userId)}
                          className="text-emerald-650 hover:text-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEditRoleName(role.userId, role.roleName)}
                        className={`text-[10px] font-bold block truncate w-full hover:underline font-mono ${
                          role.roleName === "+ Agregar rol"
                            ? "text-blue-600 dark:text-blue-400 italic"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                        title="Fes clic per actualitzar el rol"
                      >
                        {role.roleName}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Fallback if no roles initialized yet */}
            {activeRoles.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-6 border border-slate-100 dark:border-slate-800 px-4 text-center">
                <Users className="w-6 h-6 text-slate-350 dark:text-slate-700 mb-1" />
                <p className="text-[11px] text-slate-400 italic">No s'han associat rols en aquest projecte. Feu clic a "Afegir membre" per assignar-ne.</p>
              </div>
            )}

          </div>
        </div>

        {/* Recursos Clave / Key Resources Block */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
                Recursos clau
              </h3>
              <p className="text-[11px] text-slate-450 text-slate-500 dark:text-slate-400">
                Usa el brief del projecte i els recursos d'ajuda per alinear el teu equip.
              </p>
            </div>
            
            <button
              onClick={() => setShowAddResource(!showAddResource)}
              className="text-xs bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 border border-slate-200 dark:border-slate-750 px-2.5 py-1 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1 focus:outline-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adjuntar enllaç</span>
            </button>
          </div>

          {/* New Resource Form */}
          {showAddResource && (
            <form onSubmit={handleAddLink} className="bg-slate-50 dark:bg-slate-850 p-4 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex justify-between items-center pb-1 border-b">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Enllaçar dossier o document de referència</span>
                <button type="button" onClick={() => setShowAddResource(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-0.5">Títol del document</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dropbox d'Imatges corporatives, Excel de Preus"
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border p-1 rounded-none text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-0.5">URL de l'enllaç</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: https://docs.google.com/sheet/..."
                    value={resourceUrl}
                    onChange={(e) => setResourceUrl(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border p-1 rounded-none text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddResource(false)}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border text-xs text-slate-600 rounded-none"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-none"
                >
                  Afegir
                </button>
              </div>
            </form>
          )}

          {/* Grid of existing resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Project Brief Sub-card */}
            <div className="border border-slate-150 dark:border-slate-800 p-4 bg-slate-50/30 dark:bg-slate-850/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-blue-600">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Brief del Projecte</span>
                </div>
                {isEditingBrief ? (
                  <div className="space-y-2">
                    <textarea
                      value={briefText}
                      onChange={(e) => setBriefText(e.target.value)}
                      placeholder="Redacta el brief, indicacions, metes i visió compartida de la tasca comercial o directiva..."
                      className="w-full h-24 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 focus:outline-none text-slate-800 dark:text-slate-200"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingBrief(false)}
                        className="px-2 py-1 border text-[10px] rounded-none bg-white font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBrief}
                        className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-none hover:bg-emerald-700"
                      >
                        Desar canvis
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic mb-4">
                    {briefText ? briefText : "Usa el brief del projecte per redactar i unificar directrius de treball, documents generals o acords dels Comitès d'empresa."}
                  </p>
                )}
              </div>

              {!isEditingBrief && (
                <button
                  onClick={() => setIsEditingBrief(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold block text-left"
                >
                  {briefText ? "Editar el brief del projecte →" : "+ Crear brief del projecte"}
                </button>
              )}
            </div>

            {/* Links and Attached URL elements List */}
            <div className="border border-slate-150 dark:border-slate-800 p-4 bg-slate-50/30 dark:bg-slate-850/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 text-amber-500">
                  <Link className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Enllaços i fons de consulta</span>
                </div>
                
                {keyResources.filter(r => r.type === "link").length === 0 ? (
                  <p className="text-[11.5px] text-slate-400 italic mb-4">No s'han publicat dossiers d'enllaços ni carpetes compartides de cloud encara.</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {keyResources.filter(r => r.type === "link").map(res => (
                      <div key={res.id} className="flex items-center justify-between bg-white dark:bg-slate-800 px-2 py-1.5 border border-slate-100 group relative">
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline font-semibold truncate flex items-center gap-1.5 max-w-[140px]"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{res.title}</span>
                        </a>
                        <button
                          onClick={() => handleRemoveResource(res.id, res.title)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 justify-self-end text-xs"
                          title="Eliminar enllaç"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowAddResource(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold block text-left"
              >
                + Enllaçar recursos i documents compartits
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* RIGHT COLUMN: Sidebar (Status & Recent activities/audit logs) */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* State / Project Progress block (Asana widget) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            ¿Cuál es el estado?
          </h3>
          
          <div className="space-y-4">
            
            {/* Project state indicators */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  onUpdateProject(project.id, { status: "active" });
                  if (logAction) logAction(`Ha canviat l'estat del projecte a: En curs`);
                }}
                className={`py-2 px-1 text-center text-[10.5px] font-bold uppercase transition-all select-none border ${
                  project.status === "active" || !project.status
                    ? "bg-emerald-50 text-emerald-800 border-emerald-500"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100/50"
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-550 inline-block mr-1"></div>
                <span>En curso</span>
              </button>

              <button
                onClick={() => {
                  onUpdateProject(project.id, { status: "completed" });
                  if (logAction) logAction(`Ha marcat el projecte com a COMPLETAT`);
                }}
                className={`py-2 px-1 text-center text-[10.5px] font-bold uppercase transition-all select-none border ${
                  project.status === "completed"
                    ? "bg-indigo-50 text-indigo-800 border-indigo-500"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100/50"
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block mr-1"></div>
                <span>Completat</span>
              </button>

              <button
                onClick={() => {
                  onUpdateProject(project.id, { status: "archived" });
                  if (logAction) logAction(`Ha arxivat el projecte directiu`);
                }}
                className={`py-2 px-1 text-center text-[10.5px] font-bold uppercase transition-all select-none border ${
                  project.status === "archived"
                    ? "bg-slate-100 text-slate-800 border-slate-400"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100/55"
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block mr-1"></div>
                <span>Arxivat</span>
              </button>
            </div>

            {/* Overall Summary indicator */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Estat actual del pla</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                {project.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                ) : project.status === "archived" ? (
                  <Clock className="w-4 h-4 text-slate-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-550 text-emerald-500" />
                )}
                <span>El projecte s'ubica com a: {getStatusLabelCatalan()}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Due Date & General Specs widget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none space-y-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            <span>Fecha de entrega</span>
          </div>

          <div className="p-3 border border-slate-100 dark:border-slate-850 bg-slate-50/40 text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aquest projecte regeix les tasques directives d'Asana de GolfSana.</p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t">
              <span>Sincronització:</span>
              <span className="text-emerald-600 font-bold">Activa (Sandbox)</span>
            </div>
          </div>
        </div>

        {/* Members update activity stream / Event logs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span>Activitat del projecte</span>
          </h3>

          <div className="space-y-4 relative pl-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200 dark:before:bg-slate-800">
            {activeRoles.map((role, idx) => {
              const u = users.find(user => user.id === role.userId);
              if (!u) return null;
              return (
                <div key={idx} className="relative text-[11px] leading-tight text-slate-600 dark:text-slate-400 font-medium">
                  <div className="absolute -left-[19.5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-100 dark:bg-slate-800 border-2 border-blue-500"></div>
                  <span className="font-bold text-slate-850 dark:text-slate-200">{u.name}</span> se unió al equipo con rol de <span className="font-semibold text-slate-500 dark:text-slate-450 italic">"{role.roleName === "+ Agregar rol" ? "Membre de l'equip" : role.roleName}"</span>.
                </div>
              );
            })}

            <div className="relative text-[11px] leading-tight text-slate-600 dark:text-slate-400 font-medium">
              <div className="absolute -left-[19.5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-100 dark:bg-slate-800 border-2 border-blue-500"></div>
              Se configuró el entorno del espacio <span className="font-bold text-slate-700 dark:text-slate-300">"{project.name}"</span>.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
