import React, { useState, useMemo } from "react";
import {
  Megaphone,
  Plus,
  Trash,
  Send,
  CheckCircle2,
  Circle,
  Users as UsersIcon,
  ChevronDown,
  ChevronUp,
  Pencil,
  CalendarClock,
  FileEdit,
} from "lucide-react";
import { InfoNote, InfoNoteStatus, UserProfile } from "../types";
import { isInfoNoteLive } from "../lib/infoNotes";
import RichTextEditor from "./RichTextEditor";

interface InfoNotesDashboardProps {
  notes: InfoNote[];
  users: UserProfile[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onSaveNote: (note: InfoNote, isNew: boolean) => Promise<void> | void;
  onDeleteNote: (id: string) => Promise<void> | void;
  now?: Date;
}

const NAVY = "#033b7a";

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ca-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Converteix un ISO a format "YYYY-MM-DDTHH:mm" per l'input datetime-local
function toDatetimeLocalValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InfoNotesDashboard({
  notes,
  users,
  currentUser,
  isAdmin,
  onSaveNote,
  onDeleteNote,
  now = new Date(),
}: InfoNotesDashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [expandedReaders, setExpandedReaders] = useState<string | null>(null);

  // Notes que aquest usuari pot veure a la llista: totes les publicades/ja en
  // hora (per a tothom), més els esborranys i programacions propis, més
  // absolutament tot per als admins (per poder-hi fer seguiment/edició).
  const visibleNotes = useMemo(
    () =>
      notes.filter(
        (n) => isAdmin || isInfoNoteLive(n, now) || n.createdBy === currentUser.id
      ),
    [notes, isAdmin, currentUser.id, now]
  );

  const inPreparation = useMemo(
    () =>
      visibleNotes
        .filter((n) => !isInfoNoteLive(n, now))
        .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")),
    [visibleNotes, now]
  );

  const published = useMemo(
    () =>
      visibleNotes
        .filter((n) => isInfoNoteLive(n, now))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [visibleNotes, now]
  );

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setScheduledFor("");
  };

  const startEdit = (note: InfoNote) => {
    setEditingId(note.id);
    setIsCreating(true);
    setTitle(note.title);
    setContent(note.content);
    setScheduledFor(toDatetimeLocalValue(note.scheduledFor));
  };

  // Qui pot editar/gestionar una nota concreta: l'autor mentre no s'hagi
  // publicat encara, o un admin en qualsevol moment.
  const canManage = (note: InfoNote) =>
    isAdmin || (note.createdBy === currentUser.id && !isInfoNoteLive(note, now));

  const submit = async (status: InfoNoteStatus) => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (!cleanTitle || !cleanContent || cleanContent === "<br>") return;
    if (status === "scheduled" && !scheduledFor) return;

    const existing = editingId ? notes.find((n) => n.id === editingId) : null;

