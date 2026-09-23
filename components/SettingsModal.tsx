"use client";

import { useEffect, useState } from "react";
import { Check, Palette, UserRound, Hash, RefreshCw } from "lucide-react";
import Modal from "./Modal";
import BaristaPicker from "./BaristaPicker";
import { THEMES, setTheme, useSettings } from "@/lib/settings";
import { peekNextSeq, setNextSeq, formatOrderId } from "@/lib/orders";
import { refreshDuty, refreshMenu, syncOrdersNow, useSyncStatus } from "@/lib/sync";
import { getMeta } from "@/lib/db";
import { toast } from "@/lib/toast";

type Tab = "theme" | "barista" | "order" | "data";

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: "theme", label: "皮肤", icon: Palette },
  { id: "barista", label: "值班", icon: UserRound },
  { id: "order", label: "订单号", icon: Hash },
  { id: "data", label: "数据同步", icon: RefreshCw },
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("theme");

  return (
    <Modal onClose={onClose} title="设置" subtitle="只对这台 Pad 生效" size="lg">
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-colors ${
              tab === id ? "bg-brand text-brand-fg" : "bg-sunken text-muted hover:text-ink"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "theme" && <ThemeTab />}
      {tab === "barista" && <BaristaPicker />}
      {tab === "order" && <OrderSeqTab />}
      {tab === "data" && <DataTab />}
    </Modal>
  );
}

function ThemeTab() {
  const { theme } = useSettings();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {THEMES.map(t => {
        const [bg, main, accent] = t.swatch;
        const active = t.id === theme;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`text-left rounded-2xl border-2 p-3 transition-all ${
              active ? "border-brand shadow-card" : "border-line hover:border-muted"
            }`}
          >
            {/* 小预览 */}
            <div className="h-20 rounded-xl overflow-hidden flex border border-black/5" style={{ background: bg }}>
              <div className="w-5 h-full" style={{ background: main, opacity: 0.9 }} />
              <div className="flex-1 p-2 flex flex-col gap-1.5">
                <div className="h-2 w-2/3 rounded-full" style={{ background: main }} />
                <div className="flex gap-1.5 flex-1">
                  <div className="flex-1 rounded-md" style={{ background: main, opacity: 0.12 }} />
                  <div className="flex-1 rounded-md" style={{ background: main, opacity: 0.12 }} />
                </div>
                <div className="h-2 w-6 rounded-full self-end" style={{ background: accent }} />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="font-black">{t.name}</p>
                <p className="text-xs text-muted font-bold">{t.desc}</p>
              </div>
              {active && (
                <span className="w-6 h-6 rounded-full bg-brand text-brand-fg flex items-center justify-center">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function OrderSeqTab() {
  const [next, setNext] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    peekNextSeq().then(n => {
      setNext(n);
      setDraft(String(n));
    });
  }, []);

  const save = async () => {
    const n = Number(draft);
    try {
      await setNextSeq(n);
      setNext(n);
      toast(`下一单订单号将是 ${formatOrderId(new Date(), n)}`, { kind: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { kind: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-muted leading-relaxed">
        订单号现在会一直累计：<span className="text-ink">日期-累计序号</span>
        ，例如 <span className="font-mono text-ink">{formatOrderId(new Date(), next ?? 128)}</span>
        。第一次升级时会以本机已有订单数作为起点；如果想和飞书表里的总单数对齐，可以在这里改。
      </p>
      <div className="flex gap-2 items-center">
        <span className="text-sm font-black shrink-0">下一单序号</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="w-40 h-11 rounded-xl border-2 border-line bg-canvas px-3 font-mono text-lg font-bold focus:border-brand outline-none"
        />
        <button
          onClick={save}
          disabled={!draft || Number(draft) === next}
          className="h-11 px-5 rounded-xl bg-brand text-brand-fg font-black disabled:opacity-40"
        >
          保存
        </button>
      </div>
      <p className="text-xs font-bold text-danger/80">注意：改成比现在小的数字可能会产生重复订单号。</p>
    </div>
  );
}

function DataTab() {
  const status = useSyncStatus();
  const [menuAt, setMenuAt] = useState<number | undefined>();
  const [dutyAt, setDutyAt] = useState<number | undefined>();
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    getMeta<number>("menuSyncedAt").then(setMenuAt);
    getMeta<number>("dutySyncedAt").then(setDutyAt);
  };
  useEffect(load, []);

  const fmt = (t?: number | null) => (t ? new Date(t).toLocaleString("zh-CN", { hour12: false }) : "从未");

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    try {
      const r = await fn();
      toast(r, { kind: r.includes("失败") ? "error" : "success" });
    } finally {
      setBusy(null);
      load();
    }
  };

  const rows: { key: string; label: string; desc: string; at: string; action: () => Promise<string> }[] = [
    {
      key: "orders",
      label: "订单 → 飞书",
      desc: "完成订单后约 10 秒自动上传；离线时保存在本机，联网后自动补传。重复上传不会重复记账。",
      at: fmt(status.lastSyncAt),
      action: async () => {
        const r = await syncOrdersNow();
        return r.error ? `订单同步失败：${r.error}` : `订单已同步（本次 ${r.synced} 单）`;
      },
    },
    {
      key: "menu",
      label: "飞书 → 菜单/配方",
      desc: "打开时超过 6 小时没更新会自动刷新。飞书里改了价格想马上生效，就点这里。",
      at: fmt(menuAt),
      action: async () => ((await refreshMenu({ force: true })) === "updated" ? "菜单已更新" : "菜单更新失败，请检查网络"),
    },
    {
      key: "duty",
      label: "飞书 → 打卡清单",
      desc: "同上，自动刷新。",
      at: fmt(dutyAt),
      action: async () => ((await refreshDuty({ force: true })) === "updated" ? "打卡清单已更新" : "清单更新失败，请检查网络"),
    },
  ];

  return (
    <div className="space-y-3">
      {!status.online && (
        <div className="rounded-2xl bg-danger/10 text-danger px-4 py-3 text-sm font-bold">
          当前离线：数据都安全保存在本机，联网后会自动同步。
        </div>
      )}
      {rows.map(r => (
        <div key={r.key} className="rounded-2xl border border-line p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-black">{r.label}</p>
            <p className="text-xs font-bold text-muted mt-1 leading-relaxed">{r.desc}</p>
            <p className="text-xs font-mono text-muted mt-1">上次：{r.at}</p>
          </div>
          <button
            onClick={() => run(r.key, r.action)}
            disabled={busy !== null}
            className="shrink-0 h-10 px-4 rounded-xl bg-sunken font-black text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={busy === r.key ? "animate-spin" : ""} /> 立即同步
          </button>
        </div>
      ))}
      {status.lastError && <p className="text-xs font-bold text-danger">最近一次错误：{status.lastError}</p>}
    </div>
  );
}
