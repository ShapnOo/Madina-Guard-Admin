import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import DataTable from "@/components/DataTable";
import SearchableSelect from "@/components/SearchableSelect";
import DatePicker from "@/components/DatePicker";
import { ROSTER_STORAGE_KEY, readRosters } from "@/lib/roster-store";
import { mockGuards } from "@/data/mock-data";
import type { GuardRoster } from "@/types/guard-management";

type RosterRow = {
  id: string;
  title: string;
  zoneName: string;
  guards: string;
  guardCount: number;
  dayOff: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: "upcoming" | "active" | "expired";
  guardIds: string[];
  dayOffWeekdays: number[];
};

const WEEKDAY_LABEL: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

function overlapsRange(startDate: string, endDate: string, fromDate: string, toDate: string) {
  return !(endDate < fromDate || startDate > toDate);
}

function toStatus(startDate: string, endDate: string): RosterRow["status"] {
  const todayISO = new Date().toISOString().slice(0, 10);
  if (todayISO < startDate) return "upcoming";
  if (todayISO > endDate) return "expired";
  return "active";
}

export default function ReportsRoaster() {
  const [rosters, setRosters] = useState<GuardRoster[]>(readRosters());
  const [filters, setFilters] = useState({
    fromDate: "2026-01-01",
    toDate: "2026-12-31",
    zoneName: "all",
    guardId: "all",
    weekday: "all",
    status: "all",
  });

  useEffect(() => {
    const refresh = () => setRosters(readRosters());
    const onStorage = (e: StorageEvent) => {
      if (e.key === ROSTER_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const zones = useMemo(() => Array.from(new Set(rosters.map((r) => r.zoneName))), [rosters]);

  const rows = useMemo(() => {
    return rosters
      .filter((roster) => overlapsRange(roster.effectiveFrom, roster.effectiveTo, filters.fromDate, filters.toDate))
      .map((roster) => {
        const guardNames = roster.guardIds
          .map((guardId) => mockGuards.find((guard) => guard.id === guardId)?.name || guardId)
          .join(", ");
        const dayOff = roster.dayOffWeekdays.map((day) => WEEKDAY_LABEL[day]).join(", ");
        return {
          id: roster.id,
          title: roster.title,
          zoneName: roster.zoneName,
          guards: guardNames || "-",
          guardCount: roster.guardIds.length,
          dayOff: dayOff || "-",
          effectiveFrom: roster.effectiveFrom,
          effectiveTo: roster.effectiveTo,
          status: toStatus(roster.effectiveFrom, roster.effectiveTo),
          guardIds: roster.guardIds,
          dayOffWeekdays: roster.dayOffWeekdays,
        };
      })
      .filter((row) => {
        if (filters.zoneName !== "all" && row.zoneName !== filters.zoneName) return false;
        if (filters.guardId !== "all" && !row.guardIds.includes(filters.guardId)) return false;
        if (filters.weekday !== "all" && !row.dayOffWeekdays.includes(Number(filters.weekday))) return false;
        if (filters.status !== "all" && row.status !== filters.status) return false;
        return true;
      });
  }, [rosters, filters]);

  const columns = [
    { key: "title", label: "Roaster Title" },
    { key: "zoneName", label: "Zone" },
    { key: "guards", label: "Guards" },
    { key: "guardCount", label: "Count" },
    { key: "dayOff", label: "Day Off" },
    { key: "effectiveFrom", label: "From" },
    { key: "effectiveTo", label: "To" },
    {
      key: "status",
      label: "Status",
      render: (item: RosterRow) => (
        <span
          className={`status-badge ${
            item.status === "active"
              ? "status-active"
              : item.status === "upcoming"
              ? "status-late"
              : "status-inactive"
          }`}
        >
          {item.status === "upcoming" ? "Upcoming" : item.status === "active" ? "Active" : "Expired"}
        </span>
      ),
    },
  ];

  const summary = useMemo(() => {
    const uniqueGuards = new Set(rows.flatMap((row) => row.guardIds));
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      upcoming: rows.filter((row) => row.status === "upcoming").length,
      expired: rows.filter((row) => row.status === "expired").length,
      guardsCovered: uniqueGuards.size,
      zones: new Set(rows.map((row) => row.zoneName)).size,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Roaster Report</h1>
        <p className="page-subtitle">Track zone-wise roaster plans with day-off and effective range filters</p>
      </div>

      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Roaster Summary</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Rosters</p>
          <p className="text-lg font-semibold">{summary.total}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Active</p>
          <p className="text-lg font-semibold text-success">{summary.active}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Upcoming</p>
          <p className="text-lg font-semibold text-warning">{summary.upcoming}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Expired</p>
          <p className="text-lg font-semibold">{summary.expired}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Guards Covered</p>
          <p className="text-lg font-semibold">{summary.guardsCovered}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Zones</p>
          <p className="text-lg font-semibold">{summary.zones}</p>
        </div>
      </div>

      <div className="stat-card grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">From Date *</label>
          <DatePicker value={filters.fromDate} onChange={(value) => setFilters((p) => ({ ...p, fromDate: value }))} className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To Date *</label>
          <DatePicker value={filters.toDate} onChange={(value) => setFilters((p) => ({ ...p, toDate: value }))} className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Zone</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.zoneName}
              onChange={(value) => setFilters((p) => ({ ...p, zoneName: value }))}
              options={[
                { value: "all", label: "All Zones" },
                ...zones.map((zone) => ({ value: zone, label: zone })),
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Guard</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.guardId}
              onChange={(value) => setFilters((p) => ({ ...p, guardId: value }))}
              options={[
                { value: "all", label: "All Guards" },
                ...mockGuards.map((guard) => ({ value: guard.id, label: `${guard.name} (${guard.employeeId})` })),
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Day Off</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.weekday}
              onChange={(value) => setFilters((p) => ({ ...p, weekday: value }))}
              options={[
                { value: "all", label: "All" },
                { value: "0", label: "Sunday" },
                { value: "1", label: "Monday" },
                { value: "2", label: "Tuesday" },
                { value: "3", label: "Wednesday" },
                { value: "4", label: "Thursday" },
                { value: "5", label: "Friday" },
                { value: "6", label: "Saturday" },
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.status}
              onChange={(value) => setFilters((p) => ({ ...p, status: value }))}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "upcoming", label: "Upcoming" },
                { value: "expired", label: "Expired" },
              ]}
            />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={rows} />
    </div>
  );
}
