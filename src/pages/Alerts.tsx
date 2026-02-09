import { useState } from "react";
import { Plus, Bell, MoreVertical, Pencil, Trash2 } from "lucide-react";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockAlertRules, mockNotificationEvents } from "@/data/mock-data";
import SearchableSelect from "@/components/SearchableSelect";
import type { AlertRule, NotificationEvent } from "@/types/guard-management";
import { toInitCapLabel } from "@/lib/text";
import { Switch } from "@/components/ui/switch";
import { appendAuditLog } from "@/lib/audit-store";

type NotificationPreference = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  channels: Array<"in-app" | "email" | "sms">;
  recipientScope: "all" | "custom";
  recipients: string;
};

export default function Alerts() {
  const [rules, setRules] = useState<AlertRule[]>(mockAlertRules);
  const [events, setEvents] = useState<NotificationEvent[]>(mockNotificationEvents);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference[]>([
    {
      id: "nt-1",
      title: "Missed Patrol",
      description: "Notify when a scheduled patrol is not completed within expected window.",
      enabled: true,
      channels: ["in-app", "email", "sms"],
      recipientScope: "all",
      recipients: "",
    },
    {
      id: "nt-2",
      title: "Late Patrol",
      description: "Notify when a patrol is completed after grace period.",
      enabled: true,
      channels: ["in-app", "email"],
      recipientScope: "all",
      recipients: "",
    },
    {
      id: "nt-3",
      title: "Panic Alert",
      description: "High-priority emergency alert from guard device.",
      enabled: true,
      channels: ["in-app", "email", "sms"],
      recipientScope: "all",
      recipients: "",
    },
    {
      id: "nt-4",
      title: "Device Offline",
      description: "Notify when guard app/device is unreachable.",
      enabled: true,
      channels: ["in-app", "email"],
      recipientScope: "custom",
      recipients: "ops@madina.com, it@madina.com",
    },
    {
      id: "nt-5",
      title: "Dynamic QR Issue",
      description: "Notify when dynamic QR display is unavailable or stale.",
      enabled: false,
      channels: ["in-app", "email"],
      recipientScope: "custom",
      recipients: "supervisor@madina.com",
    },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "missed-patrol" as AlertRule["type"],
    channels: ["in-app"] as AlertRule["channels"],
    recipients: "",
    recipientScope: "custom" as "all" | "custom",
    isEnabled: true,
  });

  const openCreate = () => {
    setEditingRule(null);
    setForm({ name: "", type: "missed-patrol", channels: ["in-app"], recipients: "", recipientScope: "all", isEnabled: true });
    setDialogOpen(true);
  };

  const openEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      type: rule.type,
      channels: rule.channels,
      recipients: rule.recipients.includes("all") ? "" : rule.recipients.join(", "),
      recipientScope: rule.recipients.includes("all") ? "all" : "custom",
      isEnabled: rule.isEnabled,
    });
    setDialogOpen(true);
  };

  const toggleChannel = (channel: AlertRule["channels"][number]) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      type: form.type,
      channels: form.channels,
      recipients:
        form.recipientScope === "all"
          ? ["all"]
          : form.recipients.split(",").map((r) => r.trim()).filter(Boolean),
      isEnabled: form.isEnabled,
    };
    if (editingRule) {
      setRules((prev) => prev.map((r) => (r.id === editingRule.id ? { ...r, ...payload } : r)));
      appendAuditLog({
        actor: "Admin",
        module: "alerts",
        action: "update",
        entityType: "alert-rule",
        entityId: editingRule.id,
        summary: `Updated alert rule ${payload.name}`,
      });
    } else {
      const newId = `a${Date.now()}`;
      const newRule: AlertRule = {
        id: newId,
        ...payload,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setRules((prev) => [...prev, newRule]);
      appendAuditLog({
        actor: "Admin",
        module: "alerts",
        action: "create",
        entityType: "alert-rule",
        entityId: newId,
        summary: `Created alert rule ${payload.name}`,
      });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const target = rules.find((r) => r.id === id);
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (target) {
      appendAuditLog({
        actor: "Admin",
        module: "alerts",
        action: "delete",
        entityType: "alert-rule",
        entityId: id,
        summary: `Deleted alert rule ${target.name}`,
      });
    }
  };

  const markAsRead = (id: string) => {
    setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, read: true } : event)));
  };

  const toggleNotificationType = (id: string, enabled: boolean) => {
    const item = notificationPreferences.find((entry) => entry.id === id);
    setNotificationPreferences((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled } : item)),
    );
    if (item) {
      appendAuditLog({
        actor: "Admin",
        module: "alerts",
        action: "toggle",
        entityType: "notification-type",
        entityId: id,
        summary: `${enabled ? "Enabled" : "Disabled"} notification type ${item.title}`,
      });
    }
  };

  const updateNotificationRecipientScope = (id: string, recipientScope: "all" | "custom") => {
    setNotificationPreferences((prev) =>
      prev.map((item) => (item.id === id ? { ...item, recipientScope } : item)),
    );
  };

  const updateNotificationRecipients = (id: string, recipients: string) => {
    setNotificationPreferences((prev) =>
      prev.map((item) => (item.id === id ? { ...item, recipients } : item)),
    );
  };

  const ruleColumns = [
    { key: "name", label: "Rule Name" },
    {
      key: "type",
      label: "Type",
      render: (rule: AlertRule) => <span>{toInitCapLabel(rule.type)}</span>,
    },
    {
      key: "channels",
      label: "Channels",
      render: (rule: AlertRule) => <span className="text-xs text-muted-foreground">{rule.channels.join(", ")}</span>,
    },
    {
      key: "recipients",
      label: "Recipients",
      render: (rule: AlertRule) => (
        <span className="text-xs text-muted-foreground">
          {rule.recipients.includes("all") ? "All Management" : rule.recipients.join(", ")}
        </span>
      ),
    },
    {
      key: "isEnabled",
      label: "Enabled",
      render: (rule: AlertRule) => (
        <span className={`status-badge ${rule.isEnabled ? "status-active" : "status-inactive"}`}>
          {rule.isEnabled ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (rule: AlertRule) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(rule)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(rule.id)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Alerts & Notifications</h1>
          <p className="page-subtitle">Manage notification types, recipients, and alert rules</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Alert Rule
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Notification Types</h2>
        <div className="space-y-2">
          {notificationPreferences.map((item) => (
            <div key={item.id} className="stat-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.channels.map((channel) => (
                      <Badge key={`${item.id}-${channel}`} variant="secondary" className="text-[10px]">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${item.enabled ? "text-success" : "text-muted-foreground"}`}>
                    {item.enabled ? "On" : "Off"}
                  </span>
                  <Switch checked={item.enabled} onCheckedChange={(checked) => toggleNotificationType(item.id, checked)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mt-3">
                <div className="md:col-span-4">
                  <Label className="text-xs text-muted-foreground">Recipients</Label>
                  <div className="mt-1">
                    <SearchableSelect
                      value={item.recipientScope}
                      onChange={(v) => updateNotificationRecipientScope(item.id, v as "all" | "custom")}
                      options={[
                        { value: "all", label: "All Management" },
                        { value: "custom", label: "Custom Recipients" },
                      ]}
                    />
                  </div>
                </div>
                <div className="md:col-span-8">
                  <Label className="text-xs text-muted-foreground">Custom Recipients</Label>
                  <Input
                    disabled={item.recipientScope === "all"}
                    value={item.recipients}
                    onChange={(e) => updateNotificationRecipients(item.id, e.target.value)}
                    placeholder="emails separated by comma"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DataTable columns={ruleColumns} data={rules} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Recent Notifications</h2>
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="stat-card flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${event.type === "critical" ? "bg-destructive/10" : event.type === "warning" ? "bg-warning/10" : "bg-primary/10"}`}>
                  <Bell className={`w-4 h-4 ${event.type === "critical" ? "text-destructive" : event.type === "warning" ? "text-warning" : "text-primary"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {!event.read && (
                <Button size="sm" variant="outline" onClick={() => markAsRead(event.id)}>
                  Mark Read
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Alert Rule" : "Create Alert Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Alert Type</Label>
              <SearchableSelect
                value={form.type}
                onChange={(v) => setForm({ ...form, type: v as AlertRule["type"] })}
                options={[
                  { value: "missed-patrol", label: "Missed Patrol" },
                  { value: "late-patrol", label: "Late Patrol" },
                  { value: "panic", label: "Panic" },
                  { value: "device-offline", label: "Device Offline" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Channels</Label>
              <div className="flex gap-2">
                {(["in-app", "email", "sms"] as const).map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={`px-3 py-2 rounded-md text-xs font-medium border ${
                      form.channels.includes(channel)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border"
                    }`}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Recipients (comma separated)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <SearchableSelect
                    value={form.recipientScope}
                    onChange={(v) => setForm({ ...form, recipientScope: v as "all" | "custom" })}
                    options={[
                      { value: "all", label: "All Management" },
                      { value: "custom", label: "Custom" },
                    ]}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    disabled={form.recipientScope === "all"}
                    value={form.recipients}
                    onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                    placeholder="ops@madina.com, admin@madina.com"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <SearchableSelect
                value={form.isEnabled ? "enabled" : "disabled"}
                onChange={(v) => setForm({ ...form, isEnabled: v === "enabled" })}
                options={[
                  { value: "enabled", label: "Enabled" },
                  { value: "disabled", label: "Disabled" },
                ]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.name ||
                form.channels.length === 0 ||
                (form.recipientScope === "custom" && !form.recipients.trim())
              }
            >
              {editingRule ? "Update" : "Create"} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
