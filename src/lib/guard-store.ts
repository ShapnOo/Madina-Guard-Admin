import { mockGuards } from "@/data/mock-data";
import type { Guard } from "@/types/guard-management";

export const GUARD_STORAGE_KEY = "guardwise_guards";

function hasWindow() {
  return typeof window !== "undefined";
}

export function readGuards(): Guard[] {
  if (!hasWindow()) return mockGuards;
  const raw = window.localStorage.getItem(GUARD_STORAGE_KEY);
  if (!raw) return mockGuards;
  try {
    const parsed = JSON.parse(raw) as Guard[];
    return Array.isArray(parsed) ? parsed : mockGuards;
  } catch {
    return mockGuards;
  }
}

export function writeGuards(guards: Guard[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(GUARD_STORAGE_KEY, JSON.stringify(guards));
}

