import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import DataTable from "@/components/DataTable";
import { mockPatrolHistory } from "@/data/mock-data";
import SearchableSelect from "@/components/SearchableSelect";
import { toInitCapLabel } from "@/lib/text";
import DatePicker from "@/components/DatePicker";

type PatrolStatus = "completed" | "late" | "missed" | "skipped";

export default function ReportsGuardWise() {
  const [filters, setFilters] = useState({
    fromDate: "2026-02-01",
    toDate: "2026-02-07",
    guardName: "all",
    zoneName: "all",
    status: "all",
    scanMethod: "all",
  });

  const guards = useMemo(() => Array.from(new Set(mockPatrolHistory.map((r) => r.guardName))), []);
  const zones = useMemo(() => Array.from(new Set(mockPatrolHistory.map((r) => r.zoneName))), []);

  const rows = useMemo(() => {
    return mockPatrolHistory.filter((record) => {
      if (record.date < filters.fromDate || record.date > filters.toDate) return false;
      if (filters.guardName !== "all" && record.guardName !== filters.guardName) return false;
      if (filters.zoneName !== "all" && record.zoneName !== filters.zoneName) return false;
      if (filters.status !== "all" && record.status !== filters.status) return false;
      if (filters.scanMethod !== "all" && record.scanMethod !== filters.scanMethod) return false;
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
      key: "scanMethod",
      label: "Scan",
      render: (item: { scanMethod: string }) => <span className="uppercase text-xs font-semibold">{item.scanMethod}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (item: { status: PatrolStatus }) => <span className={statusBadgeClass(item.status)}>{toInitCapLabel(item.status)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Guard-wise Patrol History</h1>
        <p className="page-subtitle">Track patrol activity by guard with date range and scan filters</p>
      </div>

      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Guard-wise Patrol History</h2>
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
          <label className="text-xs text-muted-foreground">Status</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.status}
              onChange={(v) => setFilters((p) => ({ ...p, status: v }))}
              options={[
                { value: "all", label: "All" },
                { value: "completed", label: "Completed" },
                { value: "late", label: "Late" },
                { value: "missed", label: "Missed" },
                { value: "skipped", label: "Skipped" },
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Scan</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.scanMethod}
              onChange={(v) => setFilters((p) => ({ ...p, scanMethod: v }))}
              options={[
                { value: "all", label: "All" },
                { value: "nfc", label: "NFC" },
                { value: "qr", label: "QR" },
              ]}
            />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={rows} />
    </div>
  );
}

