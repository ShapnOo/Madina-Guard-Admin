import type {
  Guard,
  Zone,
  Checkpoint,
  Schedule,
  DashboardStats,
  PatrolHistory,
  GuardAvailability,
  GuardRoster,
  AuditLog,
  ManagementUser,
  AlertRule,
  NotificationEvent,
} from "@/types/guard-management";

export const mockGuards: Guard[] = [
  {
    id: "g1",
    name: "Rahim Uddin",
    phone: "+880 1712345678",
    email: "rahim@madina.com",
    employeeId: "GRD-001",
    password: "12345678",
    boundDeviceId: "device-demo-g1",
    boundDeviceName: "Samsung Galaxy A54 - Android 14 (Dhaka)",
    boundAt: "2026-02-01T08:15:00Z",
    lastLoginAt: "2026-02-09T09:42:00Z",
    status: "on-duty",
    assignedZone: "Main Building",
    createdAt: "2025-12-01",
  },
  {
    id: "g2",
    name: "Kamal Hossain",
    phone: "+880 1723456789",
    email: "kamal@madina.com",
    employeeId: "GRD-002",
    password: "12345678",
    boundDeviceId: "device-demo-g2",
    boundDeviceName: "Xiaomi Redmi Note 13 - Android 14 (Chattogram)",
    boundAt: "2026-02-03T07:50:00Z",
    lastLoginAt: "2026-02-09T07:12:00Z",
    status: "active",
    assignedZone: "Warehouse",
    createdAt: "2025-12-05",
  },
  {
    id: "g3",
    name: "Jamal Ahmed",
    phone: "+880 1734567890",
    email: "jamal@madina.com",
    employeeId: "GRD-003",
    password: "12345678",
    boundDeviceId: "device-demo-g3",
    boundDeviceName: "Nokia 1110 - Android 13 (Khulna)",
    boundAt: "2026-02-04T10:05:00Z",
    lastLoginAt: "2026-02-08T18:22:00Z",
    status: "on-duty",
    assignedZone: "Main Building",
    createdAt: "2025-12-10",
  },
  {
    id: "g4",
    name: "Saiful Islam",
    phone: "+880 1745678901",
    email: "saiful@madina.com",
    employeeId: "GRD-004",
    password: "12345678",
    boundDeviceId: "device-demo-g4",
    boundDeviceName: "realme C55 - Android 14 (Sylhet)",
    boundAt: "2026-02-02T06:40:00Z",
    lastLoginAt: "2026-02-09T05:58:00Z",
    status: "active",
    assignedZone: "Parking Area",
    createdAt: "2026-01-02",
  },
  { id: "g5", name: "Noor Mohammad", phone: "+880 1756789012", email: "noor@madina.com", employeeId: "GRD-005", password: "12345678", status: "inactive", createdAt: "2026-01-10" },
  {
    id: "g6",
    name: "Faruk Hasan",
    phone: "+880 1767890123",
    email: "faruk@madina.com",
    employeeId: "GRD-006",
    password: "12345678",
    boundDeviceId: "device-demo-g6",
    boundDeviceName: "OPPO A38 - Android 14 (Rajshahi)",
    boundAt: "2026-02-05T09:10:00Z",
    lastLoginAt: "2026-02-09T08:05:00Z",
    status: "on-duty",
    assignedZone: "Warehouse",
    createdAt: "2026-01-15",
  },
];

export const mockZones: Zone[] = [
  { id: "z1", name: "Main Building", description: "Headquarters main building covering all floors", location: "Madina Square, Block A", latitude: 23.7846, longitude: 90.4072, checkpointCount: 5, guardCount: 2, status: "active", createdAt: "2025-11-15" },
  { id: "z2", name: "Warehouse", description: "Storage and logistics warehouse area", location: "Madina Square, Block C", latitude: 23.7857, longitude: 90.4058, checkpointCount: 3, guardCount: 2, status: "active", createdAt: "2025-11-20" },
  { id: "z3", name: "Parking Area", description: "Vehicle parking and entry/exit gates", location: "Madina Square, Ground Level", latitude: 23.7839, longitude: 90.4066, checkpointCount: 4, guardCount: 1, status: "active", createdAt: "2025-12-01" },
  { id: "z4", name: "Residential Block", description: "Staff residential quarters", location: "Madina Square, Block D", checkpointCount: 2, guardCount: 0, status: "inactive", createdAt: "2026-01-05" },
];

