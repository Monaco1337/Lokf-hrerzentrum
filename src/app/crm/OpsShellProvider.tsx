"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "crm-sidebar-collapsed";

interface OpsShellContextValue {
  sidebarCollapsed: boolean;
  sidebarReady: boolean;
  toggleSidebar: () => void;
}

const OpsShellContext = createContext<OpsShellContextValue | null>(null);

export function OpsShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* private browsing — keep expanded */
    }
    setSidebarReady(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ sidebarCollapsed, sidebarReady, toggleSidebar }),
    [sidebarCollapsed, sidebarReady, toggleSidebar],
  );

  return (
    <OpsShellContext.Provider value={value}>{children}</OpsShellContext.Provider>
  );
}

export function useOpsShell(): OpsShellContextValue {
  const ctx = useContext(OpsShellContext);
  if (!ctx) {
    throw new Error("useOpsShell must be used within OpsShellProvider");
  }
  return ctx;
}
