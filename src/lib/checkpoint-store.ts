import { mockCheckpoints } from "@/data/mock-data";
import type { Checkpoint } from "@/types/guard-management";

export const CHECKPOINT_STORAGE_KEY = "guardwise_checkpoints";

function hasWindow() {
  return typeof window !== "undefined";
}

export function readCheckpoints(): Checkpoint[] {
  if (!hasWindow()) return mockCheckpoints;
  const raw = window.localStorage.getItem(CHECKPOINT_STORAGE_KEY);
  if (!raw) return mockCheckpoints;
  try {
    const parsed = JSON.parse(raw) as Checkpoint[];
    return Array.isArray(parsed) ? parsed : mockCheckpoints;
  } catch {
    return mockCheckpoints;
  }
}

export function writeCheckpoints(checkpoints: Checkpoint[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpoints));
}

