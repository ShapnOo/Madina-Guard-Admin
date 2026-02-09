import { mockSchedules } from "@/data/mock-data";
import type { Schedule } from "@/types/guard-management";

export const SCHEDULE_STORAGE_KEY = "guardwise_schedules";

function hasWindow() {
  return typeof window !== "undefined";
}

function addDays(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeScheduleRanges(schedules: Schedule[]) {
  const todayISO = new Date().toISOString().slice(0, 10);
  const defaultEnd = addDays(todayISO, 6);
  let changed = false;
  const normalized = schedules.map((schedule) => {
    if (schedule.startDate && schedule.endDate) return schedule;
    changed = true;
    return {
      ...schedule,
      startDate: schedule.startDate || todayISO,
      endDate: schedule.endDate || defaultEnd,
    };
  });
  if (changed) writeSchedules(normalized);
  return normalized;
}

export function readSchedules(): Schedule[] {
  if (!hasWindow()) return mockSchedules;
  const raw = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
  if (!raw) return mockSchedules;
  try {
    const parsed = JSON.parse(raw) as Schedule[];
    if (!Array.isArray(parsed)) return mockSchedules;

    // Auto-upgrade very old sparse demo datasets to the richer default demo schedules.
    const looksLikeLegacyDemo = parsed.length <= 12 && parsed.every((s) => typeof s.id === "string" && s.id.startsWith("s"));
    if (looksLikeLegacyDemo) {
      writeSchedules(mockSchedules);
      return mockSchedules;
    }

    return normalizeScheduleRanges(parsed);
  } catch {
    return mockSchedules;
  }
}

export function writeSchedules(schedules: Schedule[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
}

export function addSchedules(newSchedules: Schedule[]) {
  const current = readSchedules();
  writeSchedules([...current, ...newSchedules]);
}

export function deleteScheduleById(id: string) {
  const current = readSchedules();
  writeSchedules(current.filter((s) => s.id !== id));
}
