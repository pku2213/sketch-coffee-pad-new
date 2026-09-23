"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import SettingsModal from "./SettingsModal";
import Toaster from "./Toaster";
import { useSettings } from "@/lib/settings";
import { refreshDuty, refreshMenu, scheduleOrderSync, setOnline, syncOrdersNow } from "@/lib/sync";

/**
 * [v7 NEW] 全局外壳：侧边栏 + 页面 + 自动同步 + 提示
 * 以前每个页面各自放 Sidebar、各自算高度，导致账本页多出一块留白；现在统一在这里布局。
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 皮肤
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  // 自动同步
  useEffect(() => {
    setOnline(navigator.onLine);

    // 打开时：补传未同步订单 + 菜单/清单过期就静默刷新
    void syncOrdersNow();
    void refreshMenu();
    void refreshDuty();

    const onOnline = () => {
      setOnline(true);
      scheduleOrderSync(1500);
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        scheduleOrderSync(1500);
        void refreshMenu();
        void refreshDuty();
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    // 兜底：每 2 分钟检查一次有没有漏传的
    const interval = setInterval(() => void syncOrdersNow(), 2 * 60 * 1000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app-shell flex w-full overflow-hidden bg-canvas text-ink">
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
      <main className="flex-1 min-w-0 h-full overflow-hidden relative">{children}</main>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <Toaster />
    </div>
  );
}
