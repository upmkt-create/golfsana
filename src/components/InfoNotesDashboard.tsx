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
  Link as LinkIcon,
  X,
  Copy,
  Ban,
  FileDown,
  Image as ImageIcon,
  FileText,
  Building2,
  Search,
  UserPlus,
} from "lucide-react";
import { InfoNote, InfoNoteAttachment, InfoNoteStatus, UserProfile, Workspace } from "../types";
import { isInfoNoteLive, isInfoNoteForUser } from "../lib/infoNotes";
import { getDepartmentOptions } from "../lib/departments";
import RichTextEditor from "./RichTextEditor";

interface InfoNotesDashboardProps {
  notes: InfoNote[];
  users: UserProfile[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onSaveNote: (note: InfoNote, isNew: boolean) => Promise<void> | void;
  onDeleteNote: (id: string) => Promise<void> | void;
  now?: Date;
  workspaces: Workspace[]; // Departaments = espais de treball reals (Firestore), no una llista fixa
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

function toDatetimeLocalValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function genId() {
  return "infonote-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

// Adivinem si l'enllaç és una imatge per la seva extensió, ja que no venim
// d'una pujada real (no tenim el content-type real del navegador).
function looksLikeImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
}

// Exporta a PDF, per a una nota concreta, qui l'ha acceptada i qui no —
// càrrega dinàmica de jsPDF perquè només s'utilitza quan un admin ho demana.
async function exportReadersPdf(note: InfoNote, users: UserProfile[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const readers = note.acknowledgedBy || [];
  const readerIds = new Set(readers.map((r) => r.userId));
  const pending = users.filter((u) => !readerIds.has(u.id));

  doc.setFontSize(14);
  doc.text(note.title, 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Registre de lectura · Exportat ${new Date().toLocaleString("ca-ES")}`, 14, 25);

  let y = 36;
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(`Acceptada (${readers.length})`, 14, y);
  y += 7;
  doc.setFontSize(9);
  if (readers.length === 0) {
    doc.text("Ningú encara.", 16, y);
    y += 6;
  }
  readers
    .slice()
    .sort((a, b) => a.userName.localeCompare(b.userName))
    .forEach((r) => {
      doc.text(`• ${r.userName} — ${formatDate(r.acknowledgedAt)}`, 16, y);
      y += 6;
    });

  y += 6;
  doc.setFontSize(11);
  doc.text(`Pendents (${pending.length})`, 14, y);
  y += 7;
  doc.setFontSize(9);
  if (pending.length === 0) {
    doc.text("Tothom l'ha acceptada.", 16, y);
  }
  pending
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((u) => {
      doc.text(`• ${u.name}`, 16, y);
      y += 6;
    });

  doc.save(`novetat-${note.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.pdf`);
}

export default function InfoNotesDashboard({
  notes,
  users,
  currentUser,
  isAdmin,
  onSaveNote,
  onDeleteNote,
  now = new Date(),
  workspaces,
}: InfoNotesDashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoteId, setFormNoteId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [attachments, setAttachments] = useState<InfoNoteAttachment[]>([]);
  const [linkNameInput, setLinkNameInput] = useState("");
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [targetDepartmentIds, setTargetDepartmentIds] = useState<string[]>([]);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [expandedReaders, setExpandedReaders] = useState<string | null>(null);

  // Departaments = espais de treball reals que existeixen ara mateix a
  // Firestore — mai una llista fixa al codi (vegeu src/lib/departments.ts).
  const targetOptions = useMemo(() => getDepartmentOptions(workspaces), [workspaces]);

  const visibleNotes = useMemo(
    () =>
      notes.filter(
        (n) =>
          isAdmin ||
          (isInfoNoteLive(n, now) && isInfoNoteForUser(n, currentUser)) ||
          n.createdBy === currentUser.id
      ),
    [notes, isAdmin, currentUser, now]
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
    setFormNoteId("");
    setTitle("");
    setContent("");
    setScheduledFor("");
    setAttachments([]);
    setLinkNameInput("");
    setLinkUrlInput("");
    setTargetDepartmentIds([]);
    setTargetUserIds([]);
    setUserSearchQuery("");
  };

  const startCreate = () => {
    setFormNoteId(genId());
    setIsCreating(true);
  };

  const startEdit = (note: InfoNote) => {
    setEditingId(note.id);
    setFormNoteId(note.id);
    setIsCreating(true);
    setTitle(note.title);
    setContent(note.content);
    setScheduledFor(toDatetimeLocalValue(note.scheduledFor));
    setAttachments(note.attachments || []);
    setTargetDepartmentIds(note.targetDepartmentIds || []);
    setTargetUserIds(note.targetUserIds || []);
  };

  // Qui pot editar/gestionar una nota concreta: l'autor mentre no s'hagi
  // publicat encara, o un admin en qualsevol moment.
  const canManage = (note: InfoNote) =>
    isAdmin || (note.createdBy === currentUser.id && !isInfoNoteLive(note, now));

  const toggleDepartment = (depId: string) => {
    setTargetDepartmentIds((prev) =>
      prev.includes(depId) ? prev.filter((d) => d !== depId) : [...prev, depId]
    );
  };

  const toggleUser = (userId: string) => {
    setTargetUserIds((prev) =>
      prev.includes(userId) ? prev.filter((u) => u !== userId) : [...prev, userId]
    );
  };

  const filteredUsersForPicker = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    const base = q ? users.filter((u) => u.name.toLowerCase().includes(q)) : users;
    return base.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [users, userSearchQuery]);

  // Els adjunts són enllaços externs (Google Drive, etc.) — el pla gratuït
  // de Firebase no permet pujar fitxers directament (caldria Blaze).
  const addLink = () => {
    const name = linkNameInput.trim();
    const url = linkUrlInput.trim();
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) {
      alert("L'enllaç ha de començar per http:// o https:// (per exemple, un enllaç de compartir de Google Drive).");
      return;
    }
    const newAttachment: InfoNoteAttachment = {
      id: "att-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      name,
      url,
      contentType: looksLikeImageUrl(url) ? "image" : undefined,
    };
    setAttachments((prev) => [...prev, newAttachment]);
    setLinkNameInput("");
    setLinkUrlInput("");
  };

  const removeAttachment = (att: InfoNoteAttachment) => {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
  };

  const submit = async (status: InfoNoteStatus) => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (!cleanTitle || !cleanContent || cleanContent === "<br>") return;
    if (status === "scheduled" && !scheduledFor) return;

    const existing = editingId ? notes.find((n) => n.id === editingId) : null;
    const commonFields = {
      title: cleanTitle,
      content,
      status,
      scheduledFor: status === "scheduled" ? new Date(scheduledFor).toISOString() : undefined,
      attachments,
      targetDepartmentIds: targetDepartmentIds.length > 0 ? targetDepartmentIds : undefined,
      targetUserIds: targetUserIds.length > 0 ? targetUserIds : undefined,
    };

    if (existing) {
      await onSaveNote({ ...existing, ...commonFields, updatedAt: new Date().toISOString() }, false);
    } else {
      const newNote: InfoNote = {
        id: formNoteId || genId(),
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
        acknowledgedBy: [],
        ...commonFields,
      };
      await onSaveNote(newNote, true);
    }
    resetForm();
  };

  const duplicateNote = (note: InfoNote) => {
    // Es duplica com a nou esborrany: mateix títol/contingut/destinataris/
    // enllaços (ara que són enllaços externs, no cal preocupar-se de compartir
    // cap fitxer), però sense programació ni lectures anteriors.
    setFormNoteId(genId());
    setEditingId(null);
    setIsCreating(true);
    setTitle(`${note.title} (còpia)`);
    setContent(note.content);
    setScheduledFor("");
    setAttachments(note.attachments || []);
    setTargetDepartmentIds(note.targetDepartmentIds || []);
    setTargetUserIds(note.targetUserIds || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelSchedule = (note: InfoNote) => {
    onSaveNote({ ...note, status: "draft", scheduledFor: undefined }, false);
  };

  const renderStatusBadge = (note: InfoNote) => {
    if (isInfoNoteLive(note, now)) return null;
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

  const renderTargetBadge = (note: InfoNote) => {
    const hasDept = note.targetDepartmentIds && note.targetDepartmentIds.length > 0;
    const hasUsers = note.targetUserIds && note.targetUserIds.length > 0;
    if (!hasDept && !hasUsers) return null;
    const parts: string[] = [];
    if (hasDept) {
      parts.push(
        note.targetDepartmentIds!.map((id) => targetOptions.find((d) => d.id === id)?.name || id).join(", ")
      );
    }
    if (hasUsers) {
      const names = note.targetUserIds!.map((id) => users.find((u) => u.id === id)?.name || id);
      parts.push(names.length <= 2 ? names.join(" i ") : `${names[0]} i ${names.length - 1} més`);
    }
    return (
      <span className="text-[9px] flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 font-bold uppercase tracking-wide">
        <Building2 className="w-3 h-3" /> Només {parts.join(" · ")}
      </span>
    );
  };

  const renderAttachmentChip = (att: InfoNoteAttachment, onRemove?: () => void) => {
    const isImage = att.contentType === "image" || att.contentType?.startsWith("image/") || looksLikeImageUrl(att.url);
    return (
      <div
        key={att.id}
        className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 text-[11px] text-slate-600"
      >
        {isImage ? <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> : <FileText className="w-3.5 h-3.5 text-rose-500" />}
        <a href={att.url} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[10rem]">
          {att.name}
        </a>
        {onRemove && (
          <button onClick={onRemove} className="text-slate-400 hover:text-rose-600 ml-1">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
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
            onClick={startCreate}
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

          {/* Adjunts (enllaços externs — Drive, etc.) */}
          <div className="space-y-2">
            {attachments.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {attachments.map((att) => renderAttachmentChip(att, () => removeAttachment(att)))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={linkNameInput}
                onChange={(e) => setLinkNameInput(e.target.value)}
                placeholder="Nom del document (ex: Cartell nou horari)"
                className="flex-1 min-w-[10rem] border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#033b7a]"
              />
              <input
                type="text"
                value={linkUrlInput}
                onChange={(e) => setLinkUrlInput(e.target.value)}
                placeholder="Enllaç (https://drive.google.com/...)"
                className="flex-1 min-w-[14rem] border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#033b7a]"
              />
              <button
                onClick={addLink}
                disabled={!linkNameInput.trim() || !linkUrlInput.trim()}
                className="px-3 py-1.5 text-[11px] font-bold text-white bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Afegir enllaç
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Puja primer la imatge o el PDF a Google Drive, comparteix-lo com a "Qualsevol persona amb l'enllaç" i enganxa aquí l'enllaç.
            </p>
          </div>

          {/* Destinataris per departament */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Destinataris — deixa-ho buit per enviar-la a tot l'equip
            </label>
            <div className="flex flex-wrap gap-1.5">
              {targetOptions.map((dep) => {
                const active = targetDepartmentIds.includes(dep.id);
                return (
                  <button
                    key={dep.id}
                    type="button"
                    onClick={() => toggleDepartment(dep.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold border transition-all ${
                      active
                        ? "text-white border-transparent"
                        : "text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                    style={active ? { backgroundColor: dep.color } : {}}
                  >
                    {dep.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destinataris per usuari concret — se sumen als departaments, no els substitueixen */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              O bé usuaris concrets — se sumen als departaments triats a sobre
            </label>
            {targetUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {targetUserIds.map((uid) => {
                  const u = users.find((usr) => usr.id === uid);
                  return (
                    <span
                      key={uid}
                      className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] text-slate-700"
                    >
                      {u?.name || uid}
                      <button onClick={() => toggleUser(uid)} className="text-slate-400 hover:text-rose-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Cerca un membre pel nom..."
                className="w-full border border-slate-200 pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#033b7a]"
              />
            </div>
            {userSearchQuery.trim() && (
              <div className="max-h-40 overflow-y-auto border border-slate-200 divide-y divide-slate-100">
                {filteredUsersForPicker.length === 0 && (
                  <p className="text-xs text-slate-400 px-2 py-2">Cap membre coincideix.</p>
                )}
                {filteredUsersForPicker.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUser(u.id)}
                    className={`w-full text-left px-2 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      targetUserIds.includes(u.id) ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600"
                    }`}
                  >
                    {u.name}
                    {targetUserIds.includes(u.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

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
            "Desar esborrany" no notifica ningú. "Programar" el publicarà sol al moment exacte que triïs. "Publicar ara" surt a l'instant com a pop-up obligatori als destinataris.
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
                    {renderTargetBadge(note)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {note.createdByName} · {formatDate(note.updatedAt || note.createdAt)}
                  </p>
                  <div
                    className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                  {note.attachments && note.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {note.attachments.map((att) => renderAttachmentChip(att))}
                    </div>
                  )}
                </div>
                {canManage(note) && (
                  <div className="flex items-center gap-1 shrink-0">
                    {note.status === "scheduled" && (
                      <button
                        onClick={() => cancelSchedule(note)}
                        title="Aturar la programació (torna a esborrany)"
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => duplicateNote(note)}
                      title="Duplicar com a plantilla"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
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
          // Els destinataris reals (per calcular % de lectura) — mateixa
          // lògica que decideix qui la veu (departament i/o usuaris concrets,
          // o tothom si no hi ha cap filtre), font única a lib/infoNotes.ts.
          const targetUsers = users.filter((u) => isInfoNoteForUser(note, u));
          const readers = note.acknowledgedBy || [];
          const readerIds = new Set(readers.map((r) => r.userId));
          const pending = targetUsers.filter((u) => !readerIds.has(u.id));
          const isExpanded = expandedReaders === note.id;
          const iRead = readerIds.has(currentUser.id);

          return (
            <div key={note.id} className="bg-white border border-slate-200">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-sm">{note.title}</h4>
                    {renderTargetBadge(note)}
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
                  {note.attachments && note.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {note.attachments.map((att) => renderAttachmentChip(att))}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => exportReadersPdf(note, targetUsers)}
                      title="Exportar registre de lectura (PDF)"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => duplicateNote(note)}
                      title="Duplicar com a plantilla"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
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
                      {readers.length} de {targetUsers.length} han acceptat
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
