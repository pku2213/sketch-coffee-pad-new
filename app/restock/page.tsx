"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AtSign,
  BellRing,
  ChevronDown,
  ClipboardCopy,
  History,
  LayoutGrid,
  PackageCheck,
  PackageX,
  Search,
  Trash2,
  Truck,
  Undo2,
} from 'lucide-react';
import { db, type RestockTable } from '@/lib/db';
import { INVENTORY_ITEMS } from '@/constants';
import { useSettings } from '@/lib/settings';
import {
  BOSS,
  OPEN_STATUSES,
  STATUS_LABEL,
  buildMessage,
  copyText,
  markArrived,
  markOrdered,
  markRequested,
  relTime,
  removeRecord,
  reportMissing,
  span,
  stepBack,
} from '@/lib/restock';
import { toast } from '@/lib/toast';
import Modal from '@/components/Modal';
import Wordmark from '@/components/Wordmark';

const WAIT_WARN_MS = 48 * 60 * 60 * 1000; // @了 2 天还没到就提醒

export default function RestockPage() {
  const { currentBarista } = useSettings();
  const by = currentBarista;
  const [tab, setTab] = useState<'board' | 'history'>('board');
  const [item, setItem] = useState('');
  const [note, setNote] = useState('');
  const [showChips, setShowChips] = useState(true);
  const [message, setMessage] = useState<{ records: RestockTable[]; reminder: boolean } | null>(null);
  const [deleting, setDeleting] = useState<RestockTable | null>(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const all = useLiveQuery(() => db.restock.orderBy('createdAt').reverse().toArray(), [], [] as RestockTable[]);

  const missing = useMemo(() => all.filter(r => r.status === 'missing'), [all]);
  const waiting = useMemo(
    () =>
      all
        .filter(r => r.status === 'requested' || r.status === 'ordered')
        .sort((a, b) => +new Date(a.requestedAt ?? a.createdAt) - +new Date(b.requestedAt ?? b.createdAt)),
    [all],
  );
  const recentArrived = useMemo(() => {
    const since = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    return all
      .filter(r => r.status === 'arrived' && r.arrivedAt && +new Date(r.arrivedAt) >= since)
      .sort((a, b) => +new Date(b.arrivedAt!) - +new Date(a.arrivedAt!));
  }, [all, now]);

  const openByItem = useMemo(() => {
    const m = new Map<string, RestockTable>();
    all.filter(r => OPEN_STATUSES.includes(r.status)).forEach(r => m.set(r.item, r));
    return m;
  }, [all]);

  const suggestions = useMemo(
    () => Array.from(new Set([...INVENTORY_ITEMS, ...all.map(r => r.item)])),
    [all],
  );

  // ---------- 操作 ----------
  const report = async (name: string, n = '') => {
    try {
      const { record, existed } = await reportMissing(name, by, n);
      if (existed) {
        toast(`「${record.item}」已经在清单里：${STATUS_LABEL[record.status]}（${relTime(record.requestedAt ?? record.createdAt, new Date())}）`, {
          kind: 'info',
          duration: 5000,
        });
      } else {
        toast(`已登记缺货：${record.item}`, { kind: 'success' });
      }
      setItem('');
      setNote('');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { kind: 'error' });
    }
  };

  const confirmMessage = async (copy: boolean) => {
    if (!message) return;
    const text = buildMessage(message.records, by, message.reminder);
    let copied = false;
    if (copy) copied = await copyText(text);
    await markRequested(message.records.map(r => r.id!), by);
    setMessage(null);
    if (copy && !copied) toast('复制失败，请长按上面的文字手动复制；已标记为已@舒舒', { kind: 'error', duration: 6000 });
    else if (copy) toast(`已复制，去群里粘贴发给${BOSS}${message.reminder ? '' : ' · 已标记为已@'}`, { kind: 'success', duration: 5000 });
    else toast(message.reminder ? '已记录再次提醒' : `已标记为已@${BOSS}`, { kind: 'success' });
  };

  const arrive = async (r: RestockTable) => {
    await markArrived(r.id!, by);
    toast(`「${r.item}」已到货`, {
      kind: 'success',
      duration: 6000,
      action: { label: '撤销', onClick: () => void stepBack(r.id!) },
    });
  };

  const historyList = useMemo(() => {
    const q = historyQuery.trim();
    return q ? all.filter(r => r.item.includes(q) || (r.note || '').includes(q)) : all;
  }, [all, historyQuery]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 space-y-4">
        {/* Header */}
        <header className="flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <Wordmark className="h-8 w-auto text-ink mb-1" />
            <h1 className="text-xl font-black tracking-tight">
              缺货补货
              <span className="text-muted font-bold text-base ml-2">
                {missing.length + waiting.length > 0 ? `${missing.length + waiting.length} 项未到货` : '目前不缺东西 👍'}
              </span>
            </h1>
          </div>
          <div className="flex p-1 rounded-full bg-sunken">
            {([
              ['board', '看板', LayoutGrid],
              ['history', '补货记录', History],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`h-10 px-4 rounded-full text-sm font-black flex items-center gap-1.5 transition-colors ${
                  tab === id ? 'bg-brand text-brand-fg shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </header>

        {tab === 'board' ? (
          <>
            {/* 登记缺货 */}
            <section className="rounded-3xl bg-panel border border-line shadow-card p-4 space-y-3">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  void report(item, note);
                }}
              >
                <input
                  value={item}
                  onChange={e => setItem(e.target.value)}
                  list="restock-suggestions"
                  placeholder="缺什么？比如 燕麦奶"
                  className="flex-[2] min-w-[10rem] h-12 rounded-xl border-2 border-line bg-canvas px-4 font-black outline-none focus:border-brand"
                />
                <datalist id="restock-suggestions">
                  {suggestions.map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="备注（可选）：剩半盒 / 要 2 箱"
                  className="flex-[3] min-w-[10rem] h-12 rounded-xl border-2 border-line bg-canvas px-4 font-bold outline-none focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={!item.trim()}
                  className="h-12 px-5 rounded-xl bg-danger text-white font-black flex items-center gap-1.5 disabled:opacity-40"
                >
                  <PackageX size={18} /> 登记缺货
                </button>
              </form>

              <div>
                <button onClick={() => setShowChips(v => !v)} className="flex items-center gap-1 text-xs font-black text-muted mb-2">
                  <ChevronDown size={14} className={`transition-transform ${showChips ? '' : '-rotate-90'}`} />
                  常用原料（点一下直接登记缺货；有颜色的是已经登记过的）
                </button>
                {showChips && (
                  <div className="flex flex-wrap gap-1.5">
                    {INVENTORY_ITEMS.map(name => {
                      const open = openByItem.get(name);
                      const tone = !open
                        ? 'bg-sunken text-ink/80 hover:bg-sunken-2'
                        : open.status === 'missing'
                          ? 'bg-danger/15 text-danger'
                          : 'bg-accent/15 text-accent';
                      return (
                        <button
                          key={name}
                          onClick={() => void report(name)}
                          className={`h-8 px-3 rounded-full text-sm font-bold transition-colors ${tone}`}
                          title={open ? STATUS_LABEL[open.status] : '点一下登记缺货'}
                        >
                          {name}
                          {open && (
                            <span className="ml-1 text-xs font-black">
                              · {open.status === 'missing' ? '缺' : open.status === 'requested' ? '已@' : '在路上'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* 看板 */}
            <div className="grid gap-4 lg:grid-cols-3 items-start">
              {/* 1. 缺货 */}
              <Column
                tone="danger"
                icon={<PackageX size={18} />}
                title="缺货 · 还没@舒舒"
                count={missing.length}
                action={
                  missing.length > 0 && (
                    <button
                      onClick={() => setMessage({ records: missing, reminder: false })}
                      className="h-9 px-3 rounded-xl bg-danger text-white text-sm font-black flex items-center gap-1.5"
                    >
                      <AtSign size={15} /> @{BOSS}
                    </button>
                  )
                }
                empty="没有待通知的缺货"
              >
                {missing.map(r => (
                  <Card key={r.id} r={r}>
                    <Meta label="登记" at={r.createdAt} who={r.createdBy} now={now} />
                    <div className="flex gap-1.5 pt-1">
                      <SmallBtn onClick={() => setMessage({ records: [r], reminder: false })} primary>
                        <AtSign size={14} /> 只@这一项
                      </SmallBtn>
                      <SmallBtn onClick={() => setDeleting(r)} title="登记错了，删除">
                        <Trash2 size={14} />
                      </SmallBtn>
                    </div>
                  </Card>
                ))}
              </Column>

              {/* 2. 等待到货 */}
              <Column
                tone="accent"
                icon={<Truck size={18} />}
                title="已@舒舒 · 等到货"
                count={waiting.length}
                action={
                  waiting.length > 0 && (
                    <button
                      onClick={() => setMessage({ records: waiting, reminder: true })}
                      className="h-9 px-3 rounded-xl bg-accent/15 text-accent text-sm font-black flex items-center gap-1.5"
                    >
                      <BellRing size={15} /> 再提醒
                    </button>
                  )
                }
                empty="没有在路上的东西"
              >
                {waiting.map(r => {
                  const waited = now.getTime() - +new Date(r.requestedAt ?? r.createdAt);
                  const overdue = waited > WAIT_WARN_MS;
                  return (
                    <Card key={r.id} r={r} warn={overdue}>
                      <span
                        className={`self-start text-xs font-black px-2 py-0.5 rounded-full ${
                          r.status === 'ordered' ? 'bg-cold/15 text-cold' : 'bg-accent/15 text-accent'
                        }`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                      <Meta label="登记" at={r.createdAt} who={r.createdBy} now={now} />
                      <Meta label={`@${BOSS}`} at={r.requestedAt} who={r.requestedBy} now={now} />
                      {r.remindedAt && <Meta label="再提醒" at={r.remindedAt} now={now} />}
                      {r.orderedAt && <Meta label="已买" at={r.orderedAt} who={r.orderedBy} now={now} />}
                      <p className={`text-xs font-bold ${overdue ? 'text-accent' : 'text-muted'}`}>
                        已等 {span(r.requestedAt ?? r.createdAt, now)}
                        {overdue && ' · 等挺久了，要不要再提醒一下？'}
                      </p>
                      <div className="flex gap-1.5 pt-1">
                        <SmallBtn onClick={() => void arrive(r)} primary tone="ok">
                          <PackageCheck size={14} /> 已到货
                        </SmallBtn>
                        {r.status === 'requested' && (
                          <SmallBtn onClick={() => void markOrdered(r.id!, by)} title={`${BOSS}说已经买了`}>
                            <Truck size={14} /> 已买
                          </SmallBtn>
                        )}
                        <SmallBtn onClick={() => void stepBack(r.id!)} title="撤回一步">
                          <Undo2 size={14} />
                        </SmallBtn>
                      </div>
                    </Card>
                  );
                })}
              </Column>

              {/* 3. 最近到货 */}
              <Column tone="ok" icon={<PackageCheck size={18} />} title="最近 7 天到货" count={recentArrived.length} empty="最近没有到货记录">
                {recentArrived.map(r => (
                  <Card key={r.id} r={r} muted>
                    <Meta label="到货" at={r.arrivedAt} who={r.arrivedBy} now={now} />
                    <p className="text-xs font-bold text-muted">从缺货到到货用了 {span(r.createdAt, r.arrivedAt)}</p>
                    <div className="flex gap-1.5 pt-1">
                      <SmallBtn onClick={() => void stepBack(r.id!)} title="点错了，撤回">
                        <Undo2 size={14} /> 撤回
                      </SmallBtn>
                    </div>
                  </Card>
                ))}
              </Column>
            </div>
          </>
        ) : (
          /* 补货记录 */
          <section className="rounded-3xl bg-panel border border-line shadow-card overflow-hidden">
            <div className="p-3 border-b border-line flex items-center gap-2">
              <label className="flex-1 h-10 rounded-full bg-canvas border border-line flex items-center gap-2 px-3 focus-within:border-brand">
                <Search size={16} className="text-muted" />
                <input
                  value={historyQuery}
                  onChange={e => setHistoryQuery(e.target.value)}
                  placeholder="搜索原料，看它每次是什么时候缺的、什么时候到的"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold placeholder:text-muted"
                />
              </label>
              <span className="text-sm font-bold text-muted shrink-0 px-2">{historyList.length} 条</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="text-left text-xs font-black text-muted bg-sunken/60">
                    <th className="px-4 py-2.5">原料</th>
                    <th className="px-3 py-2.5">缺货登记</th>
                    <th className="px-3 py-2.5">@{BOSS}</th>
                    <th className="px-3 py-2.5">已买</th>
                    <th className="px-3 py-2.5">到货</th>
                    <th className="px-3 py-2.5 text-right">用时</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {historyList.map(r => (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-2.5">
                        <p className="font-black">{r.item}</p>
                        {r.note && <p className="text-xs font-bold text-muted">{r.note}</p>}
                      </td>
                      <Cell at={r.createdAt} who={r.createdBy} now={now} />
                      <Cell at={r.requestedAt} who={r.requestedBy} now={now} />
                      <Cell at={r.orderedAt} who={r.orderedBy} now={now} />
                      <Cell at={r.arrivedAt} who={r.arrivedBy} now={now} />
                      <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                        {r.arrivedAt ? span(r.createdAt, r.arrivedAt) : <span className="text-accent">{STATUS_LABEL[r.status].split(' · ')[0]}</span>}
                      </td>
                    </tr>
                  ))}
                  {historyList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted font-bold">
                        还没有补货记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* 发给舒舒的消息 */}
      {message && (
        <Modal
          onClose={() => setMessage(null)}
          title={message.reminder ? `再提醒${BOSS}（${message.records.length} 项）` : `@${BOSS} 补货（${message.records.length} 项）`}
          subtitle="复制后去群里粘贴发送；这里会记下时间，下次就知道已经@过了"
          size="md"
          footer={
            <div className="flex gap-2">
              <button onClick={() => void confirmMessage(false)} className="flex-1 h-12 rounded-xl bg-sunken font-black text-muted text-sm">
                我已经手动发了，只做标记
              </button>
              <button
                onClick={() => void confirmMessage(true)}
                className="flex-1 h-12 rounded-xl bg-brand text-brand-fg font-black flex items-center justify-center gap-2"
              >
                <ClipboardCopy size={18} /> 复制消息
              </button>
            </div>
          }
        >
          <pre className="whitespace-pre-wrap rounded-2xl bg-sunken p-4 text-base font-bold leading-relaxed select-text font-sans">
            {buildMessage(message.records, by, message.reminder)}
          </pre>
          {!by && <p className="mt-3 text-xs font-bold text-danger">提示：还没设置当前值班咖啡师，消息落款会显示"值班咖啡师"。</p>}
        </Modal>
      )}

      {deleting && (
        <Modal onClose={() => setDeleting(null)} title={`删除「${deleting.item}」这条登记？`} subtitle="只在登记错了的时候用" size="sm" tone="danger">
          <div className="flex gap-2">
            <button onClick={() => setDeleting(null)} className="flex-1 h-12 rounded-xl bg-sunken font-black text-muted">
              保留
            </button>
            <button
              onClick={async () => {
                await removeRecord(deleting.id!);
                setDeleting(null);
              }}
              className="flex-1 h-12 rounded-xl bg-danger text-white font-black"
            >
              删除
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- 小组件 ---------------- */

const TONES = {
  danger: { bar: 'bg-danger', text: 'text-danger' },
  accent: { bar: 'bg-accent', text: 'text-accent' },
  ok: { bar: 'bg-ok', text: 'text-ok' },
} as const;

function Column({
  tone,
  icon,
  title,
  count,
  action,
  empty,
  children,
}: {
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  title: string;
  count: number;
  action?: React.ReactNode;
  empty: string;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <section className="rounded-3xl bg-sunken/70 border border-line overflow-hidden">
      <div className={`h-1 ${t.bar}`} />
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <span className={t.text}>{icon}</span>
        <h2 className="font-black mr-auto">
          {title} <span className="text-muted font-bold">{count}</span>
        </h2>
        {action}
      </div>
      <div className="px-3 pb-3 space-y-2">
        {count === 0 ? <p className="py-6 text-center text-sm font-bold text-muted">{empty}</p> : children}
      </div>
    </section>
  );
}

function Card({ r, warn, muted, children }: { r: RestockTable; warn?: boolean; muted?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`anim-rise rounded-2xl bg-panel border p-3 flex flex-col gap-1 shadow-card ${
        warn ? 'border-accent/60' : 'border-line'
      } ${muted ? 'opacity-90' : ''}`}
    >
      <p className="font-black text-base leading-snug">
        {r.item}
        {r.note && <span className="ml-2 text-sm font-bold text-muted">{r.note}</span>}
      </p>
      {children}
    </div>
  );
}

function Meta({ label, at, who, now }: { label: string; at?: Date; who?: string; now: Date }) {
  if (!at) return null;
  return (
    <p className="text-xs font-bold text-muted">
      <span className="text-ink/70">{label}</span> {relTime(at, now)}
      {who ? ` · ${who}` : ''}
    </p>
  );
}

function Cell({ at, who, now }: { at?: Date; who?: string; now: Date }) {
  return (
    <td className="px-3 py-2.5 whitespace-nowrap">
      {at ? (
        <>
          <p className="font-bold">{relTime(at, now)}</p>
          {who && <p className="text-xs font-bold text-muted">{who}</p>}
        </>
      ) : (
        <span className="text-muted">—</span>
      )}
    </td>
  );
}

function SmallBtn({
  children,
  onClick,
  primary,
  tone,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  tone?: 'ok';
  title?: string;
}) {
  const cls = primary
    ? tone === 'ok'
      ? 'bg-ok text-white'
      : 'bg-brand text-brand-fg'
    : 'bg-sunken text-muted hover:text-ink';
  return (
    <button onClick={onClick} title={title} className={`h-9 px-3 rounded-lg text-sm font-black flex items-center gap-1 ${cls}`}>
      {children}
    </button>
  );
}

