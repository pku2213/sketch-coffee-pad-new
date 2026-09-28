/**
 * [v7.2] 缺货补货（只存本地）
 * 简化流程：有货 → 缺货 → 到货（回到有货）
 * 每次"缺货→到货"是一条记录，记下什么时候缺的、谁登记的、什么时候到的、谁确认的。
 */
import { db, type RestockTable, type SupplyTable } from './db';

/** 还没到货的记录（兼容旧版本的"已@ / 在路上"状态，一律当作缺货中） */
export const isOpen = (r: RestockTable) => r.status !== 'arrived';

/** 标记缺货；已经在缺货中就直接返回那条 */
export async function markMissing(item: string, by: string, note = ''): Promise<{ record: RestockTable; existed: boolean }> {
  const name = item.trim();
  if (!name) throw new Error('原料名称不能为空');
  return db.transaction('rw', db.restock, async () => {
    const existing = await db.restock.where('item').equals(name).filter(isOpen).first();
    if (existing) return { record: existing, existed: true };
    const record: RestockTable = {
      item: name,
      note: note.trim() || undefined,
      status: 'missing',
      createdAt: new Date(),
      createdBy: by || undefined,
    };
    record.id = (await db.restock.add(record)) as number;
    return { record, existed: false };
  });
}

/** 到货：把这个原料所有未到货的记录都关掉 */
export async function markArrived(item: string, by: string): Promise<number[]> {
  const now = new Date();
  const ids: number[] = [];
  await db.transaction('rw', db.restock, async () => {
    const open = await db.restock.where('item').equals(item).filter(isOpen).toArray();
    for (const r of open) {
      await db.restock.update(r.id!, { status: 'arrived', arrivedAt: now, arrivedBy: by || undefined });
      ids.push(r.id!);
    }
  });
  return ids;
}

/** 撤销"缺货"：删掉刚登记的那条 */
export async function undoMissing(id: number) {
  await db.restock.delete(id);
}

/** 撤销"到货"：恢复成缺货 */
export async function undoArrived(ids: number[]) {
  await db.transaction('rw', db.restock, async () => {
    for (const id of ids) {
      await db.restock.update(id, { status: 'missing', arrivedAt: undefined, arrivedBy: undefined });
    }
  });
}

export async function updateNote(id: number, note: string) {
  await db.restock.update(id, { note: note.trim() || undefined });
}

export async function removeRecord(id: number) {
  await db.restock.delete(id);
}

/* ---------------- 原料清单 ---------------- */

export async function addSupply(name: string, category: string): Promise<SupplyTable> {
  const n = name.trim();
  if (!n) throw new Error('请输入原料名称');
  const existing = await db.supplies.where('name').equals(n).first();
  if (existing) throw new Error(`「${n}」已经在「${existing.category}」里了`);
  const row: SupplyTable = { name: n, category, createdAt: new Date() };
  row.id = (await db.supplies.add(row)) as number;
  return row;
}

export async function removeSupply(id: number) {
  await db.supplies.delete(id);
}

export async function moveSupply(id: number, category: string) {
  await db.supplies.update(id, { category });
}

/* ---------------- 时间显示 ---------------- */

/** "刚刚 / 25分钟前 / 今天 16:20 / 昨天 16:20 / 9月21日 16:20" */
export function relTime(d?: Date | null, now = new Date()): string {
  if (!d) return '';
  const t = new Date(d);
  const diff = now.getTime() - t.getTime();
  const hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  if (diff < 60_000) return '刚刚';
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}分钟前`;
  const day0 = new Date(now);
  day0.setHours(0, 0, 0, 0);
  if (t >= day0) return `今天 ${hm}`;
  const y0 = new Date(day0);
  y0.setDate(y0.getDate() - 1);
  if (t >= y0) return `昨天 ${hm}`;
  const sameYear = t.getFullYear() === now.getFullYear();
  return `${sameYear ? '' : t.getFullYear() + '年'}${t.getMonth() + 1}月${t.getDate()}日 ${hm}`;
}

/** 两个时间点之间："3小时" / "1天4小时" */
export function span(from?: Date | null, to?: Date | null): string {
  if (!from || !to) return '';
  const mins = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  if (mins < 60) return `${mins}分钟`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}小时`;
  const days = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${days}天${rh}小时` : `${days}天`;
}

/** 缺货多久的简短标签："2小时" / "3天" */
export function shortSpan(from: Date, now = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(from).getTime()) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}分钟`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}小时`;
  return `${Math.floor(h / 24)}天`;
}
