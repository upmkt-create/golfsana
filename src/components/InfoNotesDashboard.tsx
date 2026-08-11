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
} from "lucide-react";
import { InfoNote, UserProfile } from "../types";
import RichTextEditor from "./RichTextEditor";

interface InfoNotesDashboardProps {
  notes: InfoNote[];
  users: UserProfile[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onSaveNote: (note: InfoNote, isNew: boolean) => Promise<void> | void;
  onDeleteNote: (id: string) => Promise<void> | void;
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

export default function InfoNotesDashboard({
  notes,
  users,
  currentUser,
  isAdmin,
  onSaveNote,
  onDeleteNote,
}: InfoNotesDashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expandedReaders, setExpandedReaders] = useState<string | null>(null);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [notes]
  );

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  const startEdit = (note: InfoNote) => {
    setEditingId(note.id);
    setIsCreating(true);
    setTitle(note.title);
    setContent(note.content);
  };

  const handleSubmit = async () => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (!cleanTitle || !cleanContent || cleanContent === "<br>") return;

    if (editingId) {
      const existing = notes.find((n) => n.id === editingId);
      if (!existing) return;
      await onSaveNote(
        { ...existing, title: cleanTitle, content, updatedAt: new Date().toISOString() },
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
        acknowledgedBy: [],
      };
      await onSaveNote(newNote, true);
    }
    resetForm();
  };

  return (
    <div className="space-y-4">
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
            placeholder="Escriu aquí el comunicat per a tot l'equip..."
            minHeightClass="min-h-[10rem]"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel·lar
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white"
              style={{ backgroundColor: NAVY }}
            >
              <Send className="w-3.5 h-3.5" />
              {editingId ? "Desar canvis" : "Publicar a tot l'equip"}
            </button>
          </div>
          {!editingId && (
            <p className="text-[10px] text-slate-400">
              En publicar-se, apareixerà com a pop-up obligatori a tots els membres fins que l'acceptin.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {sortedNotes.length === 0 && !isCreating && (
          <div className="text-center py-10 text-sm text-slate-400 border border-dashed border-slate-200">
            Encara no hi ha cap nota informativa publicada.
          </div>
        )}
        {sortedNotes.map((note) => {
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
