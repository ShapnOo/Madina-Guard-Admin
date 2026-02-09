import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Navigation,
  MoreVertical,
  Pencil,
  Trash2,
  Wifi,
  QrCode,
  Eye,
  Download,
  Save,
  SmartphoneNfc,
  CheckCircle2,
  RefreshCw,
  Link2,
  Copy,
} from "lucide-react";
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
import DataTable from "@/components/DataTable";
import SearchableSelect from "@/components/SearchableSelect";
import { mockGuards, mockZones } from "@/data/mock-data";
import type { Checkpoint } from "@/types/guard-management";
import { useToast } from "@/hooks/use-toast";
import { CHECKPOINT_STORAGE_KEY, readCheckpoints, writeCheckpoints } from "@/lib/checkpoint-store";
import { appendAuditLog } from "@/lib/audit-store";

type ScanType = Checkpoint["scanTypes"][number];
const DEMO_CHECKPOINT_PASSWORD = "12345678";

function normalizeScanTypes(scanTypes: ScanType[]): ScanType[] {
  const unique = Array.from(new Set(scanTypes));
  const hasQr = unique.includes("qr");
  const hasDynamicQr = unique.includes("dynamic-qr");

  let next = [...unique];
  if (hasQr && hasDynamicQr) {
    // Keep Dynamic QR when both are present in legacy/demo data.
    next = next.filter((s) => s !== "qr");
  }
  return next.length ? next : ["nfc"];
}

