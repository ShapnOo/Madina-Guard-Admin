import { useState } from "react";
import { Plus, MoreVertical, Pencil, Trash2, Users, Eye, Search } from "lucide-react";
import DataTable from "@/components/DataTable";
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
import { mockManagementUsers, mockZones } from "@/data/mock-data";
import SearchableSelect from "@/components/SearchableSelect";
import type { ManagementUser } from "@/types/guard-management";
import { toInitCapLabel } from "@/lib/text";
import { appendAuditLog } from "@/lib/audit-store";

export default function UserManagement() {
  const [users, setUsers] = useState<ManagementUser[]>(mockManagementUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ManagementUser["status"]>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagementUser | null>(null);
  const [viewingUser, setViewingUser] = useState<ManagementUser | null>(null);
  const [form, setForm] = useState({
    name: "",
    profileImageUrl: "",
    employeeId: "",
    email: "",
    phone: "",
    role: "viewer" as ManagementUser["role"],
    department: "Operations",
    office: "Chattogram HQ",
    device: "",
    lastLogin: "",
    mfaEnabled: true,
    assignedZones: [] as string[],
    status: "active" as ManagementUser["status"],
  });

  const openCreate = () => {
    setEditingUser(null);
    setForm({
      name: "",
      profileImageUrl: "",
      employeeId: "",
      email: "",
      phone: "",
      role: "viewer",
      department: "Operations",
      office: "Chattogram HQ",
      device: "",
      lastLogin: "",
      mfaEnabled: false,
      assignedZones: [],
      status: "active",
    });
    setDialogOpen(true);
  };

  const openView = (user: ManagementUser) => {
    setViewingUser(user);
    setViewOpen(true);
  };

  const openEdit = (user: ManagementUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      profileImageUrl: user.profileImageUrl || "",
      employeeId: user.employeeId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      office: user.office,
      device: user.device,
      lastLogin: user.lastLogin,
      mfaEnabled: user.mfaEnabled,
      assignedZones: user.assignedZones,
      status: user.status,
    });
    setDialogOpen(true);
  };

  const toggleZone = (zoneName: string) => {
    setForm((prev) => ({
      ...prev,
      assignedZones: prev.assignedZones.includes(zoneName)
        ? prev.assignedZones.filter((z) => z !== zoneName)
        : [...prev.assignedZones, zoneName],
    }));
  };

  const handleSave = () => {
    const payload = { ...form };
    if (editingUser) {
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...payload } : u)));
      appendAuditLog({
        actor: "Admin",
        module: "users",
        action: "update",
        entityType: "user",
        entityId: editingUser.id,
        summary: `Updated management user ${payload.name}`,
      });
    } else {
      const newId = `u${Date.now()}`;
      const newUser: ManagementUser = {
        id: newId,
        ...payload,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setUsers((prev) => [...prev, newUser]);
      appendAuditLog({
        actor: "Admin",
        module: "users",
        action: "create",
        entityType: "user",
        entityId: newId,
        summary: `Created management user ${payload.name}`,
      });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const target = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (target) {
      appendAuditLog({
        actor: "Admin",
        module: "users",
        action: "delete",
        entityType: "user",
        entityId: id,
        summary: `Deleted management user ${target.name}`,
      });
    }
  };

  const handleProfileImageUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, profileImageUrl: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const filteredUsers = users.filter((user) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      user.name.toLowerCase().includes(query) ||
      user.employeeId.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.phone.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: "name",
      label: "User",
      render: (u: ManagementUser) => (
        <div className="flex items-center gap-2">
          {u.profileImageUrl ? (
            <img
              src={u.profileImageUrl}
              alt={u.name}
              className="w-8 h-8 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: "employeeId", label: "Employee ID" },
    { key: "department", label: "Department" },
    { key: "office", label: "Office" },
    {
      key: "status",
      label: "Status",
      render: (u: ManagementUser) => (
        <span className={`status-badge ${u.status === "active" ? "status-active" : "status-inactive"}`}>
          {toInitCapLabel(u.status)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (u: ManagementUser) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openView(u)}>
              <Eye className="w-4 h-4 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(u)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(u.id)} className="text-destructive">
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
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Create and manage management-level users</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      <div className="stat-card p-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, employee ID, email, phone..."
                className="pl-9 h-10"
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <Label className="text-xs text-muted-foreground">Filter by Status</Label>
            <div className="mt-1">
              <SearchableSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as "all" | ManagementUser["status"])}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredUsers} />

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Account</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-1 py-2">
              <div className="flex items-center justify-center mb-3">
                {viewingUser.profileImageUrl ? (
                  <img
                    src={viewingUser.profileImageUrl}
                    alt={viewingUser.name}
                    className="w-20 h-20 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">View your details</p>
              {[
                ["Full Name", viewingUser.name],
                ["Employee ID", viewingUser.employeeId],
                ["Role", `${viewingUser.role} - ${viewingUser.office}`],
                ["Department", viewingUser.department],
                ["Office", viewingUser.office],
                ["Email", viewingUser.email],
                ["Phone", viewingUser.phone],
                ["Device", viewingUser.device || "N/A"],
                ["Last Login", viewingUser.lastLogin ? new Date(viewingUser.lastLogin).toLocaleString() : "N/A"],
                ["MFA", viewingUser.mfaEnabled ? "Enabled" : "Disabled"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-2 gap-4 py-1.5">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-right">{value}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                {form.profileImageUrl ? (
                  <img
                    src={form.profileImageUrl}
                    alt="Profile preview"
                    className="w-16 h-16 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleProfileImageUpload(e.target.files?.[0] || null)}
                    className="max-w-[240px]"
                  />
                  {form.profileImageUrl && (
                    <Button type="button" variant="outline" onClick={() => setForm((prev) => ({ ...prev, profileImageUrl: "" }))}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="e.g. MGR-BD-001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <SearchableSelect
                  value={form.role}
                  onChange={(v) => setForm({ ...form, role: v as ManagementUser["role"] })}
                  options={[
                    { value: "super-admin", label: "Super Admin" },
                    { value: "operations-manager", label: "Operations Manager" },
                    { value: "zone-manager", label: "Zone Manager" },
                    { value: "viewer", label: "Viewer" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <SearchableSelect
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v as ManagementUser["status"] })}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Office</Label>
                <Input value={form.office} onChange={(e) => setForm({ ...form, office: e.target.value })} />
              </div>
            </div>

            {editingUser && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Device</Label>
                  <Input value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} placeholder="e.g. iPhone 14 Pro - iOS 17" />
                </div>
                <div className="space-y-2">
                  <Label>Last Login (optional)</Label>
                  <Input type="datetime-local" value={form.lastLogin} onChange={(e) => setForm({ ...form, lastLogin: e.target.value })} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Assigned Zones</Label>
              <div className="grid grid-cols-2 gap-2">
                {mockZones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => toggleZone(zone.name)}
                    className={`px-3 py-2 rounded-md text-xs font-medium border ${
                      form.assignedZones.includes(zone.name)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border"
                    }`}
                  >
                    {zone.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.email || !form.employeeId || !form.department || !form.office}>
              {editingUser ? "Update" : "Create"} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
