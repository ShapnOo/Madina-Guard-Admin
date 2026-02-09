export interface Guard {
  id: string;
  name: string;
  phone: string;
  email: string;
  employeeId: string;
  status: "active" | "inactive" | "on-duty";
  assignedZone?: string;
  createdAt: string;
}

export interface Zone {
  id: string;
  name: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  checkpointCount: number;
  guardCount: number;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  scanTypes: Array<"nfc" | "qr" | "dynamic-qr">;
  tagId: string;
  location: string;
  latitude?: number;
  longitude?: number;
  nfcConfig?: {
    payload: string;
    tagSerial?: string;
    configured: boolean;
    lastConfiguredAt?: string;
  };
  qrConfig?: {
    payload: string;
    size: number;
    dynamic?: boolean;
    rotateEveryMinutes?: number;
    configured: boolean;
    lastGeneratedAt?: string;
  };
  status: "active" | "inactive";
  createdAt: string;
}

export interface ScheduleSlot {
  id: string;
  time: string;
  label: string;
}

export interface Schedule {
  id: string;
  guardId: string;
  guardName: string;
  checkpointId: string;
  checkpointName: string;
  startDate: string;
  endDate: string;
  zoneName: string;
  timeSlots: ScheduleSlot[];
  graceTimeMinutes: number;
  status: "active" | "inactive";
}

export interface DashboardStats {
  totalGuards: number;
  activeGuards: number;
  totalZones: number;
  totalCheckpoints: number;
  completedPatrols: number;
  missedPatrols: number;
  latePatrols: number;
  onTimeRate: number;
}

export interface PatrolHistory {
  id: string;
  date: string;
  operationDate?: string;
  plannedDateTime?: string;
  actualDateTime?: string;
  sequenceNo?: number;
  guardId: string;
  guardName: string;
  zoneName: string;
  checkpointName: string;
  status: "completed" | "late" | "missed" | "skipped";
  scanMethod: "nfc" | "qr";
  graceTimeMinutes: number;
  lateByMinutes?: number;
  skipReason?: "leave" | "off-roster" | "training" | "holiday";
}

export interface GuardAvailability {
  id: string;
  guardId: string;
  guardName: string;
  mode?: "date-range" | "weekly-off";
  type: "leave" | "off-roster" | "training" | "holiday";
  startDate: string;
  endDate: string;
  weekdays?: number[];
  note?: string;
}

export interface GuardRoster {
  id: string;
  title: string;
  zoneName: string;
  guardIds: string[];
  dayOffWeekdays: number[];
  effectiveFrom: string;
  effectiveTo: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  module: "schedules" | "checkpoints" | "users" | "alerts" | "availability";
  action: "create" | "update" | "delete" | "toggle" | "replace";
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface ManagementUser {
  id: string;
  name: string;
  profileImageUrl?: string;
  employeeId: string;
  email: string;
  phone: string;
  role: "super-admin" | "operations-manager" | "zone-manager" | "viewer";
  department: string;
  office: string;
  device: string;
  lastLogin: string;
  mfaEnabled: boolean;
  assignedZones: string[];
  status: "active" | "inactive";
  createdAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: "missed-patrol" | "late-patrol" | "panic" | "device-offline";
  channels: Array<"in-app" | "email" | "sms">;
  recipients: string[];
  isEnabled: boolean;
  createdAt: string;
}

export interface NotificationEvent {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "critical";
  createdAt: string;
  read: boolean;
}
