import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2, Clock, Save, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/SearchableSelect";
import DatePicker from "@/components/DatePicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { mockGuards, mockCheckpoints, mockZones } from "@/data/mock-data";
import type { Schedule, ScheduleSlot } from "@/types/guard-management";
import { addSchedules, readSchedules } from "@/lib/schedule-store";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { toInitCapLabel } from "@/lib/text";
import { cn } from "@/lib/utils";
import { appendAuditLog } from "@/lib/audit-store";
import { isGuardUnavailableInRange, readAvailability } from "@/lib/availability-store";

type DraftCheckpointPlan = {
  id: string;
  checkpointId: string;
  graceTimeMinutes: number;
  status: Schedule["status"];
  timeSlots: ScheduleSlot[];
  timeInput: string;
  labelInput: string;
};

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createPlanRow(graceTimeMinutes: number): DraftCheckpointPlan {
  return {
    id: makeId("row"),
    checkpointId: "",
    graceTimeMinutes,
    status: "active",
    timeSlots: [],
    timeInput: "",
    labelInput: "",
  };
}

function buildPlansFromCheckpoints(checkpoints: Array<{ id: string }>, graceTimeMinutes: number) {
  return checkpoints.map((checkpoint) => ({
    ...createPlanRow(graceTimeMinutes),
    checkpointId: checkpoint.id,
  }));
}

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function parse24h(time24: string) {
  if (!/^\d{2}:\d{2}$/.test(time24)) {
    return { hour12: 8, minute: 0, period: "AM" as const };
  }
  const [hourRaw, minuteRaw] = time24.split(":").map(Number);
  const period: "AM" | "PM" = hourRaw >= 12 ? "PM" : "AM";
  const hour12 = hourRaw % 12 === 0 ? 12 : hourRaw % 12;
  return { hour12, minute: minuteRaw, period };
}

