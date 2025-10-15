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
  const lowStockItems: any[] = []; // Removed low stock tracking as Supply no longer has minStockLevel
  const pendingOrders = filteredOrders.filter(o => o.status === "Pending");
  const stockValue = 0; // Removed stock value calculation as Supply no longer has pricePerUnit
  
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
          title="Total Amount"
          value={filteredSupplies.reduce((sum, s) => sum + s.amount, 0)}
          description="Combined quantity"
          icon={Package}
          variant="default"
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
            <CardTitle>Total Supplies</CardTitle>
            <CardDescription>Inventory summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredSupplies.length}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Total amount: {filteredSupplies.reduce((sum, s) => sum + s.amount, 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Supplies</CardTitle>
            <CardDescription>Latest inventory items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredSupplies.slice(0, 5).map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    {item.amount}
                  </span>
                </div>
              ))}
              {filteredSupplies.length === 0 && (
                <p className="text-sm text-muted-foreground">No supplies yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
