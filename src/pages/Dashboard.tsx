import { Shop } from "@/types";
import { formatCurrency } from "@/lib/currency";
import MetricCard from "@/components/dashboard/MetricCard";
import { Package, ShoppingCart, DollarSign, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format } from 'date-fns';
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
  const [dateRange, setDateRange] = useState<'current-week' | 'last-week' | 'current-month' | 'last-month'>('current-week');

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

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (dateRange) {
      case 'current-week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'last-week':
        const lastWeek = subWeeks(now, 1);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case 'current-month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
    }

    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  const filteredSupplies = selectedShop === "All" 
    ? supplies 
    : supplies.filter(s => s.shop === selectedShop);
  
  const filteredOrders = selectedShop === "All" 
    ? orders 
    : orders.filter(o => o.shop === selectedShop);
  
  const filteredIncome = selectedShop === "All" 
    ? incomeRecords 
    : incomeRecords.filter(i => i.shop === selectedShop);

  // Filter by date range
  const rangeOrders = filteredOrders.filter(o => 
    o.order_date >= rangeStart && o.order_date <= rangeEnd
  );
  
  const rangeIncome = filteredIncome.filter(i => 
    i.date >= rangeStart && i.date <= rangeEnd
  );

  const pendingOrders = filteredOrders.filter(o => o.status === "Pending");
  
  const today = new Date().toISOString().split('T')[0];
  const todayIncome = filteredIncome
    .filter(i => i.date === today)
    .reduce((sum, i) => sum + Number(i.net_income), 0);

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

  // Get weekly budget for date range
  const filteredBudgets = selectedShop === "All" 
    ? weeklyBudgets 
    : weeklyBudgets.filter(b => b.shop === selectedShop);

  // Calculate total budget for the date range
  const rangeBudgets = filteredBudgets.filter(
    b => b.week_start_date >= rangeStart && b.week_start_date <= rangeEnd
  );
  
  const weeklyBudgetAmount = rangeBudgets.reduce((sum, b) => sum + Number(b.budget_amount || 0), 0);

  // Calculate order metrics for date range
  const totalOrderAmount = rangeOrders.reduce(
    (sum, o) => sum + (Number(o.order_amount) || 0), 0
  );

  const totalDelivered = rangeOrders.reduce(
    (sum, o) => sum + (Number(o.amount_delivered) || 0), 0
  );

  // Calculate budget savings (difference when delivered < ordered)
  const budgetSavings = rangeOrders.reduce((sum, o) => {
    const ordered = Number(o.order_amount) || 0;
    const delivered = Number(o.amount_delivered) || 0;
    return sum + Math.max(0, ordered - delivered);
  }, 0);

  // Calculate cash-up metrics
  const totalCashUpIncome = rangeIncome.reduce((sum, i) => sum + Number(i.daily_income), 0);
  const totalExpenses = rangeIncome.reduce((sum, i) => sum + Number(i.expenses), 0);
  const netIncome = rangeIncome.reduce((sum, i) => sum + Number(i.net_income), 0);
  const netDifference = totalCashUpIncome - totalOrderAmount;
  
  // Count missing cash-up days
  const daysInRange = Math.ceil((new Date(rangeEnd).getTime() - new Date(rangeStart).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Get unique shops to count expected records
  const shopsToCheck = selectedShop === "All" 
    ? Array.from(new Set([...supplies.map(s => s.shop), ...orders.map(o => o.shop), ...incomeRecords.map(i => i.shop)]))
    : [selectedShop];
  
  const expectedCashUpRecords = daysInRange * shopsToCheck.length;
  const actualCashUpRecords = rangeIncome.length;
  const missingCashUpDays = Math.max(0, expectedCashUpRecords - actualCashUpRecords);

  const budgetRemaining = weeklyBudgetAmount - totalOrderAmount;
  const availableBudget = budgetRemaining + budgetSavings;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  const dateRangeLabel = {
    'current-week': 'Current Week',
    'last-week': 'Last Week',
    'current-month': 'Current Month',
    'last-month': 'Last Month'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of {selectedShop === "All" ? "all shops" : `Shop ${selectedShop}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-week">Current Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="current-month">Current Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Budget"
          value={formatCurrency(weeklyBudgetAmount)}
          description={weeklyBudgetAmount > 0 ? dateRangeLabel[dateRange] : "Not set"}
          icon={DollarSign}
          variant="default"
        />
        <MetricCard
          title="Orders Placed"
          value={formatCurrency(totalOrderAmount)}
          description={weeklyBudgetAmount > 0 && totalOrderAmount > weeklyBudgetAmount ? "⚠️ Over budget!" : `${rangeOrders.length} orders`}
          icon={ShoppingCart}
          variant={weeklyBudgetAmount > 0 && totalOrderAmount > weeklyBudgetAmount ? "destructive" : "default"}
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
          variant={availableBudget >= 0 ? "success" : "destructive"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Daily Income"
          value={formatCurrency(totalCashUpIncome)}
          description={`${actualCashUpRecords} records in ${dateRangeLabel[dateRange]}`}
          icon={DollarSign}
          variant="default"
        />
        <MetricCard
          title="Expenses"
          value={formatCurrency(totalExpenses)}
          description={dateRangeLabel[dateRange]}
          icon={TrendingDown}
          variant="default"
        />
        <MetricCard
          title="Net Difference"
          value={formatCurrency(netDifference)}
          description="Income - Orders"
          icon={TrendingUp}
          variant={netDifference >= 0 ? "success" : "destructive"}
        />
        <MetricCard
          title="Missing Cash-Ups"
          value={missingCashUpDays.toString()}
          description={missingCashUpDays > 0 ? "⚠️ Action needed" : "All complete"}
          icon={Calendar}
          variant={missingCashUpDays > 0 ? "warning" : "success"}
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
          description="Daily performance"
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
