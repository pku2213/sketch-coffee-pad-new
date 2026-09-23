import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { DEFAULT_MENU, MENU_CATEGORIES } from '../constants';
import type { MenuItem } from '../types';

/** 本地菜单（飞书刷新后自动更新），本地为空时用代码里的默认菜单兜底 */
export function useMenu(): { menu: MenuItem[]; categories: string[]; loaded: boolean } {
  const fromDB = useLiveQuery(() => db.menu.toArray());
  return useMemo(() => {
    const source = fromDB && fromDB.length > 0 ? fromDB : DEFAULT_MENU;
    const unique = new Map<string, MenuItem>();
    source.forEach(item => {
      if (item && item.id != null && !unique.has(String(item.id))) unique.set(String(item.id), item);
    });
    const menu = Array.from(unique.values());
    const present = new Set(menu.map(i => i.category));
    // 固定顺序在前，飞书里新增的分类排在后面
    const categories = [
      ...MENU_CATEGORIES.filter(c => present.has(c)),
      ...Array.from(present).filter(c => c && !MENU_CATEGORIES.includes(c)),
    ];
    return { menu, categories, loaded: fromDB !== undefined };
  }, [fromDB]);
}

/** 根据订单找到对应菜单项（先按 ID，再按名称） */
export function findMenuItem(
  menu: MenuItem[],
  order: { menuItemId?: string; itemName: string; syncItemName?: string }
): MenuItem | undefined {
  if (order.menuItemId) {
    const byId = menu.find(m => String(m.id) === String(order.menuItemId));
    if (byId) return byId;
  }
  const names = [order.syncItemName, order.itemName].filter(Boolean) as string[];
  for (const n of names) {
    const exact = menu.find(m => m.name === n);
    if (exact) return exact;
    const base = n.replace(/\s*[(（].*?[)）]/g, '').trim();
    const byBase = menu.find(m => m.name === base);
    if (byBase) return byBase;
  }
  return undefined;
}

/** "拿铁 (冷、燕麦奶)" → 'cold' */
export function tempOfOrder(itemName: string): 'hot' | 'cold' | undefined {
  const m = /[(（]([^)）]*)[)）]/.exec(itemName);
  if (!m) return undefined;
  const first = m[1].split(/[、,，]/)[0];
  if (first === '冷') return 'cold';
  if (first === '热') return 'hot';
  return undefined;
}

export const CATEGORY_SHORT_NAMES: Record<string, string> = {
  无咖啡因: '无咖',
  美式系列: '美式',
  拿铁系列: '拿铁',
  限定特调: '限定',
  酒品: '酒品',
  美味小食和其他: '美味',
  库房: '库房',
};

export const SUB_CATEGORY_SHORT_NAMES: Record<string, string> = {
  纯咖: '纯咖',
  果汁: '果汁',
  茶: '茶',
  奶: '奶',
  果汁美式: '果汁',
  果汁气泡美式: '气泡',
};
