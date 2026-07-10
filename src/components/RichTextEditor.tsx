import React, { useRef, useEffect, useCallback } from "react";
import { Bold, Italic, List, ListOrdered, CheckSquare, Type } from "lucide-react";

interface RichTextEditorProps {
  value: string;          // HTML guardat (pot venir buit o com a text pla antic)
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string; // ex: "min-h-[6rem]"
}

// Editor de text ric lleuger basat en contentEditable + execCommand.
// Guarda el contingut com a HTML dins del mateix camp `description` (string).
// Suporta: negreta, cursiva, mida de font, llista de vinyetes, llista numerada
// i checklist (caselles clicables dins del text).
export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Escriu aquí...",
  minHeightClass = "min-h-[6rem]",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sincronitza el contingut extern (p.ex. quan canvia de tasca) sense
  // sobreescriure mentre l'usuari està escrivint.
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  };

  const setFontSize = (size: string) => {
    // execCommand("fontSize") usa una escala 1-7; mapegem mides semàntiques.
    editorRef.current?.focus();
    document.execCommand("fontSize", false, size);
    emitChange();
  };

  const insertChecklistItem = () => {
    editorRef.current?.focus();
    const html =
      '<div class="rte-checklist-item" style="display:flex;align-items:flex-start;gap:6px;margin:2px 0;">' +
      '<input type="checkbox" class="rte-checkbox" style="margin-top:3px;cursor:pointer;" />' +
      '<span style="flex:1;">Element de la llista</span>' +
      "</div>";
    document.execCommand("insertHTML", false, html);
    emitChange();
  };

  // Delegació de clics per alternar les caselles del checklist sense
  // entrar en mode edició de text (els checkboxes no són contentEditable).
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && target.classList.contains("rte-checkbox")) {
      const input = target as HTMLInputElement;
      const span = input.nextElementSibling as HTMLElement | null;
      if (span) {
        span.style.textDecoration = input.checked ? "line-through" : "none";
        span.style.opacity = input.checked ? "0.55" : "1";
      }
      emitChange();
    }
  };

  const btnCls =
    "p-1.5 rounded-none border border-transparent hover:border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors";

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-sm overflow-hidden">
      {/* Barra d'eines */}
      <div className="flex items-center gap-0.5 flex-wrap px-1.5 py-1 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} className={btnCls} title="Negreta">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} className={btnCls} title="Cursiva">
          <Italic className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

        <div className="relative flex items-center gap-1">
          <Type className="w-3.5 h-3.5 text-slate-400" />
          <select
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => setFontSize(e.target.value)}
            defaultValue="3"
            className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-700 rounded-none px-1 py-0.5 focus:outline-none cursor-pointer"
            title="Mida de la lletra"
          >
            <option value="2">Petita</option>
            <option value="3">Normal</option>
            <option value="5">Gran</option>
            <option value="7">Molt gran</option>
          </select>
        </div>

        <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} className={btnCls} title="Llista de vinyetes">
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")} className={btnCls} title="Llista numerada">
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={insertChecklistItem} className={btnCls} title="Afegir element de checklist">
          <CheckSquare className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Àrea d'edició */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onClick={handleClick}
        data-placeholder={placeholder}
        className={`w-full ${minHeightClass} p-3 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none rte-content`}
      />
    </div>
  );
}
