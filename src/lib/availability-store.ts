import { mockGuardAvailability } from "@/data/mock-data";
import type { GuardAvailability } from "@/types/guard-management";
import { buildRosterAvailability, readRosters } from "@/lib/roster-store";

export const AVAILABILITY_STORAGE_KEY = "guardwise_guard_availability";

function hasWindow() {
  return typeof window !== "undefined";
}

function toUtcDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00Z`);
}

function getWeekdayUtc(dateISO: string) {
  return toUtcDate(dateISO).getUTCDay();
}

export function readAvailability(): GuardAvailability[] {
  const rosterGenerated = buildRosterAvailability(readRosters());
  if (!hasWindow()) {
    const nonRosterDemo = mockGuardAvailability.filter((record) => !(record.note || "").startsWith("roster:"));
    return [...nonRosterDemo, ...rosterGenerated];
  }
  const raw = window.localStorage.getItem(AVAILABILITY_STORAGE_KEY);
  if (!raw) {
    const nonRosterDemo = mockGuardAvailability.filter((record) => !(record.note || "").startsWith("roster:"));
    return [...nonRosterDemo, ...rosterGenerated];
  }
  try {
    const parsed = JSON.parse(raw) as GuardAvailability[];
    const normalized = Array.isArray(parsed) ? parsed : mockGuardAvailability;
    const nonRoster = normalized.filter((record) => !(record.note || "").startsWith("roster:"));
    return [...nonRoster, ...rosterGenerated];
  } catch {
    const nonRosterDemo = mockGuardAvailability.filter((record) => !(record.note || "").startsWith("roster:"));
    return [...nonRosterDemo, ...rosterGenerated];
  }
}

export function writeAvailability(records: GuardAvailability[]) {
  if (!hasWindow()) return;
  const nonRoster = records.filter((record) => !(record.note || "").startsWith("roster:"));
  window.localStorage.setItem(AVAILABILITY_STORAGE_KEY, JSON.stringify(nonRoster));
}

function matchesDateRange(record: GuardAvailability, dateISO: string) {
  return record.startDate <= dateISO && record.endDate >= dateISO;
}

function matchesWeekly(record: GuardAvailability, dateISO: string) {
  if (!record.weekdays || record.weekdays.length === 0) return false;
  if (!matchesDateRange(record, dateISO)) return false;
  return record.weekdays.includes(getWeekdayUtc(dateISO));
}

export function isGuardUnavailableOnDate(
  records: GuardAvailability[],
  guardId: string,
  dateISO: string,
) {
  return records.find((record) => {
    if (record.guardId !== guardId) return false;
    if (record.mode === "weekly-off") return matchesWeekly(record, dateISO);
    return matchesDateRange(record, dateISO);
  });
}

export function isGuardUnavailableInRange(
  records: GuardAvailability[],
  guardId: string,
  fromISO: string,
  toISO: string,
) {
  const cursor = toUtcDate(fromISO);
  const end = toUtcDate(toISO);
  while (cursor <= end) {
    const dateISO = cursor.toISOString().slice(0, 10);
    const hit = isGuardUnavailableOnDate(records, guardId, dateISO);
    if (hit) return { record: hit, dateISO };
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return undefined;
}
