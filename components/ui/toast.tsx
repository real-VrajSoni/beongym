"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; title: string; description?: string; tone: ToastTone };

type ToastContextValue = {
  toast: (opts: { title: string; description?: string; tone?: ToastTone }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

const TONE_CLASS: Record<ToastTone, string> = {
  success: "text-[var(--success)]",
  error: "text-[var(--danger)]",
  info: "text-[var(--info)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, tone = "success" }) => {
      const id = nextId.current++;
      setItems((prev) => [...prev, { id, title, description, tone }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
      >
        {items.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              className="animate-in-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-overlay)]"
            >
              <Icon className={cn("mt-px size-4 shrink-0", TONE_CLASS[t.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t.description}</p>
                ) : null}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded p-0.5 text-[var(--subtle-foreground)] hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
