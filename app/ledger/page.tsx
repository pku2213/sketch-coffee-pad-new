'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as XLSX from 'xlsx';
import {
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  CupSoda,
  PenTool,
  CheckSquare,
  Square,
  Download,
  BookOpen,
  UserRound,
  ChevronDown,
  CircleDollarSign,
  Coffee,
  CheckCheck,
  X,
  Cloud,
  CloudUpload,
} from 'lucide-react';
import { db, type OrderTable } from '@/lib/db';
import {
  completeOrders,
  effectiveSigner,
  isReadyToComplete,
  localDateKey,
  missingSteps,
  startOfDay,
  undoComplete,
  type CompletionSnapshot,
} from '@/lib/orders';
import { scheduleOrderSync } from '@/lib/sync';
import { SHIFT_LENGTH_MS, formatDuration, useSettings } from '@/lib/settings';
import { toast } from '@/lib/toast';
import { findMenuItem, tempOfOrder, useMenu } from '@/lib/useMenu';
import Modal from '@/components/Modal';
import Wordmark from '@/components/Wordmark';
import BaristaPicker from '@/components/BaristaPicker';
import RecipeModal from '@/components/RecipeModal';
import type { MenuItem } from '@/types';

const FINANCE_PASSWORD = '8888';
const UNDO_WINDOW_MS = 8000;
const SYNC_DELAY_MS = 10_000; // 比撤销窗口稍长，撤销的订单不会被传上去

const timeOf = (d: Date) => new Date(d).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
const money = (n: number) => `¥${Math.round(n * 10) / 10}`;

/* ============================================================
 *  完成后的提示 + 撤销
 * ============================================================ */
function announceCompletion(snaps: CompletionSnapshot[], signer: string) {
  if (snaps.length === 0) return;
  scheduleOrderSync(SYNC_DELAY_MS);
  toast(`已完成 ${snaps.length} 单 · 签名 ${signer}`, {
    kind: 'success',
    duration: UNDO_WINDOW_MS,
    action: {
      label: '撤销',
      onClick: async () => {
        const r = await undoComplete(snaps);
        if (r.alreadySynced > 0) toast(`${r.alreadySynced} 单已同步到飞书，无法撤销`, { kind: 'error' });
        if (r.restored > 0) toast(`已撤销 ${r.restored} 单，回到制作清单`, { kind: 'info' });
      },
    },
  });
}

function StepToggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-11 w-[3.6rem] rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-colors ${
        on ? 'bg-brand border-brand text-brand-fg' : 'border-line text-muted hover:border-muted'
      }`}
    >
      <CheckCircle2 size={16} />
      <span className="text-[0.72rem] font-black leading-none">{label}</span>
    </button>
  );
}

/* ============================================================
 *  制作中的一行
 * ============================================================ */
const ActiveOrderRow = React.memo(function ActiveOrderRow({
  item,
  isSelected,
  currentBarista,
  onToggleSelection,
  onOpenRecipe,
  onDelete,
}: {
  item: OrderTable;
  isSelected: boolean;
  currentBarista: string;
  onToggleSelection: (id: number) => void;
  onOpenRecipe: (item: OrderTable) => void;
  onDelete: (id: number) => void;
}) {
  const id = item.id!;
  // [v7 FIX] 签名草稿：外部（比如批量签名）改了签名时会同步刷新，不会再用旧的空值覆盖
  const [sig, setSig] = useState(item.signature || '');
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setSig(item.signature || '');
  }, [item.signature, focused]);

  const saveSig = async (value = sig) => {
    const v = value.trim();
    if (v !== (item.signature || '')) await db.orders.update(id, { signature: v || null });
  };

  const toggle = (field: 'paid' | 'produced' | 'washed') => {
    const patch: Partial<OrderTable> = {};
    patch[field] = !item[field];
    return db.orders.update(id, patch);
  };

  const draftOrder: OrderTable = { ...item, signature: sig.trim() || null };
  const ready = isReadyToComplete(draftOrder, currentBarista);

  const handleComplete = async () => {
    const missing = missingSteps(draftOrder, currentBarista);
    if (missing.length > 0) {
      toast(`还差：${missing.join('、')}${missing.includes('签名') ? '（可以在顶部设置当前值班咖啡师）' : ''}`, { kind: 'info' });
      return;
    }
    await saveSig();
    const snaps = await completeOrders([id], currentBarista);
    announceCompletion(snaps, effectiveSigner(draftOrder, currentBarista));
  };


  return (
    <div className={`anim-rise flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? 'bg-brand/5' : ''}`}>
      <button
        onClick={() => onToggleSelection(id)}
        className={`shrink-0 p-1 ${isSelected ? 'text-brand' : 'text-muted/60 hover:text-muted'}`}
        aria-label="选择"
      >
        {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
      </button>

      {/* 名称 & 时间 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-base font-black truncate">{item.itemName}</h3>
          <button
            onClick={() => onOpenRecipe(item)}
            className="shrink-0 p-1.5 rounded-full text-muted hover:text-ink hover:bg-sunken"
            title="查看配方"
          >
            <BookOpen size={15} />
          </button>
        </div>
        <p className="text-xs font-mono text-muted mt-0.5">
          <span className="text-accent font-bold">{timeOf(item.timestamp)}</span> · {item.orderId}
        </p>
      </div>

      <div className="shrink-0 w-14 text-right font-black text-lg">{money(item.payable)}</div>

      {/* 步骤 */}
      <div className="shrink-0 flex items-center gap-1.5">
        <StepToggle on={item.paid} label="付款" onClick={() => toggle('paid')} />
        <StepToggle on={item.produced} label="制作" onClick={() => toggle('produced')} />
        {item.needWash ? (
          <button
            onClick={() => toggle('washed')}
            className={`h-11 w-[3.6rem] rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              item.washed ? 'bg-ok/15 border-ok/40 text-ok' : 'bg-danger/10 border-danger/30 text-danger animate-pulse'
            }`}
          >
            <CupSoda size={16} />
            <span className="text-[0.72rem] font-black leading-none">{item.washed ? '已洗' : '洗杯!'}</span>
          </button>
        ) : (
          <div className="h-11 w-[3.6rem] rounded-xl border-2 border-dashed border-line flex items-center justify-center text-[0.72rem] font-bold text-muted/60">
            无需洗
          </div>
        )}
      </div>

      {/* 签名：默认用当前值班，需要时才单独填 */}
      <div className="shrink-0 w-[7.5rem]">
        <input
          type="text"
          value={sig}
          onChange={e => setSig(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            void saveSig();
          }}
          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder={currentBarista ? `默认 ${currentBarista}` : '签名'}
          className={`h-11 w-full rounded-xl border-2 bg-canvas px-2 text-center text-sm font-bold outline-none focus:border-brand placeholder:font-bold ${
            sig ? 'border-brand/40' : 'border-line placeholder:text-muted/70'
          }`}
        />
      </div>

      {/* 完成 */}
      <button
        onClick={handleComplete}
        className={`shrink-0 h-11 px-3 rounded-xl font-black text-sm flex items-center gap-1 transition-all ${
          ready ? 'bg-ok text-white shadow-card active:scale-95' : 'bg-sunken text-muted/60'
        }`}
        title={ready ? '完成并归档' : '还有步骤没完成'}
      >
        <CheckCircle2 size={16} /> 完成
      </button>

      <button
        onClick={() => onDelete(id)}
        className="shrink-0 p-2 rounded-lg text-muted/50 hover:text-danger hover:bg-danger/10"
        aria-label="取消订单"
        title="取消订单"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
});

/* ============================================================
 *  页面
 * ============================================================ */
export default function LedgerPage() {
  const settings = useSettings();
  const currentBarista = settings.currentBarista;
  const { menu } = useMenu();

  // 历史订单默认加载最近 7 天，可以继续往前加载
  const [historyDays, setHistoryDays] = useState(7);
  const historySince = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - (historyDays - 1));
    return d;
  }, [historyDays]);

  const activeOrders =
    useLiveQuery(
      () => db.orders.where('status').equals('processing').toArray().then(list => list.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))),
      [],
    ) ?? [];

  const historyOrders =
    useLiveQuery(
      () =>
        db.orders
          .where('timestamp')
          .aboveOrEqual(historySince)
          .filter(o => o.status === 'completed')
          .toArray()
          .then(list => list.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))),
      [historySince],
    ) ?? [];

  const hasOlder = useLiveQuery(
    () => db.orders.where('timestamp').below(historySince).filter(o => o.status === 'completed').count().then(n => n > 0),
    [historySince],
    false,
  );

  // ---------- UI state ----------
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [financeLocked, setFinanceLocked] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showBarista, setShowBarista] = useState(false);
  const [batchSign, setBatchSign] = useState<string | null>(null); // null = 关闭
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState(3);
  const [viewingRecipe, setViewingRecipe] = useState<{ item: MenuItem; temp?: 'hot' | 'cold' } | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set([localDateKey(new Date())]));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // 选中的订单如果已经不在制作清单里（完成/删除），自动取消选中
  useEffect(() => {
    setSelected(prev => {
      const alive = new Set(activeOrders.map(o => o.id!));
      const next = new Set(Array.from(prev).filter(id => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [activeOrders]);

  // ---------- 派生数据 ----------
  const todayKey = localDateKey(new Date(now));
  const todayStats = useMemo(() => {
    const isToday = (o: OrderTable) => localDateKey(new Date(o.timestamp)) === todayKey;
    const doneToday = historyOrders.filter(isToday);
    const paidActive = activeOrders.filter(o => o.paid && isToday(o));
    const revenue = [...doneToday, ...paidActive].reduce((s, o) => s + (o.payable || 0), 0);
    return { doneCount: doneToday.length, revenue };
  }, [historyOrders, activeOrders, todayKey]);

  const historyGroups = useMemo(() => {
    const groups = new Map<string, OrderTable[]>();
    for (const o of historyOrders) {
      const k = localDateKey(new Date(o.timestamp));
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(o);
    }
    return Array.from(groups.entries()); // 已按时间倒序
  }, [historyOrders]);

  const readyOrders = useMemo(
    () => activeOrders.filter(o => isReadyToComplete(o, currentBarista)),
    [activeOrders, currentBarista],
  );
  const selectedOrders = useMemo(() => activeOrders.filter(o => selected.has(o.id!)), [activeOrders, selected]);
  const selectedTotal = selectedOrders.reduce((s, o) => s + o.payable, 0);

  const shiftElapsed = settings.baristaSince ? now - settings.baristaSince : 0;
  const shiftOverdue = !!currentBarista && shiftElapsed > SHIFT_LENGTH_MS;

  // ---------- 操作 ----------
  const toggleSelection = useCallback((id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    if (activeOrders.length > 0 && selected.size === activeOrders.length) setSelected(new Set());
    else setSelected(new Set(activeOrders.map(o => o.id!)));
  };

  const openRecipe = useCallback(
    (order: OrderTable) => {
      const item = findMenuItem(menu, order);
      if (item?.instructions) setViewingRecipe({ item, temp: tempOfOrder(order.itemName) });
      else toast('本地暂无此配方，联网后会自动同步最新菜单', { kind: 'info' });
    },
    [menu],
  );

  const handleDelete = useCallback((id: number) => {
    setDeletingId(id);
    setDeleteCountdown(3);
  }, []);

  useEffect(() => {
    if (deletingId === null) return;
    const timer = setInterval(() => {
      setDeleteCountdown(prev => {
        if (prev <= 1) {
          setDeletingId(null); // 3 秒内没确认就自动关闭
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [deletingId]);

  const confirmDelete = async () => {
    if (deletingId === null) return;
    await db.orders.delete(deletingId);
    setDeletingId(null);
    toast('订单已取消', { kind: 'info' });
  };

  const bulkMark = async (field: 'paid' | 'produced') => {
    const ids = Array.from(selected);
    await db.orders.where('id').anyOf(ids).modify(field === 'paid' ? { paid: true } : { produced: true });
    toast(`已将 ${ids.length} 单标记为${field === 'paid' ? '已付款' : '已制作'}`, { kind: 'success' });
  };

  const applyBatchSign = async () => {
    const name = (batchSign || '').trim();
    if (!name) return;
    const ids = Array.from(selected);
    await db.orders.where('id').anyOf(ids).modify({ signature: name });
    toast(`已为 ${ids.length} 单签名：${name}`, { kind: 'success' });
    setBatchSign(null);
  };

  const runBatchComplete = async () => {
    const ids = Array.from(selected);
    const snaps = await completeOrders(ids, currentBarista, { markAll: true });
    setConfirmBatch(false);
    setSelected(new Set());
    if (snaps.length < ids.length) {
      toast(`${ids.length - snaps.length} 单没有签名人，未完成`, { kind: 'error' });
    }
    announceCompletion(snaps, currentBarista || '单独签名');
  };

  const completeAllReady = async () => {
    const ids = readyOrders.map(o => o.id!);
    const snaps = await completeOrders(ids, currentBarista);
    announceCompletion(snaps, currentBarista || '单独签名');
  };

  const handleUnlock = () => {
    if (passwordInput === FINANCE_PASSWORD) {
      setFinanceLocked(false);
      setShowPassword(false);
      setPasswordInput('');
    } else {
      toast('密码错误', { kind: 'error' });
    }
  };

  const exportDay = (dateKey: string, orders: OrderTable[]) => {
    if (orders.length === 0) {
      toast('这一天没有已完成的账单', { kind: 'info' });
      return;
    }
    const rows = [...orders]
      .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
      .map(o => ({
        日期: dateKey,
        时间: timeOf(o.timestamp),
        订单号: o.orderId,
        饮品名称: o.itemName,
        原价: o.originalPrice ?? o.payable,
        优惠明细: o.discounts || '',
        实付金额: o.payable,
        咖啡师签名: o.signature || '未签署',
        同步状态: o.isSynced ? '已同步' : '未同步',
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '账单');
    XLSX.writeFile(wb, `草图咖啡账单_${dateKey}.xlsx`); // [v7 FIX] 用本地日期，凌晨导出不再变成前一天
  };

  const toggleDay = (k: string) =>
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const dateLabel = new Date(now).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  const allSelected = activeOrders.length > 0 && selected.size === activeOrders.length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 space-y-5">
        {/* ---------------- Header ---------------- */}
        <header className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <Wordmark className="h-8 w-auto text-ink mb-1" />
            <h1 className="text-xl font-black tracking-tight">
              账本 <span className="text-muted font-bold text-base ml-1">{dateLabel}</span>
            </h1>
          </div>

          {/* 当前值班 */}
          <button
            onClick={() => setShowBarista(true)}
            className={`flex items-center gap-3 pl-3 pr-4 h-14 rounded-2xl border-2 transition-colors ${
              !currentBarista
                ? 'border-danger/40 bg-danger/10 text-danger animate-pulse'
                : shiftOverdue
                  ? 'border-accent/50 bg-accent/10'
                  : 'border-line bg-panel hover:border-muted'
            }`}
          >
            <span className="w-9 h-9 rounded-full bg-brand text-brand-fg flex items-center justify-center">
              <UserRound size={18} />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-xs font-bold text-muted">
                {currentBarista ? (shiftOverdue ? '已满 3 小时，换班了吗？' : '当前值班 · 点击换班') : '还没设置值班咖啡师'}
              </span>
              <span className="block text-base font-black">
                {currentBarista || '点击设置'}
                {currentBarista && settings.baristaSince && (
                  <span className="ml-2 text-xs font-bold text-muted">{formatDuration(shiftElapsed)}</span>
                )}
              </span>
            </span>
          </button>

          {/* 今日统计 */}
          <div className="flex items-stretch h-14 rounded-2xl bg-panel border-2 border-line overflow-hidden">
            <Stat label="待办" value={activeOrders.length} />
            <Stat label="今日完成" value={todayStats.doneCount} tone="text-ok" />
            <button
              onClick={() => (financeLocked ? setShowPassword(true) : setFinanceLocked(true))}
              className="px-4 flex items-center gap-2 border-l-2 border-line hover:bg-sunken"
              title={financeLocked ? '输入密码查看' : '点击隐藏'}
            >
              <span className="text-left leading-tight">
                <span className="block text-xs font-bold text-muted">今日已收</span>
                <span className={`block text-base font-black ${financeLocked ? 'blur-sm select-none' : ''}`}>
                  {financeLocked ? '¥ ***' : money(todayStats.revenue)}
                </span>
              </span>
              {financeLocked ? <Lock size={14} className="text-muted" /> : <Unlock size={14} className="text-muted" />}
            </button>
          </div>
        </header>

        {/* ---------------- 批量操作条 ---------------- */}
        {selected.size > 0 && (
          <div className="anim-drop sticky top-2 z-20 rounded-2xl bg-brand text-brand-fg shadow-float px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="font-black mr-auto flex items-center gap-2">
              <CheckSquare size={18} /> 已选 {selected.size} 单 · {money(selectedTotal)}
            </span>
            <BarButton icon={<CircleDollarSign size={16} />} label="标记已付款" onClick={() => bulkMark('paid')} />
            <BarButton icon={<Coffee size={16} />} label="标记已制作" onClick={() => bulkMark('produced')} />
            <BarButton icon={<PenTool size={16} />} label="指定签名" onClick={() => setBatchSign(currentBarista)} />
            <button
              onClick={() => setConfirmBatch(true)}
              className="h-10 px-4 rounded-xl bg-brand-fg text-brand font-black text-sm flex items-center gap-1.5"
            >
              <CheckCheck size={16} /> 批量完成
            </button>
            <button onClick={() => setSelected(new Set())} className="h-10 w-10 rounded-xl hover:bg-white/10 flex items-center justify-center" aria-label="取消选择">
              <X size={18} />
            </button>
          </div>
        )}

        {/* ---------------- 制作清单 ---------------- */}
        <section className="rounded-3xl bg-panel border border-line shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center gap-3">
            <button onClick={toggleSelectAll} className="p-1 text-muted hover:text-ink" aria-label="全选">
              {allSelected ? <CheckSquare size={22} /> : <Square size={22} />}
            </button>
            <h2 className="text-lg font-black flex items-center gap-2 mr-auto">
              <span className="w-2 h-2 rounded-full bg-accent" /> 制作清单
              <span className="text-sm font-bold text-muted">{activeOrders.length}</span>
            </h2>
            {readyOrders.length > 0 && (
              <button
                onClick={completeAllReady}
                className="h-10 px-4 rounded-xl bg-ok text-white font-black text-sm flex items-center gap-1.5 shadow-card active:scale-95"
              >
                <CheckCheck size={16} /> 完成全部就绪的 {readyOrders.length} 单
              </button>
            )}
          </div>

          {activeOrders.length === 0 ? (
            <div className="py-16 text-center text-muted font-black text-lg">暂无待办订单 ☕️</div>
          ) : (
            <div className="divide-y divide-line overflow-x-auto custom-scrollbar">
              <div className="min-w-[46rem] divide-y divide-line">
                {activeOrders.map(item => (
                  <ActiveOrderRow
                    key={item.id}
                    item={item}
                    isSelected={selected.has(item.id!)}
                    currentBarista={currentBarista}
                    onToggleSelection={toggleSelection}
                    onOpenRecipe={openRecipe}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ---------------- 历史账本 ---------------- */}
        <section className="space-y-3 pb-10">
          <div className="flex items-center gap-3 px-1">
            <h2 className="text-lg font-black mr-auto">历史账本</h2>
            <button
              onClick={() => exportDay(todayKey, historyGroups.find(([k]) => k === todayKey)?.[1] ?? [])}
              className="h-9 px-4 rounded-full border-2 border-line text-sm font-black flex items-center gap-1.5 hover:bg-brand hover:text-brand-fg hover:border-brand transition-colors"
            >
              <Download size={14} /> 导出今日
            </button>
          </div>

          {historyGroups.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-line py-10 text-center text-muted font-bold">
              最近 {historyDays} 天没有已完成的订单
            </div>
          )}

          {historyGroups.map(([dayKey, orders]) => {
            const open = expandedDays.has(dayKey);
            const total = orders.reduce((s, o) => s + o.payable, 0);
            const unsynced = orders.filter(o => o.isSynced === 0).length;
            const label =
              dayKey === todayKey
                ? '今天'
                : new Date(dayKey + 'T00:00:00').toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' });
            return (
              <div key={dayKey} className="rounded-3xl bg-panel border border-line shadow-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => toggleDay(dayKey)} className="flex items-center gap-3 mr-auto text-left">
                    <ChevronDown size={18} className={`text-muted transition-transform ${open ? '' : '-rotate-90'}`} />
                    <span className="font-black">{label}</span>
                    <span className="text-sm font-bold text-muted">
                      {orders.length} 单 · <span className={financeLocked ? 'blur-sm select-none' : ''}>{financeLocked ? '¥***' : money(total)}</span>
                    </span>
                    {unsynced > 0 ? (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-accent/15 text-accent flex items-center gap-1">
                        <CloudUpload size={12} /> {unsynced} 待同步
                      </span>
                    ) : (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-ok/10 text-ok flex items-center gap-1">
                        <Cloud size={12} /> 已同步
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => exportDay(dayKey, orders)}
                    className="p-2 rounded-lg text-muted hover:text-ink hover:bg-sunken"
                    title="导出这一天"
                  >
                    <Download size={16} />
                  </button>
                </div>

                {open && (
                  <div className="border-t border-line divide-y divide-line">
                    {orders.map(o => (
                      <div key={o.id} className="grid grid-cols-[3.5rem_1fr_auto_auto_6rem] items-center gap-3 px-4 py-2.5 text-sm">
                        <span className="font-mono text-xs text-muted">{timeOf(o.timestamp)}</span>
                        <div className="min-w-0">
                          <p className="font-bold truncate">{o.itemName}</p>
                          <p className="text-xs font-mono text-muted truncate">{o.orderId}</p>
                        </div>
                        <span className="font-black text-right">{money(o.payable)}</span>
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                            o.isSynced ? 'bg-ok/10 text-ok' : 'bg-accent/15 text-accent'
                          }`}
                        >
                          {o.isSynced ? '已同步' : '未同步'}
                        </span>
                        <span className="text-xs font-bold truncate text-right">{o.signature || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {hasOlder && (
            <button
              onClick={() => setHistoryDays(d => d + 30)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-line text-sm font-black text-muted hover:text-ink hover:border-muted"
            >
              加载更早的 30 天
            </button>
          )}
        </section>
      </div>

      {/* ================= 弹窗 ================= */}

      {showBarista && (
        <Modal onClose={() => setShowBarista(false)} title="换班" subtitle="完成订单时默认用当前值班咖啡师签名" size="md">
          <BaristaPicker onDone={() => setShowBarista(false)} />
        </Modal>
      )}

      {confirmBatch && (
        <Modal
          onClose={() => setConfirmBatch(false)}
          title={`批量完成 ${selected.size} 单`}
          subtitle={`合计 ${money(selectedTotal)}`}
          size="md"
          footer={
            <div className="flex gap-3">
              <button onClick={() => setConfirmBatch(false)} className="flex-1 h-12 rounded-xl bg-sunken font-black text-muted">
                取消
              </button>
              <button
                onClick={runBatchComplete}
                disabled={!currentBarista && selectedOrders.some(o => !o.signature)}
                className="flex-[2] h-12 rounded-xl bg-ok text-white font-black flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <CheckCheck size={18} /> 确认完成
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="font-bold leading-relaxed">
              这些订单将被标记为 <b>已付款、已制作</b>
              {selectedOrders.some(o => o.needWash) && <>、<b>已洗杯</b></>}，并完成归档、自动同步到飞书。
            </p>
            {currentBarista ? (
              <p className="rounded-2xl bg-sunken px-4 py-3 font-bold">
                签名：<span className="font-black">{currentBarista}</span>
                <span className="text-muted text-sm">（单独签过名的订单保留原签名）</span>
              </p>
            ) : (
              <div className="rounded-2xl border-2 border-danger/30 p-4 space-y-3">
                <p className="text-danger font-black flex items-center gap-2">
                  <AlertCircle size={18} /> 先设置当前值班咖啡师
                </p>
                <BaristaPicker />
              </div>
            )}
            <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-2xl border border-line divide-y divide-line">
              {selectedOrders.map(o => (
                <div key={o.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-muted">{timeOf(o.timestamp)}</span>
                  <span className="flex-1 font-bold truncate">{o.itemName}</span>
                  <span className="font-black">{money(o.payable)}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {batchSign !== null && (
        <Modal
          onClose={() => setBatchSign(null)}
          title={`为 ${selected.size} 单指定签名`}
          subtitle="一般不需要：不填时自动用当前值班咖啡师"
          size="sm"
          footer={
            <div className="flex gap-3">
              <button onClick={() => setBatchSign(null)} className="flex-1 h-12 rounded-xl bg-sunken font-black text-muted">
                取消
              </button>
              <button
                onClick={applyBatchSign}
                disabled={!batchSign.trim()}
                className="flex-1 h-12 rounded-xl bg-brand text-brand-fg font-black disabled:opacity-40"
              >
                确认签名
              </button>
            </div>
          }
        >
          <input
            autoFocus
            value={batchSign}
            onChange={e => setBatchSign(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyBatchSign()}
            placeholder="例如：Alex"
            className="w-full h-14 rounded-2xl border-2 border-line bg-canvas px-4 text-center text-xl font-black outline-none focus:border-brand"
          />
        </Modal>
      )}

      {showPassword && (
        <Modal onClose={() => setShowPassword(false)} title="查看营业额" subtitle="请输入管理密码" size="sm">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleUnlock();
            }}
            className="space-y-4"
          >
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="****"
              className="w-full h-14 rounded-2xl border-2 border-line bg-canvas text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-brand"
            />
            <button type="submit" className="w-full h-12 rounded-xl bg-brand text-brand-fg font-black">
              解锁
            </button>
          </form>
        </Modal>
      )}

      {deletingId !== null && (
        <Modal onClose={() => setDeletingId(null)} size="sm" tone="danger">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-danger/15 text-danger flex items-center justify-center">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black">确认取消这个订单？</h3>
              <p className="text-sm font-bold text-muted mt-1">此操作无法撤销</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 h-12 rounded-xl bg-sunken font-black text-muted">
                保留
              </button>
              <button onClick={confirmDelete} className="flex-1 h-12 rounded-xl bg-danger text-white font-black active:scale-95">
                确认取消 ({deleteCountdown}s)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {viewingRecipe && (
        <RecipeModal
          item={viewingRecipe.item}
          highlight={viewingRecipe.temp}
          onClose={() => setViewingRecipe(null)}
          syncedAt={typeof window !== 'undefined' ? localStorage.getItem('menu_last_synced') || undefined : undefined}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone = '' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="px-4 flex flex-col justify-center border-r-2 border-line last:border-r-0">
      <span className="text-xs font-bold text-muted leading-tight">{label}</span>
      <span className={`text-lg font-black leading-tight ${tone}`}>{value}</span>
    </div>
  );
}

function BarButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 font-black text-sm flex items-center gap-1.5">
      {icon} {label}
    </button>
  );
}
