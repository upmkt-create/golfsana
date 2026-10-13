import React, { useState } from "react";
import { UserProfile } from "../types";
import { Users, Check, Shield, LogOut, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UserSessionSelectorProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => Promise<void>;
  onLogout: () => void;
}

export default function UserSessionSelector({
  users,
  currentUser,
  onSelectUser,
  onDeleteUser,
  onLogout,
}: UserSessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (userId: string) => {
    setIsDeleting(true);
    try {
      await onDeleteUser(userId);
      setConfirmingDeleteId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative inline-block text-left" id="user-session-container">
      <button
        id="btn-trigger-selector"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-none bg-white dark:bg-slate-900 shadow-none hover:shadow-none transition-all text-slate-700 dark:text-slate-200 text-sm font-medium"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-none bg-brand-blue text-white flex items-center justify-center font-bold text-xs select-none shrink-0">
            {currentUser.avatar}
          </div>
          <span className="truncate max-w-[150px] hidden md:inline">{currentUser.name}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-none font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hidden lg:inline">
            {currentUser.role === "admin" ? "Administrador Total" : currentUser.role === "owner" ? "Owner/Director" : "Membre"}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>

            <motion.div
              id="dropdown-session-profiles"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-none z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm">
                    <Users className="w-4 h-4 text-indigo-550" />
                    <span>Usuaris de l'Espai Enterprise</span>
                  </div>
                  <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-none border border-indigo-150">
                    {users.length} actius
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Canvia de vista per comprovar els rols empresarials o crear tasques per a qualsevol membre.
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                {users.map((u) => {
                  const isSelected = u.id === currentUser.id;
                  const isConfirmingDelete = confirmingDeleteId === u.id;

                  return (
                    <div
                      key={u.id}
                      className={`w-full p-2 rounded-none transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            onSelectUser(u);
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <div className="w-8 h-8 rounded-none bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 text-indigo-600 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.avatar}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              {u.name}
                              {u.role === "admin" && (
                                <Shield className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">{u.email}</p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          {isSelected && (
                            <div className="w-5 h-5 rounded-none bg-indigo-650 text-white flex items-center justify-center">
                              <Check className="w-3 animate-pulse" />
                            </div>
                          )}
                          {!isSelected && (
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(isConfirmingDelete ? null : u.id)}
                              className="text-slate-300 hover:text-rose-600 p-1"
                              title="Eliminar usuari"
                            >
                              {isConfirmingDelete ? <X className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {isConfirmingDelete && (
                        <div className="mt-2 border-t border-rose-100 pt-2 space-y-1.5">
                          <p className="text-[10px] text-rose-700 font-semibold">
                            Segur? S'eliminarà el perfil de Golfsana.
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(null)}
                              className="py-1.5 text-[10px] font-bold border border-slate-300 text-slate-600 hover:bg-slate-100"
                            >
                              Cancel·lar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(u.id)}
                              disabled={isDeleting}
                              className="py-1.5 text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              {isDeleting ? "Eliminant..." : "Sí, eliminar"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/50">
                <p className="text-[10px] leading-relaxed text-slate-500">
                  Les altes de nous usuaris queden temporalment desactivades fins que s'implementi el flux d'invitació Firebase server-side.
                </p>
              </div>

              <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-none text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Tancar Sessió</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
