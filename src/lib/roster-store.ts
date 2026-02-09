import type { GuardRoster } from "@/types/guard-management";
import { mockGuards, mockRosters } from "@/data/mock-data";
import type { GuardAvailability } from "@/types/guard-management";
import { readGuards } from "@/lib/guard-store";

export const ROSTER_STORAGE_KEY = "guardwise_rosters";

function hasWindow() {
  return typeof window !== "undefined";
}

export function readRosters(): GuardRoster[] {
  if (!hasWindow()) return mockRosters;
  const raw = window.localStorage.getItem(ROSTER_STORAGE_KEY);
  if (!raw) return mockRosters;
  try {
    const parsed = JSON.parse(raw) as GuardRoster[];
    return Array.isArray(parsed) ? parsed : mockRosters;
  } catch {
    return mockRosters;
  }
}

export function writeRosters(rosters: GuardRoster[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(rosters));
}

export function buildRosterAvailability(rosters: GuardRoster[]) {
  const guards = readGuards();
  const rosterGenerated: GuardAvailability[] = rosters.flatMap((roster) =>
    roster.guardIds.map((guardId) => {
      const guard = guards.find((g) => g.id === guardId) || mockGuards.find((g) => g.id === guardId);
      return {
        id: `roster-${roster.id}-${guardId}`,
        guardId,
        guardName: guard?.name || guardId,
        mode: "weekly-off",
        type: "off-roster",
        startDate: roster.effectiveFrom,
        endDate: roster.effectiveTo,
        weekdays: roster.dayOffWeekdays,
        note: `roster:${roster.id}:${roster.title}`,
      } satisfies GuardAvailability;
    }),
  );
  return rosterGenerated;
}
