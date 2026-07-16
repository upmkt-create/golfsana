import React, { useState } from "react";
import { UserProfile, UserRole } from "../types";
import { Users, Plus, Check, Shield, User, X, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UserSessionSelectorProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onAddUser: (name: string, email: string, role: UserRole, accessCode: string) => Promise<void>;
  onLogout: () => void;
}

export default function UserSessionSelector({
  users,
  currentUser,
  onSelectUser,
  onAddUser,
  onLogout,
}: UserSessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("member");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newAccessCode.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddUser(newName, newEmail, newRole, newAccessCode.trim());
      setNewName("");
      setNewEmail("");
      setNewRole("member");
      setNewAccessCode("");
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
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
          <div className="w-6 h-6 rounded-none bg-indigo-600 text-white flex items-center justify-center font-bold text-xs select-none">
            {currentUser.avatar}
          </div>
          <span className="truncate max-w-[150px]">{currentUser.name}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-none font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
            {currentUser.role === "admin" ? "Administrador Total" : currentUser.role === "owner" ? "Owner/Director" : "Membre"}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
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
                  Canvia de sessió instantàniament per comprovar els rols empresarials o crear tasques per a qualsevol membre.
                </p>
              </div>

              {/* Users list */}
              <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                {users.map((u) => {
                  const isSelected = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelectUser(u);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-none text-left transition-all hover:bg-slate-1050 dark:hover:bg-slate-800 ${
                        isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-none bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 text-indigo-600 font-bold flex items-center justify-center text-xs">
                          {u.avatar}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            {u.name}
                            {u.role === "admin" && (
                              <Shield className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]">{u.email}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-none bg-indigo-650 text-white flex items-center justify-center">
                          <Check className="w-3 animate-pulse" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Logout button */}
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

              {/* Add Custom User Form Trigger */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50">
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full py-2 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-550 hover:text-indigo-600 rounded-none flex items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition-all font-mono"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Afegir Usuari Indefinit</span>
                  </button>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3 p-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-750 dark:text-slate-300">Nou Col·laborador</span>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="text-slate-400 hover:text-slate-600 font-bold"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Nom complet (ex: Pere Joan)"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      />

                      <input
                        type="email"
                        placeholder="correu@entitat.com"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      />

                      <input
                        type="text"
                        placeholder="Codi d'accés (per iniciar sessió)"
                        required
                        value={newAccessCode}
                        onChange={(e) => setNewAccessCode(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                      />
                      <p className="text-[9.5px] text-slate-400 -mt-1">
                        Comunica aquest codi al nou usuari — el necessitarà per entrar amb el seu email.
                      </p>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewRole("member")}
                          className={`py-1 rounded-none text-[10px] font-semibold border ${
                            newRole === "member"
                              ? "bg-indigo-55/10 text-indigo-600 border-indigo-200"
                              : "border-slate-200 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          Membre Estàndard
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewRole("admin")}
                          className={`py-1 rounded-none text-[10px] font-semibold border ${
                            newRole === "admin"
                              ? "bg-amber-50 text-amber-600 border-amber-250"
                              : "border-slate-200 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          Administrador Total
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-indigo-600 text-white rounded-none py-2 text-xs font-bold hover:bg-indigo-750 transition-all disabled:opacity-55"
                    >
                      {isSubmitting ? "Registrant..." : "Guardar Usuari"}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
