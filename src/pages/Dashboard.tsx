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

type WeeklyBudget = Tables<'weekly_budgets'>;

const Dashboard = ({ selectedShop }: DashboardProps) => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [weeklyBudgets, setWeeklyBudgets] = useState<WeeklyBudget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [suppliesResponse, ordersResponse, incomeResponse, budgetsResponse] = await Promise.all([
        supabase.from('supplies').select('*'),
        supabase.from('orders').select('*'),
        supabase.from('income_records').select('*'),
        supabase.from('weekly_budgets').select('*')
      ]);

      if (suppliesResponse.error) throw suppliesResponse.error;
      if (ordersResponse.error) throw ordersResponse.error;
      if (incomeResponse.error) throw incomeResponse.error;
      if (budgetsResponse.error) throw budgetsResponse.error;

      setSupplies(suppliesResponse.data || []);
      setOrders(ordersResponse.data || []);
      setIncomeRecords(incomeResponse.data || []);
      setWeeklyBudgets(budgetsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSupplies = selectedShop === "All" 
    ? supplies 
    : supplies.filter(s => s.shop === selectedShop);
  
  const filteredOrders = selectedShop === "All" 
    ? orders 
    : orders.filter(o => o.shop === selectedShop);
  
  const filteredIncome = selectedShop === "All" 
    ? incomeRecords 
    : incomeRecords.filter(i => i.shop === selectedShop);

  const pendingOrders = filteredOrders.filter(o => o.status === "Pending");
  
  const today = new Date().toISOString().split('T')[0];
  const todayIncome = filteredIncome
    .filter(i => i.date === today)
    .reduce((sum, i) => sum + i.net_income, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyIncome = filteredIncome
    .filter(i => new Date(i.date) >= weekAgo)
    .reduce((sum, i) => sum + i.net_income, 0);

  // Get current week's start date (Monday)
  const getCurrentWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  };

  const currentWeekStart = getCurrentWeekStart();

  // Get weekly budget for current week and shop
  const filteredBudgets = selectedShop === "All" 
    ? weeklyBudgets 
    : weeklyBudgets.filter(b => b.shop === selectedShop);

  const currentWeekBudget = filteredBudgets.find(
    b => b.week_start_date === currentWeekStart
  );

  // Calculate order metrics for current week
  const currentWeekOrders = filteredOrders.filter(
    o => o.order_date >= currentWeekStart
  );

  const totalOrderAmount = currentWeekOrders.reduce(
    (sum, o) => sum + (Number(o.order_amount) || 0), 0
  );

  const totalDelivered = currentWeekOrders.reduce(
    (sum, o) => sum + (Number(o.amount_delivered) || 0), 0
  );

  // Calculate budget savings (difference when delivered < ordered)
  const budgetSavings = currentWeekOrders.reduce((sum, o) => {
    const ordered = Number(o.order_amount) || 0;
    const delivered = Number(o.amount_delivered) || 0;
    return sum + Math.max(0, ordered - delivered);
  }, 0);

  const weeklyBudgetAmount = currentWeekBudget?.budget_amount || 0;
  const budgetRemaining = weeklyBudgetAmount - totalOrderAmount;
  const availableBudget = budgetRemaining + budgetSavings;

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
          title="Weekly Budget"
          value={formatCurrency(weeklyBudgetAmount)}
          description={currentWeekBudget ? "Current week" : "Not set"}
          icon={DollarSign}
          variant="default"
        />
        <MetricCard
          title="Orders Placed"
          value={formatCurrency(totalOrderAmount)}
          description="This week's spending"
          icon={ShoppingCart}
          variant="default"
        />
        <MetricCard
          title="Expected Delivery"
          value={formatCurrency(totalDelivered)}
          description="Amount to be delivered"
          icon={Package}
          variant="default"
        />
        <MetricCard
          title="Available Budget"
          value={formatCurrency(availableBudget)}
          description={`Savings: ${formatCurrency(budgetSavings)}`}
          icon={TrendingUp}
          variant={availableBudget >= 0 ? "success" : "warning"}
        />
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
        <MetricCard
          title="Budget Savings"
          value={formatCurrency(budgetSavings)}
          description="Undelivered amounts"
          icon={DollarSign}
          variant="success"
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
