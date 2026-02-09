import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import DataTable from "@/components/DataTable";
import { mockPatrolHistory } from "@/data/mock-data";
import SearchableSelect from "@/components/SearchableSelect";
import DatePicker from "@/components/DatePicker";

export default function ReportsLocationWise() {
  const [filters, setFilters] = useState({
    fromDate: "2026-02-01",
    toDate: "2026-02-07",
    zoneName: "all",
    checkpointName: "all",
    status: "all",
  });

  const zones = useMemo(() => Array.from(new Set(mockPatrolHistory.map((r) => r.zoneName))), []);
  const checkpoints = useMemo(() => Array.from(new Set(mockPatrolHistory.map((r) => r.checkpointName))), []);

  const sourceRows = useMemo(() => {
    return mockPatrolHistory.filter((record) => {
      if (record.date < filters.fromDate || record.date > filters.toDate) return false;
      if (filters.zoneName !== "all" && record.zoneName !== filters.zoneName) return false;
      if (filters.checkpointName !== "all" && record.checkpointName !== filters.checkpointName) return false;
      if (filters.status !== "all" && record.status !== filters.status) return false;
      return true;
    });
  }, [filters]);

  const rows = useMemo(() => {
    const map = new Map<string, {
      id: string;
      zoneName: string;
      checkpointName: string;
      total: number;
      completed: number;
      late: number;
      missed: number;
      skipped: number;
    }>();
    sourceRows.forEach((record) => {
      const key = `${record.zoneName}-${record.checkpointName}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          zoneName: record.zoneName,
          checkpointName: record.checkpointName,
          total: 0,
          completed: 0,
          late: 0,
          missed: 0,
          skipped: 0,
        });
      }
      const bucket = map.get(key)!;
      bucket.total += 1;
      if (record.status === "completed" || record.status === "late" || record.status === "missed" || record.status === "skipped") {
        bucket[record.status] += 1;
      }
    });
    return Array.from(map.values());
  }, [sourceRows]);

  const columns = [
    { key: "zoneName", label: "Zone" },
    { key: "checkpointName", label: "Checkpoint" },
    { key: "total", label: "Total Visits" },
    { key: "completed", label: "Completed" },
    { key: "late", label: "Late" },
    { key: "missed", label: "Missed" },
    { key: "skipped", label: "Skipped" },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Location-wise Visit Summary</h1>
        <p className="page-subtitle">Analyze visit volume and status by zone and checkpoint</p>
      </div>

      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Location-wise Visit Summary</h2>
      </div>

      <div className="stat-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              onChange={(v) => setFilters((p) => ({ ...p, zoneName: v }))}
              options={[
                { value: "all", label: "All" },
                ...zones.map((zone) => ({ value: zone, label: zone })),
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Checkpoint</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.checkpointName}
              onChange={(v) => setFilters((p) => ({ ...p, checkpointName: v }))}
              options={[
                { value: "all", label: "All" },
                ...checkpoints.map((checkpoint) => ({ value: checkpoint, label: checkpoint })),
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
      </div>

      <DataTable columns={columns} data={rows} />
    </div>
  );
}