    if (existing) {
      await onSaveNote(
        {
          ...existing,
          title: cleanTitle,
          content,
          status,
          scheduledFor: status === "scheduled" ? new Date(scheduledFor).toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        },
        false
      );
    } else {
      const newNote: InfoNote = {
        id: "infonote-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        title: cleanTitle,
        content,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
        status,
        scheduledFor: status === "scheduled" ? new Date(scheduledFor).toISOString() : undefined,
        acknowledgedBy: [],
      };
      await onSaveNote(newNote, true);
    }
    resetForm();
  };

  const renderStatusBadge = (note: InfoNote) => {
    if (isInfoNoteLive(note, now)) return null; // ja publicada, no cal etiqueta d'estat
    if (note.status === "draft") {
      return (
        <span className="text-[9px] flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 font-bold uppercase tracking-wide">
          <FileEdit className="w-3 h-3" /> Esborrany
        </span>
      );
    }
    return (
      <span className="text-[9px] flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 font-bold uppercase tracking-wide">
        <CalendarClock className="w-3 h-3" /> Programada · {formatDate(note.scheduledFor)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
            <Megaphone className="w-4 h-4" style={{ color: NAVY }} />
            Novetats i comunicats
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Comunicats formals a tot l'equip. Cada membre veu un avís en obrir sessió fins que l'accepta.
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white transition-all"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nova nota informativa
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white border border-slate-200 p-4 space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Títol del comunicat (ex: Nou horari de reserves)"
            className="w-full border border-slate-200 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#033b7a]"
          />
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Escriu aquí el comunicat. Pots desar-ho com a esborrany i tornar-hi més tard per afegir-hi més temes abans d'enviar-ho."
            minHeightClass="min-h-[10rem]"
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Programar per a:
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#033b7a]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 flex-wrap pt-1">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel·lar
            </button>
            <button
              onClick={() => submit("draft")}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-50"
            >
              <FileEdit className="w-3.5 h-3.5" />
              Desar esborrany
            </button>
            <button
              onClick={() => submit("scheduled")}
              disabled={!scheduledFor}
              title={!scheduledFor ? "Tria primer data i hora" : ""}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white ${
                scheduledFor ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-200 cursor-not-allowed"
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Programar enviament
            </button>
            <button
              onClick={() => submit("published")}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white"
              style={{ backgroundColor: NAVY }}
            >
              <Send className="w-3.5 h-3.5" />
              Publicar ara
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            "Desar esborrany" no notifica ningú — el pots reobrir i seguir-hi afegint temes quan vulguis. "Programar" el publicarà sol al moment exacte que triïs. "Publicar ara" surt a l'instant com a pop-up obligatori a tot l'equip.
          </p>
        </div>
      )}

      {inPreparation.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            En preparació ({inPreparation.length})
          </p>
          {inPreparation.map((note) => (
            <div key={note.id} className="bg-white border border-dashed border-slate-300">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-sm">{note.title || "(sense títol)"}</h4>
                    {renderStatusBadge(note)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {note.createdByName} · {formatDate(note.updatedAt || note.createdAt)}
                  </p>
                  <div
                    className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                </div>
                {canManage(note) && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(note)}
                      title="Editar / continuar"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Segur que vols eliminar "${note.title}"?`)) {
                          onDeleteNote(note.id);
                        }
                      }}
                      title="Eliminar"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
          Publicades ({published.length})
        </p>
        {published.length === 0 && (
          <div className="text-center py-10 text-sm text-slate-400 border border-dashed border-slate-200">
            Encara no hi ha cap nota informativa publicada.
          </div>
        )}
        {published.map((note) => {
          const totalUsers = users.length;
          const readers = note.acknowledgedBy || [];
          const readerIds = new Set(readers.map((r) => r.userId));
          const pending = users.filter((u) => !readerIds.has(u.id));
          const isExpanded = expandedReaders === note.id;
          const iRead = readerIds.has(currentUser.id);

          return (
            <div key={note.id} className="bg-white border border-slate-200">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-sm">{note.title}</h4>
                    {iRead ? (
                      <span className="text-[9px] flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 font-bold uppercase tracking-wide">
                        <CheckCircle2 className="w-3 h-3" /> Llegida
                      </span>
                    ) : (
                      <span className="text-[9px] flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 font-bold uppercase tracking-wide">
                        <Circle className="w-3 h-3" /> Pendent per tu
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {note.createdByName} · {formatDate(note.createdAt)}
                    {note.updatedAt ? ` · editat ${formatDate(note.updatedAt)}` : ""}
                  </p>
                  <div
                    className="text-xs text-slate-600 mt-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(note)}
                      title="Editar"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Segur que vols eliminar la nota "${note.title}"?`)) {
                          onDeleteNote(note.id);
                        }
                      }}
                      title="Eliminar"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="border-t border-slate-100">
                  <button
                    onClick={() => setExpandedReaders(isExpanded ? null : note.id)}
                    className="w-full px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-1.5">
                      <UsersIcon className="w-3.5 h-3.5" />
                      {readers.length} de {totalUsers} han acceptat
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      <div>
                        <p className="text-[9px] uppercase tracking-wide font-bold text-emerald-600 mb-1">
                          Ja acceptada ({readers.length})
                        </p>
                        {readers
                          .slice()
                          .sort((a, b) => a.userName.localeCompare(b.userName))
                          .map((r) => (
                            <p key={r.userId} className="text-xs text-slate-600 flex items-center justify-between">
                              <span>{r.userName}</span>
                              <span className="text-[10px] text-slate-400">{formatDate(r.acknowledgedAt)}</span>
                            </p>
                          ))}
                        {readers.length === 0 && <p className="text-xs text-slate-300">Ningú encara</p>}
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wide font-bold text-amber-600 mb-1">
                          Pendents ({pending.length})
                        </p>
                        {pending
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((u) => (
                            <p key={u.id} className="text-xs text-slate-600">{u.name}</p>
                          ))}
                        {pending.length === 0 && <p className="text-xs text-slate-300">Tothom l'ha acceptada</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