export const mockCheckpoints: Checkpoint[] = [
  { id: "c1", name: "Main Gate", zoneId: "z1", zoneName: "Main Building", scanTypes: ["nfc", "qr"], tagId: "NFC-001", location: "Ground Floor Entrance", latitude: 23.78455, longitude: 90.40728, nfcConfig: { payload: "checkpoint:c1|tag:NFC-001", configured: true, tagSerial: "04A1B2C3D4", lastConfiguredAt: "2026-02-01" }, qrConfig: { payload: "checkpoint:c1|tag:NFC-001|zone:Main Building", size: 220, dynamic: false, rotateEveryMinutes: 10, configured: true, lastGeneratedAt: "2026-02-01" }, status: "active", createdAt: "2025-11-15" },
  { id: "c2", name: "Lobby", zoneId: "z1", zoneName: "Main Building", scanTypes: ["dynamic-qr"], tagId: "QR-002", location: "Ground Floor Lobby", qrConfig: { payload: "checkpoint:c2|tag:QR-002|zone:Main Building", size: 220, dynamic: true, rotateEveryMinutes: 10, configured: true, lastGeneratedAt: "2026-02-01" }, status: "active", createdAt: "2025-11-15" },
  { id: "c3", name: "Server Room", zoneId: "z1", zoneName: "Main Building", scanTypes: ["nfc"], tagId: "NFC-003", location: "3rd Floor", nfcConfig: { payload: "checkpoint:c3|tag:NFC-003", configured: true, tagSerial: "04D9AA7712", lastConfiguredAt: "2026-01-29" }, status: "active", createdAt: "2025-11-20" },
  { id: "c4", name: "Rooftop Access", zoneId: "z1", zoneName: "Main Building", scanTypes: ["qr"], tagId: "QR-004", location: "8th Floor", status: "active", createdAt: "2025-11-20" },
  { id: "c5", name: "Fire Exit B", zoneId: "z1", zoneName: "Main Building", scanTypes: ["nfc"], tagId: "NFC-005", location: "Ground Floor East", status: "inactive", createdAt: "2025-12-01" },
  { id: "c6", name: "Loading Dock", zoneId: "z2", zoneName: "Warehouse", scanTypes: ["nfc", "qr"], tagId: "NFC-006", location: "Warehouse Entry", status: "active", createdAt: "2025-11-20" },
  { id: "c7", name: "Storage Hall A", zoneId: "z2", zoneName: "Warehouse", scanTypes: ["qr"], tagId: "QR-007", location: "Section A", status: "active", createdAt: "2025-11-25" },
  { id: "c8", name: "Storage Hall B", zoneId: "z2", zoneName: "Warehouse", scanTypes: ["nfc"], tagId: "NFC-008", location: "Section B", status: "active", createdAt: "2025-11-25" },
  { id: "c9", name: "Entry Gate", zoneId: "z3", zoneName: "Parking Area", scanTypes: ["nfc"], tagId: "NFC-009", location: "Main Entry", status: "active", createdAt: "2025-12-01" },
  { id: "c10", name: "Exit Gate", zoneId: "z3", zoneName: "Parking Area", scanTypes: ["qr"], tagId: "QR-010", location: "Main Exit", status: "active", createdAt: "2025-12-01" },
  { id: "c11", name: "Basement Level", zoneId: "z3", zoneName: "Parking Area", scanTypes: ["nfc"], tagId: "NFC-011", location: "B1 Parking", status: "active", createdAt: "2025-12-05" },
  { id: "c12", name: "VIP Parking", zoneId: "z3", zoneName: "Parking Area", scanTypes: ["qr"], tagId: "QR-012", location: "Ground Level West", status: "active", createdAt: "2025-12-05" },
];

