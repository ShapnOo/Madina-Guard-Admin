import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import Dashboard from "@/pages/Dashboard";
import Guards from "@/pages/Guards";
import Zones from "@/pages/Zones";
import Checkpoints from "@/pages/Checkpoints";
import Schedules from "@/pages/Schedules";
import ScheduleBulkCreate from "@/pages/ScheduleBulkCreate";
import Reports from "@/pages/Reports";
import ReportsGuardWise from "@/pages/ReportsGuardWise";
import ReportsLocationWise from "@/pages/ReportsLocationWise";
import ReportsLateMissed from "@/pages/ReportsLateMissed";
import UserManagement from "@/pages/UserManagement";
import Alerts from "@/pages/Alerts";
import AuditTrail from "@/pages/AuditTrail";
import Login from "@/pages/Login";
import CheckpointQrDisplay from "@/pages/CheckpointQrDisplay";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/guards" element={<Guards />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="/checkpoints" element={<Checkpoints />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/schedules/new" element={<ScheduleBulkCreate />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/guard-wise" element={<ReportsGuardWise />} />
            <Route path="/reports/location-wise" element={<ReportsLocationWise />} />
            <Route path="/reports/late-missed" element={<ReportsLateMissed />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/audit-trail" element={<AuditTrail />} />
          </Route>
          <Route path="/checkpoint-display/:checkpointId" element={<CheckpointQrDisplay />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
