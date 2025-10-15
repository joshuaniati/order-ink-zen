import { useParams } from "react-router-dom";
import { Shop } from "@/types";
import { getSupplies, getOrders, getIncomeRecords } from "@/lib/storage";
import { formatCurrency } from "@/lib/currency";
import MetricCard from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";

const ShopDashboard = () => {
  const { shopId } = useParams<{ shopId: Shop }>();
  const shop = shopId as Shop;

  const supplies = getSupplies().filter(s => s.shop === shop);
  const orders = getOrders().filter(o => o.shop === shop);
  const incomeRecords = getIncomeRecords().filter(i => i.shop === shop);

  const lowStockItems: any[] = []; // Removed as Supply no longer has minStockLevel
  const pendingOrders = orders.filter(o => o.status !== "Delivered");
  const totalAmount = supplies.reduce((sum, s) => sum + s.amount, 0);

  const today = new Date().toISOString().split('T')[0];
  const todayIncome = incomeRecords
    .filter(i => i.date === today)
    .reduce((sum, i) => sum + i.netIncome, 0);

  const shopColors: Record<string, string> = {
    A: "shop-a",
    B: "shop-b",
    C: "shop-c",
    All: "primary",
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-3xl font-bold tracking-tight">Shop {shop} Dashboard</h2>
          <Badge className={`bg-${shopColors[shop]}`}>Shop {shop}</Badge>
        </div>
        <p className="text-muted-foreground">Quick overview and performance metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Supplies"
          value={supplies.length}
          description="Items in inventory"
          icon={Package}
          variant="default"
        />
        <MetricCard
          title="Total Amount"
          value={totalAmount}
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
          title="Today's Income"
          value={formatCurrency(todayIncome)}
          description="Net profit today"
          icon={DollarSign}
          variant={todayIncome >= 0 ? "success" : "destructive"}
        />
      </div>

      {supplies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Supplies</CardTitle>
            <CardDescription>Latest inventory items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supplies.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{item.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {item.amount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Deliveries</CardTitle>
            <CardDescription>Orders awaiting delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{order.supplyName}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {order.deliveryDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={order.status === "Pending" ? "secondary" : "default"}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShopDashboard;
