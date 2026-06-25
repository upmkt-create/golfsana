import React, { useState } from "react";
import { BookOpen, User, Kanban, HelpCircle, X, ShieldAlert, Zap, Award, Target, HelpCircle as HelpIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpGuideModal({ isOpen, onClose }: HelpGuideModalProps) {
  const [activeTab, setActiveTab] = useState<"roles" | "asana" | "pricing">("roles");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-[520px] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400 stroke-[2]" />
            <div>
              <h3 className="font-extrabold text-sm tracking-wider uppercase">GOLFSANA ENTERPRISE</h3>
              <p className="text-[10px] text-slate-400 font-mono">Guia d'Onboarding & Millores de Claredat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-none text-slate-400 hover:text-white transition-colors"
            title="Tancar guia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-xs shrink-0 font-semibold text-slate-500">
          <button
            onClick={() => setActiveTab("roles")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === "roles"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent hover:text-slate-800 dark:hover:text-slate-100"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Guia per Rols</span>
          </button>
          <button
            onClick={() => setActiveTab("asana")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === "asana"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent hover:text-slate-800 dark:hover:text-slate-100"
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Estructura d'Asana</span>
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === "pricing"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent hover:text-slate-800 dark:hover:text-slate-100"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Tarifes i Competència</span>
          </button>
        </div>

        {/* Modal content */}
        <div className="flex-1 overflow-y-auto p-5 text-sm space-y-4 text-slate-700 dark:text-slate-300">
          {activeTab === "roles" && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-slate-800/40 border border-blue-200/50 dark:border-slate-800">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-blue-800 dark:text-blue-300 uppercase tracking-wider font-mono">PANEL DE ROCÍO (ADMIN / PRICING)</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Com a administradora, supervises les tarifes d'altres camps de golf (Empordà, Real Club El Prat, PGA Catalunya) que es llegeixen en temps real del servei Web Scraping. Pots llançar sincronitzacions manuals de preus i autoritzar els incentius mensuals i plans de retribució del nostre personal d'operacions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40">
                <div className="flex items-start gap-2.5">
                  <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider font-mono">GUIDE PER A PROJECT MANAGERS</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      El nostre equip gestiona l'operació diària del Club. Utilitza els camps corporatius en crear tasques: assigna el departament correcte (<span className="font-bold">Màrqueting, Comercial, Escoles, Reserves, Administració</span>), delega el responsable (Marc, Erika, Marina, Ester, Mònica), i configura cicles automàtics setmanals/mensuals per estalviar temps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "asana" && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5 uppercase font-mono tracking-wider text-xs">
                <Target className="w-4 h-4 text-emerald-500" />
                Vistes de planificació operativa
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-250 dark:border-slate-850">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-1">1. Taula d'Excel (Grid)</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug block">
                    Ideal per modificar terminis, canviar estats o prioritzacions ràpides. El mode compacte permet veure fins a un 40% més de tasques per pantalla.
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-250 dark:border-slate-850">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-1">2. Kanban de Depts.</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug block">
                    Monitoritza en quines àrees de l'empresa s'està concentrant l'esforç i qui pot estar sobrecarregat gràcies al recompte dinàmic de tasques actives.
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-250 dark:border-slate-850">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-1">3. Calendari Timeline</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug block">
                    Planifica esdeveniments, llançament de tarifes o períodes d'alta ocupació. Permet evitar solapaments d'actuacions crítiques.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-slate-800/40 border border-amber-205 dark:border-slate-800 text-xs flex gap-2">
                <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">SISTEMA D'INCENTIUS COMPARTITS (KPIs)</span>
                  <span className="text-slate-550 dark:text-slate-400 block mt-0.5 leading-normal">
                    La finalització puntual de les tasques assignades a cadascun dels cinc departaments contribueix automàticament a una bonificació del fons de productivitat empresarial regulat des del menú d'incentius.
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5 uppercase font-mono tracking-wider text-xs">
                <HelpIcon className="w-4 h-4 text-emerald-500" />
                Respostes a dubtes importants del negoci
              </h4>

              <div className="space-y-3">
                <div className="border-l-2 border-emerald-550 pl-3">
                  <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">Els preus de la competència canvien?</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Sí! Els preus estrangers de camps competidors se sincronitzen mitjançant un simulador lògic de web scraping diari. Els valors poden rebre avisos i alertes cognitives de mercat de forma dinàmica.
                  </p>
                </div>

                <div className="border-l-2 border-amber-550 pl-3">
                  <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">Perquè el preu d'altres només és correcte al nostre camp?</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Es tracta d'una mesura de seguretat del disseny. Els proveïdors estrangers poden canviar tarifes de ràpida fluctuació. El nostre preu corporatiu està certificat oficialment i connectat a la base de dades immutable de l'empresa.
                  </p>
                </div>

                <div className="border-l-2 border-indigo-550 pl-3">
                  <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">Com s'activa el mode dense / compacte?</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Premeu el botó de <span className="font-bold">Mode Dens</span> (icona d'ajust de línies) directament a la barra d'eines superior. Aquesta preferència es desa en el navegador d'operacions per a cada dispositiu.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono">Golfsana Enterprise © 2026 • Versió d'Usabilitat 1.25</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Entès, tancar guia
          </button>
        </div>
      </motion.div>
    </div>
  );
}
