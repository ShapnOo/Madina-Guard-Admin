import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { Input } from "@/components/ui/input";
import SearchableSelect from "@/components/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, ShieldAlert, ShieldCheck } from "lucide-react";
import { mockPatrolHistory } from "@/data/mock-data";
import { CHECKPOINT_STORAGE_KEY, readCheckpoints } from "@/lib/checkpoint-store";
import { SCHEDULE_STORAGE_KEY, readSchedules } from "@/lib/schedule-store";
import type { Checkpoint } from "@/types/guard-management";
import "leaflet/dist/leaflet.css";

type Health = "healthy" | "attention" | "critical" | "inactive" | "unknown";

type ZoneMapNode = {
  checkpoint: Checkpoint;
  health: Health;
  latestStatus: "completed" | "late" | "missed" | "skipped" | "none";
  activeVisits: number;
  lat: number;
  lng: number;
};

type ZoneMap = {
  zoneName: string;
  center: [number, number];
  checkpoints: ZoneMapNode[];
};

function markerColor(health: Health) {
  if (health === "healthy") return "#10b981";
  if (health === "attention") return "#f59e0b";
  if (health === "critical") return "#ef4444";
  if (health === "inactive") return "#64748b";
  return "#3b82f6";
}

function healthChipClass(health: Health) {
  if (health === "healthy") return "bg-success/10 text-success border-success/20";
  if (health === "attention") return "bg-warning/10 text-warning border-warning/20";
  if (health === "critical") return "bg-destructive/10 text-destructive border-destructive/20";
  if (health === "inactive") return "bg-muted text-muted-foreground border-border";
  return "bg-info/10 text-info border-info/20";
}

function healthLabel(health: Health) {
  if (health === "healthy") return "Healthy";
  if (health === "attention") return "Attention";
  if (health === "critical") return "Critical";
  if (health === "inactive") return "Inactive";
  return "Unknown";
}

function hashToOffset(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash << 5) - hash + seed.charCodeAt(i);
  const normalized = ((hash % 1000) + 1000) % 1000;
  return (normalized - 500) / 200000;
}

