import { useMemo, useState } from "react";
import { Activity, CalendarDays, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { readAuditLogs } from "@/lib/audit-store";
import DatePicker from "@/components/DatePicker";
import type { AuditLog } from "@/types/guard-management";
import { toInitCapLabel } from "@/lib/text";

const MODULE_OPTIONS: Array<{ value: AuditLog["module"] | "all"; label: string }> = [
  { value: "all", label: "All Modules" },
  { value: "schedules", label: "Schedules" },
  { value: "checkpoints", label: "Checkpoints" },
  { value: "users", label: "Users" },
  { value: "alerts", label: "Alerts" },
  { value: "availability", label: "Availability" },
];

const ACTION_OPTIONS: Array<{ value: AuditLog["action"] | "all"; label: string }> = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "toggle", label: "Toggle" },
  { value: "replace", label: "Replace" },
];

export default function AuditTrail() {
  const [logs] = useState<AuditLog[]>(readAuditLogs());
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<AuditLog["module"] | "all">("all");
  const [actionFilter, setActionFilter] = useState<AuditLog["action"] | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        log.summary.toLowerCase().includes(query) ||
        log.entityType.toLowerCase().includes(query) ||
        log.entityId.toLowerCase().includes(query) ||
        log.actor.toLowerCase().includes(query);
      const matchesModule = moduleFilter === "all" || log.module === moduleFilter;
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const dateISO = log.createdAt.slice(0, 10);
      const matchesFrom = !fromDate || dateISO >= fromDate;
      const matchesTo = !toDate || dateISO <= toDate;
      return matchesSearch && matchesModule && matchesAction && matchesFrom && matchesTo;
    });
  }, [actionFilter, fromDate, logs, moduleFilter, search, toDate]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
          <p className="text-sm text-muted-foreground mt-1">Track who changed what and when across major modules.</p>
        </div>
        <Badge variant="secondary" className="px-2.5 py-1">
          {filteredLogs.length} Logs
        </Badge>
      </div>

      <div className="stat-card p-3">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12 md:col-span-5">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder="Search summary, entity, actor..."
              />
            </div>
          </div>
          <div className="col-span-6 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Module</Label>
            <div className="mt-1">
              <SearchableSelect
                value={moduleFilter}
                onChange={(value) => setModuleFilter(value as AuditLog["module"] | "all")}
                options={MODULE_OPTIONS}
              />
            </div>
          </div>
          <div className="col-span-6 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Action</Label>
            <div className="mt-1">
              <SearchableSelect
                value={actionFilter}
                onChange={(value) => setActionFilter(value as AuditLog["action"] | "all")}
                options={ACTION_OPTIONS}
              />
            </div>
          </div>
          <div className="col-span-6 md:col-span-1.5">
            <Label className="text-xs text-muted-foreground">From</Label>
            <DatePicker value={fromDate} onChange={setFromDate} className="mt-1" />
          </div>
          <div className="col-span-6 md:col-span-1.5">
            <Label className="text-xs text-muted-foreground">To</Label>
            <DatePicker value={toDate} onChange={setToDate} className="mt-1" />
          </div>
        </div>
      </div>

      <div className="stat-card p-3">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center">
            <Filter className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">No audit logs match current filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="rounded-md border border-border bg-secondary/20 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{log.summary}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Activity className="inline w-3.5 h-3.5 mr-1" />
                      {toInitCapLabel(log.module)} | {toInitCapLabel(log.action)} | {log.entityType} ({log.entityId})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <CalendarDays className="inline w-3.5 h-3.5 mr-1" />
                      {new Date(log.createdAt).toLocaleString()} by {log.actor}
                    </p>
                  </div>
                  <Badge variant="secondary">{toInitCapLabel(log.action)}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