function to24h(hour12: number, minute: number, period: "AM" | "PM") {
  let hour = hour12 % 12;
  if (period === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function format12h(time24: string) {
  const { hour12, minute, period } = parse24h(time24);
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && endA >= startB;
}

function getDuplicateTimes(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([time]) => time);
}

function TimePicker12h({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const initial = parse24h(value);
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute - (initial.minute % 5));
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period);

  useEffect(() => {
    if (!open) return;
    const next = parse24h(value);
    setHour12(next.hour12);
    setMinute(next.minute - (next.minute % 5));
    setPeriod(next.period);
  }, [open, value]);

  const preview = `${hour12}:${String(minute).padStart(2, "0")} ${period}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full h-10 justify-between text-sm font-normal">
          <span>{value ? format12h(value) : "Select time"}</span>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start">
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Selected Time</p>
            <p className="text-lg font-semibold mt-0.5">{preview}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Hour</p>
              <div className="grid grid-cols-3 gap-1">
                {HOURS_12.map((hr) => (
                  <button
                    key={hr}
                    type="button"
                    onClick={() => setHour12(hr)}
                    className={cn(
                      "h-8 rounded-md border text-xs font-medium transition-colors",
                      hour12 === hr
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-secondary border-border",
                    )}
                  >
                    {hr}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Minute</p>
              <div className="grid grid-cols-3 gap-1">
                {MINUTES_5.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setMinute(min)}
                    className={cn(
                      "h-8 rounded-md border text-xs font-medium transition-colors",
                      minute === min
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-secondary border-border",
                    )}
                  >
                    {String(min).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["AM", "PM"] as const).map((md) => (
              <button
                key={md}
                type="button"
                onClick={() => setPeriod(md)}
                className={cn(
                  "h-9 rounded-md border text-sm font-semibold transition-colors",
                  period === md
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-secondary border-border",
                )}
              >
                {md}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onChange(to24h(hour12, minute, period));
                setOpen(false);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ScheduleBulkCreate() {
  const { toast } = useToast();
  const [guardId, setGuardId] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [globalGrace, setGlobalGrace] = useState(10);
  const [plans, setPlans] = useState<DraftCheckpointPlan[]>([createPlanRow(10)]);
  const [rangeStart, setRangeStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [rangeEnd, setRangeEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const lastZoneRef = useRef<string>("");

  const guard = useMemo(() => mockGuards.find((g) => g.id === guardId), [guardId]);

  const availableCheckpoints = useMemo(() => {
    if (!zoneName) return [];
    return mockCheckpoints.filter((c) => c.status === "active" && c.zoneName === zoneName);
  }, [zoneName]);

  const selectedCheckpointMap = useMemo(() => {
    return new Map(mockCheckpoints.map((cp) => [cp.id, cp]));
  }, []);

  const totalVisits = useMemo(
    () => plans.reduce((sum, row) => sum + row.timeSlots.length, 0),
    [plans],
  );

  const completedRows = useMemo(
    () => plans.filter((row) => row.checkpointId && row.timeSlots.length > 0).length,
    [plans],
  );

  useEffect(() => {
    if (lastZoneRef.current === zoneName && plans.length > 0) return;
    lastZoneRef.current = zoneName;
    setPlans(buildPlansFromCheckpoints(availableCheckpoints, globalGrace));
  }, [zoneName, availableCheckpoints, globalGrace, plans.length]);

  const updatePlan = (rowId: string, updater: (row: DraftCheckpointPlan) => DraftCheckpointPlan) => {
    setPlans((prev) => prev.map((row) => (row.id === rowId ? updater(row) : row)));
  };

  const removePlanRow = (rowId: string) => {
    setPlans((prev) => prev.filter((row) => row.id !== rowId));
  };

  const addTimeSlot = (rowId: string) => {
    updatePlan(rowId, (row) => {
      const normalizedTime = row.timeInput?.trim().slice(0, 5);
      if (!normalizedTime) return row;
      if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
        toast({ title: "Invalid time", description: "Use HH:MM format." });
        return row;
      }
      if (row.timeSlots.some((slot) => slot.time === normalizedTime)) {
        toast({ title: "Duplicate time", description: `${normalizedTime} already exists for this checkpoint.` });
        return row;
      }
      if (
        row.checkpointId &&
        plans.some(
          (plan) =>
            plan.id !== rowId &&
            plan.checkpointId === row.checkpointId &&
            plan.timeSlots.some((slot) => slot.time === normalizedTime),
        )
      ) {
        toast({
          title: "Duplicate checkpoint-time",
          description: `${format12h(normalizedTime)} already exists for this checkpoint.`,
        });
        return row;
      }
      const nextSlot: ScheduleSlot = {
        id: makeId("ts"),
        time: normalizedTime,
        label: row.labelInput || `Visit at ${format12h(normalizedTime)}`,
      };
      return {
        ...row,
        timeSlots: [...row.timeSlots, nextSlot].sort((a, b) => a.time.localeCompare(b.time)),
        timeInput: "",
        labelInput: "",
      };
    });
  };

  const removeTimeSlot = (rowId: string, slotId: string) => {
    updatePlan(rowId, (row) => ({
      ...row,
      timeSlots: row.timeSlots.filter((slot) => slot.id !== slotId),
    }));
  };

  const handleSaveAll = () => {
    if (!guard) {
      toast({ title: "Select guard", description: "Please select a guard first." });
      return;
    }
    if (plans.length === 0) {
      toast({ title: "Select zone", description: "Please select a zone to load checkpoints." });
      return;
    }
    if (!rangeStart || !rangeEnd) {
      toast({ title: "Date range required", description: "Please select a schedule start and end date." });
      return;
    }
    if (rangeStart > rangeEnd) {
      toast({ title: "Invalid date range", description: "Start date must be before the end date." });
      return;
    }

    const availability = readAvailability();
    const unavailable = isGuardUnavailableInRange(availability, guard.id, rangeStart, rangeEnd);
    if (unavailable) {
      toast({
        title: "Guard unavailable",
        description: `${guard.name} is marked ${toInitCapLabel(unavailable.record.type)} on ${unavailable.dateISO}.`,
      });
      return;
    }

    for (const row of plans) {
      if (!row.checkpointId) {
        toast({ title: "Checkpoint required", description: "Each row needs a checkpoint." });
        return;
      }
      if (row.timeSlots.length === 0) {
        toast({ title: "Time required", description: "Each checkpoint needs at least one visit time." });
        return;
      }
    }

    const allNewTimes = plans.flatMap((row) => row.timeSlots.map((slot) => slot.time));
    const duplicateTimes = getDuplicateTimes(allNewTimes);
    if (duplicateTimes.length > 0) {
      toast({
        title: "Schedule conflict",
        description: `Same guard has overlapping times: ${duplicateTimes.map(format12h).join(", ")}.`,
      });
      return;
    }

    const duplicateCheckpointTimeInBatch = (() => {
      const seen = new Set<string>();
      for (const row of plans) {
        for (const slot of row.timeSlots) {
          const key = `${row.checkpointId}::${slot.time}`;
          if (seen.has(key)) return { checkpointId: row.checkpointId, time: slot.time };
          seen.add(key);
        }
      }
      return undefined;
    })();
    if (duplicateCheckpointTimeInBatch) {
      const checkpointName = selectedCheckpointMap.get(duplicateCheckpointTimeInBatch.checkpointId)?.name || "Checkpoint";
      toast({
        title: "Duplicate checkpoint-time",
        description: `${checkpointName} already has ${format12h(duplicateCheckpointTimeInBatch.time)}.`,
      });
      return;
    }

    const existingSchedules = readSchedules().filter(
      (schedule) =>
        schedule.guardId === guard.id &&
        schedule.status === "active" &&
        rangesOverlap(
          rangeStart,
          rangeEnd,
          schedule.startDate || rangeStart,
          schedule.endDate || rangeEnd,
        ),
    );
    const existingTimeSet = new Set(existingSchedules.flatMap((schedule) => schedule.timeSlots.map((slot) => slot.time)));
    const overlapWithExisting = allNewTimes.filter((time) => existingTimeSet.has(time));
    if (overlapWithExisting.length > 0) {
      const uniqueOverlaps = Array.from(new Set(overlapWithExisting));
      toast({
        title: "Schedule conflict",
        description: `Guard already has schedules at ${uniqueOverlaps.map(format12h).join(", ")}.`,
      });
      return;
    }

    const existingCheckpointTimeSet = new Set(
      existingSchedules.flatMap((schedule) => schedule.timeSlots.map((slot) => `${schedule.checkpointId}::${slot.time}`)),
    );
    const duplicateCheckpointTimeExisting = plans.find((row) =>
      row.timeSlots.some((slot) => existingCheckpointTimeSet.has(`${row.checkpointId}::${slot.time}`)),
    );
    if (duplicateCheckpointTimeExisting) {
      const duplicateSlot = duplicateCheckpointTimeExisting.timeSlots.find((slot) =>
        existingCheckpointTimeSet.has(`${duplicateCheckpointTimeExisting.checkpointId}::${slot.time}`),
      );
      if (duplicateSlot) {
        const checkpointName = selectedCheckpointMap.get(duplicateCheckpointTimeExisting.checkpointId)?.name || "Checkpoint";
        toast({
          title: "Duplicate checkpoint-time",
          description: `${checkpointName} already has ${format12h(duplicateSlot.time)} in an existing schedule.`,
        });
        return;
      }
    }

    const newSchedules: Schedule[] = plans.map((row) => {
      const checkpoint = mockCheckpoints.find((c) => c.id === row.checkpointId);
      return {
        id: makeId("s"),
        guardId: guard.id,
        guardName: guard.name,
        checkpointId: row.checkpointId,
        checkpointName: checkpoint?.name || "",
        startDate: rangeStart,
        endDate: rangeEnd,
        zoneName: checkpoint?.zoneName || guard.assignedZone || "",
        timeSlots: row.timeSlots,
        graceTimeMinutes: row.graceTimeMinutes,
        status: row.status,
      };
    });

    addSchedules(newSchedules);
    appendAuditLog({
      actor: "Admin",
      module: "schedules",
      action: "create",
      entityType: "schedule-bulk",
      entityId: newSchedules.map((s) => s.id).join(","),
      summary: `Created ${newSchedules.length} schedules for ${guard.name} from ${rangeStart} to ${rangeEnd}`,
    });
    toast({
      title: "Schedules created",
      description: `${newSchedules.length} assignments added for ${guard.name}.`,
    });
    setPlans([createPlanRow(globalGrace)]);
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-start justify-between gap-2">
        <div>
          <a href="/schedules" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to schedules
          </a>
          <h1 className="text-2xl font-bold text-foreground mt-1">Add Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">One guard, multiple checkpoints, one save. Faster bulk entry workflow.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="px-2.5 py-1 text-xs">
          {plans.length} Rows
        </Badge>
        <Badge variant="secondary" className="px-2.5 py-1 text-xs">
          {completedRows}/{plans.length} Ready
        </Badge>
        <Badge variant="secondary" className="px-2.5 py-1 text-xs">
          {totalVisits} Visits/Day
        </Badge>
      </div>

      <div className="stat-card p-3 space-y-3">
        <Label>Guard</Label>
        <SearchableSelect
          value={guardId}
          onChange={(value) => {
            setGuardId(value);
            const nextGuard = mockGuards.find((g) => g.id === value);
            const nextZone = nextGuard?.assignedZone || "";
            setZoneName(nextZone);
            const nextCheckpoints = nextZone
              ? mockCheckpoints.filter((c) => c.status === "active" && c.zoneName === nextZone)
              : [];
            setPlans(buildPlansFromCheckpoints(nextCheckpoints, globalGrace));
          }}
          options={mockGuards
            .filter((g) => g.status !== "inactive")
            .map((g) => ({ value: g.id, label: `${g.name} (${g.employeeId})` }))}
          placeholder="Select guard"
        />
        {guard && (
          <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>Zone: {guard.assignedZone || "Not assigned"} | Checkpoints available: {availableCheckpoints.length}</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-12 gap-x-2 gap-y-2">
          <div className="col-span-12 md:col-span-6 space-y-1">
            <Label>Zone</Label>
            <SearchableSelect
              value={zoneName}
              onChange={setZoneName}
              options={[
                ...mockZones.map((zone) => ({ value: zone.name, label: zone.name })),
              ]}
              placeholder="Select zone"
            />
          </div>
          <div className="col-span-12 md:col-span-6 space-y-1">
            <Label>Global Grace (min)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                value={globalGrace}
                onChange={(e) => setGlobalGrace(Number(e.target.value) || 0)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPlans((prev) => prev.map((row) => ({ ...row, graceTimeMinutes: globalGrace })))}
              >
                Apply to All
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-2 gap-y-2">
          <div className="col-span-12 md:col-span-6 space-y-1">
            <Label>Start Date</Label>
            <DatePicker value={rangeStart} onChange={setRangeStart} />
          </div>
          <div className="col-span-12 md:col-span-6 space-y-1">
            <Label>End Date</Label>
            <DatePicker value={rangeEnd} onChange={setRangeEnd} />
          </div>
        </div>
       
      </div>

      <div className="space-y-3">
        {plans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-card/60 p-4 text-center text-sm text-muted-foreground">
            Select a zone to load checkpoints.
          </div>
        ) : (
          plans.map((row) => (
            <div key={row.id} className="stat-card p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {selectedCheckpointMap.get(row.checkpointId)?.name || "Checkpoint"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedCheckpointMap.get(row.checkpointId)?.zoneName || zoneName || "Zone"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removePlanRow(row.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove checkpoint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-12 gap-x-2 gap-y-2">
                <div className="col-span-6 md:col-span-2 space-y-1">
                  <Label>Grace</Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.graceTimeMinutes}
                    onChange={(e) => updatePlan(row.id, (current) => ({ ...current, graceTimeMinutes: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="col-span-6 md:col-span-3 space-y-1">
                  <Label>Status</Label>
                  <SearchableSelect
                    value={row.status}
                    onChange={(value) => updatePlan(row.id, (current) => ({ ...current, status: value as Schedule["status"] }))}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-x-2 gap-y-2 items-end">
                <div className="col-span-12 md:col-span-2 space-y-1">
                  <Label>Time</Label>
                  <TimePicker12h
                    value={row.timeInput}
                    onChange={(value) => updatePlan(row.id, (current) => ({ ...current, timeInput: value }))}
                  />
                </div>
                <div className="col-span-12 md:col-span-8 space-y-1">
                  <Label>Label</Label>
                  <Input
                    className="h-10 text-sm"
                    placeholder="Optional note"
                    value={row.labelInput}
                    onChange={(e) => updatePlan(row.id, (current) => ({ ...current, labelInput: e.target.value }))}
                  />
                </div>
                <div className="col-span-12 md:col-span-2">
                  <Button type="button" variant="outline" size="sm" className="w-full h-10 text-sm" onClick={() => addTimeSlot(row.id)} disabled={!row.timeInput}>
                    <Plus className="w-4 h-4 mr-1" /> Add Time
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {row.timeSlots.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-1">No time added.</p>
                )}
                {row.timeSlots.map((slot) => (
                  <div key={slot.id} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-mono">{format12h(slot.time)}</span>
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(row.id, slot.id)}
                      className="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                {row.timeSlots.length} visits/day | Grace {row.graceTimeMinutes} min | {toInitCapLabel(row.status)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sticky bottom-3 z-20">
        <div className="stat-card p-2.5 flex items-center justify-between gap-2">
          <Button type="button" size="sm" className="h-9 text-sm" onClick={handleSaveAll}>
            <Save className="w-4 h-4 mr-1" /> Save All
          </Button>
        </div>
      </div>

      {completedRows === plans.length && plans.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="w-4 h-4" />
          All rows are ready to save.
        </div>
      )}
    </div>
  );
}
