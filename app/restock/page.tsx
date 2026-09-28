"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { History, LayoutGrid, Pencil, Plus, Search, Trash2, X, Check } from 'lucide-react';
import { db, type RestockTable, type SupplyTable } from '@/lib/db';
import { SUPPLY_CATEGORIES } from '@/constants';
import { useSettings } from '@/lib/settings';
import {
  addSupply,
  isOpen,
  markArrived,
  markMissing,
  moveSupply,
  relTime,
  removeSupply,
  shortSpan,
  span,
  undoArrived,
  undoMissing,
} from '@/lib/restock';
import { toast } from '@/lib/toast';
import Modal from '@/components/Modal';
import Wordmark from '@/components/Wordmark';

/** 第一下选中后，多久内点第二下才算确认 */
const ARM_MS = 2500;

export default function RestockPage() {
  const { currentBarista: by } = useSettings();
  const [tab, setTab] = useState<'list' | 'history'>('list');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // 正在往哪个分类里添加
  const [newName, setNewName] = useState('');
  const [editSupply, setEditSupply] = useState<SupplyTable | null>(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => {
    if (armTimer.current) clearTimeout(armTimer.current);
  }, []);

  const supplies = useLiveQuery(() => db.supplies.toArray(), [], [] as SupplyTable[]);
  const records = useLiveQuery(() => db.restock.orderBy('createdAt').reverse().toArray(), [], [] as RestockTable[]);

  // 每个原料当前的缺货记录（最早那条）
  const openByItem = useMemo(() => {
    const m = new Map<string, RestockTable>();
    [...records].reverse().forEach(r => {
      if (isOpen(r) && !m.has(r.item)) m.set(r.item, r);
    });
    return m;
  }, [records]);

  const missingList = useMemo(
    () => Array.from(openByItem.values()).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [openByItem],
  );

  const categories = useMemo<string[]>(() => {
    const extra: string[] = Array.from(new Set<string>(supplies.map(s => s.category))).filter(c => !(SUPPLY_CATEGORIES as readonly string[]).includes(c));
    return [...SUPPLY_CATEGORIES, ...extra];
  }, [supplies]);

  const q = query.trim();
  const grouped = useMemo(() => {
    const g = new Map<string, SupplyTable[]>();
    categories.forEach(c => g.set(c, []));
    supplies
      .filter(s => !q || s.name.includes(q))
      .forEach(s => g.get(s.category)?.push(s));
    return g;
  }, [supplies, categories, q]);

  // ---------- 点一下选中，再点一下确认 ----------
  const arm = (name: string) => {
    if (armTimer.current) clearTimeout(armTimer.current);
    setArmed(name);
    armTimer.current = setTimeout(() => setArmed(null), ARM_MS);
  };

  const tap = async (name: string) => {
    if (editing) return;
    if (armed !== name) {
      arm(name);
      return;
    }
    if (armTimer.current) clearTimeout(armTimer.current);
    setArmed(null);
    const open = openByItem.get(name);
    if (!open) {
      const { record } = await markMissing(name, by);
      toast(`已标记缺货：${name}`, {
        kind: 'info',
        duration: 5000,
        action: { label: '撤销', onClick: () => void undoMissing(record.id!) },
      });
    } else {
      const ids = await markArrived(name, by);
      toast(`「${name}」已到货 · 缺了 ${span(open.createdAt, new Date())}`, {
        kind: 'success',
        duration: 5000,
        action: { label: '撤销', onClick: () => void undoArrived(ids) },
      });
    }
  };

  const submitNew = async (category: string) => {
    try {
      await addSupply(newName, category);
      toast(`已添加到「${category}」：${newName.trim()}`, { kind: 'success' });
      setNewName('');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { kind: 'error' });
    }
  };

  const historyList = useMemo(() => {
    const hq = historyQuery.trim();
    return hq ? records.filter(r => r.item.includes(hq)) : records;
  }, [records, historyQuery]);

  // ---------- 渲染 ----------
  const chip = (name: string, key: number, supply?: SupplyTable) => (
    <Chip
      key={key}
      name={name}
      open={openByItem.get(name)}
      isArmed={armed === name}
      editing={editing}
      now={now}
      onTap={() => (editing && supply ? setEditSupply(supply) : void tap(name))}
    />
  );

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 space-y-3">
        {/* Header */}
        <header className="flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <Wordmark className="h-8 w-auto text-ink mb-1" />
            <h1 className="text-xl font-black tracking-tight">
              缺货补货
              <span className={`font-bold text-base ml-2 ${missingList.length ? 'text-danger' : 'text-muted'}`}>
                {missingList.length ? `${missingList.length} 样缺货` : '目前不缺东西 👍'}
              </span>
            </h1>
          </div>
          <div className="flex p-1 rounded-full bg-sunken">
            {([
              ['list', '清单', LayoutGrid],
              ['history', '补货记录', History],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`h-9 px-4 rounded-full text-sm font-black flex items-center gap-1.5 transition-colors ${
                  tab === id ? 'bg-brand text-brand-fg shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </header>

        {tab === 'list' ? (
          <>
            {/* 工具栏 */}
            <div className="flex items-center gap-2">
              <label className="flex-1 h-10 rounded-full bg-panel border border-line flex items-center gap-2 px-3 focus-within:border-brand">
                <Search size={16} className="text-muted shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="找原料…"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold placeholder:text-muted"
                />
                {q && (
                  <button onClick={() => setQuery('')} className="text-muted" aria-label="清空">
                    <X size={14} />
                  </button>
                )}
              </label>
              <button
                onClick={() => {
                  setEditing(v => !v);
                  setArmed(null);
                  setAdding(null);
                }}
                className={`h-10 px-4 rounded-full text-sm font-black flex items-center gap-1.5 border ${
                  editing ? 'bg-brand text-brand-fg border-brand' : 'bg-panel border-line text-muted hover:text-ink'
                }`}
              >
                {editing ? <Check size={15} /> : <Pencil size={15} />} {editing ? '完成编辑' : '编辑清单'}
              </button>
            </div>
            <p className="text-xs font-bold text-muted px-1">
              {editing
                ? '编辑模式：点原料可以改分类或删除，点"+ 添加"新增原料'
                : '点一下选中，2 秒内再点一下确认：有货 → 缺货（红色）→ 到货。点错了可以在底部提示里撤销。'}
            </p>

            {/* 缺货中 */}
            {missingList.length > 0 && !editing && (
              <section className="rounded-2xl border-2 border-danger/30 bg-danger/5 p-3">
                <h2 className="text-sm font-black text-danger mb-2">缺货中 · 到货后点两下</h2>
                <div className="flex flex-wrap gap-1.5">
                  {missingList.map(r => chip(r.item, r.id!))}
                </div>
              </section>
            )}

            {/* 分类清单 */}
            {categories.map(cat => {
              const items = grouped.get(cat) || [];
              if (q && items.length === 0) return null;
              const missingCount = items.filter(s => openByItem.has(s.name)).length;
              return (
                <section key={cat} className="rounded-2xl bg-sunken/60 border border-line p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="font-black">{cat}</h2>
                    <span className="text-xs font-bold text-muted">
                      {items.length} 样{missingCount > 0 && <span className="text-danger"> · {missingCount} 样缺</span>}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map(s => chip(s.name, s.id!, s))}
                    {adding === cat ? (
                      <form
                        className="flex items-center gap-1"
                        onSubmit={e => {
                          e.preventDefault();
                          void submitNew(cat);
                        }}
                      >
                        <input
                          autoFocus
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          placeholder="原料名称"
                          className="h-9 w-32 rounded-lg border-2 border-brand bg-canvas px-2 text-sm font-bold outline-none"
                        />
                        <button type="submit" className="h-9 px-3 rounded-lg bg-brand text-brand-fg text-sm font-black">
                          添加
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdding(null);
                            setNewName('');
                          }}
                          className="h-9 w-9 rounded-lg text-muted flex items-center justify-center"
                          aria-label="取消"
                        >
                          <X size={16} />
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setAdding(cat);
                          setNewName(q);
                        }}
                        className="h-9 px-3 rounded-lg border border-dashed border-muted text-muted text-sm font-bold flex items-center gap-1 hover:text-ink"
                      >
                        <Plus size={14} /> 添加
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          /* 补货记录 */
          <section className="rounded-2xl bg-panel border border-line shadow-card overflow-hidden">
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
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left text-xs font-black text-muted bg-sunken/60">
                    <th className="px-4 py-2.5">原料</th>
                    <th className="px-3 py-2.5">缺货</th>
                    <th className="px-3 py-2.5">到货</th>
                    <th className="px-3 py-2.5 text-right">缺了多久</th>
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
                      <Cell at={r.arrivedAt} who={r.arrivedBy} now={now} />
                      <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                        {r.arrivedAt ? span(r.createdAt, r.arrivedAt) : <span className="text-danger">缺货中 {span(r.createdAt, now)}</span>}
                      </td>
                    </tr>
                  ))}
                  {historyList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted font-bold">
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

      {/* 编辑原料 */}
      {editSupply && (
        <Modal onClose={() => setEditSupply(null)} title={editSupply.name} subtitle="改分类或删除" size="sm">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-black text-muted mb-2">分类</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={async () => {
                      await moveSupply(editSupply.id!, c);
                      setEditSupply(null);
                    }}
                    className={`h-10 px-4 rounded-xl text-sm font-black border-2 ${
                      c === editSupply.category ? 'border-brand bg-brand/10' : 'border-line text-muted'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={async () => {
                await removeSupply(editSupply.id!);
                toast(`已从清单删除：${editSupply.name}（历史记录保留）`, { kind: 'info' });
                setEditSupply(null);
              }}
              className="w-full h-11 rounded-xl bg-danger/10 text-danger font-black flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> 从清单删除
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Chip({
  name,
  open,
  isArmed,
  editing,
  now,
  onTap,
}: {
  name: string;
  open?: RestockTable;
  isArmed: boolean;
  editing: boolean;
  now: Date;
  onTap: () => void;
}) {
  let cls = 'bg-panel border-line text-ink hover:border-muted';
  if (open) cls = 'bg-danger/15 border-danger/40 text-danger';
  if (isArmed) cls = open ? 'bg-ok text-white border-ok anim-pop' : 'bg-danger text-white border-danger anim-pop';
  if (editing) cls = 'bg-panel border-dashed border-muted text-ink';
  return (
    <button
      onClick={onTap}
      className={`h-9 px-3 rounded-lg border text-sm font-bold flex items-center gap-1.5 transition-colors select-none ${cls}`}
    >
      {editing && <Pencil size={12} className="text-muted" />}
      <span>{name}</span>
      {isArmed ? (
        <span className="text-xs font-black opacity-90">· 再点{open ? '确认到货' : '标记缺货'}</span>
      ) : (
        open && !editing && <span className="text-xs font-black opacity-80">· 缺{shortSpan(open.createdAt, now)}</span>
      )}
    </button>
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
