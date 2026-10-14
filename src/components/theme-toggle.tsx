"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "learnloom-theme:v1";
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
function getSnapshot(): Theme { return document.documentElement.dataset.theme === "dark" ? "dark" : "light"; }
function getServerSnapshot(): Theme { return "light"; }

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial = stored === "dark" || stored === "light" ? stored : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = initial;
  }, []);
  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    void fetch("/api/settings/theme", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: next }) });
  }
  return (
    <button type="button" onClick={toggle} className={`inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] transition hover:bg-[var(--mist)] ${className}`} aria-label={theme === "light" ? "เปลี่ยนเป็นโหมดกลางคืน" : "เปลี่ยนเป็นโหมดกลางวัน"} title={theme === "light" ? "โหมดกลางคืน" : "โหมดกลางวัน"}>
      {theme === "light" ? <Moon className="size-[17px]" /> : <Sun className="size-[17px]" />}
    </button>
  );
}