export default function Checkpoints() {
  const { toast } = useToast();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(readCheckpoints());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [nfcDialogOpen, setNfcDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [filterGuard, setFilterGuard] = useState<string>("all");
  const [filterScanType, setFilterScanType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | Checkpoint["status"]>("all");
  const [filterZone, setFilterZone] = useState<string>("all");
  const [nfcWriteDone, setNfcWriteDone] = useState(false);
  const [nfcTestDone, setNfcTestDone] = useState(false);
  const [updatePassword, setUpdatePassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [form, setForm] = useState({
    name: "",
    zoneId: "",
    scanTypes: ["nfc"] as ScanType[],
    tagId: "",
    location: "",
    latitude: "",
    longitude: "",
    status: "active" as Checkpoint["status"],
  });
  const [qrForm, setQrForm] = useState({
    payload: "",
    size: 220,
    dynamic: false,
    rotateEveryMinutes: 10,
  });
  const [nfcForm, setNfcForm] = useState({
    payload: "",
    tagSerial: "",
  });

  useEffect(() => {
    writeCheckpoints(checkpoints);
  }, [checkpoints]);

  useEffect(() => {
    const refresh = () => setCheckpoints(readCheckpoints());
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHECKPOINT_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const guardOptions = mockGuards
    .filter((g) => g.assignedZone)
    .map((g) => ({ value: g.id, label: `${g.name} (${g.assignedZone})` }));

  const filteredCheckpoints = checkpoints.filter((c) => {
    const matchesZone = filterZone === "all" || c.zoneId === filterZone;
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    const matchesScanType = filterScanType === "all" || c.scanTypes.includes(filterScanType as ScanType);
    const matchesGuard =
      filterGuard === "all" ||
      mockGuards.some((g) => g.id === filterGuard && g.assignedZone === c.zoneName);
    return matchesZone && matchesStatus && matchesScanType && matchesGuard;
  });

  const openCreate = () => {
    setEditingCheckpoint(null);
    setForm({
      name: "",
      zoneId: "",
      scanTypes: ["nfc"],
      tagId: "",
      location: "",
      latitude: "",
      longitude: "",
      status: "active",
    });
    setDialogOpen(true);
  };

  const openEdit = (cp: Checkpoint) => {
    const normalizedTypes = normalizeScanTypes(cp.scanTypes);
    setEditingCheckpoint(cp);
    setForm({
      name: cp.name,
      zoneId: cp.zoneId,
      scanTypes: normalizedTypes,
      tagId: cp.tagId,
      location: cp.location,
      latitude: cp.latitude?.toString() || "",
      longitude: cp.longitude?.toString() || "",
      status: cp.status,
    });
    setDialogOpen(true);
  };

  const openDetails = (cp: Checkpoint) => {
    setSelectedCheckpoint(cp);
    setDetailOpen(true);
  };

  const openQrSetup = (cp: Checkpoint) => {
    const payload = cp.qrConfig?.payload || `checkpoint:${cp.id}|tag:${cp.tagId}|zone:${cp.zoneName}`;
    const dynamicDefault = cp.qrConfig?.dynamic ?? cp.scanTypes.includes("dynamic-qr");
    setSelectedCheckpoint(cp);
    setQrForm({
      payload,
      size: cp.qrConfig?.size || 220,
      dynamic: dynamicDefault,
      rotateEveryMinutes: cp.qrConfig?.rotateEveryMinutes || 10,
    });
    setQrDialogOpen(true);
  };

  const openNfcSetup = (cp: Checkpoint) => {
    const payload = cp.nfcConfig?.payload || `checkpoint:${cp.id}|tag:${cp.tagId}`;
    setSelectedCheckpoint(cp);
    setNfcForm({ payload, tagSerial: cp.nfcConfig?.tagSerial || "" });
    setNfcWriteDone(false);
    setNfcTestDone(false);
    setNfcDialogOpen(true);
  };

  const toggleScanType = (scanType: ScanType) => {
    setForm((prev) => {
      const hasType = prev.scanTypes.includes(scanType);
      if (hasType) {
        const next = prev.scanTypes.filter((s) => s !== scanType);
        return { ...prev, scanTypes: next.length ? next : [scanType] };
      }

      // QR and Dynamic QR are mutually exclusive for a checkpoint.
      if (scanType === "qr") {
        return { ...prev, scanTypes: [...prev.scanTypes.filter((s) => s !== "dynamic-qr"), "qr"] };
      }
      if (scanType === "dynamic-qr") {
        return { ...prev, scanTypes: [...prev.scanTypes.filter((s) => s !== "qr"), "dynamic-qr"] };
      }
      return { ...prev, scanTypes: [...prev.scanTypes, scanType] };
    });
  };

  const saveCheckpoint = () => {
    const zone = mockZones.find((z) => z.id === form.zoneId);
    const payload = {
      name: form.name,
      zoneId: form.zoneId,
      zoneName: zone?.name || "",
      scanTypes: normalizeScanTypes(form.scanTypes),
      tagId: form.tagId,
      location: form.location,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      status: form.status,
    };

    if (editingCheckpoint) {
      setCheckpoints((prev) =>
        prev.map((c) => (c.id === editingCheckpoint.id ? { ...c, ...payload } : c)),
      );
      appendAuditLog({
        actor: "Admin",
        module: "checkpoints",
        action: "update",
        entityType: "checkpoint",
        entityId: editingCheckpoint.id,
        summary: `Updated checkpoint ${payload.name} in ${payload.zoneName}`,
      });
    } else {
      const newId = `c${Date.now()}`;
      const newCp: Checkpoint = {
        id: newId,
        ...payload,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setCheckpoints((prev) => [...prev, newCp]);
      appendAuditLog({
        actor: "Admin",
        module: "checkpoints",
        action: "create",
        entityType: "checkpoint",
        entityId: newId,
        summary: `Created checkpoint ${payload.name} in ${payload.zoneName}`,
      });
    }
    setDialogOpen(false);
  };

  const handleSaveClick = () => {
    if (editingCheckpoint) {
      setUpdatePassword("");
      setPasswordError("");
      setPasswordDialogOpen(true);
      return;
    }
    saveCheckpoint();
  };

  const handlePasswordConfirm = () => {
    if (updatePassword !== DEMO_CHECKPOINT_PASSWORD) {
      setPasswordError("Incorrect password");
      return;
    }
    setPasswordDialogOpen(false);
    saveCheckpoint();
  };

  const handleDelete = (id: string) => {
    const target = checkpoints.find((cp) => cp.id === id);
    setCheckpoints((prev) => prev.filter((c) => c.id !== id));
    if (target) {
      appendAuditLog({
        actor: "Admin",
        module: "checkpoints",
        action: "delete",
        entityType: "checkpoint",
        entityId: id,
        summary: `Deleted checkpoint ${target.name}`,
      });
    }
  };

  const [dynamicToken, setDynamicToken] = useState<string>("");

  useEffect(() => {
    if (!qrDialogOpen || !qrForm.dynamic) {
      setDynamicToken("");
      return;
    }
    const updateToken = () => {
      const rotateMs = Math.max(1, qrForm.rotateEveryMinutes) * 60 * 1000;
      const slot = Math.floor(Date.now() / rotateMs);
      setDynamicToken(String(slot));
    };
    updateToken();
    const intervalId = window.setInterval(updateToken, 1000);
    return () => window.clearInterval(intervalId);
  }, [qrDialogOpen, qrForm.dynamic, qrForm.rotateEveryMinutes]);

  const qrPayloadForPreview = useMemo(() => {
    if (!qrForm.dynamic) return qrForm.payload;
    return `${qrForm.payload}|token:${dynamicToken}`;
  }, [qrForm.payload, qrForm.dynamic, dynamicToken]);

  const qrImageUrl = useMemo(() => {
    if (!selectedCheckpoint) return "";
    const content = encodeURIComponent(qrPayloadForPreview);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrForm.size}x${qrForm.size}&data=${content}`;
  }, [selectedCheckpoint, qrForm.size, qrPayloadForPreview]);

  const dynamicQrHint = useMemo(() => {
    if (!qrForm.dynamic) return "";
    const rotateMs = Math.max(1, qrForm.rotateEveryMinutes) * 60 * 1000;
    const nextAt = Math.ceil(Date.now() / rotateMs) * rotateMs;
    const secondsLeft = Math.max(0, Math.floor((nextAt - Date.now()) / 1000));
    return `Changes every ${qrForm.rotateEveryMinutes} min, next refresh in ${secondsLeft}s`;
  }, [dynamicToken, qrForm.dynamic, qrForm.rotateEveryMinutes]);

  const saveQrConfig = () => {
    if (!selectedCheckpoint) return;
    const now = new Date().toISOString().split("T")[0];
    setCheckpoints((prev) =>
      prev.map((cp) =>
        cp.id === selectedCheckpoint.id
          ? {
              ...cp,
              qrConfig: {
                payload: qrForm.payload,
                size: qrForm.size,
                dynamic: qrForm.dynamic,
                rotateEveryMinutes: qrForm.dynamic ? Math.max(1, qrForm.rotateEveryMinutes) : undefined,
                configured: true,
                lastGeneratedAt: now,
              },
            }
          : cp,
      ),
    );
    toast({ title: "QR config saved", description: `${selectedCheckpoint.name} QR setup updated.` });
    appendAuditLog({
      actor: "Admin",
      module: "checkpoints",
      action: "update",
      entityType: "checkpoint-qr",
      entityId: selectedCheckpoint.id,
      summary: `Updated QR setup for ${selectedCheckpoint.name}${qrForm.dynamic ? " (Dynamic)" : ""}`,
    });
    setQrDialogOpen(false);
  };

  const simulateNfcWrite = () => {
    setNfcWriteDone(true);
    toast({ title: "NFC write simulated", description: "Tag payload written in demo mode." });
  };

  const simulateNfcTest = () => {
    setNfcTestDone(true);
    toast({ title: "NFC scan test passed", description: "Tag scan validation succeeded in demo mode." });
  };

  const saveNfcConfig = () => {
    if (!selectedCheckpoint) return;
    const now = new Date().toISOString().split("T")[0];
    setCheckpoints((prev) =>
      prev.map((cp) =>
        cp.id === selectedCheckpoint.id
          ? {
              ...cp,
              nfcConfig: {
                payload: nfcForm.payload,
                tagSerial: nfcForm.tagSerial || undefined,
                configured: true,
                lastConfiguredAt: now,
              },
            }
          : cp,
      ),
    );
    toast({ title: "NFC config saved", description: `${selectedCheckpoint.name} NFC setup updated.` });
    appendAuditLog({
      actor: "Admin",
      module: "checkpoints",
      action: "update",
      entityType: "checkpoint-nfc",
      entityId: selectedCheckpoint.id,
      summary: `Updated NFC setup for ${selectedCheckpoint.name}`,
    });
    setNfcDialogOpen(false);
  };

  const getDisplayPath = (cp: Checkpoint) => `/checkpoint-display/${cp.id}`;

  const getDisplayUrl = (cp: Checkpoint) => {
    if (typeof window === "undefined") return getDisplayPath(cp);
    return `${window.location.origin}${getDisplayPath(cp)}`;
  };

  const copyDisplayLink = async (cp: Checkpoint) => {
    try {
      await navigator.clipboard.writeText(getDisplayUrl(cp));
      toast({ title: "Display link copied", description: `${cp.name} link copied to clipboard.` });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy link. Please copy manually.", variant: "destructive" });
    }
  };

  const selectedHasNfc = !!selectedCheckpoint?.scanTypes.includes("nfc");
  const selectedHasQr = !!selectedCheckpoint?.scanTypes.some((s) => s === "qr" || s === "dynamic-qr");
  const selectedHasDynamicQr = !!selectedCheckpoint?.scanTypes.includes("dynamic-qr");

  const columns = [
    {
      key: "name",
      label: "Checkpoint",
      render: (cp: Checkpoint) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Navigation className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{cp.name}</p>
            <p className="text-[11px] text-muted-foreground">{cp.location}</p>
          </div>
        </div>
      ),
    },
    {
      key: "zoneName",
      label: "Zone",
      render: (cp: Checkpoint) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-md text-[11px] font-medium text-secondary-foreground">
          {cp.zoneName}
        </span>
      ),
    },
    {
      key: "scanTypes",
      label: "Scan Types",
      render: (cp: Checkpoint) => (
        <div className="flex flex-wrap gap-1.5">
          {cp.scanTypes.map((scanType) => (
            <Badge key={`${cp.id}-${scanType}`} variant="secondary" className="gap-1.5 px-2 py-0.5 text-[11px]">
              {scanType === "nfc" ? <Wifi className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
              {scanType === "dynamic-qr" ? "DYNAMIC QR" : scanType.toUpperCase()}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "setup",
      label: "Setup",
      render: (cp: Checkpoint) => (
        <div className="flex flex-col gap-1">
          {cp.scanTypes.includes("qr") && (
            <span className={`text-[11px] ${cp.qrConfig?.configured ? "text-success" : "text-muted-foreground"}`}>
              QR: {cp.qrConfig?.configured ? "configured" : "pending"}
            </span>
          )}
          {cp.scanTypes.includes("dynamic-qr") && (
            <span className={`text-[11px] ${cp.qrConfig?.configured ? "text-success" : "text-muted-foreground"}`}>
              Dynamic QR: {cp.qrConfig?.configured ? "configured" : "pending"}
            </span>
          )}
          {cp.scanTypes.includes("nfc") && (
            <span className={`text-[11px] ${cp.nfcConfig?.configured ? "text-success" : "text-muted-foreground"}`}>
              NFC: {cp.nfcConfig?.configured ? "configured" : "pending"}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (cp: Checkpoint) => (
        <span className={`status-badge ${cp.status === "active" ? "status-active" : "status-inactive"}`}>
          {cp.status === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (cp: Checkpoint) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetails(cp)}>
            <Eye className="w-4 h-4" />
          </Button>
          {cp.scanTypes.includes("dynamic-qr") && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openQrSetup(cp)} title="Setup Dynamic QR">
              <QrCode className="w-4 h-4" />
            </Button>
          )}
          {cp.scanTypes.includes("dynamic-qr") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(getDisplayPath(cp), "_blank", "noopener,noreferrer")}
              title="Open display link"
            >
              <Link2 className="w-4 h-4" />
            </Button>
          )}
          {cp.scanTypes.includes("nfc") && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openNfcSetup(cp)}>
              <SmartphoneNfc className="w-4 h-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(cp)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(cp.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Checkpoints</h1>
          <p className="page-subtitle">Manage checkpoints with dedicated QR generation and NFC setup</p>
        </div>
        <Button onClick={openCreate} className="gap-2 h-9 text-sm">
          <Plus className="w-4 h-4" /> Add Checkpoint
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="stat-card p-2.5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <Label className="text-[11px] text-muted-foreground">Guard</Label>
            <div className="mt-1">
              <SearchableSelect
                value={filterGuard}
                onChange={setFilterGuard}
                options={[
                  { value: "all", label: "All Guards" },
                  ...guardOptions,
                ]}
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Scan Type</Label>
            <div className="mt-1">
              <SearchableSelect
                value={filterScanType}
                onChange={setFilterScanType}
                options={[
                  { value: "all", label: "All Scan Types" },
                  { value: "nfc", label: "NFC" },
                  { value: "qr", label: "QR Code" },
                  { value: "dynamic-qr", label: "Dynamic QR" },
                ]}
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Status</Label>
            <div className="mt-1">
              <SearchableSelect
                value={filterStatus}
                onChange={(v) => setFilterStatus(v as "all" | Checkpoint["status"])}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Zone</Label>
            <div className="mt-1">
              <SearchableSelect
                value={filterZone}
                onChange={setFilterZone}
                options={[
                  { value: "all", label: `All Zones (${checkpoints.length})` },
                  ...mockZones.map((zone) => ({
                    value: zone.id,
                    label: `${zone.name} (${checkpoints.filter((c) => c.zoneId === zone.id).length})`,
                  })),
                ]}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <DataTable columns={columns} data={filteredCheckpoints} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCheckpoint ? "Edit Checkpoint" : "Add New Checkpoint"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Checkpoint Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Gate" />
            </div>

            <div className="space-y-2">
              <Label>Zone</Label>
              <SearchableSelect
                value={form.zoneId}
                onChange={(v) => setForm({ ...form, zoneId: v })}
                options={mockZones.map((z) => ({ value: z.id, label: z.name }))}
                placeholder="Select zone"
              />
            </div>

            <div className="space-y-2">
              <Label>Scan Types (NFC + one QR mode)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => toggleScanType("nfc")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    form.scanTypes.includes("nfc")
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Wifi className={`w-5 h-5 ${form.scanTypes.includes("nfc") ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${form.scanTypes.includes("nfc") ? "text-primary" : "text-muted-foreground"}`}>NFC</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleScanType("qr")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    form.scanTypes.includes("qr")
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <QrCode className={`w-5 h-5 ${form.scanTypes.includes("qr") ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${form.scanTypes.includes("qr") ? "text-primary" : "text-muted-foreground"}`}>QR Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleScanType("dynamic-qr")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    form.scanTypes.includes("dynamic-qr")
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <RefreshCw className={`w-5 h-5 ${form.scanTypes.includes("dynamic-qr") ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${form.scanTypes.includes("dynamic-qr") ? "text-primary" : "text-muted-foreground"}`}>Dynamic QR</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Tag ID</Label>
                <Input
                  value={form.tagId}
                  onChange={(e) => setForm({ ...form, tagId: e.target.value })}
                  placeholder="e.g. NFC-013"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. 3rd Floor" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude (optional)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g. 23.78455"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude (optional)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g. 90.40728"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <SearchableSelect
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v as Checkpoint["status"] })}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveClick}
              disabled={
                !form.name ||
                !form.zoneId ||
                !form.tagId ||
                form.scanTypes.length === 0
              }
            >
              {editingCheckpoint ? "Update" : "Create"} Checkpoint
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
              <p className="text-[11px] text-muted-foreground">Demo password: {DEMO_CHECKPOINT_PASSWORD}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePasswordConfirm} disabled={!updatePassword.trim()}>
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Checkpoint Setup Details</DialogTitle>
          </DialogHeader>
          {selectedCheckpoint && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border/70 bg-[linear-gradient(140deg,hsl(var(--card)),hsl(var(--primary)/0.07))] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{selectedCheckpoint.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {selectedCheckpoint.zoneName} | {selectedCheckpoint.location}
                    </p>
                  </div>
                  <span className={`status-badge ${selectedCheckpoint.status === "active" ? "status-active" : "status-inactive"}`}>
                    {selectedCheckpoint.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-md border border-border bg-card/80 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">Tag ID</p>
                    <p className="text-[11px] font-medium mt-0.5">{selectedCheckpoint.tagId}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card/80 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">Scan Types</p>
                    <p className="text-[11px] font-medium mt-0.5">{selectedCheckpoint.scanTypes.length}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card/80 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">Latitude</p>
                    <p className="text-[11px] font-medium mt-0.5">{selectedCheckpoint.latitude ?? "-"}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card/80 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">Longitude</p>
                    <p className="text-[11px] font-medium mt-0.5">{selectedCheckpoint.longitude ?? "-"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {selectedHasQr && (
                  <div className="rounded-lg border border-border/70 bg-secondary/20 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">QR Setup</p>
                    <p className={`text-[11px] font-semibold mt-0.5 ${selectedCheckpoint.qrConfig?.configured ? "text-success" : "text-warning"}`}>
                      {selectedCheckpoint.qrConfig?.configured ? "Configured" : "Pending"}
                    </p>
                  </div>
                )}
                {selectedHasNfc && (
                  <div className="rounded-lg border border-border/70 bg-secondary/20 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">NFC Setup</p>
                    <p className={`text-[11px] font-semibold mt-0.5 ${selectedCheckpoint.nfcConfig?.configured ? "text-success" : "text-warning"}`}>
                      {selectedCheckpoint.nfcConfig?.configured ? "Configured" : "Pending"}
                    </p>
                  </div>
                )}
                {selectedHasQr && (
                  <div className="rounded-lg border border-border/70 bg-secondary/20 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">QR Mode</p>
                    <p className="text-[11px] font-semibold mt-0.5">
                      {selectedCheckpoint.qrConfig?.dynamic ? "Dynamic" : "Static"}
                    </p>
                  </div>
                )}
                {selectedHasDynamicQr && (
                  <div className="rounded-lg border border-border/70 bg-secondary/20 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">Dynamic Link</p>
                    <p className="text-[11px] font-semibold mt-0.5 text-success">Enabled</p>
                  </div>
                )}
              </div>

              {(selectedHasQr || selectedHasNfc) && (
                <div className={`grid grid-cols-1 ${selectedHasQr && selectedHasNfc ? "sm:grid-cols-2" : ""} gap-3`}>
                  {selectedHasQr && (
                    <div className="rounded-lg border border-border/70 bg-card/80 p-3">
                      <p className="text-sm font-semibold mb-1.5">QR / Dynamic QR</p>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedHasDynamicQr
                          ? "Dynamic QR is link-based. Use the display link to view the live QR."
                          : "Static QR is auto-generated from checkpoint data and ready for download."}
                      </p>
                      {selectedHasDynamicQr && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            className="h-8 text-[12px]"
                            size="sm"
                            variant="outline"
                            onClick={() => openQrSetup(selectedCheckpoint)}
                          >
                            <QrCode className="w-4 h-4 mr-1" /> Setup Dynamic QR
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedHasNfc && (
                    <div className="rounded-lg border border-border/70 bg-card/80 p-3">
                      <p className="text-sm font-semibold mb-1.5">NFC</p>
                      <p className="text-[11px] text-muted-foreground">
                        Write payload and verify scan behavior using demo NFC setup flow.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          className="h-8 text-[12px]"
                          size="sm"
                          variant="outline"
                          onClick={() => openNfcSetup(selectedCheckpoint)}
                        >
                          <SmartphoneNfc className="w-4 h-4 mr-1" /> Configure NFC
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedHasQr && (
                <div className="rounded-lg border border-border/70 bg-card/80 p-3">
                  {selectedCheckpoint.qrConfig?.dynamic ? (
                    <>
                      <p className="text-sm font-semibold">Dynamic QR View</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Use this link for projection screen. QR updates automatically by rotation interval.</p>
                      <p className="mt-2 text-[11px] text-muted-foreground break-all">{getDisplayUrl(selectedCheckpoint)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          className="h-8 text-[12px]"
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(getDisplayPath(selectedCheckpoint), "_blank", "noopener,noreferrer")}
                        >
                          <Link2 className="w-4 h-4 mr-1" /> View
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">Static QR View</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Use this QR for printed or fixed checkpoint scan.</p>
                      <div className="mt-3 flex justify-center rounded-lg border border-border bg-white/80 p-3">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=${selectedCheckpoint.qrConfig?.size || 220}x${selectedCheckpoint.qrConfig?.size || 220}&data=${encodeURIComponent(selectedCheckpoint.qrConfig?.payload || `checkpoint:${selectedCheckpoint.id}|tag:${selectedCheckpoint.tagId}|zone:${selectedCheckpoint.zoneName}`)}`}
                          alt="Static QR"
                          className="rounded-md border border-border bg-white"
                        />
                      </div>
                      <a
                        href={`https://api.qrserver.com/v1/create-qr-code/?size=${selectedCheckpoint.qrConfig?.size || 220}x${selectedCheckpoint.qrConfig?.size || 220}&data=${encodeURIComponent(selectedCheckpoint.qrConfig?.payload || `checkpoint:${selectedCheckpoint.id}|tag:${selectedCheckpoint.tagId}|zone:${selectedCheckpoint.zoneName}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 block"
                      >
                        <Button className="h-8 text-[12px] w-full" size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-1" /> Download QR
                        </Button>
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate QR</DialogTitle>
          </DialogHeader>
          {selectedCheckpoint && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Payload</Label>
                  <Input value={qrForm.payload} onChange={(e) => setQrForm({ ...qrForm, payload: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Size</Label>
                  <SearchableSelect
                    value={String(qrForm.size)}
                    onChange={(v) => setQrForm({ ...qrForm, size: Number(v) })}
                    options={[
                      { value: "180", label: "180 x 180" },
                      { value: "220", label: "220 x 220" },
                      { value: "300", label: "300 x 300" },
                      { value: "400", label: "400 x 400" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>QR Mode</Label>
                  <SearchableSelect
                    value={qrForm.dynamic ? "dynamic" : "static"}
                    onChange={(v) => setQrForm({ ...qrForm, dynamic: v === "dynamic" })}
                    options={[
                      { value: "static", label: "Static QR" },
                      { value: "dynamic", label: "Dynamic QR" },
                    ]}
                  />
                </div>
                {qrForm.dynamic && (
                  <div className="space-y-2">
                    <Label>Change Every (minutes)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={qrForm.rotateEveryMinutes}
                      onChange={(e) => setQrForm({ ...qrForm, rotateEveryMinutes: Math.max(1, Number(e.target.value) || 1) })}
                    />
                    <p className="text-[11px] text-muted-foreground">{dynamicQrHint}</p>
                  </div>
                )}
              </div>
              <div className="stat-card">
                <div className="flex justify-center">
                  <img src={qrImageUrl} alt="Generated QR" className="rounded-md border border-border bg-white" />
                </div>
                {qrForm.dynamic && (
                  <p className="text-xs text-center text-muted-foreground mt-3">Live token: {dynamicToken || "-"}</p>
                )}
                <a href={qrImageUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-1" /> Download QR
                  </Button>
                </a>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveQrConfig} disabled={!qrForm.payload.trim()}>
              <Save className="w-4 h-4 mr-1" /> Save QR Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nfcDialogOpen} onOpenChange={setNfcDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Setup NFC</DialogTitle>
          </DialogHeader>
          {selectedCheckpoint && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>NFC Payload</Label>
                    <Input value={nfcForm.payload} onChange={(e) => setNfcForm({ ...nfcForm, payload: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tag Serial (optional)</Label>
                    <Input value={nfcForm.tagSerial} onChange={(e) => setNfcForm({ ...nfcForm, tagSerial: e.target.value })} placeholder="e.g. 04A1B2C3D4" />
                  </div>
                </div>
                <div className="stat-card">
                  <p className="text-sm font-semibold mb-2">Demo Setup Flow</p>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>1. Open NFC tool on device.</p>
                    <p>2. Choose write operation.</p>
                    <p>3. Write payload to NFC tag.</p>
                    <p>4. Test by scanning the same tag.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={simulateNfcWrite}>
                  <SmartphoneNfc className="w-4 h-4 mr-1" /> Simulate Write
                </Button>
                <Button type="button" variant="outline" onClick={simulateNfcTest} disabled={!nfcWriteDone}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Simulate Test Scan
                </Button>
              </div>

              <div className="text-xs">
                <p className={nfcWriteDone ? "text-success" : "text-muted-foreground"}>Write step: {nfcWriteDone ? "Done" : "Pending"}</p>
                <p className={nfcTestDone ? "text-success" : "text-muted-foreground"}>Test step: {nfcTestDone ? "Done" : "Pending"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNfcDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveNfcConfig} disabled={!nfcForm.payload.trim()}>
              <Save className="w-4 h-4 mr-1" /> Save NFC Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

