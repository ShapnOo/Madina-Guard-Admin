import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Shield,
  MapPin,
  Navigation,
  Calendar,
  BarChart3,
  Users,
  BellRing,
  ChevronRight,
  ChevronDown,
  Bell,
  User,
  Sparkles,
  ShieldCheck,
  Dot,
  FileText,
  AlertTriangle,
  History,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const reportSubItems = [
  { title: "Guard-wise Patrol", url: "/reports/guard-wise", icon: FileText },
  { title: "Location-wise Visit", url: "/reports/location-wise", icon: MapPin },
  { title: "Late & Missed", url: "/reports/late-missed", icon: AlertTriangle },
];

const scheduleSubItems = [
  { title: "Schedule List", url: "/schedules", icon: Calendar },
];

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Guards", url: "/guards", icon: Shield },
  { title: "Zones", url: "/zones", icon: MapPin },
  { title: "Checkpoints", url: "/checkpoints", icon: Navigation },
  { title: "Schedules", url: "/schedules", icon: Calendar, children: scheduleSubItems },
  { title: "Reports", url: "/reports", icon: BarChart3, children: reportSubItems },
  { title: "Users", url: "/users", icon: Users },
  { title: "Alerts", url: "/alerts", icon: BellRing },
  { title: "Audit Trail", url: "/audit-trail", icon: History },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const collapsed = false;
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "/reports": false,
    "/schedules": false,
  });
  const location = useLocation();
  const activeSubItem = [...reportSubItems, ...scheduleSubItems].find((item) => item.url === location.pathname);
  const activeItem = navItems.find((item) =>
    item.children ? location.pathname.startsWith(item.url) : item.url === location.pathname,
  );
  const pageTitle = activeSubItem?.title || activeItem?.title || "Overview";

  const handleLogout = () => {
    navigate("/login");
  };

  useEffect(() => {
    if (location.pathname.startsWith("/reports")) {
      setOpenMenus((prev) => ({ ...prev, "/reports": true }));
    }
    if (location.pathname.startsWith("/schedules")) {
      setOpenMenus((prev) => ({ ...prev, "/schedules": true }));
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full bg-[hsl(var(--background))]">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 88 : 280 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-sidebar-border overflow-hidden"
        style={{ background: "var(--gradient-sidebar)" }}
      >
        <div className="absolute -top-24 -left-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

        {/* Brand */}
        <div className="relative flex items-center h-20 px-4 border-b border-sidebar-border/70">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-sidebar-primary/95 flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldCheck className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <h1 className="text-[15px] font-bold text-sidebar-accent-foreground tracking-tight">GuardWise</h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Dot className="w-4 h-4 -ml-1 text-emerald-400" />
                    <p className="text-[10px] text-sidebar-foreground uppercase tracking-[0.2em]">Admin Console</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.22em] text-sidebar-foreground/70">
              Main Navigation
            </p>
          )}
          {navItems.map((item) => {
            const isActive = item.children
              ? location.pathname.startsWith(item.url)
              : location.pathname === item.url;
            return (
              <div key={item.url} className="space-y-1">
                {item.children && !collapsed ? (
                  <div className="flex items-center gap-1">
                    <NavLink
                      to={item.children[0].url}
                      className={`relative flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                        ${isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/15"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground"
                        }
                      `}
                      activeClassName=""
                    >
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-white/90" />}
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? "bg-white/15" : "bg-white/5 group-hover:bg-white/10"}`}>
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                      </div>
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        className="whitespace-nowrap"
                      >
                        {item.title}
                      </motion.span>
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => setOpenMenus((prev) => ({ ...prev, [item.url]: !prev[item.url] }))}
                      className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground"
                      }`}
                      title={openMenus[item.url] ? "Collapse Menu" : "Expand Menu"}
                    >
                      {openMenus[item.url] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <NavLink
                    to={item.children ? item.children[0].url : item.url}
                    end={!item.children}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                      ${isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/15"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground"
                      }
                    `}
                    activeClassName=""
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-white/90" />}
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? "bg-white/15" : "bg-white/5 group-hover:bg-white/10"}`}>
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                    </div>
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          className="whitespace-nowrap"
                        >
                          {item.title}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                )}

                {!collapsed && item.children && openMenus[item.url] && (
                  <div className="ml-12 space-y-1">
                    {item.children.map((subItem) => {
                      const isSubActive = location.pathname === subItem.url;
                      return (
                        <NavLink
                          key={subItem.url}
                          to={subItem.url}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            isSubActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <subItem.icon className="w-3.5 h-3.5" />
                          <span>{subItem.title}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="px-3 pb-2">
            <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/60 p-3">
              <div className="flex items-center gap-2 text-sidebar-accent-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold">Powered by Pakiza Software Limited</p>
              </div>
             
            </div>
          </div>
        )}

      </motion.aside>

      {/* Main Content */}
      <motion.div
        animate={{ marginLeft: collapsed ? 88 : 280 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="flex-1 flex flex-col min-h-screen"
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/75 backdrop-blur-xl border-b border-border/70 px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>GuardWise</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span>Admin</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground font-medium">{pageTitle}</span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">Security Operations Workspace</p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/85 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              <button className="relative p-2.5 rounded-xl border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:bg-background transition-colors">
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
              </button>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background/85 px-2.5 py-1.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-foreground leading-none">Admin</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-none">Madina Group</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
}
