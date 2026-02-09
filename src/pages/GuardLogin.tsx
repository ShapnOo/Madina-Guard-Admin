import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, LogIn, Smartphone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GUARD_LOGIN_DEVICE_KEY, loginGuardWithDevice } from "@/lib/guard-store";

function createLocalDeviceId() {
  if (typeof window === "undefined") return "device-local";
  const existing = window.localStorage.getItem(GUARD_LOGIN_DEVICE_KEY);
  if (existing) return existing;
  const id = `device-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(GUARD_LOGIN_DEVICE_KEY, id);
  return id;
}

export default function GuardLogin() {
  const [employeeId, setEmployeeId] = useState("GRD-001");
  const [password, setPassword] = useState("12345678");
  const [showPassword, setShowPassword] = useState(false);
  const [deviceName, setDeviceName] = useState("Guard App Device");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const deviceId = useMemo(() => createLocalDeviceId(), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    window.setTimeout(() => {
      const result = loginGuardWithDevice(employeeId, password, deviceId, deviceName.trim() || "Guard App Device");
      setLoading(false);
      if (!result.ok) {
        if (result.reason === "not-found") setError("Guard not found.");
        else if (result.reason === "invalid-password") setError("Invalid password.");
        else if (result.reason === "inactive") setError("Guard is inactive.");
        else setError(`This guard is already bound to ${result.guard.boundDeviceName || "another device"}. Ask admin to unbind.`);
        return;
      }
      const boundText = result.guard.boundDeviceId === deviceId ? "Login successful." : "Device bound successfully.";
      setSuccess(`${boundText} Guard: ${result.guard.name}`);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,hsl(var(--primary)/0.2),transparent_35%),radial-gradient(circle_at_85%_25%,hsl(var(--info)/0.14),transparent_34%),linear-gradient(165deg,hsl(210_30%_98%),hsl(210_22%_95%))] p-4 sm:p-6 items-center flex justify-center">
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border/70 bg-card/90 p-6 shadow-xl backdrop-blur space-y-4"
      >
        <div>
          <h1 className="text-xl font-bold">Guard Login</h1>
          <p className="text-xs text-muted-foreground mt-1">One guard account can be used on one device only.</p>
        </div>

        <div className="space-y-2">
          <Label>Employee ID</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="h-10 pl-9" required />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 pl-9 pr-10"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Device Name</Label>
          <div className="relative">
            <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} className="h-10 pl-9" />
          </div>
          <p className="text-[11px] text-muted-foreground">This browser device id: {deviceId}</p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-success">{success}</p>}

        <Button type="submit" className="w-full h-10" disabled={loading}>
          <LogIn className="w-4 h-4 mr-1.5" />
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </motion.form>
    </div>
  );
}

