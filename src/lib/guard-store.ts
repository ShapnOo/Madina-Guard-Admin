import { mockGuards } from "@/data/mock-data";
import type { Guard } from "@/types/guard-management";

export const GUARD_STORAGE_KEY = "guardwise_guards";
export const GUARD_LOGIN_DEVICE_KEY = "guardwise_guard_device_id";

function hasWindow() {
  return typeof window !== "undefined";
}

const DEMO_BINDINGS_BY_EMPLOYEE: Record<
  string,
  { deviceId: string; deviceName: string; boundAt: string; lastLoginAt: string }
> = {
  "GRD-001": {
    deviceId: "device-demo-g1",
    deviceName: "Samsung Galaxy A54 - Android 14 (Dhaka)",
    boundAt: "2026-02-01T08:15:00Z",
    lastLoginAt: "2026-02-09T09:42:00Z",
  },
  "GRD-002": {
    deviceId: "device-demo-g2",
    deviceName: "Xiaomi Redmi Note 13 - Android 14 (Chattogram)",
    boundAt: "2026-02-03T07:50:00Z",
    lastLoginAt: "2026-02-09T07:12:00Z",
  },
  "GRD-003": {
    deviceId: "device-demo-g3",
    deviceName: "Nokia 1110 - Android 13 (Khulna)",
    boundAt: "2026-02-04T10:05:00Z",
    lastLoginAt: "2026-02-08T18:22:00Z",
  },
  "GRD-004": {
    deviceId: "device-demo-g4",
    deviceName: "realme C55 - Android 14 (Sylhet)",
    boundAt: "2026-02-02T06:40:00Z",
    lastLoginAt: "2026-02-09T05:58:00Z",
  },
};

function ensureMinimumDemoBindings(guards: Guard[]) {
  const alreadyBound = guards.filter((guard) => !!guard.boundDeviceId).length;
  if (alreadyBound >= 4) return guards;

  let applied = 0;
  const next = guards.map((guard) => {
    if (guard.boundDeviceId) return guard;
    const preset = DEMO_BINDINGS_BY_EMPLOYEE[guard.employeeId];
    if (!preset) return guard;
    applied += 1;
    return {
      ...guard,
      boundDeviceId: preset.deviceId,
      boundDeviceName: preset.deviceName,
      boundAt: preset.boundAt,
      lastLoginAt: preset.lastLoginAt,
    };
  });

  return applied > 0 ? next : guards;
}

export function readGuards(): Guard[] {
  if (!hasWindow()) return mockGuards;
  const raw = window.localStorage.getItem(GUARD_STORAGE_KEY);
  if (!raw) return mockGuards;
  try {
    const parsed = JSON.parse(raw) as Guard[];
    if (!Array.isArray(parsed)) return mockGuards;
    const normalized = parsed.map((guard) => ({
      ...guard,
      password: guard.password || "12345678",
    }));
    const withBindings = ensureMinimumDemoBindings(normalized);
    if (withBindings !== normalized) writeGuards(withBindings);
    return withBindings;
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
