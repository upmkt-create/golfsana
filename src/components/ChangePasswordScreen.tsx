import React, { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";

interface ChangePasswordScreenProps {
  email: string;
  onChangePassword: (newPassword: string) => Promise<void>;
}

export default function ChangePasswordScreen({ email, onChangePassword }: ChangePasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    if (password.length < 12) return "La contrasenya ha de tenir com a mínim 12 caràcters.";
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return "Inclou com a mínim una majúscula, una minúscula i un número.";
    }
    if (password !== confirm) return "Les dues contrasenyes no coincideixen.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onChangePassword(password);
      setPassword("");
      setConfirm("");
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/requires-recent-login") {
        setError("Per seguretat, torna a iniciar sessió i repeteix el canvi de contrasenya.");
      } else if (code === "auth/weak-password") {
        setError("Firebase considera aquesta contrasenya massa feble. Tria'n una altra.");
      } else {
        setError("No s'ha pogut actualitzar la contrasenya. Torna-ho a provar.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={handleSubmit} className="bg-white p-10 shadow-2xl border border-slate-100 w-full max-w-md space-y-7">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">Protegeix el teu compte</h1>
          <p className="text-sm text-slate-500 font-semibold">
            El teu compte ja utilitza Firebase Authentication. Ara defineix una contrasenya privada nova.
          </p>
          <p className="text-xs text-slate-400 font-mono">{email}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
          No reutilitzis el codi d'accés antic. La nova contrasenya no es desa a Golfsana ni a Firestore: només la gestiona Firebase Authentication.
        </div>

        <div className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova contrasenya"
              autoComplete="new-password"
              className="w-full border border-slate-200 p-3 pl-10 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeteix la nova contrasenya"
            autoComplete="new-password"
            className="w-full border border-slate-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="accent-emerald-600"
            />
            Mostrar contrasenya
          </label>
          <p className="text-[11px] text-slate-400">
            Mínim 12 caràcters, amb una majúscula, una minúscula i un número.
          </p>
        </div>

        {error && <p className="text-rose-600 text-xs text-center font-bold">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 transition-all disabled:opacity-60"
        >
          {loading ? "Actualitzant..." : "Desar nova contrasenya"}
        </button>
      </form>
    </div>
  );
}
