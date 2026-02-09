import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import DataTable from "@/components/DataTable";
import { mockPatrolHistory } from "@/data/mock-data";
import SearchableSelect from "@/components/SearchableSelect";
import { toInitCapLabel } from "@/lib/text";
import DatePicker from "@/components/DatePicker";

type PatrolStatus = "completed" | "late" | "missed" | "skipped";

export default function ReportsLateMissed() {
  const [filters, setFilters] = useState({
    fromDate: "2026-02-01",
    toDate: "2026-02-07",
    issue: "all",
    guardName: "all",
    zoneName: "all",
    minLateMinutes: 0,
  });

  const guards = useMemo(() => Array.from(new Set(mockPatrolHistory.map((r) => r.guardName))), []);
  const zones = useMemo(() => Array.from(new Set(mockPatrolHistory.map((r) => r.zoneName))), []);

  const rows = useMemo(() => {
    return mockPatrolHistory.filter((record) => {
      if (record.date < filters.fromDate || record.date > filters.toDate) return false;
      if (filters.guardName !== "all" && record.guardName !== filters.guardName) return false;
      if (filters.zoneName !== "all" && record.zoneName !== filters.zoneName) return false;
      if (filters.issue !== "all" && record.status !== filters.issue) return false;
      if (record.status === "completed") return false;
      if (record.status === "late" && (record.lateByMinutes || 0) < filters.minLateMinutes) return false;
      return true;
    });
  }, [filters]);

  const statusBadgeClass = (status: PatrolStatus) => {
    if (status === "completed") return "status-badge status-active";
    if (status === "late") return "status-badge status-late";
    if (status === "missed") return "status-badge status-missed";
    return "status-badge status-inactive";
  };

  const columns = [
    { key: "date", label: "Date" },
    { key: "guardName", label: "Guard" },
    { key: "zoneName", label: "Zone" },
    { key: "checkpointName", label: "Checkpoint" },
    {
      key: "status",
      label: "Issue",
      render: (item: { status: PatrolStatus }) => <span className={statusBadgeClass(item.status)}>{toInitCapLabel(item.status)}</span>,
    },
    {
      key: "lateByMinutes",
      label: "Late By",
      render: (item: { lateByMinutes?: number; status: PatrolStatus }) =>
        item.status === "late" ? `${item.lateByMinutes || 0} min` : "N/A",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Late and Missed Patrol</h1>
        <p className="page-subtitle">Track exceptions with issue type and minimum late threshold filters</p>
      </div>

      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <h2 className="text-sm font-semibold">Late and Missed Patrol Report</h2>
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
          <label className="text-xs text-muted-foreground">Issue</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.issue}
              onChange={(v) => setFilters((p) => ({ ...p, issue: v }))}
              options={[
                { value: "all", label: "Late + Missed + Skipped" },
                { value: "late", label: "Late only" },
                { value: "missed", label: "Missed only" },
                { value: "skipped", label: "Skipped only" },
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Guard</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.guardName}
              onChange={(v) => setFilters((p) => ({ ...p, guardName: v }))}
              options={[
                { value: "all", label: "All" },
                ...guards.map((guard) => ({ value: guard, label: guard })),
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Zone</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.zoneName}
              onChange={(v) => setFilters((p) => ({ ...p, zoneName: v }))}
              options={[
                { value: "all", label: "All" },
                ...zones.map((zone) => ({ value: zone, label: zone })),
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Min Late (min)</label>
          <input type="number" min={0} value={filters.minLateMinutes} onChange={(e) => setFilters((p) => ({ ...p, minLateMinutes: Number(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <DataTable columns={columns} data={rows} />
    </div>
  );
}

