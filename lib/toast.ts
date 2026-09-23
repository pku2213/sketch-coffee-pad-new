/**
 * [v7 NEW] 轻提示（替代原来到处弹的 alert，不打断操作）
 */
import { useSyncExternalStore } from 'react';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
  duration: number;
}

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function toast(
  message: string,
  opts: { kind?: ToastKind; action?: Toast['action']; duration?: number } = {}
) {
  const t: Toast = {
    id: ++seq,
    kind: opts.kind ?? 'info',
    message,
    action: opts.action,
    duration: opts.duration ?? (opts.kind === 'error' ? 6000 : 3000),
  };
  toasts = [...toasts.slice(-3), t];
  emit();
  setTimeout(() => dismissToast(t.id), t.duration);
  return t.id;
}

export function dismissToast(id: number) {
  const next = toasts.filter(t => t.id !== id);
  if (next.length !== toasts.length) {
    toasts = next;
    emit();
  }
}

const EMPTY: Toast[] = [];

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => toasts,
    () => EMPTY
  );
}
