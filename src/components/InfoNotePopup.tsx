import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Megaphone, CheckCircle2 } from "lucide-react";
import { InfoNote } from "../types";

interface InfoNotePopupProps {
  note: InfoNote | null;
  authorName?: string;
  onAccept: (noteId: string) => void;
}

// Pop-up que apareix en obrir sessió quan hi ha alguna nota informativa
// encara no acceptada per l'usuari actual. Es mostra una nota a la vegada
// (si n'hi ha vàries de pendents, en tancar aquesta apareixerà la següent,
// gestionat pel component pare via `note`).
export default function InfoNotePopup({ note, authorName, onAccept }: InfoNotePopupProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  // Força que l'usuari faci scroll fins al final abans de poder acceptar,
  // perquè "Acceptar" tingui sentit real (que ha llegit tota la nota).
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  useEffect(() => {
    setHasScrolledToEnd(false);
    // Si el contingut és curt i no genera scroll, no bloquegem l'acceptació.
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (el && el.scrollHeight <= el.clientHeight + 4) {
        setHasScrolledToEnd(true);
      }
    });
  }, [note?.id]);

  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setHasScrolledToEnd(true);
    }
  };

  return (
    <AnimatePresence>
      {note && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]"
          >
            <div className="bg-[#033b7a] px-6 py-4 flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-blue-200 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider font-mono text-blue-200 font-bold">
                  Nota informativa · Club Golf d'Aro
                </p>
                <h2 className="text-white font-extrabold text-base leading-snug break-words">
                  {note.title}
                </h2>
                <p className="text-[10px] text-blue-200/80 mt-1">
                  {authorName ? `Publicat per ${authorName}` : ""}
                  {note.createdAt ? ` · ${new Date(note.createdAt).toLocaleDateString("ca-ES", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                </p>
              </div>
            </div>

            <div
              ref={contentRef}
              onScroll={handleScroll}
              className="px-6 py-5 overflow-y-auto text-sm text-slate-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold"
              dangerouslySetInnerHTML={{ __html: note.content || "" }}
            />

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
              {!hasScrolledToEnd && (
                <p className="text-[10px] text-slate-400 text-center font-mono uppercase tracking-wide">
                  Baixa fins al final per poder acceptar
                </p>
              )}
              <button
                onClick={() => hasScrolledToEnd && onAccept(note.id)}
                disabled={!hasScrolledToEnd}
                className={`w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  hasScrolledToEnd
                    ? "bg-[#033b7a] text-white hover:bg-[#044a99] cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Ho he llegit i ho accepto
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
