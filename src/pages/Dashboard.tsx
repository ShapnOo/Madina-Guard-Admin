import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CalendarX2,
  CheckCircle2,
  Clock3,
  History,
  Navigation,
  QrCode,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { mockGuards, mockPatrolHistory } from "@/data/mock-data";
import { CHECKPOINT_STORAGE_KEY, readCheckpoints } from "@/lib/checkpoint-store";
import { SCHEDULE_STORAGE_KEY, readSchedules } from "@/lib/schedule-store";
import { AUDIT_LOG_STORAGE_KEY, readAuditLogs } from "@/lib/audit-store";
import { AVAILABILITY_STORAGE_KEY, readAvailability } from "@/lib/availability-store";
import { ROSTER_STORAGE_KEY } from "@/lib/roster-store";
import { toInitCapLabel } from "@/lib/text";
import type { AuditLog, Checkpoint, GuardAvailability, Schedule } from "@/types/guard-management";

const GUARD_MIX_COLORS = ["hsl(var(--success))", "hsl(var(--info))", "hsl(var(--muted-foreground))"];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.26, ease: "easeOut" } },
};

function isInDateRange(record: GuardAvailability, dateISO: string) {
  if (record.startDate > dateISO || record.endDate < dateISO) return false;
  if (record.mode === "weekly-off") {
    if (!record.weekdays || record.weekdays.length === 0) return false;
    const weekday = new Date(`${dateISO}T00:00:00Z`).getUTCDay();
    return record.weekdays.includes(weekday);
  }
  return true;
}

