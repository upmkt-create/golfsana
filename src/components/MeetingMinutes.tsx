import React, { useState } from "react";
import {
  FileText,
  Plus,
  Calendar,
  User as UserIcon,
  Trash,
  CheckCircle,
  Clock,
  ListPlus,
  Send,
  Repeat,
} from "lucide-react";
import { MeetingMinute, MeetingAgreement, UserProfile } from "../types";

interface MeetingMinutesProps {
  minutes: MeetingMinute[];
  users: UserProfile[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onSaveMinute: (minute: MeetingMinute, isNew: boolean) => Promise<void> | void;
  onDeleteMinute: (id: string) => Promise<void> | void;
  onCreateTaskFromAgreement: (minute: MeetingMinute, agreement: MeetingAgreement) => Promise<void> | void;
}

const NAVY = "#033b7a";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MeetingMinutes({
  minutes,
  users,
  currentUser,
  isAdmin,
  onSaveMinute,
  onDeleteMinute,
  onCreateTaskFromAgreement,
}: MeetingMinutesProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulari
  const [formMemberId, setFormMemberId] = useState("");
  const [formDate, setFormDate] = useState(todayStr());
  const [formTitle, setFormTitle] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formAgreements, setFormAgreements] = useState<MeetingAgreement[]>([]);

  // Actes visibles: admin veu totes, membre només les seves
  const visibleMinutes = isAdmin
    ? minutes
    : minutes.filter((m) => m.memberId === currentUser.id);

  const sortedMinutes = [...visibleMinutes].sort((a, b) => b.date.localeCompare(a.date));

  const resetForm = () => {
    setFormMemberId("");
    setFormDate(todayStr());
    setFormTitle("");
    setFormNotes("");
    setFormAgreements([]);
    setIsCreating(false);
    setEditingId(null);
  };

  const startEdit = (m: MeetingMinute) => {
    setFormMemberId(m.memberId);
    setFormDate(m.date);
    setFormTitle(m.title || "");
    setFormNotes(m.notes || "");
    setFormAgreements(m.agreements.map((a) => ({ ...a })));
    setEditingId(m.id);
    setIsCreating(true);
  };

  const addAgreementRow = () => {
    setFormAgreements((prev) => [
      ...prev,
      { id: `agr-${Date.now()}-${Math.floor(Math.random() * 1000)}`, text: "", dueDate: "", recurring: false },
    ]);
  };

  const updateAgreement = (id: string, patch: Partial<MeetingAgreement>) => {
    setFormAgreements((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeAgreement = (id: string) => {
    setFormAgreements((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (!formMemberId) {
      alert("Selecciona el membre amb qui has fet la reunió.");
      return;
    }
    const validAgreements = formAgreements.filter((a) => a.text.trim() !== "");
    const member = users.find((u) => u.id === formMemberId);
    const minute: MeetingMinute = {
      id: editingId || `minute-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      memberId: formMemberId,
      memberName: member?.name || "Membre",
      date: formDate,
      title: formTitle.trim() || undefined,
      notes: formNotes.trim() || undefined,
      agreements: validAgreements,
      createdBy: currentUser.name,
      createdAt: editingId ? (minutes.find((m) => m.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveMinute(minute, !editingId);
    resetForm();
  };

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
        {isAdmin && !isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 text-white text-xs font-bold px-3 py-2 rounded-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="w-4 h-4" /> Nova acta
          </button>
        )}
      </div>

      {/* Formulari de creació/edició (només admin) */}
      {isAdmin && isCreating && (
        <div className="border border-slate-200 rounded-sm bg-white p-4 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700">
            {editingId ? "Editar acta" : "Nova acta de reunió"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Membre</label>
              <select
                value={formMemberId}
                onChange={(e) => setFormMemberId(e.target.value)}
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
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full border border-slate-200 p-2 text-xs rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Títol (opcional)</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Seguiment setmanal"
                className="w-full border border-slate-200 p-2 text-xs rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Notes / context (opcional)</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
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

            {formAgreements.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1">Encara no hi ha acords. Clica "Afegir acord".</p>
            ) : (
              <div className="space-y-2">
                {formAgreements.map((agr, idx) => (
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
              <Send className="w-3.5 h-3.5" /> {editingId ? "Desar canvis" : "Publicar acta i avisar"}
            </button>
            <button
              onClick={resetForm}
              className="text-xs font-semibold text-slate-500 px-3 py-2 hover:text-slate-700"
            >
              Cancel·lar
            </button>
          </div>
        </div>
      )}

      {/* Llista d'actes */}
      {sortedMinutes.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {isAdmin ? "Encara no has creat cap acta." : "Encara no tens cap acta de reunió."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMinutes.map((m) => (
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
                      // El membre propietari de l'acta pot crear-se la tasca
                      const canCreateTask = !isAdmin && m.memberId === currentUser.id;
                      return (
                        <li key={agr.id} className="flex items-start gap-2.5 text-xs">
                          <span className="font-mono font-bold text-slate-300 mt-0.5">{idx + 1}.</span>
                          <div className="flex-grow">
                            <span className="text-slate-800 font-medium">{agr.text}</span>
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
                              {agr.taskCreated && (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                  <CheckCircle className="w-3 h-3" /> Tasca creada
                                </span>
                              )}
                            </div>
                          </div>
                          {canCreateTask && !agr.taskCreated && (
                            <button
                              onClick={() => onCreateTaskFromAgreement(m, agr)}
                              className="flex items-center gap-1 text-[10px] font-semibold text-white px-2 py-1 rounded-sm hover:opacity-90 shrink-0"
                              style={{ backgroundColor: NAVY }}
                              title="Crear una tasca a partir d'aquest acord"
                            >
                              <ListPlus className="w-3 h-3" /> Crear tasca
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
