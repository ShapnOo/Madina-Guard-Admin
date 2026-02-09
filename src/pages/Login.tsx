import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, Lock, LogIn, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@guardwise.demo");
  const [password, setPassword] = useState("12345678");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      navigate("/");
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,hsl(var(--primary)/0.2),transparent_35%),radial-gradient(circle_at_85%_25%,hsl(var(--info)/0.14),transparent_34%),linear-gradient(165deg,hsl(210_30%_98%),hsl(210_22%_95%))] p-4 sm:p-6 items-center flex justify-center">
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-border/70 bg-card/85 shadow-2xl backdrop-blur  md:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden border-b border-border/60 p-7 sm:p-9 md:border-b-0 md:border-r"
        >
          <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute right-0 top-14 h-40 w-40 rounded-full bg-info/20 blur-3xl" />

          <div className="relative">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">GuardWise Admin</span>
            </div>

            <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              Secure Patrol Operations
              <span className="block text-primary">Command Center</span>
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Professional control panel for checkpoints, schedules, availability, and real-time patrol monitoring.
            </p>

            <div className="mt-8 space-y-2">
              {[
                "Authorized management access only",
                "Role-based dashboard and operation controls",
                "Checkpoint, schedule, and alert administration",
              ].map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 + index * 0.06 }}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background/75 px-3 py-2.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-sm text-foreground">{item}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="flex items-center justify-center p-7 sm:p-9"
        >
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to admin workspace.</p>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                  placeholder="name@company.com"
                  required
                />
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
                  className="h-11 pl-9 pr-11"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              Demo login: <span className="font-semibold text-foreground">admin@guardwise.demo / 12345678</span>
            </div>

            <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={loading}>
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
