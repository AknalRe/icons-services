import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { api } from "../lib/api";
import type { User } from "../types";

interface AdminLoginPageProps {
  onSuccess: (user: User) => void;
}

export function AdminLoginPage({ onSuccess }: AdminLoginPageProps) {
  const [email, setEmail] = useState("admin@reneo.my.id");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.login(email.trim(), password);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk ke Panel Admin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-14">
      <div className="reneo-card p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--accent-tint)", color: "var(--accent-text)" }}
          >
            <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "var(--ink)" }}>
              Masuk Panel Admin
            </h1>
            <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
              Kelola koleksi ikon SVG dan kategori Reneo Icons.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border px-3 py-2 text-xs font-medium"
            style={{
              backgroundColor: "var(--danger-bg)",
              borderColor: "var(--danger)",
              color: "var(--danger-text)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
              Email Admin
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="reneo-field h-10 w-full px-3 text-sm"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
              Kata Sandi
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="reneo-field h-10 w-full px-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="reneo-btn-primary h-10 w-full text-sm"
          >
            {submitting ? "Memverifikasi..." : "Masuk ke Panel Admin"}
          </button>
        </form>
      </div>
    </main>
  );
}
