import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Shield, Phone, Mail, MoreVertical, Pencil, Trash2, Eye, EyeOff, Search, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import DataTable from "@/components/DataTable";
import SearchableSelect from "@/components/SearchableSelect";
import { mockGuards, mockZones } from "@/data/mock-data";
import type { Guard } from "@/types/guard-management";
import { GUARD_STORAGE_KEY, readGuards, unbindGuardDevice, writeGuards } from "@/lib/guard-store";
import { useToast } from "@/hooks/use-toast";

function normalizeToLocalPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (/^01\d{9}$/.test(digits)) return digits;
  if (/^1\d{9}$/.test(digits)) return `0${digits}`;
  if (/^8801\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  return digits;
}

export default function Guards() {
  const { toast } = useToast();
  const [guards, setGuards] = useState<Guard[]>(readGuards());
  const [searchName, setSearchName] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Guard["status"]>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    employeeId: "",
    status: "active" as Guard["status"],
    assignedZone: "",
    password: "",
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

  const openCreate = () => {
    setEditingGuard(null);
    setShowPassword(false);
    setForm({
      name: "",
      phoneNumber: "",
      email: "",
      employeeId: "",
      status: "active",
      assignedZone: "",
      password: "",
    });
    setPhoneError("");
    setDialogOpen(true);
  };

  const openEdit = (guard: Guard) => {
    setEditingGuard(guard);
    setShowPassword(false);
    setForm({
      name: guard.name,
      phoneNumber: normalizeToLocalPhone(guard.phone),
      email: guard.email,
      employeeId: guard.employeeId,
      status: guard.status,
      assignedZone: guard.assignedZone || "",
      password: "",
    });
    setPhoneError("");
    setDialogOpen(true);
  };

  const handleSave = () => {
    const isLocalPhoneValid = /^01\d{9}$/.test(form.phoneNumber);
    if (!isLocalPhoneValid) {
      setPhoneError("Phone number must be in format 01XXXXXXXXX.");
      return;
    }
    setPhoneError("");
    const { password, phoneNumber, ...guardForm } = form;
    const normalizedPhone = phoneNumber;

    if (editingGuard) {
      const next = guards.map((g) =>
          g.id === editingGuard.id
            ? { ...g, ...guardForm, phone: normalizedPhone, password: password.trim() ? password.trim() : g.password || "12345678" }
            : g,
      );
      setGuards(next);
      writeGuards(next);
    } else {
      const newGuard: Guard = {
        id: `g${Date.now()}`,
        ...guardForm,
        phone: normalizedPhone,
        password: password.trim(),
        createdAt: new Date().toISOString().split("T")[0],
      };
      const next = [...guards, newGuard];
      setGuards(next);
      writeGuards(next);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const next = guards.filter((g) => g.id !== id);
    setGuards(next);
    writeGuards(next);
  };

  const handleUnbindDevice = (id: string) => {
    const next = unbindGuardDevice(id);
    setGuards(next);
    toast({ title: "Device unbound", description: "Guard can now login from a new device." });
  };

  const filteredGuards = guards.filter((guard) => {
    const query = searchName.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      guard.name.toLowerCase().includes(query) ||
      guard.employeeId.toLowerCase().includes(query) ||
      guard.phone.toLowerCase().includes(query);
    const matchesZone = zoneFilter === "all" || (guard.assignedZone || "") === zoneFilter;
    const matchesStatus = statusFilter === "all" || guard.status === statusFilter;
    return matchesSearch && matchesZone && matchesStatus;
  });

  const columns = [
    {
      key: "name",
      label: "Guard",
      render: (guard: Guard) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{guard.name}</p>
            <p className="text-xs text-muted-foreground">{guard.employeeId}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Contact",
      render: (guard: Guard) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span className="text-xs">{guard.phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="w-3 h-3" />
            <span className="text-xs">{guard.email || "Optional / Not provided"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "assignedZone",
      label: "Assigned Zone",
      render: (guard: Guard) => (
        <span className="text-sm">{guard.assignedZone || "N/A"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (guard: Guard) => (
        <span className={`status-badge ${
          guard.status === "on-duty" ? "status-on-duty" :
          guard.status === "active" ? "status-active" : "status-inactive"
        }`}>
          {guard.status === "on-duty" ? "On Duty" : guard.status === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "device",
      label: "Device Binding",
      render: (guard: Guard) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Smartphone className="w-3 h-3" />
            <span className="text-xs">{guard.boundDeviceName || "Not bound"}</span>
          </div>
          {guard.boundAt && <p className="text-[11px] text-muted-foreground">Bound: {new Date(guard.boundAt).toLocaleString()}</p>}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (guard: Guard) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(guard)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUnbindDevice(guard.id)} disabled={!guard.boundDeviceId}>
              <Smartphone className="w-4 h-4 mr-2" /> Unbind Device
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(guard.id)} className="text-destructive">
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
          <h1 className="page-title">Guards</h1>
          <p className="page-subtitle">Manage your security personnel</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Guard
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Guards", value: filteredGuards.length },
          { label: "On Duty", value: filteredGuards.filter((g) => g.status === "on-duty").length },
          { label: "Inactive", value: filteredGuards.filter((g) => g.status === "inactive").length },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card text-center"
          >
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="stat-card p-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <Label className="text-xs text-muted-foreground">Search by Name</Label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Search name, employee ID, phone..."
                className="pl-9 h-10"
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <Label className="text-xs text-muted-foreground">Assigned Zone</Label>
            <div className="mt-1">
              <SearchableSelect
                value={zoneFilter}
                onChange={setZoneFilter}
                options={[
                  { value: "all", label: "All Zones" },
                  ...mockZones.map((z) => ({ value: z.name, label: z.name })),
                ]}
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div className="mt-1">
              <SearchableSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as "all" | Guard["status"])}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "on-duty", label: "On Duty" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredGuards} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGuard ? "Edit Guard" : "Add New Guard"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter guard name" />
            </div>
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="e.g. GRD-007" />
            </div>

            <div className="space-y-2">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/[^\d]/g, "") })}
                  placeholder="e.g. 01XXXXXXXXX"
                />
                {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="guard@email.com" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <SearchableSelect
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v as Guard["status"] })}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "on-duty", label: "On Duty" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Assigned Zone</Label>
                <SearchableSelect
                  value={form.assignedZone}
                  onChange={(v) => setForm({ ...form, assignedZone: v })}
                  options={mockZones.map((z) => ({ value: z.name, label: z.name }))}
                  placeholder="Select zone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{editingGuard ? "Password (optional)" : "Password"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingGuard ? "Leave empty to keep current" : "Set guard password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name || !form.employeeId || !form.phoneNumber || (!editingGuard && !form.password.trim())}
            >
              {editingGuard ? "Update" : "Create"} Guard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
