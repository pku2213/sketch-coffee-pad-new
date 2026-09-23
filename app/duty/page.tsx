"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Package, RotateCcw, RefreshCw, Sun, Moon, Sparkles, UserRound } from 'lucide-react';
import { db, type DutyTable } from '@/lib/db';
import { INVENTORY_ITEMS } from '@/constants';
import { refreshDuty } from '@/lib/sync';
import { useSettings } from '@/lib/settings';
import { localDateKey } from '@/lib/orders';
import { toast } from '@/lib/toast';
import Modal from '@/components/Modal';
import Wordmark from '@/components/Wordmark';

type Shift = 'MORNING' | 'EVENING';

const LS = {
  daily: 'sketch_daily_done_v3',
  deep: 'sketch_deep_done_v3',
  sign: 'sketch_task_signatures_v1',
  inv: 'sketch_inventory_counts_v1',
  dailyDate: 'sketch_daily_date_v1',
};

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

// [v7] 用"分类+内容"做任务 key，飞书清单刷新后勾选状态不会错位
const taskKey = (prefix: string, cat: string, item: string) => `${prefix}-${cat}-${item}`;

function TaskCard({
  group,
  prefix,
  done,
  onToggle,
}: {
  group: DutyTable;
  prefix: string;
  done: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const finished = group.items.filter(i => done[taskKey(prefix, group.cat, i)]).length;
  const all = finished === group.items.length && group.items.length > 0;
  return (
    <div className={`rounded-3xl p-4 border-2 transition-colors ${all ? 'bg-ok/5 border-ok/30' : 'bg-panel border-line shadow-card'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-black px-3 py-1 rounded-full bg-brand text-brand-fg">{group.cat}</span>
        <span className={`text-xs font-black ${all ? 'text-ok' : 'text-muted'}`}>
          {finished}/{group.items.length}
        </span>
      </div>
      <div className="space-y-1">
        {group.items.map(item => {
          const key = taskKey(prefix, group.cat, item);
          const isDone = !!done[key];
          return (
            <button
              key={key}
              onClick={() => onToggle(key)}
              className="w-full flex items-start gap-3 text-left px-2 py-2 rounded-xl hover:bg-sunken transition-colors"
            >
              <span
                className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  isDone ? 'bg-brand border-brand text-brand-fg' : 'border-line bg-canvas'
                }`}
              >
                {isDone && <Check size={13} strokeWidth={3.5} />}
              </span>
              <span className={`text-sm font-bold leading-5 ${isDone ? 'text-muted line-through' : ''}`}>{item}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SignField({
  label,
  value,
  onChange,
  suggestion,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestion: string;
}) {
  return (
    <div className="flex-1 min-w-[12rem]">
      <p className="text-xs font-black text-muted mb-1.5">{label}</p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="输入姓名"
          className="flex-1 min-w-0 h-12 rounded-xl border-2 border-line bg-canvas px-3 text-center font-black outline-none focus:border-brand"
        />
        {!value && suggestion && (
          <button
            onClick={() => onChange(suggestion)}
            className="shrink-0 h-12 px-3 rounded-xl bg-brand/10 text-brand font-black text-sm flex items-center gap-1"
            title="填入当前值班咖啡师"
          >
            <UserRound size={14} /> {suggestion}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DutyPage() {
  const { currentBarista } = useSettings();
  const [tab, setTab] = useState<'daily' | 'deep'>('daily');
  const [shift, setShift] = useState<Shift>(() => (new Date().getHours() < 15 ? 'MORNING' : 'EVENING'));
  const [showReset, setShowReset] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [dailyDone, setDailyDone] = useState<Record<string, boolean>>({});
  const [deepDone, setDeepDone] = useState<Record<string, boolean>>({});
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [inventory, setInventory] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const duty = useLiveQuery(() => db.duty.toArray(), [], [] as DutyTable[]);
  const morning = useMemo(() => duty.filter(d => d.type === 'MORNING'), [duty]);
  const evening = useMemo(() => duty.filter(d => d.type === 'EVENING'), [duty]);
  const deep = useMemo(() => duty.filter(d => d.type === 'DEEP'), [duty]);
  const shiftTasks = shift === 'MORNING' ? morning : evening;

  // 读取本地状态（只在浏览器端）
  useEffect(() => {
    setDailyDone(readLS(LS.daily, {}));
    setDeepDone(readLS(LS.deep, {}));
    setSignatures(readLS(LS.sign, {}));
    setInventory(readLS(LS.inv, {}));
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) writeLS(LS.daily, dailyDone); }, [dailyDone, loaded]);
  useEffect(() => { if (loaded) writeLS(LS.deep, deepDone); }, [deepDone, loaded]);
  useEffect(() => { if (loaded) writeLS(LS.sign, signatures); }, [signatures, loaded]);
  useEffect(() => { if (loaded) writeLS(LS.inv, inventory); }, [inventory, loaded]);

  // [v7] 日常打卡每天自动清空（大扫除和库存不自动清）
  useEffect(() => {
    if (!loaded) return;
    const check = () => {
      const today = localDateKey(new Date());
      const last = readLS<string | null>(LS.dailyDate, null);
      if (last !== today) {
        if (last !== null) {
          setDailyDone({});
          setSignatures(prev => {
            const next = { ...prev };
            delete next['daily-MORNING'];
            delete next['daily-EVENING'];
            return next;
          });
        }
        writeLS(LS.dailyDate, today);
      }
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [loaded]);

  const toggleDaily = (key: string) => setDailyDone(p => ({ ...p, [key]: !p[key] }));
  const toggleDeep = (key: string) => setDeepDone(p => ({ ...p, [key]: !p[key] }));
  const setSign = (key: string, v: string) => setSignatures(p => ({ ...p, [key]: v }));

  const progress = (groups: DutyTable[], prefix: string, done: Record<string, boolean>) => {
    const total = groups.reduce((s, g) => s + g.items.length, 0);
    const finished = groups.reduce((s, g) => s + g.items.filter(i => done[taskKey(prefix, g.cat, i)]).length, 0);
    return { total, finished, pct: total ? Math.round((finished / total) * 100) : 0 };
  };
  const prog = tab === 'daily' ? progress(shiftTasks, `daily-${shift}`, dailyDone) : progress(deep, 'deep', deepDone);

  const handleReset = () => {
    if (tab === 'daily') {
      const prefix = `daily-${shift}-`;
      setDailyDone(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix))));
      setSignatures(prev => {
        const next = { ...prev };
        delete next[`daily-${shift}`];
        return next;
      });
    } else {
      setDeepDone({});
      setSignatures(prev => {
        const next = { ...prev };
        delete next['deep-1'];
        delete next['deep-2'];
        return next;
      });
    }
    setShowReset(false);
  };

  const manualSync = async () => {
    setSyncing(true);
    const r = await refreshDuty({ force: true });
    setSyncing(false);
    toast(r === 'updated' ? '任务清单已从飞书更新' : '同步失败，请检查网络', { kind: r === 'updated' ? 'success' : 'error' });
  };

  const dateLabel = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 space-y-5">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <Wordmark className="h-8 w-auto text-ink mb-1" />
            <h1 className="text-xl font-black tracking-tight">
              打卡打扫 <span className="text-muted font-bold text-base ml-1">{dateLabel}</span>
            </h1>
          </div>
          <div className="flex p-1 rounded-full bg-sunken">
            {(['daily', 'deep'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`h-10 px-5 rounded-full text-sm font-black transition-colors ${
                  tab === t ? 'bg-brand text-brand-fg shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                {t === 'daily' ? '日常打卡' : '每周大扫除'}
              </button>
            ))}
          </div>
          <button
            onClick={manualSync}
            disabled={syncing}
            className="h-10 px-4 rounded-full bg-panel border border-line text-sm font-bold text-muted hover:text-ink flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> 同步清单
          </button>
          <button
            onClick={() => setShowReset(true)}
            className="h-10 px-4 rounded-full bg-panel border border-line text-sm font-bold text-muted hover:text-danger hover:border-danger/40 flex items-center gap-2"
          >
            <RotateCcw size={14} /> 重置
          </button>
        </header>

        {/* 进度 + 班次切换 */}
        <div className="rounded-3xl bg-panel border border-line shadow-card p-4 flex flex-wrap items-center gap-4">
          {tab === 'daily' ? (
            <div className="flex gap-2">
              {(['MORNING', 'EVENING'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setShift(s)}
                  className={`h-11 px-4 rounded-2xl font-black flex items-center gap-2 border-2 transition-colors ${
                    shift === s ? 'border-brand bg-brand/10' : 'border-transparent bg-sunken text-muted'
                  }`}
                >
                  {s === 'MORNING' ? <Sun size={18} /> : <Moon size={18} />}
                  {s === 'MORNING' ? '早班准备' : '晚班收档'}
                </button>
              ))}
            </div>
          ) : (
            <span className="h-11 px-4 rounded-2xl font-black flex items-center gap-2 bg-sunken">
              <Sparkles size={18} /> 每周大扫除
            </span>
          )}
          <div className="flex-1 min-w-[10rem]">
            <div className="flex justify-between text-xs font-black text-muted mb-1.5">
              <span>完成进度</span>
              <span className={prog.pct === 100 ? 'text-ok' : ''}>
                {prog.finished}/{prog.total} · {prog.pct}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-sunken overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${prog.pct === 100 ? 'bg-ok' : 'bg-brand'}`}
                style={{ width: `${prog.pct}%` }}
              />
            </div>
          </div>
        </div>

        {tab === 'daily' ? (
          <>
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
              {shiftTasks.map(g => (
                <TaskCard key={`${g.type}-${g.cat}`} group={g} prefix={`daily-${shift}`} done={dailyDone} onToggle={toggleDaily} />
              ))}
            </div>
            <div className="rounded-3xl bg-sunken p-4 flex flex-wrap items-end gap-4">
              <SignField
                label={`${shift === 'MORNING' ? '早班' : '晚班'}咖啡师签名确认`}
                value={signatures[`daily-${shift}`] || ''}
                onChange={v => setSign(`daily-${shift}`, v)}
                suggestion={currentBarista}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
              {deep.map(g => (
                <TaskCard key={`${g.type}-${g.cat}`} group={g} prefix="deep" done={deepDone} onToggle={toggleDeep} />
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-3xl bg-panel border border-line shadow-card p-4">
                <h3 className="flex items-center gap-2 font-black mb-3">
                  <Package size={18} /> 清点余货
                </h3>
                <div className="grid gap-x-4 gap-y-1 grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]">
                  {INVENTORY_ITEMS.map(item => (
                    <label key={item} className="flex items-center justify-between gap-2 py-1.5 border-b border-dashed border-line">
                      <span className="text-sm font-bold truncate">{item}</span>
                      <input
                        value={inventory[item] || ''}
                        onChange={e => setInventory(p => ({ ...p, [item]: e.target.value }))}
                        inputMode="decimal"
                        className="w-14 h-8 rounded-lg bg-sunken text-center font-mono font-black outline-none focus:ring-2 focus:ring-brand/40"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl bg-sunken p-4 flex flex-col gap-4">
                <h3 className="font-black">大扫除双人签名</h3>
                <SignField label="咖啡师 1" value={signatures['deep-1'] || ''} onChange={v => setSign('deep-1', v)} suggestion={currentBarista} />
                <SignField label="咖啡师 2" value={signatures['deep-2'] || ''} onChange={v => setSign('deep-2', v)} suggestion="" />
              </div>
            </div>
          </>
        )}
      </div>

      {showReset && (
        <Modal onClose={() => setShowReset(false)} size="sm" tone="danger">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-danger/15 text-danger flex items-center justify-center">
              <RotateCcw size={30} />
            </div>
            <div>
              <h3 className="text-xl font-black">
                重置{tab === 'daily' ? (shift === 'MORNING' ? '早班' : '晚班') : '大扫除'}清单？
              </h3>
              <p className="text-sm font-bold text-muted mt-1">会清空勾选和签名（日常打卡每天也会自动清空）</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)} className="flex-1 h-12 rounded-xl bg-sunken font-black text-muted">
                取消
              </button>
              <button onClick={handleReset} className="flex-1 h-12 rounded-xl bg-danger text-white font-black">
                确认重置
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
