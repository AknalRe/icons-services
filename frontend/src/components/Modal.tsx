import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: ReactNode;
}

export function Modal({ open, title, subtitle, onClose, maxWidthClass = "max-w-2xl", children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border ${maxWidthClass}`}
        style={{
          backgroundColor: "var(--surface-elevated)",
          borderColor: "var(--border)",
          boxShadow: "var(--modal-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-3.5"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold" style={{ color: "var(--ink)" }}>
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate font-mono text-xs" style={{ color: "var(--ink-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="reneo-btn-ghost inline-flex h-8 w-8 shrink-0 items-center justify-center"
          >
            <X size={15} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
