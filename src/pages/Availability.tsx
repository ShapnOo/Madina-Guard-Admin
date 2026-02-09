import { useEffect, useMemo, useState } from "react";
import { CalendarOff, CalendarRange, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readRosters, writeRosters } from "@/lib/roster-store";
import { readAvailability, writeAvailability } from "@/lib/availability-store";
import type { GuardAvailability, GuardRoster } from "@/types/guard-management";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import SearchableSelect from "@/components/SearchableSelect";
import { appendAuditLog } from "@/lib/audit-store";
import DatePicker from "@/components/DatePicker";
import { GUARD_STORAGE_KEY, readGuards } from "@/lib/guard-store";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function Availability() {
  const { toast } = useToast();
  const [guards, setGuards] = useState(readGuards());
  const [rosters, setRosters] = useState<GuardRoster[]>(readRosters());
  const [leaveEntries, setLeaveEntries] = useState<GuardAvailability[]>(readAvailability());
  const [activeView, setActiveView] = useState<"rosters" | "leaves">("rosters");
  const [filters, setFilters] = useState({
    search: "",
    zoneName: "all",
    status: "all",
  });
  const [rosterEditOpen, setRosterEditOpen] = useState(false);
  const [leaveEditOpen, setLeaveEditOpen] = useState(false);
  const [editingRoster, setEditingRoster] = useState<GuardRoster | null>(null);
  const [editingLeave, setEditingLeave] = useState<GuardAvailability | null>(null);
  const [rosterForm, setRosterForm] = useState({
    title: "",
    zoneName: "",
    effectiveFrom: "",
    effectiveTo: "",
    dayOffWeekdays: [] as number[],
    guardIds: [] as string[],
  });
  const [leaveForm, setLeaveForm] = useState({
    guardId: "",
    startDate: "",
    endDate: "",
    note: "",
  });

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
  const rosterZoneGuards = useMemo(
    () => activeGuards.filter((g) => g.assignedZone === rosterForm.zoneName),
    [activeGuards, rosterForm.zoneName],
  );

  const listedLeaves = useMemo(
    () =>
      leaveEntries
        .filter((entry) => (entry.mode || "date-range") !== "weekly-off")
        .filter((entry) => entry.type === "leave")
        .sort((a, b) => `${b.startDate}${b.endDate}`.localeCompare(`${a.startDate}${a.endDate}`)),
    [leaveEntries],
  );

  function guardSummary(guardIds: string[]) {
    const names = guardIds
      .map((id) => guards.find((g) => g.id === id)?.name)
      .filter(Boolean) as string[];
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
  }

  const getRosterStatus = (roster: GuardRoster) => {
    const todayISO = new Date().toISOString().slice(0, 10);
    if (todayISO < roster.effectiveFrom) return "upcoming";
    if (todayISO > roster.effectiveTo) return "expired";
    return "active";
  };

  const getLeaveStatus = (entry: GuardAvailability) => {
    const todayISO = new Date().toISOString().slice(0, 10);
    if (todayISO < entry.startDate) return "upcoming";
    if (todayISO > entry.endDate) return "completed";
    return "active";
  };

  const filteredRosters = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return rosters.filter((roster) => {
      if (filters.zoneName !== "all" && roster.zoneName !== filters.zoneName) return false;
      const status = getRosterStatus(roster);
      if (filters.status !== "all" && status !== filters.status) return false;
      if (!q) return true;
      const guardsText = guardSummary(roster.guardIds).toLowerCase();
      return (
        roster.title.toLowerCase().includes(q) ||
        roster.zoneName.toLowerCase().includes(q) ||
        guardsText.includes(q)
      );
    });
  }, [rosters, filters]);

  const filteredLeaves = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return listedLeaves.filter((entry) => {
      const zone = guards.find((g) => g.id === entry.guardId)?.assignedZone || "No zone";
      if (filters.zoneName !== "all" && zone !== filters.zoneName) return false;
      const status = getLeaveStatus(entry);
      if (filters.status !== "all" && status !== filters.status) return false;
      if (!q) return true;
      return (
        entry.guardName.toLowerCase().includes(q) ||
        zone.toLowerCase().includes(q) ||
        (entry.note || "").toLowerCase().includes(q)
      );
    });
  }, [listedLeaves, filters]);

  const rosterGuardCount = useMemo(() => new Set(rosters.flatMap((r) => r.guardIds)).size, [rosters]);
  const leaveGuardCount = useMemo(() => new Set(listedLeaves.map((l) => l.guardId)).size, [listedLeaves]);

  const weekdayLabel = (days: number[]) =>
    WEEKDAY_OPTIONS.filter((d) => days.includes(d.value))
      .map((d) => d.label)
      .join(", ");

  const handleDelete = (id: string) => {
    const target = rosters.find((r) => r.id === id);
    const next = rosters.filter((r) => r.id !== id);
    writeRosters(next);
    setRosters(next);
    setLeaveEntries(readAvailability());
    if (target) {
      appendAuditLog({
        actor: "Admin",
        module: "availability",
        action: "delete",
        entityType: "roster",
        entityId: id,
        summary: `Deleted roster ${target.title}`,
      });
    }
    toast({ title: "Roster removed", description: "Roster and linked weekly off rules were deleted." });
  };

  const handleDeleteLeave = (id: string) => {
    const target = leaveEntries.find((entry) => entry.id === id);
    const next = leaveEntries.filter((entry) => entry.id !== id);
    writeAvailability(next);
    setLeaveEntries(readAvailability());
    if (target) {
      appendAuditLog({
        actor: "Admin",
        module: "availability",
        action: "delete",
        entityType: "leave",
        entityId: id,
        summary: `Deleted leave for ${target.guardName}`,
      });
    }
    toast({ title: "Leave removed", description: "Leave entry has been deleted." });
  };

  const toggleRosterDay = (day: number, checked: boolean) => {
    setRosterForm((prev) => ({
      ...prev,
      dayOffWeekdays: checked
        ? prev.dayOffWeekdays.includes(day)
          ? prev.dayOffWeekdays
          : [...prev.dayOffWeekdays, day]
        : prev.dayOffWeekdays.filter((d) => d !== day),
    }));
  };

  const toggleRosterGuard = (guardId: string, checked: boolean) => {
    setRosterForm((prev) => ({
      ...prev,
      guardIds: checked
        ? prev.guardIds.includes(guardId)
          ? prev.guardIds
          : [...prev.guardIds, guardId]
        : prev.guardIds.filter((id) => id !== guardId),
    }));
  };

  const openEditRoster = (roster: GuardRoster) => {
    setEditingRoster(roster);
    setRosterForm({
      title: roster.title,
      zoneName: roster.zoneName,
      effectiveFrom: roster.effectiveFrom,
      effectiveTo: roster.effectiveTo,
      dayOffWeekdays: [...roster.dayOffWeekdays],
      guardIds: [...roster.guardIds],
    });
    setRosterEditOpen(true);
  };

  const saveEditRoster = () => {
    if (!editingRoster) return;
    if (!rosterForm.title.trim() || !rosterForm.zoneName || rosterForm.guardIds.length === 0 || rosterForm.dayOffWeekdays.length === 0) {
      toast({ title: "Complete required fields", description: "Title, zone, day off, and guards are required." });
      return;
    }
    if (!rosterForm.effectiveFrom || !rosterForm.effectiveTo || rosterForm.effectiveFrom > rosterForm.effectiveTo) {
      toast({ title: "Invalid effective range", description: "Please set a valid date range." });
      return;
    }
    const next = rosters.map((roster) =>
      roster.id === editingRoster.id
        ? {
            ...roster,
            title: rosterForm.title.trim(),
            zoneName: rosterForm.zoneName,
            guardIds: rosterForm.guardIds,
            dayOffWeekdays: [...rosterForm.dayOffWeekdays].sort((a, b) => a - b),
            effectiveFrom: rosterForm.effectiveFrom,
            effectiveTo: rosterForm.effectiveTo,
          }
        : roster,
    );
    writeRosters(next);
    setRosters(next);
    setLeaveEntries(readAvailability());
    appendAuditLog({
      actor: "Admin",
      module: "availability",
      action: "update",
      entityType: "roster",
      entityId: editingRoster.id,
      summary: `Updated roster ${rosterForm.title.trim()} (${rosterForm.zoneName})`,
    });
    setRosterEditOpen(false);
    setEditingRoster(null);
    toast({ title: "Roster updated", description: "Roster changes saved." });
  };

  const openEditLeave = (entry: GuardAvailability) => {
    setEditingLeave(entry);
    setLeaveForm({
      guardId: entry.guardId,
      startDate: entry.startDate,
      endDate: entry.endDate,
      note: entry.note || "",
    });
    setLeaveEditOpen(true);
  };

  const saveEditLeave = () => {
    if (!editingLeave) return;
    if (!leaveForm.guardId || !leaveForm.startDate || !leaveForm.endDate) {
      toast({ title: "Required fields missing", description: "Guard and date range are required." });
      return;
    }
    if (leaveForm.startDate > leaveForm.endDate) {
      toast({ title: "Invalid date range", description: "End date cannot be before start date." });
      return;
    }
    const guard = guards.find((g) => g.id === leaveForm.guardId);
    const next = leaveEntries.map((entry) =>
      entry.id === editingLeave.id
        ? {
            ...entry,
            guardId: leaveForm.guardId,
            guardName: guard?.name || leaveForm.guardId,
            startDate: leaveForm.startDate,
            endDate: leaveForm.endDate,
            note: leaveForm.note.trim() || "Leave",
            type: "leave",
            mode: "date-range",
          }
        : entry,
    );
    writeAvailability(next);
    setLeaveEntries(readAvailability());
    appendAuditLog({
      actor: "Admin",
      module: "availability",
      action: "update",
      entityType: "leave",
      entityId: editingLeave.id,
      summary: `Updated leave for ${guard?.name || leaveForm.guardId}`,
    });
    setLeaveEditOpen(false);
    setEditingLeave(null);
    toast({ title: "Leave updated", description: "Leave changes saved." });
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-[linear-gradient(120deg,hsl(var(--primary)/0.15),hsl(var(--background))_50%,hsl(var(--info)/0.1))] p-4 sm:p-5">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 w-28 h-28 rounded-full bg-info/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="page-header">
            <h1 className="page-title">Availability</h1>
            <p className="page-subtitle">Manage weekly rosters and temporary leave in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/availability/leave/new">
              <Button variant="outline" className="gap-2">
                <CalendarOff className="w-4 h-4" /> Add Leave
              </Button>
            </a>
            <a href="/availability/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add New Roster
              </Button>
            </a>
          </div>
        </div>

        <div className="relative mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rosters</p>
            <p className="text-lg font-bold">{rosters.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Roster Guards</p>
            <p className="text-lg font-bold">{rosterGuardCount}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Leaves</p>
            <p className="text-lg font-bold">{listedLeaves.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Leave Guards</p>
            <p className="text-lg font-bold">{leaveGuardCount}</p>
          </div>
        </div>
      </div>

      <div className="stat-card p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeView === "rosters" ? "default" : "outline"}
            onClick={() => setActiveView("rosters")}
          >
            Rosters ({rosters.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeView === "leaves" ? "default" : "outline"}
            onClick={() => setActiveView("leaves")}
          >
            Leaves ({listedLeaves.length})
          </Button>
        </div>
      </div>

      <div className="stat-card p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Input
            className="mt-1 h-9"
            placeholder={activeView === "rosters" ? "Search title, zone, guards..." : "Search guard, zone, note..."}
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Zone</Label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.zoneName}
              onChange={(value) => setFilters((prev) => ({ ...prev, zoneName: value }))}
              options={[
                { value: "all", label: "All Zones" },
                ...zones.map((zone) => ({ value: zone, label: zone })),
              ]}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              options={
                activeView === "rosters"
                  ? [
                      { value: "all", label: "All" },
                      { value: "active", label: "Active" },
                      { value: "upcoming", label: "Upcoming" },
                      { value: "expired", label: "Expired" },
                    ]
                  : [
                      { value: "all", label: "All" },
                      { value: "active", label: "Active" },
                      { value: "upcoming", label: "Upcoming" },
                      { value: "completed", label: "Completed" },
                    ]
              }
            />
          </div>
        </div>
      </div>

      <div className="stat-card p-3">
        {activeView === "rosters" ? (
          filteredRosters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-5 text-center">No roster found. Click Add New Roster to create one.</p>
          ) : (
            <div className="space-y-2">
              {filteredRosters.map((roster) => (
                <div key={roster.id} className="rounded-xl border border-border bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--secondary)/0.35))] px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <CalendarRange className="w-4 h-4 text-primary" />
                        {roster.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Zone: {roster.zoneName} | Day Off: {weekdayLabel(roster.dayOffWeekdays)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Effective: {roster.effectiveFrom} to {roster.effectiveTo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Users className="inline w-3.5 h-3.5 mr-1" />
                        {roster.guardIds.length} Guards: {guardSummary(roster.guardIds)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a href={`/availability/${roster.id}/edit`}>
                        <Button type="button" variant="ghost" size="sm">
                          <Pencil className="w-4 h-4 mr-1" /> Edit
                        </Button>
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(roster.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredLeaves.length === 0 ? (
          <p className="text-sm text-muted-foreground py-5 text-center">No leave entries found.</p>
        ) : (
          <div className="space-y-2">
            {filteredLeaves.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--secondary)/0.35))] px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <CalendarOff className="w-4 h-4 text-warning" />
                      {entry.guardName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Leave: {entry.startDate} to {entry.endDate}
                    </p>
                    {entry.note && <p className="text-xs text-muted-foreground mt-0.5">Note: {entry.note}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEditLeave(entry)}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteLeave(entry.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={rosterEditOpen} onOpenChange={setRosterEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Roster</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 md:col-span-6 space-y-1">
                <Label>Roster Title</Label>
                <Input value={rosterForm.title} onChange={(e) => setRosterForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="col-span-12 md:col-span-6 space-y-1">
                <Label>Zone</Label>
                <SearchableSelect
                  value={rosterForm.zoneName}
                  onChange={(value) => setRosterForm((p) => ({ ...p, zoneName: value, guardIds: [] }))}
                  options={zones.map((zone) => ({ value: zone, label: zone }))}
                />
              </div>
              <div className="col-span-12 sm:col-span-6 space-y-1">
                <Label>From</Label>
                <DatePicker
                  value={rosterForm.effectiveFrom}
                  onChange={(value) => setRosterForm((p) => ({ ...p, effectiveFrom: value }))}
                  noTruncate
                />
              </div>
              <div className="col-span-12 sm:col-span-6 space-y-1">
                <Label>To</Label>
                <DatePicker
                  value={rosterForm.effectiveTo}
                  onChange={(value) => setRosterForm((p) => ({ ...p, effectiveTo: value }))}
                  noTruncate
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Day Off</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {WEEKDAY_OPTIONS.map((day) => {
                  const checked = rosterForm.dayOffWeekdays.includes(day.value);
                  return (
                    <label key={day.value} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleRosterDay(day.value, e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Guards</Label>
              <div className="rounded-md border border-border max-h-44 overflow-auto">
                {rosterZoneGuards.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-4">No guards in selected zone.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {rosterZoneGuards.map((guard) => {
                      const checked = rosterForm.guardIds.includes(guard.id);
                      return (
                        <label key={guard.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/30">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleRosterGuard(guard.id, e.target.checked)}
                            className="h-4 w-4 rounded border-border"
                          />
                          <p className="text-sm">{guard.name}</p>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRosterEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEditRoster}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveEditOpen} onOpenChange={setLeaveEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Guard</Label>
              <SearchableSelect
                value={leaveForm.guardId}
                onChange={(value) => setLeaveForm((p) => ({ ...p, guardId: value }))}
                options={activeGuards.map((guard) => ({ value: guard.id, label: `${guard.name} (${guard.employeeId})` }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>From</Label>
                <DatePicker value={leaveForm.startDate} onChange={(value) => setLeaveForm((p) => ({ ...p, startDate: value }))} />
              </div>
              <div className="space-y-1">
                <Label>To</Label>
                <DatePicker value={leaveForm.endDate} onChange={(value) => setLeaveForm((p) => ({ ...p, endDate: value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Input value={leaveForm.note} onChange={(e) => setLeaveForm((p) => ({ ...p, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEditLeave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