const DEMO_CHECKPOINTS_PER_GUARD = 10;
const BASE_TIME_MINUTES = [6 * 60, 10 * 60, 14 * 60, 18 * 60];
const DEMO_DATE_RANGES = [
  { start: "2026-02-01", end: "2026-02-07" },
  { start: "2026-02-08", end: "2026-02-14" },
  { start: "2026-02-15", end: "2026-02-21" },
];

function minutesToHHmm(totalMinutes: number) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const mm = String(wrapped % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildScheduleSlots(guardIndex: number, checkpointIndex: number) {
  const minuteShift = ((guardIndex * 2 + checkpointIndex) % 3) * 5;
  return BASE_TIME_MINUTES.map((base, slotIndex) => {
    const time = minutesToHHmm(base + minuteShift);
    return {
      id: `ts-${guardIndex + 1}-${checkpointIndex + 1}-${slotIndex + 1}`,
      time,
      label: `Round ${slotIndex + 1}`,
    };
  });
}

const activeCheckpoints = mockCheckpoints.filter((cp) => cp.status === "active");

export const mockSchedules: Schedule[] = mockGuards.flatMap((guard, guardIndex) => {
  return Array.from({ length: DEMO_CHECKPOINTS_PER_GUARD }, (_, checkpointIndex) => {
    const checkpoint = activeCheckpoints[(guardIndex * 2 + checkpointIndex) % activeCheckpoints.length];
    const range = DEMO_DATE_RANGES[guardIndex % DEMO_DATE_RANGES.length];
    return {
      id: `s-${guard.id}-${checkpointIndex + 1}`,
      guardId: guard.id,
      guardName: guard.name,
      checkpointId: checkpoint.id,
      checkpointName: checkpoint.name,
      startDate: range.start,
      endDate: range.end,
      zoneName: checkpoint.zoneName,
      timeSlots: buildScheduleSlots(guardIndex, checkpointIndex),
      graceTimeMinutes: 8 + ((guardIndex + checkpointIndex) % 8),
      status: checkpointIndex % 9 === 8 ? "inactive" : "active",
    };
  });
});

export const mockDashboardStats: DashboardStats = {
  totalGuards: 6,
  activeGuards: 5,
  totalZones: 4,
  totalCheckpoints: 12,
  completedPatrols: 42,
  missedPatrols: 3,
  latePatrols: 5,
  onTimeRate: 84,
};

export const recentActivity = [
  { id: 1, guard: "Rahim Uddin", action: "Scanned Main Gate", time: "2 min ago", status: "completed" as const },
  { id: 2, guard: "Jamal Ahmed", action: "Scanned Server Room", time: "8 min ago", status: "completed" as const },
  { id: 3, guard: "Faruk Hasan", action: "Missed Storage Hall A", time: "15 min ago", status: "missed" as const },
  { id: 4, guard: "Kamal Hossain", action: "Late scan Loading Dock", time: "22 min ago", status: "late" as const },
  { id: 5, guard: "Saiful Islam", action: "Scanned Entry Gate", time: "30 min ago", status: "completed" as const },
  { id: 6, guard: "Rahim Uddin", action: "Scanned Lobby", time: "45 min ago", status: "completed" as const },
];

export const mockPatrolHistory: PatrolHistory[] = [
  { id: "p1", date: "2026-02-01", guardId: "g1", guardName: "Rahim Uddin", zoneName: "Main Building", checkpointName: "Main Gate", status: "completed", scanMethod: "nfc", graceTimeMinutes: 10 },
  { id: "p2", date: "2026-02-01", guardId: "g1", guardName: "Rahim Uddin", zoneName: "Main Building", checkpointName: "Lobby", status: "late", scanMethod: "qr", graceTimeMinutes: 10, lateByMinutes: 7 },
  { id: "p3", date: "2026-02-02", guardId: "g2", guardName: "Kamal Hossain", zoneName: "Warehouse", checkpointName: "Loading Dock", status: "completed", scanMethod: "nfc", graceTimeMinutes: 12 },
  { id: "p4", date: "2026-02-02", guardId: "g6", guardName: "Faruk Hasan", zoneName: "Warehouse", checkpointName: "Storage Hall A", status: "missed", scanMethod: "qr", graceTimeMinutes: 15 },
  { id: "p5", date: "2026-02-03", guardId: "g3", guardName: "Jamal Ahmed", zoneName: "Main Building", checkpointName: "Server Room", status: "completed", scanMethod: "nfc", graceTimeMinutes: 8 },
  { id: "p5b", date: "2026-02-03", guardId: "g3", guardName: "Jamal Ahmed", zoneName: "Main Building", checkpointName: "Lobby", status: "skipped", skipReason: "training", scanMethod: "qr", graceTimeMinutes: 8 },
  { id: "p6", date: "2026-02-03", guardId: "g4", guardName: "Saiful Islam", zoneName: "Parking Area", checkpointName: "Entry Gate", status: "late", scanMethod: "nfc", graceTimeMinutes: 10, lateByMinutes: 4 },
  { id: "p7", date: "2026-02-04", guardId: "g4", guardName: "Saiful Islam", zoneName: "Parking Area", checkpointName: "VIP Parking", status: "completed", scanMethod: "qr", graceTimeMinutes: 10 },
  { id: "p7b", date: "2026-02-04", guardId: "g2", guardName: "Kamal Hossain", zoneName: "Warehouse", checkpointName: "Storage Hall B", status: "skipped", skipReason: "leave", scanMethod: "nfc", graceTimeMinutes: 12 },
  { id: "p8", date: "2026-02-05", guardId: "g1", guardName: "Rahim Uddin", zoneName: "Main Building", checkpointName: "Main Gate", status: "completed", scanMethod: "qr", graceTimeMinutes: 10 },
  { id: "p9", date: "2026-02-06", guardId: "g2", guardName: "Kamal Hossain", zoneName: "Warehouse", checkpointName: "Storage Hall B", status: "missed", scanMethod: "nfc", graceTimeMinutes: 12 },
];

export const mockGuardAvailability: GuardAvailability[] = [
  {
    id: "ga1",
    guardId: "g2",
    guardName: "Kamal Hossain",
    mode: "date-range",
    type: "leave",
    startDate: "2026-02-04",
    endDate: "2026-02-06",
    note: "Annual leave",
  },
  {
    id: "ga2",
    guardId: "g3",
    guardName: "Jamal Ahmed",
    mode: "date-range",
    type: "training",
    startDate: "2026-02-03",
    endDate: "2026-02-03",
    note: "Safety drill",
  },
  {
    id: "ga3",
    guardId: "g4",
    guardName: "Saiful Islam",
    mode: "weekly-off",
    type: "off-roster",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    weekdays: [5],
    note: "Friday weekly off",
  },
];

export const mockRosters: GuardRoster[] = [
  {
    id: "r1",
    title: "Main Building Friday Off",
    zoneName: "Main Building",
    guardIds: ["g1", "g3"],
    dayOffWeekdays: [5],
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    createdAt: "2026-01-01T09:00:00Z",
  },
  {
    id: "r2",
    title: "Warehouse Sunday Off",
    zoneName: "Warehouse",
    guardIds: ["g2", "g6"],
    dayOffWeekdays: [0],
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    createdAt: "2026-01-02T10:15:00Z",
  },
  {
    id: "r3",
    title: "Parking Split Off Days",
    zoneName: "Parking Area",
    guardIds: ["g4"],
    dayOffWeekdays: [2, 6],
    effectiveFrom: "2026-02-01",
    effectiveTo: "2026-12-31",
    createdAt: "2026-02-01T08:30:00Z",
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: "al1",
    actor: "Admin",
    module: "schedules",
    action: "update",
    entityType: "schedule",
    entityId: "s-g1-2",
    summary: "Updated grace time and visit slots for Rahim Uddin at Lobby",
    createdAt: "2026-02-06T09:20:00Z",
  },
  {
    id: "al2",
    actor: "Admin",
    module: "checkpoints",
    action: "update",
    entityType: "checkpoint",
    entityId: "c2",
    summary: "Configured Dynamic QR for Lobby",
    createdAt: "2026-02-06T10:05:00Z",
  },
  {
    id: "al3",
    actor: "Admin",
    module: "alerts",
    action: "toggle",
    entityType: "notification-type",
    entityId: "nt-5",
    summary: "Enabled Dynamic QR Issue notification type",
    createdAt: "2026-02-06T11:40:00Z",
  },
  {
    id: "al4",
    actor: "Admin",
    module: "users",
    action: "create",
    entityType: "user",
    entityId: "u4",
    summary: "Created management user Farhana Karim",
    createdAt: "2026-02-06T12:15:00Z",
  },
];

export const mockManagementUsers: ManagementUser[] = [
  {
    id: "u1",
    name: "Nasrin Sultana",
    profileImageUrl: "https://ui-avatars.com/api/?name=Nasrin+Sultana&background=0f766e&color=fff",
    employeeId: "MGR-BD-001",
    email: "nasrin@madina.com",
    phone: "+880 1811111111",
    role: "super-admin",
    department: "Operations",
    office: "Chattogram HQ",
    device: "iPhone 14 Pro - iOS 17",
    lastLogin: "2026-01-31T09:42:00",
    mfaEnabled: true,
    assignedZones: ["Main Building", "Warehouse", "Parking Area"],
    status: "active",
    createdAt: "2025-12-01",
  },
  {
    id: "u2",
    name: "Arif Karim",
    profileImageUrl: "https://ui-avatars.com/api/?name=Arif+Karim&background=1f2937&color=fff",
    employeeId: "MGR-BD-002",
    email: "arif@madina.com",
    phone: "+880 1822222222",
    role: "operations-manager",
    department: "Security Operations",
    office: "Dhaka Regional Office",
    device: "Samsung S24 - Android 14",
    lastLogin: "2026-02-06T15:18:00",
    mfaEnabled: false,
    assignedZones: ["Warehouse", "Parking Area"],
    status: "active",
    createdAt: "2025-12-05",
  },
];

export const mockAlertRules: AlertRule[] = [
  {
    id: "a1",
    name: "Missed Patrol Escalation",
    type: "missed-patrol",
    channels: ["in-app", "email", "sms"],
    recipients: ["ops@madina.com", "admin@madina.com"],
    isEnabled: true,
    createdAt: "2025-12-10",
  },
  {
    id: "a2",
    name: "Late Patrol Alert",
    type: "late-patrol",
    channels: ["in-app", "email"],
    recipients: ["supervisor@madina.com"],
    isEnabled: true,
    createdAt: "2025-12-11",
  },
];

export const mockNotificationEvents: NotificationEvent[] = [
  {
    id: "n1",
    title: "Late Patrol Detected",
    message: "Rahim Uddin was 7 minutes late at Lobby checkpoint.",
    type: "warning",
    createdAt: "2026-02-01T10:07:00Z",
    read: false,
  },
  {
    id: "n2",
    title: "Missed Patrol",
    message: "Faruk Hasan missed Storage Hall A scheduled patrol.",
    type: "critical",
    createdAt: "2026-02-02T15:10:00Z",
    read: false,
  },
  {
    id: "n3",
    title: "Patrol Completed",
    message: "Jamal Ahmed completed Server Room inspection.",
    type: "info",
    createdAt: "2026-02-03T08:05:00Z",
    read: true,
  },
];
