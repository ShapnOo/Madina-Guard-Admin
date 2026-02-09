import { useEffect, useMemo, useState } from "react";
import { Plus, Clock, Shield, Navigation, Trash2, Search, Filter, Pencil, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchableSelect from "@/components/SearchableSelect";
import type { Schedule } from "@/types/guard-management";
import { Badge } from "@/components/ui/badge";
import { deleteScheduleById, readSchedules, SCHEDULE_STORAGE_KEY, writeSchedules } from "@/lib/schedule-store";
import { toInitCapLabel } from "@/lib/text";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { appendAuditLog } from "@/lib/audit-store";

const DEMO_SCHEDULE_UPDATE_PASSWORD = "12345678";
const DEMO_SCHEDULE_DELETE_PASSWORD = "12345678";

function format12h(time24: string) {
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "No date range set";
  if (startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} to ${formatDate(endDate)}`;
}

function groupSchedulesByGuard(schedules: Schedule[]) {
  const map = new Map<
    string,
    {
      guardId: string;
      guardName: string;
      zoneNames: string[];
      schedules: Schedule[];
    }
  >();

  schedules.forEach((schedule) => {
    const key = schedule.guardId || schedule.guardName;
    if (!map.has(key)) {
      map.set(key, {
        guardId: key,
        guardName: schedule.guardName,
        zoneNames: [],
        schedules: [],
      });
    }
    const bucket = map.get(key)!;
    bucket.schedules.push(schedule);
    if (!bucket.zoneNames.includes(schedule.zoneName)) {
      bucket.zoneNames.push(schedule.zoneName);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.guardName.localeCompare(b.guardName));
}

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>(readSchedules());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Schedule["status"]>("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [updatePassword, setUpdatePassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [editForm, setEditForm] = useState({
    graceTimeMinutes: 10,
    status: "active" as Schedule["status"],
    timeSlots: [] as Schedule["timeSlots"],
    timeInput: "",
  });

  useEffect(() => {
    const refresh = () => setSchedules(readSchedules());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SCHEDULE_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const zones = useMemo(() => Array.from(new Set(schedules.map((s) => s.zoneName))), [schedules]);
  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter !== "all" || zoneFilter !== "all";

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        s.guardName.toLowerCase().includes(query) ||
        s.checkpointName.toLowerCase().includes(query) ||
        s.zoneName.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesZone = zoneFilter === "all" || s.zoneName === zoneFilter;
      return matchesSearch && matchesStatus && matchesZone;
    });
  }, [schedules, searchTerm, statusFilter, zoneFilter]);

  const stats = useMemo(() => {
    const dailyVisits = filteredSchedules.reduce((sum, s) => sum + s.timeSlots.length, 0);
    return {
      assignments: filteredSchedules.length,
      guards: new Set(filteredSchedules.map((s) => s.guardId || s.guardName)).size,
      active: filteredSchedules.filter((s) => s.status === "active").length,
      visits: dailyVisits,
    };
  }, [filteredSchedules]);

  const groupedByRange = useMemo(() => {
    const map = new Map<
      string,
      {
        startDate: string;
        endDate: string;
        schedules: Schedule[];
      }
    >();

    filteredSchedules.forEach((schedule) => {
      const startDate = schedule.startDate || "";
      const endDate = schedule.endDate || "";
      const key = startDate && endDate ? `${startDate}::${endDate}` : "no-range";
      if (!map.has(key)) {
        map.set(key, {
          startDate,
          endDate,
          schedules: [],
        });
      }
      map.get(key)!.schedules.push(schedule);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      return a.endDate.localeCompare(b.endDate);
    });
  }, [filteredSchedules]);

  const handleDelete = (id: string) => {
    const target = schedules.find((s) => s.id === id);
    deleteScheduleById(id);
    setSchedules(readSchedules());
    if (target) {
      appendAuditLog({
        actor: "Admin",
        module: "schedules",
        action: "delete",
        entityType: "schedule",
        entityId: id,
        summary: `Deleted schedule for ${target.guardName} at ${target.checkpointName}`,
      });
    }
  };

  const requestDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeletePassword("");
    setDeletePasswordError("");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    if (deletePassword !== DEMO_SCHEDULE_DELETE_PASSWORD) {
      setDeletePasswordError("Incorrect password");
      return;
    }
    handleDelete(deleteTargetId);
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const openEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setEditForm({
      graceTimeMinutes: schedule.graceTimeMinutes,
      status: schedule.status,
      timeSlots: schedule.timeSlots,
      timeInput: "",
    });
    setUpdatePassword("");
    setPasswordError("");
    setEditDialogOpen(true);
  };

  const addTimeToEditForm = () => {
    const normalized = editForm.timeInput.trim().slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(normalized)) return;
    if (editForm.timeSlots.some((slot) => slot.time === normalized)) return;
    setEditForm((prev) => ({
      ...prev,
      timeSlots: [
        ...prev.timeSlots,
        { id: `ts-${Date.now()}`, time: normalized, label: `Visit at ${normalized}` },
      ].sort((a, b) => a.time.localeCompare(b.time)),
      timeInput: "",
    }));
  };

  const removeTimeFromEditForm = (slotId: string) => {
    setEditForm((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((slot) => slot.id !== slotId),
    }));
  };

  const requestUpdate = () => {
    setUpdatePassword("");
    setPasswordError("");
    setPasswordDialogOpen(true);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setZoneFilter("all");
  };

  const confirmUpdate = () => {
    if (!editingSchedule) return;
    if (updatePassword !== DEMO_SCHEDULE_UPDATE_PASSWORD) {
      setPasswordError("Incorrect password");
      return;
    }
    const nextSchedules = schedules.map((schedule) =>
      schedule.id === editingSchedule.id
        ? {
            ...schedule,
            graceTimeMinutes: editForm.graceTimeMinutes,
            status: editForm.status,
            timeSlots: editForm.timeSlots,
          }
        : schedule,
    );
    writeSchedules(nextSchedules);
    setSchedules(nextSchedules);
    appendAuditLog({
      actor: "Admin",
      module: "schedules",
      action: "update",
      entityType: "schedule",
      entityId: editingSchedule.id,
      summary: `Updated schedule for ${editingSchedule.guardName} at ${editingSchedule.checkpointName}`,
    });
    setPasswordDialogOpen(false);
    setEditDialogOpen(false);
    setEditingSchedule(null);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/70 bg-gradient-to-r from-background via-background to-primary/5 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="page-header">
            <h1 className="page-title">Schedules</h1>
            <p className="page-subtitle">Date-range schedules with guard breakdowns and quick actions</p>
          </div>
          <a href="/schedules/new" target="_blank" rel="noreferrer">
            <Button className="gap-2 h-9 px-3 text-sm">
              <Plus className="w-4 h-4" /> Add Schedule
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Assignments</p>
          <p className="text-lg font-semibold mt-0.5">{stats.assignments}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Guards</p>
          <p className="text-lg font-semibold mt-0.5">{stats.guards}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Active</p>
          <p className="text-lg font-semibold mt-0.5">{stats.active}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Visits / Day</p>
          <p className="text-lg font-semibold mt-0.5">{stats.visits}</p>
        </div>
      </div>

      <div className="stat-card p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Filters</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </Button>
        </div>
        <div className="grid grid-cols-12 gap-2.5 items-end">
          <div className="relative col-span-12 md:col-span-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-10 text-sm bg-background/80"
              placeholder="Search guard, checkpoint, zone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="col-span-6 md:col-span-3">
            <SearchableSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as "all" | Schedule["status"])}
              options={[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              className="h-10 text-sm bg-background/80"
            />
          </div>
          <div className="col-span-6 md:col-span-3">
            <SearchableSelect
              value={zoneFilter}
              onChange={setZoneFilter}
              options={[
                { value: "all", label: "All Zones" },
                ...zones.map((zone) => ({ value: zone, label: zone })),
              ]}
              className="h-10 text-sm bg-background/80"
            />
          </div>
        </div>
      </div>

      <div className="stat-card p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Click a date range to view guards scheduled for that window.</p>
          <Badge variant="outline" className="text-[11px] px-2 py-0.5">{groupedByRange.length} ranges</Badge>
        </div>
        {groupedByRange.length === 0 ? (
          <div className="py-7 text-center">
            <Filter className="w-4 h-4 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">No schedules found.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {groupedByRange.map((rangeGroup) => {
              const guardGroups = groupSchedulesByGuard(rangeGroup.schedules);
              const visits = rangeGroup.schedules.reduce((sum, s) => sum + s.timeSlots.length, 0);
              const rangeLabel = formatDateRange(rangeGroup.startDate, rangeGroup.endDate);
              return (
                <AccordionItem
                  key={`${rangeGroup.startDate || "none"}-${rangeGroup.endDate || "none"}`}
                  value={`${rangeGroup.startDate || "none"}-${rangeGroup.endDate || "none"}`}
                  className="border border-border/70 rounded-lg px-3 bg-gradient-to-r from-background to-primary/5 shadow-sm"
                >
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{rangeLabel}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {guardGroups.length} guards | {rangeGroup.schedules.length} checkpoints
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[11px] px-2 py-0.5">{guardGroups.length} guards</Badge>
                        <Badge variant="secondary" className="text-[11px] px-2 py-0.5">{visits} visits/day</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <Accordion type="multiple" className="space-y-2">
                      {guardGroups.map((group) => {
                        const guardVisits = group.schedules.reduce((sum, s) => sum + s.timeSlots.length, 0);
                        return (
                          <AccordionItem
                            key={`${rangeGroup.startDate || "none"}-${rangeGroup.endDate || "none"}-${group.guardId}`}
                            value={`${rangeGroup.startDate || "none"}-${rangeGroup.endDate || "none"}-${group.guardId}`}
                            className="border border-border/70 rounded-lg px-3 bg-card/80"
                          >
                            <AccordionTrigger className="py-3 hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <p className="text-sm font-semibold text-foreground truncate">{group.guardName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{group.zoneNames.join(", ")}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="secondary" className="text-[11px] px-2 py-0.5">{group.schedules.length} checkpoints</Badge>
                                  <Badge variant="secondary" className="text-[11px] px-2 py-0.5">{guardVisits} visits/day</Badge>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3">
                              <div className="space-y-2">
                                {group.schedules.map((schedule) => (
                                  <div key={schedule.id} className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <Navigation className="w-3.5 h-3.5 text-muted-foreground" />
                                          <p className="text-sm font-medium truncate">{schedule.checkpointName}</p>
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                          {schedule.timeSlots.map((slot) => (
                                            <Badge key={slot.id} variant="secondary" className="font-mono text-xs gap-1 px-2 py-0.5 rounded-md">
                                              <Clock className="w-3 h-3" />
                                              {format12h(slot.time)}
                                            </Badge>
                                          ))}
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                          <Badge variant="outline" className="text-[11px] px-2 py-0.5">Grace {schedule.graceTimeMinutes} min</Badge>
                                        </div>
                                      </div>
                                      <div className="flex items-center md:justify-end gap-1">
                                        <span className={`status-badge ${schedule.status === "active" ? "status-active" : "status-inactive"}`}>
                                          {toInitCapLabel(schedule.status)}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => openEdit(schedule)}
                                          className="h-8 px-2 rounded-md"
                                        >
                                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => requestDelete(schedule.id)}
                                          className="h-8 px-2 rounded-md text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          {editingSchedule && (
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-border bg-secondary/25 p-3">
                <p className="text-sm font-semibold">{editingSchedule.guardName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingSchedule.zoneName} | {editingSchedule.checkpointName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Grace Time (min)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.graceTimeMinutes}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, graceTimeMinutes: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <SearchableSelect
                    value={editForm.status}
                    onChange={(value) => setEditForm((prev) => ({ ...prev, status: value as Schedule["status"] }))}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Times</Label>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={editForm.timeInput}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, timeInput: e.target.value }))}
                  />
                  <Button type="button" variant="outline" onClick={addTimeToEditForm} disabled={!editForm.timeInput}>
                    <Plus className="w-4 h-4 mr-1" /> Add Time
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {editForm.timeSlots.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-1">No time added.</p>
                  )}
                  {editForm.timeSlots.map((slot) => (
                    <div key={slot.id} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-mono">{slot.time}</span>
                      <button
                        type="button"
                        onClick={() => removeTimeFromEditForm(slot.id)}
                        className="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={requestUpdate} disabled={editForm.timeSlots.length === 0}>
              Update Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={updatePassword}
                onChange={(e) => {
                  setUpdatePassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="Enter password"
              />
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
              <p className="text-xs text-muted-foreground">Demo password: {DEMO_SCHEDULE_UPDATE_PASSWORD}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmUpdate} disabled={!updatePassword.trim()}>
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  if (deletePasswordError) setDeletePasswordError("");
                }}
                placeholder="Enter password"
              />
              {deletePasswordError && <p className="text-xs text-destructive">{deletePasswordError}</p>}
              <p className="text-xs text-muted-foreground">Demo password: {DEMO_SCHEDULE_DELETE_PASSWORD}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={!deletePassword.trim()}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



