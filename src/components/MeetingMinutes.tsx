import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Calendar,
  User as UserIcon,
  Trash,
  CheckCircle,
  Check,
  Clock,
  ListPlus,
  Send,
  Repeat,
  Filter,
  X,
} from "lucide-react";
import { MeetingMinute, MeetingAgreement, UserProfile, Task, Project } from "../types";

interface MeetingMinutesProps {
  minutes: MeetingMinute[];
  users: UserProfile[];
  tasks: Task[];
  projects: Project[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onSaveMinute: (minute: MeetingMinute, isNew: boolean) => Promise<void> | void;
  onDeleteMinute: (id: string) => Promise<void> | void;
  onCreateTaskFromAgreement: (minute: MeetingMinute, agreement: MeetingAgreement, projectId: string) => Promise<void> | void;
}

const NAVY = "#033b7a";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Extreu la part YYYY-MM-DD d'un createdAt (que pot ser ISO amb hora, o ja curt)
function createdDateOnly(createdAt: string | undefined): string {
  if (!createdAt) return "";
  return createdAt.slice(0, 10);
}

interface MinuteFormValues {
  memberId: string;
  date: string;
  title: string;
  notes: string;
  agreements: MeetingAgreement[];
}

export default function MeetingMinutes({
  minutes,
  users,
  tasks,
  projects,
  currentUser,
  isAdmin,
  onSaveMinute,
  onDeleteMinute,
  onCreateTaskFromAgreement,
}: MeetingMinutesProps) {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Acord per al qual s'està triant el projecte de destinació abans de
  // crear-ne la tasca — evita crear-la "a cegues" al projecte que
  // casualment estigués obert (això feia que la tasca quedés en un espai
  // aliè al membre, i podia arribar a quedar-li invisible a ell mateix).
  const [selectingProjectForAgreement, setSelectingProjectForAgreement] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Formulari (compartit entre crear nova acta i editar-ne una existent)
  const emptyForm: MinuteFormValues = { memberId: "", date: todayStr(), title: "", notes: "", agreements: [] };
  const [form, setForm] = useState<MinuteFormValues>(emptyForm);

  // Filtres
  const [filterPersonId, setFilterPersonId] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Actes visibles: admin veu totes, membre només les seves
  const visibleMinutes = isAdmin
    ? minutes
    : minutes.filter((m) => m.memberId === currentUser.id);

  const filteredMinutes = useMemo(() => {
    return visibleMinutes.filter((m) => {
      if (filterPersonId !== "all" && m.memberId !== filterPersonId) return false;
      const created = createdDateOnly(m.createdAt);
      if (filterDateFrom && created && created < filterDateFrom) return false;
      if (filterDateTo && created && created > filterDateTo) return false;
      return true;
    });
  }, [visibleMinutes, filterPersonId, filterDateFrom, filterDateTo]);

  const sortedMinutes = [...filteredMinutes].sort((a, b) => b.date.localeCompare(a.date));

  const hasActiveFilters = filterPersonId !== "all" || !!filterDateFrom || !!filterDateTo;
  const clearFilters = () => {
    setFilterPersonId("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const resetForm = () => {
    setForm(emptyForm);
    setIsCreatingNew(false);
    setEditingId(null);
  };

  const startCreateNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsCreatingNew(true);
  };

  const startEdit = (m: MeetingMinute) => {
    setForm({
      memberId: m.memberId,
      date: m.date,
      title: m.title || "",
      notes: m.notes || "",
      agreements: m.agreements.map((a) => ({ ...a })),
    });
    setEditingId(m.id);
    setIsCreatingNew(false);
  };

  const addAgreementRow = () => {
    setForm((prev) => ({
      ...prev,
      agreements: [
        ...prev.agreements,
        { id: `agr-${Date.now()}-${Math.floor(Math.random() * 1000)}`, text: "", dueDate: "", recurring: false },
      ],
    }));
  };

  const updateAgreement = (id: string, patch: Partial<MeetingAgreement>) => {
    setForm((prev) => ({
      ...prev,
      agreements: prev.agreements.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };

  const removeAgreement = (id: string) => {
    setForm((prev) => ({ ...prev, agreements: prev.agreements.filter((a) => a.id !== id) }));
  };

  const handleSave = async () => {
    if (!form.memberId) {
      alert("Selecciona el membre amb qui has fet la reunió.");
      return;
    }
    const validAgreements = form.agreements.filter((a) => a.text.trim() !== "");
    const member = users.find((u) => u.id === form.memberId);
    const isNew = !editingId;
    const minute: MeetingMinute = {
      id: editingId || `minute-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      memberId: form.memberId,
      memberName: member?.name || "Membre",
      date: form.date,
      title: form.title.trim() || undefined,
      notes: form.notes.trim() || undefined,
      agreements: validAgreements,
      createdBy: currentUser.name,
      createdAt: editingId ? (minutes.find((m) => m.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveMinute(minute, isNew);
    resetForm();
  };

  // Formulari reutilitzable: es fa servir tant per crear una acta nova (a dalt)
  // com per editar-ne una existent (inline, dins de la mateixa targeta).
  const renderForm = (mode: "new" | "edit") => (
    <div className="border border-slate-200 rounded-sm bg-white p-4 space-y-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700">
        {mode === "edit" ? "Editar acta" : "Nova acta de reunió"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Membre</label>
          <select
            value={form.memberId}
            onChange={(e) => setForm((p) => ({ ...p, memberId: e.target.value }))}
            className="w-full border border-slate-200 p-2 text-xs rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— Selecciona —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Data de la reunió</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            className="w-full border border-slate-200 p-2 text-xs rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Títol (opcional)</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Ex: Seguiment setmanal"
            className="w-full border border-slate-200 p-2 text-xs rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Notes / context (opcional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          rows={2}
          placeholder="Resum general de la reunió..."
          className="w-full border border-slate-200 p-2 text-xs rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
        />
      </div>

      {/* Acords */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Acords / tasques a fer</label>
          <button
            onClick={addAgreementRow}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <Plus className="w-3.5 h-3.5" /> Afegir acord
          </button>
        </div>

        {form.agreements.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic py-1">Encara no hi ha acords. Clica "Afegir acord".</p>
        ) : (
          <div className="space-y-2">
            {form.agreements.map((agr, idx) => (
              <div key={agr.id} className="flex items-start gap-2 bg-zinc-50 border border-slate-200 p-2 rounded-sm">
                <span className="text-[10px] font-mono font-bold text-slate-400 mt-2 w-4 shrink-0">{idx + 1}.</span>
                <div className="flex-grow space-y-2">
                  <input
                    type="text"
                    value={agr.text}
                    onChange={(e) => updateAgreement(agr.id, { text: e.target.value })}
                    placeholder="Què s'ha de fer..."
                    className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <input
                        type="date"
                        value={agr.dueDate || ""}
                        onChange={(e) => updateAgreement(agr.id, { dueDate: e.target.value })}
                        className="text-[10px] border border-slate-200 rounded-sm px-1.5 py-1 focus:outline-none"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!agr.recurring}
                        onChange={(e) => updateAgreement(agr.id, { recurring: e.target.checked })}
                        className="w-3.5 h-3.5"
                      />
                      <Repeat className="w-3 h-3" /> Seguiment setmanal
                    </label>
                  </div>
                </div>
                <button
                  onClick={() => removeAgreement(agr.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 mt-1"
                  title="Eliminar acord"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-sm hover:opacity-90"
          style={{ backgroundColor: NAVY }}
        >
          <Send className="w-3.5 h-3.5" /> {mode === "edit" ? "Desar canvis" : "Publicar acta i avisar"}
        </button>
        <button
          onClick={resetForm}
          className="text-xs font-semibold text-slate-500 px-3 py-2 hover:text-slate-700"
        >
          Cancel·lar
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Capçalera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: NAVY }}>
            <FileText className="w-5 h-5" />
            Actes de Reunió
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? "Registra el que has acordat a cada reunió individual amb l'equip."
              : "Aquí veuràs el que has acordat a les teves reunions."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-sm border transition-colors ${
              hasActiveFilters
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Filtres {hasActiveFilters ? "(actius)" : ""}
          </button>
          {isAdmin && !isCreatingNew && !editingId && (
            <button
              onClick={startCreateNew}
              className="flex items-center gap-1.5 text-white text-xs font-bold px-3 py-2 rounded-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: NAVY }}
            >
              <Plus className="w-4 h-4" /> Nova acta
            </button>
          )}
        </div>
      </div>

      {/* Panell de filtres: per persona i per data de creació de l'acta */}
      {showFilters && (
        <div className="border border-slate-200 rounded-sm bg-slate-50 p-3.5 flex flex-wrap items-end gap-3">
          {isAdmin && (
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Persona</label>
              <select
                value={filterPersonId}
                onChange={(e) => setFilterPersonId(e.target.value)}
                className="border border-slate-200 p-2 text-xs rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[160px]"
              >
                <option value="all">Totes les persones</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Acta creada des de</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="border border-slate-200 p-2 text-xs rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Fins a</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="border border-slate-200 p-2 text-xs rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 px-2 py-2"
            >
              <X className="w-3.5 h-3.5" /> Netejar filtres
            </button>
          )}
          <span className="text-[10.5px] text-slate-400 font-mono ml-auto">
            {sortedMinutes.length} acta{sortedMinutes.length === 1 ? "" : "es"}
          </span>
        </div>
      )}

      {/* Formulari de creació d'una acta nova (a dalt, només quan no s'edita cap existent) */}
      {isAdmin && isCreatingNew && renderForm("new")}

      {/* Llista d'actes */}
      {sortedMinutes.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {hasActiveFilters
              ? "Cap acta coincideix amb els filtres seleccionats."
              : isAdmin
              ? "Encara no has creat cap acta."
              : "Encara no tens cap acta de reunió."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMinutes.map((m) =>
            editingId === m.id ? (
              // Edició INLINE: el formulari substitueix la targeta d'aquesta
              // acta, allà mateix on és a la llista (no cal pujar a dalt).
              <div key={m.id}>{renderForm("edit")}</div>
            ) : (
              <div key={m.id} className="border border-slate-200 rounded-sm bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100" style={{ backgroundColor: "#f8fafc" }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: NAVY }}>
                      <UserIcon className="w-4 h-4" /> {m.memberName}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                      <Calendar className="w-3 h-3" /> {m.date}
                    </span>
                    {m.title && <span className="text-[11px] text-slate-600 italic">· {m.title}</span>}
                    {m.createdAt && (
                      <span className="text-[9.5px] text-slate-400 font-mono">
                        Creada el {createdDateOnly(m.createdAt)}
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(m)}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDeleteMinute(m.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Eliminar acta"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {m.notes && <p className="text-xs text-slate-600 italic bg-zinc-50 p-2 rounded-sm">{m.notes}</p>}

                  {m.agreements.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Sense acords registrats.</p>
                  ) : (
                    <ul className="space-y-2">
                      {m.agreements.map((agr, idx) => {
                        const canCreateTask = !isAdmin && m.memberId === currentUser.id;
                        const linkedTask = agr.taskId ? tasks.find((t) => t.id === agr.taskId) : undefined;
                        const isTaskDone = linkedTask?.status === "done";
                        return (
                          <li key={agr.id} className="flex items-start gap-2.5 text-xs">
                            <span className="font-mono font-bold text-slate-300 mt-0.5">{idx + 1}.</span>
                            <div className="flex-grow">
                              <span className={`text-slate-800 font-medium ${isTaskDone ? "line-through text-slate-400" : ""}`}>{agr.text}</span>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {agr.dueDate && (
                                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                    <Clock className="w-3 h-3" /> {agr.dueDate}
                                  </span>
                                )}
                                {agr.recurring && (
                                  <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                                    <Repeat className="w-3 h-3" /> Setmanal
                                  </span>
                                )}
                                {agr.taskCreated && !isTaskDone && (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                    <CheckCircle className="w-3 h-3" /> Tasca creada
                                  </span>
                                )}
                                {isTaskDone && (
                                  <span className="flex items-center gap-1 text-[10px] text-white font-bold bg-rose-600 px-1.5 py-0.5 rounded-none">
                                    <CheckCircle className="w-3 h-3" /> Tasca completada
                                  </span>
                                )}
                              </div>
                            </div>
                            {canCreateTask && !agr.taskCreated && (
                              selectingProjectForAgreement === agr.id ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <select
                                    autoFocus
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="text-[10px] border border-slate-200 rounded-sm px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[140px]"
                                  >
                                    <option value="">Tria el projecte...</option>
                                    {projects.map((p) => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => {
                                      if (!selectedProjectId) return;
                                      onCreateTaskFromAgreement(m, agr, selectedProjectId);
                                      setSelectingProjectForAgreement(null);
                                      setSelectedProjectId("");
                                    }}
                                    disabled={!selectedProjectId}
                                    className="text-[10px] font-semibold text-white px-2 py-1 rounded-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                    style={{ backgroundColor: NAVY }}
                                    title="Confirmar"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectingProjectForAgreement(null);
                                      setSelectedProjectId("");
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-1 shrink-0"
                                    title="Cancel·lar"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectingProjectForAgreement(agr.id);
                                    setSelectedProjectId("");
                                  }}
                                  className="flex items-center gap-1 text-[10px] font-semibold text-white px-2 py-1 rounded-sm hover:opacity-90 shrink-0"
                                  style={{ backgroundColor: NAVY }}
                                  title="Crear una tasca a partir d'aquest acord"
                                >
                                  <ListPlus className="w-3 h-3" /> Crear tasca
                                </button>
                              )
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
