import { Shop } from "@/types";
import { getSupplies, getOrders, getIncomeRecords } from "@/lib/storage";
import { formatCurrency } from "@/lib/currency";
import MetricCard from "@/components/dashboard/MetricCard";
import { Package, ShoppingCart, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardProps {
  selectedShop: Shop;
}

const Dashboard = ({ selectedShop }: DashboardProps) => {
  const supplies = getSupplies();
  const orders = getOrders();
  const incomeRecords = getIncomeRecords();

  // Filter by shop
  const filteredSupplies = selectedShop === "All" 
    ? supplies 
    : supplies.filter(s => s.shop === selectedShop);
  
  const filteredOrders = selectedShop === "All" 
    ? orders 
    : orders.filter(o => o.shop === selectedShop);
  
  const filteredIncome = selectedShop === "All" 
    ? incomeRecords 
    : incomeRecords.filter(i => i.shop === selectedShop);

  // Calculate metrics
  const lowStockItems = filteredSupplies.filter(s => s.currentStock <= s.minStockLevel);
  const pendingOrders = filteredOrders.filter(o => o.status === "Pending");
  const stockValue = filteredSupplies.reduce((sum, s) => sum + (s.currentStock * s.pricePerUnit), 0);
  
  // Today's income
  const today = new Date().toISOString().split('T')[0];
  const todayIncome = filteredIncome
    .filter(i => i.date === today)
    .reduce((sum, i) => sum + i.netIncome, 0);

  // Weekly income
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyIncome = filteredIncome
    .filter(i => new Date(i.date) >= weekAgo)
    .reduce((sum, i) => sum + i.netIncome, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of {selectedShop === "All" ? "all shops" : `Shop ${selectedShop}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Supplies"
          value={filteredSupplies.length}
          description="Items in inventory"
          icon={Package}
          variant="default"
        />
        <MetricCard
          title="Low Stock Alerts"
          value={lowStockItems.length}
          description="Items need reordering"
          icon={AlertTriangle}
          variant={lowStockItems.length > 0 ? "warning" : "default"}
        />
        <MetricCard
          title="Pending Orders"
          value={pendingOrders.length}
          description="Awaiting delivery"
          icon={ShoppingCart}
          variant="default"
        />
        <MetricCard
          title="Today's Net Income"
          value={formatCurrency(todayIncome)}
          description={`Weekly: ${formatCurrency(weeklyIncome)}`}
          icon={todayIncome >= 0 ? TrendingUp : DollarSign}
          variant={todayIncome >= 0 ? "success" : "destructive"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock Value</CardTitle>
            <CardDescription>Total value of current inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stockValue)}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {filteredSupplies.length} unique items
            </p>
          </CardContent>
        </Card>

        {lowStockItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>Items requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.currentStock} {item.unit}
                    </span>
                  </div>
                ))}
                {lowStockItems.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{lowStockItems.length - 3} more items
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
