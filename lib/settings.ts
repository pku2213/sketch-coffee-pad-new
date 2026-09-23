/**
 * [v7 NEW] 设备级设置（皮肤、当前值班咖啡师）
 * 存在 localStorage 里，并用 useSyncExternalStore 让所有页面实时同步。
 */
import { useSyncExternalStore } from 'react';

export type ThemeId = 'latte' | 'matcha' | 'seasalt' | 'caramel' | 'graphite' | 'espresso';

export const THEMES: { id: ThemeId; name: string; desc: string; swatch: [string, string, string] }[] = [
  { id: 'latte', name: '拿铁', desc: '经典奶咖色（默认）', swatch: ['#f7f4ee', '#4a3728', '#d98a3a'] },
  { id: 'matcha', name: '抹茶', desc: '清新草木绿', swatch: ['#f3f5ee', '#4f6b3a', '#b0913a'] },
  { id: 'seasalt', name: '海盐', desc: '干净的蓝灰', swatch: ['#f1f4f7', '#2d5b7f', '#e07a5f'] },
  { id: 'caramel', name: '焦糖', desc: '温暖的琥珀色', swatch: ['#faf6f0', '#a0612d', '#c9822f'] },
  { id: 'graphite', name: '石墨', desc: '黑白极简', swatch: ['#f4f4f3', '#262626', '#c98a2e'] },
  { id: 'espresso', name: '深夜浓缩', desc: '深色，适合晚班', swatch: ['#16110d', '#d9a066', '#e9b872'] },
];

export const THEME_STORAGE_KEY = 'sketch_theme_v1';

export interface Settings {
  theme: ThemeId;
  /** 当前值班咖啡师：完成订单时默认用这个名字签名 */
  currentBarista: string;
  /** 本班次开始时间（毫秒） */
  baristaSince: number | null;
  /** 最近用过的名字，换班时一键选择 */
  recentBaristas: string[];
}

const SETTINGS_KEY = 'sketch_settings_v1';

const DEFAULTS: Settings = {
  theme: 'latte',
  currentBarista: '',
  baristaSince: null,
  recentBaristas: [],
};

let cache: Settings | null = null;
const listeners = new Set<() => void>();

function load(): Settings {
  if (cache) return cache;
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
    const theme = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null) || parsed.theme || DEFAULTS.theme;
    cache = { ...DEFAULTS, ...parsed, theme: THEMES.some(t => t.id === theme) ? theme : 'latte' };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

function persist(next: Settings) {
  cache = next;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    localStorage.setItem(THEME_STORAGE_KEY, next.theme);
  } catch {
    /* ignore quota errors */
  }
  listeners.forEach(l => l());
}

export function getSettings(): Settings {
  return load();
}

export function updateSettings(patch: Partial<Settings>) {
  persist({ ...load(), ...patch });
}

export function setTheme(theme: ThemeId) {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme;
  updateSettings({ theme });
}

/** 换班：设置当前值班咖啡师，并记入"最近用过" */
export function setCurrentBarista(name: string) {
  const trimmed = name.trim();
  const s = load();
  const recent = trimmed
    ? [trimmed, ...s.recentBaristas.filter(n => n !== trimmed)].slice(0, 8)
    : s.recentBaristas;
  persist({
    ...s,
    currentBarista: trimmed,
    baristaSince: trimmed ? (trimmed === s.currentBarista && s.baristaSince ? s.baristaSince : Date.now()) : null,
    recentBaristas: recent,
  });
}

export function removeRecentBarista(name: string) {
  const s = load();
  persist({ ...s, recentBaristas: s.recentBaristas.filter(n => n !== name) });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY || e.key === THEME_STORAGE_KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, load, () => DEFAULTS);
}

/** "2小时15分" */
export function formatDuration(ms: number) {
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}分钟`;
  return m === 0 ? `${h}小时` : `${h}小时${m}分`;
}

/** 值班超过这个时长就提示换班（你们 3 小时一班） */
export const SHIFT_LENGTH_MS = 3 * 60 * 60 * 1000;
