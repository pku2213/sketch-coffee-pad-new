import { db, getMeta, setMeta, type OrderTable } from './db';

/* ============================================================
 *  订单号：一直累计，不再按天从 001 重新数
 *  格式：YYYYMMDD-NNNNN，例如 20260923-00128（128 = 开店以来第 128 单）
 * ============================================================ */

const ORDER_SEQ_KEY = 'orderSeq'; // 最后一次发出的序号

export function formatOrderId(date: Date, seq: number) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}-${String(seq).padStart(5, '0')}`;
}

/** 从新格式订单号里取出累计序号；旧格式（YYYYMMDDNNN）返回 null */
export function parseOrderSeq(orderId: string): number | null {
  const m = /^\d{8}-(\d+)$/.exec(orderId || '');
  return m ? Number(m[1]) : null;
}

/** 第一次升级时：以本机已有订单数作为起点（之后可在"设置"里手动校准） */
async function seedSeq(): Promise<number> {
  let maxSeq = 0;
  let total = 0;
  await db.orders.each(o => {
    total++;
    const s = parseOrderSeq(o.orderId);
    if (s !== null && s > maxSeq) maxSeq = s;
  });
  return Math.max(maxSeq, total);
}

export async function nextOrderId(now = new Date()): Promise<string> {
  return db.transaction('rw', db.meta, db.orders, async () => {
    let last = await getMeta<number>(ORDER_SEQ_KEY);
    if (typeof last !== 'number' || !Number.isFinite(last)) last = await seedSeq();
    const next = last + 1;
    await setMeta(ORDER_SEQ_KEY, next);
    return formatOrderId(now, next);
  });
}

/** 下一单将使用的序号（设置页展示用） */
export async function peekNextSeq(): Promise<number> {
  const last = await getMeta<number>(ORDER_SEQ_KEY);
  if (typeof last === 'number' && Number.isFinite(last)) return last + 1;
  return (await seedSeq()) + 1;
}

/** 手动校准：让下一单从 n 开始（比如和飞书表里的总单数对齐） */
export async function setNextSeq(n: number) {
  if (!Number.isInteger(n) || n < 1) throw new Error('序号必须是正整数');
  await setMeta(ORDER_SEQ_KEY, n - 1);
}

/* ============================================================
 *  完成订单 & 默认签名
 * ============================================================ */

/** 实际签名人：单独签过名的用单独的，否则用当前值班咖啡师 */
export function effectiveSigner(order: Pick<OrderTable, 'signature'>, currentBarista: string) {
  return (order.signature || '').trim() || currentBarista.trim();
}

/** 还差哪些步骤才能完成（空数组 = 可以完成） */
export function missingSteps(order: OrderTable, currentBarista: string): string[] {
  const miss: string[] = [];
  if (!order.paid) miss.push('付款');
  if (!order.produced) miss.push('制作');
  if (order.needWash && !order.washed) miss.push('洗杯');
  if (!effectiveSigner(order, currentBarista)) miss.push('签名');
  return miss;
}

export function isReadyToComplete(order: OrderTable, currentBarista: string) {
  return missingSteps(order, currentBarista).length === 0;
}

/** 撤销用的快照 */
export type CompletionSnapshot = Pick<OrderTable, 'id' | 'paid' | 'produced' | 'washed' | 'signature'>;

/**
 * 完成订单（单个或批量）
 * @param markAll true = 批量完成：顺带把"付款/制作/洗杯"全部勾上
 * @returns 实际被完成的订单快照（用于撤销）
 */
export async function completeOrders(
  ids: number[],
  currentBarista: string,
  { markAll = false }: { markAll?: boolean } = {}
): Promise<CompletionSnapshot[]> {
  const snapshots: CompletionSnapshot[] = [];
  const now = new Date();
  await db.transaction('rw', db.orders, async () => {
    for (const id of ids) {
      const o = await db.orders.get(id);
      if (!o || o.status !== 'processing') continue;
      const next: OrderTable = markAll
        ? { ...o, paid: true, produced: true, washed: o.needWash ? true : o.washed }
        : o;
      const signer = effectiveSigner(next, currentBarista);
      if (!isReadyToComplete(next, currentBarista) || !signer) continue;
      snapshots.push({ id, paid: o.paid, produced: o.produced, washed: o.washed, signature: o.signature });
      await db.orders.update(id, {
        paid: next.paid,
        produced: next.produced,
        washed: next.washed,
        signature: signer,
        status: 'completed',
        completedAt: now,
        isSynced: 0,
      });
    }
  });
  return snapshots;
}

/** 撤销完成：只能撤销还没同步到飞书的 */
export async function undoComplete(snapshots: CompletionSnapshot[]): Promise<{ restored: number; alreadySynced: number }> {
  let restored = 0;
  let alreadySynced = 0;
  await db.transaction('rw', db.orders, async () => {
    for (const s of snapshots) {
      const o = await db.orders.get(s.id!);
      if (!o || o.status !== 'completed') continue;
      if (o.isSynced === 1) {
        alreadySynced++;
        continue;
      }
      await db.orders.update(s.id!, {
        status: 'processing',
        paid: s.paid,
        produced: s.produced,
        washed: s.washed,
        signature: s.signature,
        completedAt: undefined,
      });
      restored++;
    }
  });
  return { restored, alreadySynced };
}

/* ============================================================
 *  日期工具（全部按本地时区，避免凌晨导出变成前一天）
 * ============================================================ */

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function localDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
