import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/SearchableSelect";
import DatePicker from "@/components/DatePicker";
import { readRosters, writeRosters } from "@/lib/roster-store";
import type { GuardRoster } from "@/types/guard-management";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { appendAuditLog } from "@/lib/audit-store";
import { GUARD_STORAGE_KEY, readGuards } from "@/lib/guard-store";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultEndDate() {
  return "2099-12-31";
}

export default function RosterCreate() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { rosterId } = useParams();
  const isEditMode = Boolean(rosterId);
  const [guards, setGuards] = useState(readGuards());
  const [title, setTitle] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState(defaultEndDate());
  const [dayOffWeekdays, setDayOffWeekdays] = useState<number[]>([]);
  const [selectedGuardIds, setSelectedGuardIds] = useState<string[]>([]);
  const [guardSearchInput, setGuardSearchInput] = useState("");
  const [guardSearchTerm, setGuardSearchTerm] = useState("");

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

  useEffect(() => {
    if (!isEditMode || !rosterId) return;
    const roster = readRosters().find((item) => item.id === rosterId);
    if (!roster) {
      toast({ title: "Roster not found", description: "The selected roster could not be loaded.", variant: "destructive" });
      navigate("/availability");
      return;
    }
    setTitle(roster.title);
    setZoneName(roster.zoneName);
    setEffectiveFrom(roster.effectiveFrom);
    setEffectiveTo(roster.effectiveTo);
    setDayOffWeekdays([...roster.dayOffWeekdays]);
    setSelectedGuardIds([...roster.guardIds]);
  }, [isEditMode, rosterId, navigate, toast]);

  const activeGuards = useMemo(() => guards.filter((g) => g.status !== "inactive"), [guards]);
  const zones = useMemo(
    () => Array.from(new Set(activeGuards.map((g) => g.assignedZone).filter(Boolean))) as string[],
    [activeGuards],
  );
  const zoneGuards = useMemo(
    () => activeGuards.filter((g) => g.assignedZone === zoneName),
    [activeGuards, zoneName],
  );
  const filteredZoneGuards = useMemo(() => {
    const q = guardSearchTerm.trim().toLowerCase();
    if (!q) return zoneGuards;
    return zoneGuards.filter(
      (guard) =>
        guard.name.toLowerCase().includes(q) ||
        guard.employeeId.toLowerCase().includes(q) ||
        (guard.phone || "").toLowerCase().includes(q),
    );
  }, [zoneGuards, guardSearchTerm]);

  const toggleDay = (day: number, checked: boolean) => {
    setDayOffWeekdays((prev) => {
      if (checked) return prev.includes(day) ? prev : [...prev, day];
      return prev.filter((d) => d !== day);
    });
  };

  const toggleGuard = (guardId: string, checked: boolean) => {
    setSelectedGuardIds((prev) => {
      if (checked) return prev.includes(guardId) ? prev : [...prev, guardId];
      return prev.filter((id) => id !== guardId);
    });
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please add roster title." });
      return;
    }
    if (!zoneName) {
      toast({ title: "Zone required", description: "Please select a zone." });
      return;
    }
    if (dayOffWeekdays.length === 0) {
      toast({ title: "Day off required", description: "Please select at least one day off." });
      return;
    }
    if (selectedGuardIds.length === 0) {
      toast({ title: "Guards required", description: "Please select one or more guards." });
      return;
    }
    if (!effectiveFrom || !effectiveTo || effectiveFrom > effectiveTo) {
      toast({ title: "Invalid effective range", description: "Please set a valid effective date range." });
      return;
    }

    const current = readRosters();
    const payload = {
      title: title.trim(),
      zoneName,
      guardIds: selectedGuardIds,
      dayOffWeekdays: [...dayOffWeekdays].sort((a, b) => a - b),
      effectiveFrom,
      effectiveTo,
    };
    const next: GuardRoster[] = isEditMode
      ? current.map((item) => (item.id === rosterId ? { ...item, ...payload } : item))
      : [
          ...current,
          {
            id: makeId("roster"),
            ...payload,
            createdAt: new Date().toISOString(),
          },
        ];

    writeRosters(next);
    appendAuditLog({
      actor: "Admin",
      module: "availability",
      action: isEditMode ? "update" : "create",
      entityType: "roster",
      entityId: isEditMode ? rosterId || "unknown" : next[next.length - 1].id,
      summary: `${isEditMode ? "Updated" : "Created"} roster ${title.trim()} for ${zoneName} (${selectedGuardIds.length} guards)`,
    });
    toast({
      title: isEditMode ? "Roster updated" : "Roster created",
      description: isEditMode ? "Roster changes saved successfully." : "New roster has been added successfully.",
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
          <h1 className="text-2xl font-bold text-foreground mt-1">{isEditMode ? "Edit Roster" : "Add New Roster"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEditMode ? "Update roster details using the same full-page workflow." : "Create zone-wise roster and set weekly day off."}
          </p>
        </div>
      </div>

      <div className="stat-card p-3 space-y-3">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Roster Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Main Building Friday Off" />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Zone</Label>
            <SearchableSelect
              value={zoneName}
              onChange={(v) => {
                setZoneName(v);
                setSelectedGuardIds([]);
                setGuardSearchInput("");
                setGuardSearchTerm("");
              }}
              options={zones.map((z) => ({ value: z, label: z }))}
              placeholder="Select zone"
            />
          </div>
          <div className="col-span-6 md:col-span-2 space-y-1">
            <Label>Effective From</Label>
            <DatePicker value={effectiveFrom} onChange={setEffectiveFrom} />
          </div>
          <div className="col-span-6 md:col-span-2 space-y-1">
            <Label>Effective To</Label>
            <DatePicker value={effectiveTo} onChange={setEffectiveTo} />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Day Off</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {WEEKDAY_OPTIONS.map((day) => {
              const checked = dayOffWeekdays.includes(day.value);
              return (
                <label key={day.value} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleDay(day.value, e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Guards ({zoneName ? `Zone: ${zoneName}` : "Select zone first"})</Label>
          <div className="flex items-center gap-2 pb-1">
            <Input
              value={guardSearchInput}
              onChange={(e) => setGuardSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setGuardSearchTerm(guardSearchInput);
                }
              }}
              placeholder="Search guard..."
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-3"
              onClick={() => setGuardSearchTerm(guardSearchInput)}
            >
              <Search className="w-4 h-4 mr-1" /> Search
            </Button>
          </div>
          <div className="rounded-md border border-border max-h-52 overflow-auto">
            {!zoneName ? (
              <p className="text-sm text-muted-foreground px-3 py-4">Select zone to load guards.</p>
            ) : zoneGuards.length === 0 ? (
              <p className="text-sm text-muted-foreground px-3 py-4">No active guards in selected zone.</p>
            ) : filteredZoneGuards.length === 0 ? (
              <p className="text-sm text-muted-foreground px-3 py-4">No guard matches your search.</p>
            ) : (
              <div className="divide-y divide-border">
                {filteredZoneGuards.map((guard) => {
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
                        <p className="text-xs text-muted-foreground">{guard.employeeId}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSave}>
            <CalendarDays className="w-4 h-4 mr-1" />
            {isEditMode ? "Save Changes" : "Save Roster"}
          </Button>
        </div>
      </div>
    </div>
  );
}
