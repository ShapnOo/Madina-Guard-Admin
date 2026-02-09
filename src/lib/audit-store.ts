import { mockAuditLogs } from "@/data/mock-data";
import type { AuditLog } from "@/types/guard-management";

export const AUDIT_LOG_STORAGE_KEY = "guardwise_audit_logs";

function hasWindow() {
  return typeof window !== "undefined";
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function readAuditLogs(): AuditLog[] {
  if (!hasWindow()) return mockAuditLogs;
  const raw = window.localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
  if (!raw) return mockAuditLogs;
  try {
    const parsed = JSON.parse(raw) as AuditLog[];
    return Array.isArray(parsed) ? parsed : mockAuditLogs;
  } catch {
    return mockAuditLogs;
  }
}

export function writeAuditLogs(logs: AuditLog[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(logs));
}

export function appendAuditLog(
  payload: Omit<AuditLog, "id" | "createdAt"> & { createdAt?: string },
) {
  const logs = readAuditLogs();
  const next: AuditLog = {
    ...payload,
    id: makeId("audit"),
    createdAt: payload.createdAt || new Date().toISOString(),
  };
  writeAuditLogs([next, ...logs]);
}
