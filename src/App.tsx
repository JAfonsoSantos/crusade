import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Pipeline from "./pages/Pipeline";
import Deals from "./pages/Deals";
import Spaces from "./pages/Spaces";
import Campaigns from "./pages/Campaigns";
import Forecast from "./pages/Forecast";
import Integrations from "./pages/Integrations";
import PersonalSettings from "./pages/PersonalSettings";
import BusinessSettings from "./pages/BusinessSettings";
import DemoSite from "./pages/DemoSite";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="deals" element={<Deals />} />
            <Route path="spaces" element={<Spaces />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="forecast" element={<Forecast />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="demo-site" element={<DemoSite />} />
            <Route path="personal-settings" element={<PersonalSettings />} />
            <Route path="business-settings" element={<BusinessSettings />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
