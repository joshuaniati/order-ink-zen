import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useOutletContext } from "react-router-dom";
import MainLayout from "./pages/MainLayout";
import Dashboard from "./pages/Dashboard";
import Supplies from "./pages/Supplies";
import Orders from "./pages/Orders";
import CashUp from "./pages/CashUp";
import Analytics from "./pages/Analytics";
import ShopDashboard from "./pages/ShopDashboard";
import NotFound from "./pages/NotFound";
import { Shop } from "./types";

const queryClient = new QueryClient();

// Hook to access shop context
export const useShop = () => {
  return useOutletContext<{ selectedShop: Shop }>();
};

const DashboardWrapper = () => {
  const { selectedShop } = useShop();
  return <Dashboard selectedShop={selectedShop} />;
};

const SuppliesWrapper = () => {
  const { selectedShop } = useShop();
  return <Supplies selectedShop={selectedShop} />;
};

const OrdersWrapper = () => {
  const { selectedShop } = useShop();
  return <Orders selectedShop={selectedShop} />;
};

const CashUpWrapper = () => {
  const { selectedShop } = useShop();
  return <CashUp selectedShop={selectedShop} />;
};

const AnalyticsWrapper = () => {
  const { selectedShop } = useShop();
  return <Analytics selectedShop={selectedShop} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardWrapper />} />
            <Route path="supplies" element={<SuppliesWrapper />} />
            <Route path="orders" element={<OrdersWrapper />} />
            <Route path="cash-up" element={<CashUpWrapper />} />
            <Route path="analytics" element={<AnalyticsWrapper />} />
            <Route path="shop/:shopId" element={<ShopDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
