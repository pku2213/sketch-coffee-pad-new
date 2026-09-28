"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Coffee, Clock, FileText, ClipboardCheck, Settings, Cloud, CloudOff, CloudUpload, RefreshCw, AlertCircle, ShoppingCart } from "lucide-react";
import { db } from "@/lib/db";
import { countUnsynced, syncOrdersNow, useSyncStatus } from "@/lib/sync";
import { toast } from "@/lib/toast";

const NAV = [
  { label: "点单", href: "/order", icon: Coffee },
  { label: "配方", href: "/process", icon: Clock },
  { label: "账本", href: "/ledger", icon: FileText },
  { label: "补货", href: "/restock", icon: ShoppingCart },
  { label: "打卡", href: "/duty", icon: ClipboardCheck },
];

/**
 * [v7] 侧边栏：更窄（72px → 随屏幕缩放），图标下带小字；底部是同步状态和设置
 */
export default function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const pathname = usePathname();
  const status = useSyncStatus();
  const pending = useLiveQuery(() => countUnsynced(), [], 0);
  // 补货：正在缺货的原料数量
  const missingCount = useLiveQuery(
    async () => new Set((await db.restock.filter(r => r.status !== "arrived").toArray()).map(r => r.item)).size,
    [],
    0,
  );

  const handleSyncClick = async () => {
    if (!status.online) {
      toast(`离线中，${pending} 单已安全保存在本机，联网后会自动上传`, { kind: "info" });
      return;
    }
    const res = await syncOrdersNow();
    if (res.error) toast(`同步失败：${res.error}（稍后会自动重试）`, { kind: "error" });
    else if (res.synced > 0) toast(`已同步 ${res.synced} 单到飞书`, { kind: "success" });
    else toast("所有订单都已同步", { kind: "success" });
  };

  let SyncIcon = Cloud;
  let syncTone = "text-ok";
  let syncLabel = "已同步";
  if (!status.online) {
    SyncIcon = CloudOff;
    syncTone = "text-muted";
    syncLabel = "离线";
  } else if (status.syncing) {
    SyncIcon = RefreshCw;
    syncTone = "text-accent";
    syncLabel = "同步中";
  } else if (status.lastError && pending > 0) {
    SyncIcon = AlertCircle;
    syncTone = "text-danger";
    syncLabel = "待重试";
  } else if (pending > 0) {
    SyncIcon = CloudUpload;
    syncTone = "text-accent";
    syncLabel = "待同步";
  }

  return (
    <aside className="w-[4.5rem] shrink-0 h-full bg-panel border-r border-line flex flex-col items-center py-4 gap-1 z-40">
      {/* Logo */}
      <Link
        href="/order"
        className="mb-4 w-11 h-11 rounded-2xl bg-brand text-brand-fg flex items-center justify-center shadow-card"
        aria-label="Sketch Coffee"
      >
        <Coffee size={22} />
      </Link>

      {/* Nav */}
      <nav className="flex flex-col items-center gap-1.5 w-full px-2">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href || pathname?.startsWith(href + "/") || (href === "/order" && pathname === "/");
          return (
            <Link
              key={href}
              href={href}
              className={`relative w-full flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-colors ${
                active ? "bg-brand text-brand-fg shadow-card" : "text-muted hover:text-ink hover:bg-sunken"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[0.72rem] font-bold leading-none">{label}</span>
              {href === "/restock" && missingCount > 0 && (
                <span className="absolute top-0.5 right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-danger text-white text-[0.72rem] font-black flex items-center justify-center">
                  {missingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Sync status */}
      <button
        onClick={handleSyncClick}
        className={`relative w-[3.5rem] flex flex-col items-center gap-0.5 py-2 rounded-xl hover:bg-sunken transition-colors ${syncTone}`}
        title="点击立即同步到飞书"
      >
        <SyncIcon size={20} className={status.syncing ? "animate-spin" : ""} />
        <span className="text-[0.72rem] font-bold leading-none">{syncLabel}</span>
        {pending > 0 && (
          <span className="absolute top-0.5 right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-accent text-white text-[0.72rem] font-black flex items-center justify-center">
            {pending > 99 ? "99+" : pending}
          </span>
        )}
      </button>

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className="w-[3.5rem] flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted hover:text-ink hover:bg-sunken transition-colors"
      >
        <Settings size={20} />
        <span className="text-[0.72rem] font-bold leading-none">设置</span>
      </button>
    </aside>
  );
}
