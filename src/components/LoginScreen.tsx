import React, { useState } from "react";
import { LogIn } from "lucide-react";

interface LoginScreenProps {
  onLogin: (email: string, code: string) => Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(email, code);
    } catch (err) {
      setError("Dades d'accés incorrectes. Si us plau, verifica el teu correu i codi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={handleSubmit} className="bg-white p-10 shadow-2xl border border-slate-100 w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">Golfsana</h1>
          <p className="text-sm text-slate-500 font-semibold tracking-wide">Accés a la plataforma de gestió</p>
        </div>
        
        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correu electrònic"
            className="w-full border border-slate-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Codi d'accés"
            className="w-full border border-slate-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
            type={showPassword ? "text" : "password"}
          />
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="accent-indigo-600"
            />
            Mostrar contrasenya
          </label>
        </div>

        {error && <p className="text-rose-600 text-xs text-center font-bold">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 flex items-center justify-center gap-2 transition-all"
        >
          {loading ? "Verificant..." : "Accedir"}
        </button>

        <p className="text-[10px] text-slate-400 text-center uppercase font-mono">
          © 2026 Golfsana Enterprise Management. Ús exclusiu autoritzat.
        </p>
      </form>
    </div>
  );
}
