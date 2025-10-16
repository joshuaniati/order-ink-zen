import { useParams } from "react-router-dom";
import { Shop } from "@/types";
import { formatCurrency } from "@/lib/currency";
import MetricCard from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Supply = Tables<'supplies'>;
type Order = Tables<'orders'>;
type IncomeRecord = Tables<'income_records'>;

const ShopDashboard = () => {
  const { shopId } = useParams<{ shopId: Shop }>();
  const shop = shopId as Shop;

  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch supplies for this shop
        const { data: suppliesData, error: suppliesError } = await supabase
          .from('supplies')
          .select('*')
          .eq('shop', shop);

        // Fetch orders for this shop
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('shop', shop)
          .order('created_at', { ascending: false });

        // Fetch income records for this shop
        const { data: incomeData, error: incomeError } = await supabase
          .from('income_records')
          .select('*')
          .eq('shop', shop)
          .order('date', { ascending: false });

        if (suppliesError) console.error('Error fetching supplies:', suppliesError);
        if (ordersError) console.error('Error fetching orders:', ordersError);
        if (incomeError) console.error('Error fetching income:', incomeError);

        setSupplies(suppliesData || []);
        setOrders(ordersData || []);
        setIncomeRecords(incomeData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (shop) {
      fetchData();
    }
  }, [shop]);

  const pendingOrders = orders.filter(o => o.status !== "Delivered");
  const totalAmount = supplies.reduce((sum, s) => sum + (s.amount || 0), 0);

  const today = new Date().toISOString().split('T')[0];
  const todayIncome = incomeRecords
    .filter(i => i.date === today)
    .reduce((sum, i) => sum + i.net_income, 0);

  const shopColors: Record<string, string> = {
    A: "bg-blue-100 text-blue-800 border-blue-200",
    B: "bg-green-100 text-green-800 border-green-200",
    C: "bg-purple-100 text-purple-800 border-purple-200",
    All: "bg-primary text-primary-foreground border-primary",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading shop dashboard...</div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Shop not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-3xl font-bold tracking-tight">Shop {shop} Dashboard</h2>
          <Badge className={`${shopColors[shop] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            Shop {shop}
          </Badge>
        </div>
        <p className="text-muted-foreground">Quick overview and performance metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Supplies"
          value={supplies.length.toString()}
          description="Items in inventory"
          icon={Package}
          variant="default"
        />
        <MetricCard
          title="Total Amount"
          value={totalAmount.toString()}
          description="Combined quantity"
          icon={Package}
          variant="default"
        />
        <MetricCard
          title="Pending Orders"
          value={pendingOrders.length.toString()}
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
                    {item.phone_number && (
                      <p className="text-sm text-muted-foreground">{item.phone_number}</p>
                    )}
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
                    <p className="font-medium">{order.supply_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {order.delivery_date}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ordered by: {order.ordered_by}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={order.status === "Pending" ? "secondary" : "default"}>
                      {order.status}
                    </Badge>
                    <p className="text-sm font-medium mt-1">
                      {order.order_amount} units
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {supplies.length === 0 && pendingOrders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No data found</h3>
            <p className="text-muted-foreground">
              This shop doesn't have any supplies or orders yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShopDashboard;