export default function OperationsMap() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(readCheckpoints());
  const [filters, setFilters] = useState({
    zone: "all",
    health: "all",
    scanType: "all",
    search: "",
  });

  useEffect(() => {
    const refresh = () => setCheckpoints(readCheckpoints());
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHECKPOINT_STORAGE_KEY || e.key === SCHEDULE_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const schedules = useMemo(() => readSchedules(), [checkpoints]);
  const zoneOptions = useMemo(() => Array.from(new Set(checkpoints.map((cp) => cp.zoneName))).sort(), [checkpoints]);

  const enriched = useMemo(() => {
    const latestByCheckpoint = new Map<string, "completed" | "late" | "missed" | "skipped" | "none">();
    [...mockPatrolHistory]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((row) => {
        if (!latestByCheckpoint.has(row.checkpointName)) {
          latestByCheckpoint.set(row.checkpointName, row.status);
        }
      });

    const activeVisitCountByCheckpoint = new Map<string, number>();
    schedules
      .filter((schedule) => schedule.status === "active")
      .forEach((schedule) => {
        activeVisitCountByCheckpoint.set(
          schedule.checkpointId,
          (activeVisitCountByCheckpoint.get(schedule.checkpointId) || 0) + schedule.timeSlots.length,
        );
      });

    return checkpoints.map((checkpoint) => {
      const latestStatus = latestByCheckpoint.get(checkpoint.name) || "none";
      let health: Health = "unknown";
      if (checkpoint.status !== "active") health = "inactive";
      else if (latestStatus === "completed") health = "healthy";
      else if (latestStatus === "late" || latestStatus === "skipped") health = "attention";
      else if (latestStatus === "missed") health = "critical";

      return {
        checkpoint,
        latestStatus,
        health,
        activeVisits: activeVisitCountByCheckpoint.get(checkpoint.id) || 0,
      };
    });
  }, [checkpoints, schedules]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return enriched.filter((item) => {
      if (filters.zone !== "all" && item.checkpoint.zoneName !== filters.zone) return false;
      if (filters.health !== "all" && item.health !== filters.health) return false;
      if (filters.scanType !== "all" && !item.checkpoint.scanTypes.includes(filters.scanType as Checkpoint["scanTypes"][number])) return false;
      if (
        q &&
        !(
          item.checkpoint.name.toLowerCase().includes(q) ||
          item.checkpoint.zoneName.toLowerCase().includes(q) ||
          item.checkpoint.location.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [enriched, filters]);

  const zones = useMemo(() => {
    const grouped = new Map<string, Array<typeof filtered[number]>>();
    filtered.forEach((item) => {
      if (!grouped.has(item.checkpoint.zoneName)) grouped.set(item.checkpoint.zoneName, []);
      grouped.get(item.checkpoint.zoneName)!.push(item);
    });

    return Array.from(grouped.entries())
      .map(([zoneName, items]) => {
        const withCoords = items.filter(
          (item) => typeof item.checkpoint.latitude === "number" && typeof item.checkpoint.longitude === "number",
        );
        const fallbackCenter: [number, number] = [23.7846, 90.4072];
        const center: [number, number] =
          withCoords.length === 0
            ? fallbackCenter
            : [
                withCoords.reduce((sum, item) => sum + (item.checkpoint.latitude || 0), 0) / withCoords.length,
                withCoords.reduce((sum, item) => sum + (item.checkpoint.longitude || 0), 0) / withCoords.length,
              ];

        const checkpointsWithCoords: ZoneMapNode[] = items.map((item) => {
          const lat =
            typeof item.checkpoint.latitude === "number"
              ? item.checkpoint.latitude
              : center[0] + hashToOffset(`${item.checkpoint.id}-lat`);
          const lng =
            typeof item.checkpoint.longitude === "number"
              ? item.checkpoint.longitude
              : center[1] + hashToOffset(`${item.checkpoint.id}-lng`);
          return { ...item, lat, lng };
        });

        return {
          zoneName,
          center,
          checkpoints: checkpointsWithCoords,
        } satisfies ZoneMap;
      })
      .sort((a, b) => a.zoneName.localeCompare(b.zoneName));
  }, [filtered]);

  const summary = useMemo(() => {
    return {
      zones: zones.length,
      checkpoints: filtered.length,
      healthy: filtered.filter((x) => x.health === "healthy").length,
      attention: filtered.filter((x) => x.health === "attention").length,
      critical: filtered.filter((x) => x.health === "critical").length,
    };
  }, [zones, filtered]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-gradient-to-r from-background via-background to-primary/5 px-4 py-4">
        <div className="page-header">
          <h1 className="page-title">Operations Map</h1>
          <p className="page-subtitle">Zone-wise live command map with checkpoint status colors</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Zones</p>
          <p className="text-lg font-semibold">{summary.zones}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Checkpoints</p>
          <p className="text-lg font-semibold">{summary.checkpoints}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Healthy</p>
          <p className="text-lg font-semibold text-success">{summary.healthy}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Attention</p>
          <p className="text-lg font-semibold text-warning">{summary.attention}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Critical</p>
          <p className="text-lg font-semibold text-destructive">{summary.critical}</p>
        </div>
      </div>

      <div className="stat-card p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div>
          <label className="text-xs text-muted-foreground">Zone</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.zone}
              onChange={(value) => setFilters((prev) => ({ ...prev, zone: value }))}
              options={[
                { value: "all", label: "All Zones" },
                ...zoneOptions.map((zone) => ({ value: zone, label: zone })),
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Health</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.health}
              onChange={(value) => setFilters((prev) => ({ ...prev, health: value }))}
              options={[
                { value: "all", label: "All Health" },
                { value: "healthy", label: "Healthy" },
                { value: "attention", label: "Attention" },
                { value: "critical", label: "Critical" },
                { value: "inactive", label: "Inactive" },
                { value: "unknown", label: "Unknown" },
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Scan Type</label>
          <div className="mt-1">
            <SearchableSelect
              value={filters.scanType}
              onChange={(value) => setFilters((prev) => ({ ...prev, scanType: value }))}
              options={[
                { value: "all", label: "All Types" },
                { value: "nfc", label: "NFC" },
                { value: "qr", label: "Static QR" },
                { value: "dynamic-qr", label: "Dynamic QR" },
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Search</label>
          <Input
            className="mt-1"
            placeholder="Checkpoint or location..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {zones.map((zone, idx) => {
          const healthy = zone.checkpoints.filter((x) => x.health === "healthy").length;
          const attention = zone.checkpoints.filter((x) => x.health === "attention").length;
          const critical = zone.checkpoints.filter((x) => x.health === "critical").length;
          return (
            <motion.div
              key={zone.zoneName}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-xl border border-border/70 bg-card/80 p-3"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{zone.zoneName}</p>
                  <p className="text-[11px] text-muted-foreground">{zone.checkpoints.length} checkpoints</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge className="bg-success/10 text-success hover:bg-success/10 text-[10px]">{healthy} Healthy</Badge>
                  <Badge className="bg-warning/10 text-warning hover:bg-warning/10 text-[10px]">{attention} Attention</Badge>
                  <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 text-[10px]">{critical} Critical</Badge>
                </div>
              </div>

              <div className="h-64 overflow-hidden rounded-lg border border-border/70">
                <MapContainer center={zone.center} zoom={16} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  />
                  {zone.checkpoints.map((node) => (
                    <CircleMarker
                      key={node.checkpoint.id}
                      center={[node.lat, node.lng]}
                      pathOptions={{ color: markerColor(node.health), fillColor: markerColor(node.health), fillOpacity: 0.9 }}
                      radius={7}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">{node.checkpoint.name}</p>
                          <p>{node.checkpoint.location}</p>
                          <p>Status: {healthLabel(node.health)}</p>
                          <p>Visits/Day: {node.activeVisits}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>

              <div className="mt-2.5 space-y-1.5 max-h-40 overflow-auto pr-1">
                {zone.checkpoints.map((node) => (
                  <div key={node.checkpoint.id} className="rounded-md border border-border/70 bg-background/75 px-2.5 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{node.checkpoint.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{node.checkpoint.location}</p>
                      </div>
                      <Badge className={`${healthChipClass(node.health)} text-[10px]`}>{healthLabel(node.health)}</Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {node.checkpoint.zoneName}</span>
                      <span className="inline-flex items-center gap-1"><Navigation className="w-3.5 h-3.5" /> {node.activeVisits} visits/day</span>
                      <span className="inline-flex items-center gap-1">
                        {node.health === "critical" ? <ShieldAlert className="w-3.5 h-3.5 text-destructive" /> : <ShieldCheck className="w-3.5 h-3.5 text-success" />}
                        Latest: {node.latestStatus === "none" ? "No data" : node.latestStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {zones.length === 0 && (
        <div className="rounded-lg border border-border/70 bg-card/80 p-8 text-center text-sm text-muted-foreground">
          No zone map found for current filters.
        </div>
      )}
    </div>
  );
}

