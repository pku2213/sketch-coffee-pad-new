"use client";

import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { dismissToast, useToasts } from "@/lib/toast";

export default function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-[min(92vw,32rem)]">
      {toasts.map(t => {
        const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertCircle : Info;
        const tone = t.kind === "success" ? "text-ok" : t.kind === "error" ? "text-danger" : "text-accent";
        return (
          <div
            key={t.id}
            className="anim-rise pointer-events-auto w-full flex items-center gap-3 rounded-2xl bg-panel text-ink border border-line shadow-float px-4 py-3"
          >
            <Icon size={20} className={`${tone} shrink-0`} />
            <span className="flex-1 text-sm font-bold leading-snug">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  dismissToast(t.id);
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-brand text-brand-fg text-sm font-black"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismissToast(t.id)} className="shrink-0 text-muted p-1" aria-label="关闭">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
