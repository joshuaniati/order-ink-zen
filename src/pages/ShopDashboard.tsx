import { Shop } from "@/types";
import { formatCurrency } from "@/lib/currency";
import MetricCard from "@/components/dashboard/MetricCard";
import { Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from 'react';
import type { Tables } from "@/integrations/supabase/types";

interface DashboardProps {
  selectedShop: Shop;
}

type Supply = Tables<'supplies'>;
type Order = Tables<'orders'>;
type IncomeRecord = Tables<'income_records'>;

const Dashboard = ({ selectedShop }: DashboardProps) => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch supplies
      const { data: suppliesData, error: suppliesError } = await supabase
        .from('supplies')
        .select('*');
      
      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*');
      
      // Fetch income records
      const { data: incomeData, error: incomeError } = await supabase
        .from('income_records')
        .select('*');

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

  useEffect(() => {
    fetchData();
  }, []);

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
  const pendingOrders = filteredOrders.filter(o => o.status === "Pending");
  
  // Today's income
  const today = new Date().toISOString().split('T')[0];
  const todayIncome = filteredIncome
    .filter(i => i.date === today)
    .reduce((sum, i) => sum + i.net_income, 0);

  // Weekly income
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyIncome = filteredIncome
    .filter(i => new Date(i.date) >= weekAgo)
    .reduce((sum, i) => sum + i.net_income, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

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
          value={filteredSupplies.length.toString()}
          description="Items in inventory"
          icon={Package}
          variant="default"
        />
        <MetricCard
          title="Total Amount"
          value={filteredSupplies.reduce((sum, s) => sum + (s.amount || 0), 0).toString()}
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
              Total amount: {filteredSupplies.reduce((sum, s) => sum + (s.amount || 0), 0)}
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
