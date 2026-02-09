import { useMemo, useState } from "react";
import { Plus, MapPin, MoreVertical, Pencil, Trash2, Navigation, Search } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DataTable from "@/components/DataTable";
import SearchableSelect from "@/components/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { mockZones } from "@/data/mock-data";
import type { Zone } from "@/types/guard-management";
import { toInitCapLabel } from "@/lib/text";

export default function Zones() {
  const [zones, setZones] = useState<Zone[]>(mockZones);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Zone["status"]>("all");
  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    latitude: "",
    longitude: "",
    status: "active" as Zone["status"],
  });

  const openCreate = () => {
    setEditingZone(null);
    setForm({ name: "", description: "", location: "", latitude: "", longitude: "", status: "active" });
    setDialogOpen(true);
  };

  const openEdit = (zone: Zone) => {
    setEditingZone(zone);
    setForm({
      name: zone.name,
      description: zone.description,
      location: zone.location,
      latitude: zone.latitude?.toString() || "",
      longitude: zone.longitude?.toString() || "",
      status: zone.status,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      description: form.description,
      location: form.location,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      status: form.status,
    };

    if (editingZone) {
      setZones((prev) => prev.map((z) => (z.id === editingZone.id ? { ...z, ...payload } : z)));
    } else {
      const newZone: Zone = {
        id: `z${Date.now()}`,
        ...payload,
        checkpointCount: 0,
        guardCount: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setZones((prev) => [...prev, newZone]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  const filteredZones = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return zones.filter((zone) => {
      const matchesSearch =
        query.length === 0 ||
        zone.name.toLowerCase().includes(query) ||
        zone.description.toLowerCase().includes(query) ||
        zone.location.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || zone.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [zones, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: zones.length,
      active: zones.filter((zone) => zone.status === "active").length,
      inactive: zones.filter((zone) => zone.status === "inactive").length,
      checkpoints: zones.reduce((sum, zone) => sum + zone.checkpointCount, 0),
    };
  }, [zones]);

  const columns = [
    {
      key: "name",
      label: "Zone",
      render: (zone: Zone) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{zone.name}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{zone.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (zone: Zone) => <span className="text-sm text-muted-foreground">{zone.location}</span>,
    },
    {
      key: "coordinates",
      label: "Coordinates",
      render: (zone: Zone) => (
        <span className="text-xs text-muted-foreground">
          {zone.latitude && zone.longitude ? `${zone.latitude}, ${zone.longitude}` : "Not set"}
        </span>
      ),
    },
    {
      key: "checkpointCount",
      label: "Checkpoints",
      render: (zone: Zone) => (
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{zone.checkpointCount}</span>
        </div>
      ),
    },
    {
      key: "guardCount",
      label: "Guards",
      render: (zone: Zone) => <span className="text-sm font-medium">{zone.guardCount}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (zone: Zone) => (
        <span className={`status-badge ${zone.status === "active" ? "status-active" : "status-inactive"}`}>
          {toInitCapLabel(zone.status)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (zone: Zone) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(zone)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(zone.id)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Zones</h1>
          <p className="text-sm text-muted-foreground mt-1">Compact zone management with quick filtering.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Zone
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="px-2.5 py-1 text-xs">
          {stats.total} Total
        </Badge>
        <Badge variant="secondary" className="px-2.5 py-1 text-xs">
          {stats.active} Active
        </Badge>
        <Badge variant="secondary" className="px-2.5 py-1 text-xs">
          {stats.inactive} Inactive
        </Badge>
        <Badge variant="secondary" className="px-2.5 py-1 text-xs">
          {stats.checkpoints} Checkpoints
        </Badge>
      </div>

      <div className="stat-card p-2.5">
        <div className="grid grid-cols-12 gap-2">
          <div className="relative col-span-12 md:col-span-9">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-10 text-sm"
              placeholder="Search zone, location, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-3">
            <SearchableSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as "all" | Zone["status"])}
              options={[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              className="h-10 text-sm"
            />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredZones} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit Zone" : "Add New Zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-2">
              <Label>Zone Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Building" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the zone" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Block A, Floor 1-5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude (optional)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g. 23.7846"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude (optional)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g. 90.4072"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <SearchableSelect
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v as Zone["status"] })}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name}>
              {editingZone ? "Update" : "Create"} Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
