import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin, QrCode, TimerReset, Wifi } from "lucide-react";
import { readCheckpoints, CHECKPOINT_STORAGE_KEY } from "@/lib/checkpoint-store";
import type { Checkpoint } from "@/types/guard-management";

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function CheckpointQrDisplay() {
  const { checkpointId } = useParams<{ checkpointId: string }>();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(readCheckpoints());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

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

  const checkpoint = useMemo(
    () => checkpoints.find((cp) => cp.id === checkpointId),
    [checkpoints, checkpointId],
  );

  if (!checkpoint) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="stat-card max-w-md text-center">
          <p className="text-xl font-semibold">Checkpoint Not Found</p>
          <p className="text-sm text-muted-foreground mt-2">This display link is invalid or the checkpoint was removed.</p>
        </div>
      </div>
    );
  }

  const isDynamicScanType = checkpoint.scanTypes.includes("dynamic-qr");
  const hasQr = checkpoint.scanTypes.includes("qr") || isDynamicScanType;
  const basePayload = checkpoint.qrConfig?.payload || `checkpoint:${checkpoint.id}|tag:${checkpoint.tagId}|zone:${checkpoint.zoneName}`;
  const isDynamic = checkpoint.qrConfig?.dynamic ?? checkpoint.scanTypes.includes("dynamic-qr");
  const rotateEveryMinutes = checkpoint.qrConfig?.rotateEveryMinutes || 10;
  const rotateMs = Math.max(1, rotateEveryMinutes) * 60 * 1000;
  const slot = Math.floor(now / rotateMs);
  const nextAt = Math.ceil(now / rotateMs) * rotateMs;
  const secondsLeft = Math.max(0, Math.floor((nextAt - now) / 1000));
  const cycleSeconds = Math.max(1, rotateEveryMinutes * 60);
  const passedSeconds = cycleSeconds - secondsLeft;
  const progressPercent = Math.max(0, Math.min(100, (passedSeconds / cycleSeconds) * 100));
  const payload = isDynamic ? `${basePayload}|token:${slot}` : basePayload;
  const qrSize = Math.max(420, checkpoint.qrConfig?.size || 420);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(payload)}`;

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_10%,hsl(var(--primary)/0.19),transparent_34%),radial-gradient(circle_at_82%_88%,hsl(var(--info)/0.16),transparent_36%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--secondary)/0.55))] text-foreground p-2 sm:p-3">
      <div className="max-w-[1600px] mx-auto h-full flex flex-col gap-2">
        <div className="rounded-2xl border border-border/80 bg-card/75 shadow-[0_10px_35px_hsl(var(--primary)/0.08)] backdrop-blur-md p-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[linear-gradient(145deg,hsl(var(--primary)/0.25),hsl(var(--info)/0.22))] ring-1 ring-primary/20 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Dynamic QR Display</p>
                  <h1 className="text-xl sm:text-2xl font-bold mt-0.5 leading-tight tracking-tight">{checkpoint.name}</h1>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{checkpoint.zoneName} | {checkpoint.location}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/85 px-3 py-2 min-w-[200px]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Live Clock</p>
              <p className="text-xl font-semibold mt-0.5 leading-none tracking-tight">{formatClock(now)}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-xs gap-1 bg-emerald-500/12 text-emerald-700 border-emerald-500/20">
                  <Wifi className="w-3 h-3" /> Live
                </Badge>
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {isDynamic ? `Every ${rotateEveryMinutes} Min` : "Static"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 xl:grid-cols-[1fr_270px] gap-2">
          <div className="rounded-2xl border border-border bg-card/75 shadow-[0_10px_35px_hsl(var(--primary)/0.08)] backdrop-blur-md p-2 min-h-0">
            {hasQr && isDynamicScanType ? (
              <div className="rounded-2xl border border-border bg-white p-2 flex items-center justify-center h-full min-h-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--background)/0),hsl(var(--background)/0.04)_70%)] pointer-events-none" />
                <img src={qrImageUrl} alt={`${checkpoint.name} QR`} className="max-h-full max-w-full object-contain rounded-xl relative z-10" />
              </div>
            ) : (
              <div className="rounded-2xl border border-border p-8 text-center h-full min-h-0 flex items-center justify-center">
                <div>
                  <p className="text-2xl font-semibold">Dynamic QR Not Enabled</p>
                  <p className="text-muted-foreground mt-2">This projection link is available only for checkpoints using Dynamic QR.</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card/75 shadow-[0_10px_35px_hsl(var(--primary)/0.08)] backdrop-blur-md p-2 space-y-2 min-h-0">
            <div className="rounded-xl border border-border bg-background/90 p-2.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Zone</p>
              <p className="text-base font-semibold mt-1 leading-tight">{checkpoint.zoneName}</p>
            </div>

            <div className="rounded-xl border border-border bg-background/90 p-2.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Checkpoint</p>
              <p className="text-base font-semibold mt-1 leading-tight">{checkpoint.name}</p>
            </div>

            <div className="rounded-xl border border-border bg-background/90 p-2.5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <TimerReset className="w-4 h-4" />
                <span>Next Refresh</span>
              </div>
              <p className="text-3xl font-bold mt-1 text-primary leading-none tracking-tight">{secondsLeft}s</p>
              <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden ring-1 ring-border/60">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--info)))] transition-[width] duration-700 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