export default function Dashboard() {
  const [schedules, setSchedules] = useState<Schedule[]>(readSchedules());
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(readCheckpoints());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(readAuditLogs());
  const [availability, setAvailability] = useState<GuardAvailability[]>(readAvailability());

  useEffect(() => {
    const refreshAll = () => {
      setSchedules(readSchedules());
      setCheckpoints(readCheckpoints());
      setAuditLogs(readAuditLogs());
      setAvailability(readAvailability());
    };

    const watched = new Set([
      SCHEDULE_STORAGE_KEY,
      CHECKPOINT_STORAGE_KEY,
      AUDIT_LOG_STORAGE_KEY,
      AVAILABILITY_STORAGE_KEY,
      ROSTER_STORAGE_KEY,
    ]);

    const onStorage = (e: StorageEvent) => {
      if (!e.key || watched.has(e.key)) refreshAll();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshAll);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refreshAll);
    };
  }, []);

  const guardMix = useMemo(() => {
    const active = mockGuards.filter((g) => g.status === "active").length;
    const onDuty = mockGuards.filter((g) => g.status === "on-duty").length;
    const inactive = mockGuards.filter((g) => g.status === "inactive").length;
    return [
      { name: "Active", value: active },
      { name: "On Duty", value: onDuty },
      { name: "Inactive", value: inactive },
    ];
  }, []);

  const todayISO = new Date().toISOString().slice(0, 10);

  const availabilityToday = useMemo(
    () => availability.filter((record) => isInDateRange(record, todayISO)),
    [availability, todayISO],
  );

  const leaveTodayCount = useMemo(
    () => new Set(availabilityToday.filter((record) => record.type === "leave").map((record) => record.guardId)).size,
    [availabilityToday],
  );

  const offRosterTodayCount = useMemo(
    () => new Set(availabilityToday.filter((record) => record.type === "off-roster").map((record) => record.guardId)).size,
    [availabilityToday],
  );

  const plannedVisits = useMemo(
    () => schedules.filter((schedule) => schedule.status === "active").reduce((sum, schedule) => sum + schedule.timeSlots.length, 0),
    [schedules],
  );

  const dynamicQrCount = useMemo(
    () => checkpoints.filter((cp) => cp.scanTypes.includes("dynamic-qr")).length,
    [checkpoints],
  );

  const nfcConfiguredCount = useMemo(
    () => checkpoints.filter((cp) => cp.nfcConfig?.configured).length,
    [checkpoints],
  );

  const audit24h = useMemo(() => {
    const now = Date.now();
    return auditLogs.filter((log) => now - new Date(log.createdAt).getTime() <= 24 * 60 * 60 * 1000).length;
  }, [auditLogs]);

  const patrolTrend = useMemo(() => {
    const grouped = new Map<string, { day: string; completed: number; late: number; missed: number; skipped: number }>();

    mockPatrolHistory.forEach((entry) => {
      if (!grouped.has(entry.date)) {
        grouped.set(entry.date, { day: entry.date.slice(5), completed: 0, late: 0, missed: 0, skipped: 0 });
      }
      const bucket = grouped.get(entry.date);
      if (!bucket) return;
      if (entry.status === "completed") bucket.completed += 1;
      if (entry.status === "late") bucket.late += 1;
      if (entry.status === "missed") bucket.missed += 1;
      if (entry.status === "skipped") bucket.skipped += 1;
    });

    return Array.from(grouped.values()).sort((a, b) => a.day.localeCompare(b.day)).slice(-7);
  }, []);

  const patrolTrendSummary = useMemo(() => {
    const totals = patrolTrend.reduce(
      (acc, item) => {
        acc.completed += item.completed;
        acc.late += item.late;
        acc.missed += item.missed;
        acc.skipped += item.skipped;
        return acc;
      },
      { completed: 0, late: 0, missed: 0, skipped: 0 },
    );
    const actionable = totals.completed + totals.late + totals.missed;
    const compliance = actionable === 0 ? 0 : Math.round((totals.completed / actionable) * 100);
    return { ...totals, actionable, compliance };
  }, [patrolTrend]);

  const zoneLoad = useMemo(() => {
    const map = new Map<string, { zone: string; visits: number; checkpoints: number }>();
    schedules.forEach((schedule) => {
      if (!map.has(schedule.zoneName)) {
        map.set(schedule.zoneName, { zone: schedule.zoneName, visits: 0, checkpoints: 0 });
      }
      const zone = map.get(schedule.zoneName);
      if (!zone) return;
      zone.visits += schedule.timeSlots.length;
      zone.checkpoints += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.visits - a.visits);
  }, [schedules]);

  const auditByModule = useMemo(() => {
    const map = new Map<string, number>();
    auditLogs.forEach((log) => map.set(log.module, (map.get(log.module) || 0) + 1));
    return Array.from(map.entries())
      .map(([module, count]) => ({ module: module.replace("-", " "), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [auditLogs]);

  const recentAudit = useMemo(() => auditLogs.slice(0, 6), [auditLogs]);

  const kpis = [
    { label: "Planned Visits", value: plannedVisits, sub: `${schedules.length} schedule rows`, icon: Navigation },
    { label: "Dynamic QR", value: dynamicQrCount, sub: `${nfcConfiguredCount} NFC configured`, icon: QrCode },
    { label: "Leave Today", value: leaveTodayCount, sub: `${offRosterTodayCount} off-roster today`, icon: CalendarX2 },
    { label: "Audit (24h)", value: audit24h, sub: `${auditLogs.length} total logs`, icon: History },
    {
      label: "Patrol Risk",
      value: mockPatrolHistory.filter((x) => x.status === "missed").length,
      sub: "Missed patrol events",
      icon: AlertTriangle,
    },
  ];

  return (
    <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="show">
      <motion.section
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl border border-border bg-[linear-gradient(120deg,hsl(var(--primary)/0.14),hsl(var(--background))_50%,hsl(var(--info)/0.1))] p-4"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -left-10 -bottom-14 h-36 w-36 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Operations Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">Live overview of scheduling, availability, checkpoint tech, and governance logs.</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Badge className="bg-warning/10 text-warning hover:bg-warning/10">Leave: {leaveTodayCount} Today</Badge>
              <Badge className="bg-success/10 text-success hover:bg-success/10">Dynamic QR: {dynamicQrCount}</Badge>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/90 px-3.5 py-2.5 min-w-[220px]">
            <p className="text-xs text-muted-foreground">Today Focus</p>
            <p className="text-lg font-bold mt-1">{plannedVisits} Planned Visits</p>
            <p className="text-xs text-muted-foreground mt-1">Across active schedules and assigned checkpoints</p>
          </div>
        </div>
      </motion.section>

      <motion.section variants={containerVariants} className="grid grid-cols-2 xl:grid-cols-6 gap-2.5">
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={itemVariants} whileHover={{ y: -2 }} className="stat-card p-3 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--secondary)/0.25))]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold mt-1">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</p>
              </div>
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <kpi.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <motion.div variants={itemVariants} className="stat-card p-3.5 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2.5">
            <div>
              <h3 className="text-sm font-semibold">Patrol Compliance Trend (Last 7 Days)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Completed, late, missed and skipped patrol volume by day</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge className="bg-success/10 text-success hover:bg-success/10">{patrolTrendSummary.compliance}% Compliance</Badge>
              <Badge variant="secondary">{patrolTrendSummary.missed} Missed</Badge>
              <Badge variant="secondary">{patrolTrendSummary.late} Late</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-2.5">
            <div className="rounded-md border border-border bg-secondary/25 px-2.5 py-2">
              <p className="text-[11px] text-muted-foreground">Completed</p>
              <p className="text-sm font-semibold text-success">{patrolTrendSummary.completed}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary/25 px-2.5 py-2">
              <p className="text-[11px] text-muted-foreground">Late</p>
              <p className="text-sm font-semibold text-warning">{patrolTrendSummary.late}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary/25 px-2.5 py-2">
              <p className="text-[11px] text-muted-foreground">Missed</p>
              <p className="text-sm font-semibold text-destructive">{patrolTrendSummary.missed}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary/25 px-2.5 py-2">
              <p className="text-[11px] text-muted-foreground">Skipped</p>
              <p className="text-sm font-semibold text-muted-foreground">{patrolTrendSummary.skipped}</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={patrolTrend} margin={{ left: 4, right: 8, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--secondary) / 0.35)" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--success))"
                  strokeWidth={2.8}
                  dot={{ r: 3, strokeWidth: 1, fill: "hsl(var(--success))" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="late"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, strokeWidth: 1, fill: "hsl(var(--warning))" }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="missed"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, strokeWidth: 1, fill: "hsl(var(--destructive))" }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="skipped"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.9}
                  strokeDasharray="5 4"
                  dot={{ r: 2, strokeWidth: 1, fill: "hsl(var(--muted-foreground))" }}
                  activeDot={{ r: 3.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" /> Completed</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--warning))]" /> Late</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--destructive))]" /> Missed</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--muted-foreground))]" /> Skipped</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="stat-card p-3.5">
          <h3 className="text-sm font-semibold mb-2.5">Guard Workforce Mix</h3>
          <div className="h-[195px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={guardMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={78}>
                  {guardMix.map((_, idx) => (
                    <Cell key={idx} fill={GUARD_MIX_COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-1.5">
            {guardMix.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GUARD_MIX_COLORS[idx] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <motion.div variants={itemVariants} className="stat-card p-3.5 xl:col-span-2">
          <h3 className="text-sm font-semibold mb-2.5">Zone Workload (Planned Visits)</h3>
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneLoad} layout="vertical" margin={{ left: 10, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="zone" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="visits" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="stat-card p-3.5">
          <h3 className="text-sm font-semibold mb-2.5">Audit Changes by Module</h3>
          {auditByModule.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No audit events yet.</p>
          ) : (
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditByModule}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="module" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {auditByModule.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--info))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      <motion.section variants={itemVariants} className="stat-card p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-semibold">Recent Operational Changes</h3>
          <Badge variant="secondary" className="gap-1"><Activity className="w-3 h-3" />Live Log</Badge>
        </div>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No recent activity logs available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
            {recentAudit.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-lg border border-border bg-card/75 p-2"
              >
                <p className="text-xs font-semibold text-foreground">{log.summary}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{toInitCapLabel(log.module)} | {toInitCapLabel(log.action)}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{log.actor}</span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          <div className="rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Missed Patrols</span>
            <span className="font-semibold text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{mockPatrolHistory.filter((x) => x.status === "missed").length}</span>
          </div>
          <div className="rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Completed Patrols</span>
            <span className="font-semibold text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{mockPatrolHistory.filter((x) => x.status === "completed").length}</span>
          </div>
          <div className="rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Late Patrols</span>
            <span className="font-semibold text-warning flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{mockPatrolHistory.filter((x) => x.status === "late").length}</span>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
