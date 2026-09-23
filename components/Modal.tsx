"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** 通用弹窗：点遮罩或按 Esc 关闭，内容区可滚动，尺寸随屏幕自适应 */
export default function Modal({
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  tone = "default",
}: {
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "default" | "danger";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const width = { sm: "max-w-sm", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-6xl" }[size];

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`anim-pop w-full ${width} max-h-[90dvh] flex flex-col bg-panel text-ink rounded-3xl shadow-float overflow-hidden border ${
          tone === "danger" ? "border-danger/30" : "border-line"
        }`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-line shrink-0">
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight truncate">{title}</h2>
              {subtitle && <p className="text-xs font-bold text-muted mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-full bg-sunken text-muted hover:text-ink flex items-center justify-center"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
