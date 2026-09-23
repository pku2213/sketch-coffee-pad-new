/**
 * [v7 NEW] 自动同步引擎
 *  - 订单：完成后自动推送到飞书；失败/离线时留在本地队列，联网后自动补传
 *  - 服务端按「订单号 + 下单时间」去重，所以重复推送也不会在飞书里重复记账
 *  - 菜单/打卡清单：打开时如果超过 6 小时没更新，就静默从飞书刷新一次
 */
import { useSyncExternalStore } from 'react';
import { db, getMeta, setMeta, type DutyTable, type OrderTable } from './db';
import type { MenuItem } from '../types';

/* ---------------- 状态 ---------------- */

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  lastSyncAt: number | null;
  lastError: string | null;
}

let status: SyncStatus = { online: true, syncing: false, lastSyncAt: null, lastError: null };
const listeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach(l => l());
}

const SERVER_STATUS: SyncStatus = { online: true, syncing: false, lastSyncAt: null, lastError: null };

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
    () => SERVER_STATUS
  );
}

export function setOnline(online: boolean) {
  if (status.online !== online) setStatus({ online });
}

/* ---------------- 订单同步 ---------------- */

const BATCH_SIZE = 100;
let inFlight: Promise<SyncResult> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export interface SyncResult {
  synced: number;
  pending: number;
  error?: string;
}

function toPayload(order: OrderTable) {
  return {
    orderId: order.orderId,
    timestamp: new Date(order.timestamp).getTime(),
    itemName: order.syncItemName || order.itemName,
    originalPrice: order.originalPrice ?? order.payable,
    discounts:
      order.syncDiscounts ||
      order.discounts ||
      (order.selectedBenefits && order.selectedBenefits.length > 0 ? order.selectedBenefits.join(', ') : '无优惠'),
    finalPrice: order.payable,
    signature: order.signature || '',
  };
}

async function getUnsynced(): Promise<OrderTable[]> {
  return db.orders
    .where('isSynced')
    .equals(0)
    .filter(o => o.status === 'completed')
    .sortBy('timestamp');
}

export async function countUnsynced(): Promise<number> {
  return db.orders.where('isSynced').equals(0).filter(o => o.status === 'completed').count();
}

async function runSync(): Promise<SyncResult> {
  const unsynced = await getUnsynced();
  if (unsynced.length === 0) {
    setStatus({ lastError: null });
    return { synced: 0, pending: 0 };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setOnline(false);
    return { synced: 0, pending: unsynced.length, error: '网络未连接' };
  }

  setStatus({ syncing: true });
  let synced = 0;
  let error: string | undefined;

  try {
    for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
      const chunk = unsynced.slice(i, i + BATCH_SIZE);
      const res = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify({ orders: chunk.map(toPayload) }),
      });

      let body: { success?: boolean; syncedKeys?: string[]; error?: string } = {};
      try {
        body = await res.json();
      } catch {
        /* 非 JSON（比如网关超时页） */
      }

      // 服务端返回已确认写入（或本来就存在）的 "订单号|时间戳" 列表，只标记这些
      const okKeys = new Set(body.syncedKeys || []);
      const okIds = chunk
        .filter(o => okKeys.has(`${o.orderId}|${new Date(o.timestamp).getTime()}`))
        .map(o => o.id!);
      if (okIds.length > 0) {
        await db.orders.where('id').anyOf(okIds).modify({ isSynced: 1 });
        synced += okIds.length;
      }

      if (!res.ok || !body.success) {
        error = body.error || `服务器返回 ${res.status}`;
        break;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    if (/fetch|network|Failed/i.test(error)) error = '网络不稳定，稍后自动重试';
  }

  const pending = await countUnsynced();
  setStatus({
    syncing: false,
    lastError: error ?? null,
    lastSyncAt: error ? status.lastSyncAt : Date.now(),
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });
  return { synced, pending, error };
}

/** 立即同步（有正在进行的同步就复用，不会并发重复推送） */
export function syncOrdersNow(): Promise<SyncResult> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!inFlight) {
    inFlight = runSync().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** 延迟同步（完成订单后等几秒再推，给"撤销"留时间；多次调用会合并） */
export function scheduleOrderSync(delayMs = 10_000) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncOrdersNow();
  }, delayMs);
}

/* ---------------- 菜单 / 打卡清单刷新 ---------------- */

const STALE_MS = 6 * 60 * 60 * 1000;

function nowLabel() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

export async function refreshMenu({ force = false } = {}): Promise<'updated' | 'fresh' | 'failed'> {
  if (!force) {
    const last = await getMeta<number>('menuSyncedAt');
    if (last && Date.now() - last < STALE_MS) return 'fresh';
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'failed';
  try {
    const res = await fetch('/api/menu', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const menu = (await res.json()) as MenuItem[];
    if (!Array.isArray(menu) || menu.length === 0) throw new Error('飞书菜单为空');
    // 在一个事务里"清空 + 写入"，写入失败会整体回滚，本地菜单不会变空
    await db.transaction('rw', db.menu, async () => {
      await db.menu.clear();
      await db.menu.bulkPut(menu);
    });
    await setMeta('menuSyncedAt', Date.now());
    try {
      localStorage.setItem('menu_last_synced', nowLabel());
    } catch {
      /* ignore */
    }
    return 'updated';
  } catch (e) {
    console.warn('[sync] menu refresh failed', e);
    return 'failed';
  }
}

export async function refreshDuty({ force = false } = {}): Promise<'updated' | 'fresh' | 'failed'> {
  if (!force) {
    const last = await getMeta<number>('dutySyncedAt');
    if (last && Date.now() - last < STALE_MS) return 'fresh';
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'failed';
  try {
    const res = await fetch('/api/duty', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, { cat: string; items: string[] }[]>;
    const rows: DutyTable[] = [
      ...(data.MORNING || []).map(g => ({ cat: g.cat, items: g.items, type: 'MORNING' as const })),
      ...(data.EVENING || []).map(g => ({ cat: g.cat, items: g.items, type: 'EVENING' as const })),
      ...(data.DEEP_CLEAN || []).map(g => ({ cat: g.cat, items: g.items, type: 'DEEP' as const })),
    ];
    if (rows.length === 0) throw new Error('飞书任务清单为空');
    await db.transaction('rw', db.duty, async () => {
      await db.duty.clear();
      await db.duty.bulkAdd(rows);
    });
    await setMeta('dutySyncedAt', Date.now());
    return 'updated';
  } catch (e) {
    console.warn('[sync] duty refresh failed', e);
    return 'failed';
  }
}
