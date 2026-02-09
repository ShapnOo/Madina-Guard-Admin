import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/SearchableSelect";
import DatePicker from "@/components/DatePicker";
import { readAvailability, writeAvailability } from "@/lib/availability-store";
import type { GuardAvailability } from "@/types/guard-management";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { appendAuditLog } from "@/lib/audit-store";
import { GUARD_STORAGE_KEY, readGuards } from "@/lib/guard-store";

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function LeaveCreate() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [guards, setGuards] = useState(readGuards());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [selectedGuardIds, setSelectedGuardIds] = useState<string[]>([]);
  const [guardNotes, setGuardNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const refresh = () => setGuards(readGuards());
    const onStorage = (e: StorageEvent) => {
      if (e.key === GUARD_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const activeGuards = useMemo(() => guards.filter((g) => g.status !== "inactive"), [guards]);
  const zones = useMemo(
    () => Array.from(new Set(activeGuards.map((g) => g.assignedZone).filter(Boolean))) as string[],
    [activeGuards],
  );
  const filteredGuards = useMemo(() => {
    if (zoneFilter === "all") return activeGuards;
    return activeGuards.filter((g) => g.assignedZone === zoneFilter);
  }, [activeGuards, zoneFilter]);

  const allVisibleSelected =
    filteredGuards.length > 0 && filteredGuards.every((guard) => selectedGuardIds.includes(guard.id));

  const toggleGuard = (guardId: string, checked: boolean) => {
    setSelectedGuardIds((prev) => {
      if (checked) return prev.includes(guardId) ? prev : [...prev, guardId];
      return prev.filter((id) => id !== guardId);
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedGuardIds((prev) => {
        const next = new Set(prev);
        filteredGuards.forEach((guard) => next.add(guard.id));
        return Array.from(next);
      });
      return;
    }
    const visible = new Set(filteredGuards.map((guard) => guard.id));
    setSelectedGuardIds((prev) => prev.filter((id) => !visible.has(id)));
  };

  const handleSave = () => {
    if (!startDate || !endDate) {
      toast({ title: "Date range required", description: "Please select leave start and end date." });
      return;
    }
    if (startDate > endDate) {
      toast({ title: "Invalid date range", description: "End date cannot be before start date." });
      return;
    }
    if (selectedGuardIds.length === 0) {
      toast({ title: "Select guards", description: "Please select one or more guards." });
      return;
    }

    const current = readAvailability();
    const next = [...current];
    let created = 0;
    selectedGuardIds.forEach((guardId) => {
      const guard = guards.find((g) => g.id === guardId);
      if (!guard) return;
      const duplicate = next.some(
        (entry) =>
          entry.guardId === guardId &&
          entry.type === "leave" &&
          entry.startDate === startDate &&
          entry.endDate === endDate,
      );
      if (duplicate) return;
      next.push({
        id: makeId("leave"),
        guardId: guard.id,
        guardName: guard.name,
        mode: "date-range",
        type: "leave",
        startDate,
        endDate,
        note: (guardNotes[guard.id] || "").trim() || "Leave",
      } satisfies GuardAvailability);
      created += 1;
    });

    writeAvailability(next);
    appendAuditLog({
      actor: "Admin",
      module: "availability",
      action: "create",
      entityType: "leave",
      entityId: `${startDate}:${endDate}:${selectedGuardIds.join(",")}`,
      summary: `Added leave for ${created} guard(s) from ${startDate} to ${endDate}`,
    });
    toast({
      title: "Leave added",
      description: `${created} guard${created === 1 ? "" : "s"} marked on leave.`,
    });
    navigate("/availability");
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-start justify-between gap-2">
        <div>
          <a href="/availability" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to rosters
          </a>
          <h1 className="text-2xl font-bold text-foreground mt-1">Add Leave</h1>
          <p className="text-sm text-muted-foreground mt-1">Select date range and guards for temporary leave.</p>
        </div>
      </div>

      <div className="stat-card p-3 space-y-3">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-6 md:col-span-3 space-y-1">
            <Label>Date From</Label>
            <DatePicker value={startDate} onChange={setStartDate} />
          </div>
          <div className="col-span-6 md:col-span-3 space-y-1">
            <Label>Date To</Label>
            <DatePicker value={endDate} onChange={setEndDate} />
          </div>
          <div className="col-span-12 md:col-span-6 space-y-1">
            <Label>Zone</Label>
            <SearchableSelect
              value={zoneFilter}
              onChange={setZoneFilter}
              options={[
                { value: "all", label: "All Zones" },
                ...zones.map((zone) => ({ value: zone, label: zone })),
              ]}
            />
          </div>
        </div>

        <div className="rounded-md border border-border bg-secondary/20 px-3 py-2">
          <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(e) => toggleAllVisible(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Select all visible guards ({selectedGuardIds.length} selected)
          </label>
        </div>

        <div className="rounded-md border border-border max-h-64 overflow-auto">
          {filteredGuards.length === 0 ? (
            <p className="text-sm text-muted-foreground px-3 py-4">No guards found.</p>
          ) : (
            <div className="divide-y divide-border">
              {filteredGuards.map((guard) => {
                const checked = selectedGuardIds.includes(guard.id);
                return (
                  <label key={guard.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/30">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleGuard(guard.id, e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{guard.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {guard.employeeId} | {guard.assignedZone || "No zone"}
                      </p>
                    </div>
                    <div className="ml-auto w-56">
                      <Input
                        value={guardNotes[guard.id] || ""}
                        onChange={(e) =>
                          setGuardNotes((prev) => ({
                            ...prev,
                            [guard.id]: e.target.value,
                          }))
                        }
                        placeholder="Individual note (optional)"
                        disabled={!checked}
                        className="h-8 text-xs"
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSave}>
            <CalendarOff className="w-4 h-4 mr-1" />
            Save Leave
          </Button>
        </div>
      </div>
    </div>
  );
}
