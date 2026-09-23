/**
 * [v7.1] 缺货补货（只存本地）
 * 流程：缺货 → 已@舒舒 → 舒舒已买·在路上（可选）→ 已到货
 * 每一步都记下时间和当前值班咖啡师，方便回溯"什么时候缺的、什么时候@的、什么时候买的、什么时候到的"。
 */
import { db, type RestockStatus, type RestockTable } from './db';

export const BOSS = '舒舒';
export const OPEN_STATUSES: RestockStatus[] = ['missing', 'requested', 'ordered'];

export const STATUS_LABEL: Record<RestockStatus, string> = {
  missing: '缺货 · 还没@舒舒',
  requested: `已@${BOSS} · 等回复`,
  ordered: `${BOSS}已买 · 在路上`,
  arrived: '已到货',
};

const isOpen = (r: RestockTable) => OPEN_STATUSES.includes(r.status);

/** 登记缺货；同一样东西已经在清单里（还没到货）就不重复登记，返回已有那条 */
export async function reportMissing(
  item: string,
  by: string,
  note = ''
): Promise<{ record: RestockTable; existed: boolean }> {
  const name = item.trim();
  if (!name) throw new Error('请填写缺的东西');
  return db.transaction('rw', db.restock, async () => {
    const existing = await db.restock.where('item').equals(name).filter(isOpen).first();
    if (existing) {
      if (note.trim() && note.trim() !== existing.note) {
        await db.restock.update(existing.id!, { note: note.trim() });
        existing.note = note.trim();
      }
      return { record: existing, existed: true };
    }
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

/** 标记已@舒舒（可批量）。已经@过的保留第一次@的时间，只记录"再次提醒"时间 */
export async function markRequested(ids: number[], by: string) {
  const now = new Date();
  await db.transaction('rw', db.restock, async () => {
    for (const id of ids) {
      const r = await db.restock.get(id);
      if (!r) continue;
      if (r.status === 'missing') {
        await db.restock.update(id, { status: 'requested', requestedAt: now, requestedBy: by || undefined });
      } else if (r.status === 'requested' || r.status === 'ordered') {
        await db.restock.update(id, { remindedAt: now });
      }
    }
  });
}

export async function markOrdered(id: number, by: string) {
  const r = await db.restock.get(id);
  if (!r || r.status === 'arrived') return;
  const now = new Date();
  await db.restock.update(id, {
    status: 'ordered',
    orderedAt: now,
    orderedBy: by || undefined,
    // 没点过"已@"就直接标记已买的，补上@时间
    requestedAt: r.requestedAt ?? now,
    requestedBy: r.requestedBy ?? (by || undefined),
  });
}

export async function markArrived(id: number, by: string) {
  await db.restock.update(id, { status: 'arrived', arrivedAt: new Date(), arrivedBy: by || undefined });
}

/** 撤回一步（点错了用） */
export async function stepBack(id: number) {
  const r = await db.restock.get(id);
  if (!r) return;
  if (r.status === 'arrived') {
    await db.restock.update(id, { status: r.orderedAt ? 'ordered' : r.requestedAt ? 'requested' : 'missing', arrivedAt: undefined, arrivedBy: undefined });
  } else if (r.status === 'ordered') {
    await db.restock.update(id, { status: 'requested', orderedAt: undefined, orderedBy: undefined });
  } else if (r.status === 'requested') {
    await db.restock.update(id, { status: 'missing', requestedAt: undefined, requestedBy: undefined, remindedAt: undefined });
  }
}

export async function removeRecord(id: number) {
  await db.restock.delete(id);
}

export async function updateNote(id: number, note: string) {
  await db.restock.update(id, { note: note.trim() || undefined });
}

/* ---------------- 文案 & 时间 ---------------- */

/** 生成发到群里的消息 */
export function buildMessage(records: RestockTable[], by: string, reminder = false) {
  const d = new Date();
  const lines = records.map((r, i) => `${i + 1}. ${r.item}${r.note ? `（${r.note}）` : ''}`);
  const head = reminder ? `@${BOSS} 提醒一下，这些还没到：` : `@${BOSS} 需要补货：`;
  return `${head}\n${lines.join('\n')}\n—— ${by || '值班咖啡师'} ${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 回退到旧方法 */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

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
