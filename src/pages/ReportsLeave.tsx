import { useEffect, useMemo, useState } from "react";
import { CalendarX2 } from "lucide-react";
import DataTable from "@/components/DataTable";
import SearchableSelect from "@/components/SearchableSelect";
import DatePicker from "@/components/DatePicker";
import { AVAILABILITY_STORAGE_KEY, readAvailability } from "@/lib/availability-store";
import { mockGuards } from "@/data/mock-data";
import type { GuardAvailability } from "@/types/guard-management";

type LeaveRow = {
  id: string;
  guardName: string;
  zoneName: string;
  startDate: string;
  endDate: string;
  days: number;
  mode: string;
  status: "upcoming" | "active" | "completed";
  note: string;
};

function toStatus(startDate: string, endDate: string): LeaveRow["status"] {
  const todayISO = new Date().toISOString().slice(0, 10);
  if (todayISO < startDate) return "upcoming";
  if (todayISO > endDate) return "completed";
  return "active";
}

function dayCount(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1);
}

function overlapsRange(startDate: string, endDate: string, fromDate: string, toDate: string) {
  return !(endDate < fromDate || startDate > toDate);
}

export default function ReportsLeave() {
  const [records, setRecords] = useState<GuardAvailability[]>(readAvailability());
  const [filters, setFilters] = useState({
    fromDate: "2026-02-01",
    toDate: "2026-02-28",
    guardId: "all",
    zoneName: "all",
    status: "all",
    mode: "all",
  });

  useEffect(() => {
    const refresh = () => setRecords(readAvailability());
    const onStorage = (e: StorageEvent) => {
      if (e.key === AVAILABILITY_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const guards = useMemo(() => {
    const leaveGuards = Array.from(new Set(records.filter((r) => r.type === "leave").map((r) => r.guardId)));
    return mockGuards.filter((g) => leaveGuards.includes(g.id));
  }, [records]);

  const zones = useMemo(
    () => Array.from(new Set(guards.map((g) => g.assignedZone).filter(Boolean))) as string[],
    [guards],
  );

  const rows = useMemo(() => {
    return records
      .filter((record) => record.type === "leave")
      .filter((record) => overlapsRange(record.startDate, record.endDate, filters.fromDate, filters.toDate))
      .map((record) => {
        const guard = mockGuards.find((g) => g.id === record.guardId);
        const zoneName = guard?.assignedZone || "Unassigned";
        const status = toStatus(record.startDate, record.endDate);
        return {
          id: record.id,
          guardName: record.guardName,
          zoneName,
          startDate: record.startDate,
          endDate: record.endDate,
          days: dayCount(record.startDate, record.endDate),
          mode: record.mode === "weekly-off" ? "Weekly Off" : "Date Range",
          status,
          note: record.note || "-",
          guardId: record.guardId,
        };
      })
      .filter((row) => {
        if (filters.guardId !== "all" && row.guardId !== filters.guardId) return false;
        if (filters.zoneName !== "all" && row.zoneName !== filters.zoneName) return false;
        if (filters.status !== "all" && row.status !== filters.status) return false;
        if (filters.mode !== "all" && row.mode !== filters.mode) return false;
        return true;
      });
  }, [records, filters]);

  const columns = [
    { key: "guardName", label: "Guard" },
    { key: "zoneName", label: "Zone" },
    { key: "startDate", label: "From" },
    { key: "endDate", label: "To" },
    { key: "days", label: "Days" },
    { key: "mode", label: "Mode" },
    {
      key: "status",
      label: "Status",
      render: (item: LeaveRow) => (
        <span
          className={`status-badge ${
            item.status === "active"
              ? "status-active"
              : item.status === "upcoming"
              ? "status-late"
              : "status-inactive"
          }`}
        >
          {item.status === "upcoming" ? "Upcoming" : item.status === "active" ? "Active" : "Completed"}
        </span>
      ),
    },
    { key: "note", label: "Note" },
  ];

  const summary = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      upcoming: rows.filter((row) => row.status === "upcoming").length,
      completed: rows.filter((row) => row.status === "completed").length,
      leaveDays: rows.reduce((sum, row) => sum + row.days, 0),
      guards: new Set(rows.map((row) => row.guardName)).size,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Leave Report</h1>
        <p className="page-subtitle">Track leave records by date range, guard, zone, and leave status</p>
      </div>

      <div className="flex items-center gap-2">
        <CalendarX2 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Leave Summary</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Records</p>
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
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Completed</p>
          <p className="text-lg font-semibold">{summary.completed}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Leave Days</p>
          <p className="text-lg font-semibold">{summary.leaveDays}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Guards</p>
          <p className="text-lg font-semibold">{summary.guards}</p>
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
          <label className="text-xs text-muted-foreground">Guard</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.guardId}
              onChange={(value) => setFilters((p) => ({ ...p, guardId: value }))}
              options={[
                { value: "all", label: "All Guards" },
                ...guards.map((guard) => ({ value: guard.id, label: `${guard.name} (${guard.employeeId})` })),
              ]}
            />
          </div>
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
          <label className="text-xs text-muted-foreground">Status</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.status}
              onChange={(value) => setFilters((p) => ({ ...p, status: value }))}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "upcoming", label: "Upcoming" },
                { value: "completed", label: "Completed" },
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Mode</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.mode}
              onChange={(value) => setFilters((p) => ({ ...p, mode: value }))}
              options={[
                { value: "all", label: "All" },
                { value: "Date Range", label: "Date Range" },
                { value: "Weekly Off", label: "Weekly Off" },
              ]}
            />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={rows} />
    </div>
  );
}
