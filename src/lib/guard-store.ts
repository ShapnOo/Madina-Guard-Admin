import { mockGuards } from "@/data/mock-data";
import type { Guard } from "@/types/guard-management";

export const GUARD_STORAGE_KEY = "guardwise_guards";
export const GUARD_LOGIN_DEVICE_KEY = "guardwise_guard_device_id";

function hasWindow() {
  return typeof window !== "undefined";
}

export function readGuards(): Guard[] {
  if (!hasWindow()) return mockGuards;
  const raw = window.localStorage.getItem(GUARD_STORAGE_KEY);
  if (!raw) return mockGuards;
  try {
    const parsed = JSON.parse(raw) as Guard[];
    if (!Array.isArray(parsed)) return mockGuards;
    return parsed.map((guard) => ({
      ...guard,
      password: guard.password || "12345678",
    }));
  } catch {
    return mockGuards;
  }
}

export function writeGuards(guards: Guard[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(GUARD_STORAGE_KEY, JSON.stringify(guards));
}

export function upsertGuard(guardId: string, updater: (guard: Guard) => Guard) {
  const guards = readGuards();
  const next = guards.map((guard) => (guard.id === guardId ? updater(guard) : guard));
  writeGuards(next);
  return next;
}

export function unbindGuardDevice(guardId: string) {
  return upsertGuard(guardId, (guard) => ({
    ...guard,
    boundDeviceId: undefined,
    boundDeviceName: undefined,
    boundAt: undefined,
  }));
}

export function loginGuardWithDevice(employeeId: string, password: string, deviceId: string, deviceName?: string) {
  const guards = readGuards();
  const guard = guards.find((item) => item.employeeId.toLowerCase() === employeeId.trim().toLowerCase());
  if (!guard) return { ok: false as const, reason: "not-found" as const };
  if ((guard.password || "12345678") !== password) return { ok: false as const, reason: "invalid-password" as const };
  if (guard.status === "inactive") return { ok: false as const, reason: "inactive" as const };
  if (guard.boundDeviceId && guard.boundDeviceId !== deviceId) {
    return { ok: false as const, reason: "device-mismatch" as const, guard };
  }

  const nowISO = new Date().toISOString();
  const nextGuards = guards.map((item) =>
    item.id === guard.id
      ? {
          ...item,
          boundDeviceId: item.boundDeviceId || deviceId,
          boundDeviceName: item.boundDeviceName || deviceName || "Unknown device",
          boundAt: item.boundAt || nowISO,
          lastLoginAt: nowISO,
        }
      : item,
  );
  writeGuards(nextGuards);
  return { ok: true as const, guard: nextGuards.find((item) => item.id === guard.id)! };
}
