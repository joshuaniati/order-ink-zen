import { Shop } from "@/types";
import { formatCurrency } from "@/lib/currency";
import MetricCard from "@/components/dashboard/MetricCard";
import { Package, ShoppingCart, DollarSign, TrendingUp, Calendar, Truck, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from 'react';
import type { Tables } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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

  // Get previous week's start and end dates
  const getPreviousWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const currentWeekStartDiff = now.getDate() - day + (day === 0 ? -6 : 1);
    
    const previousWeekStart = new Date(now);
    previousWeekStart.setDate(currentWeekStartDiff - 7);
    previousWeekStart.setHours(0, 0, 0, 0);
    
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekStart.getDate() + 6);
    previousWeekEnd.setHours(23, 59, 59, 999);
    
    return {
      start: previousWeekStart.toISOString().split('T')[0],
      end: previousWeekEnd.toISOString().split('T')[0]
    };
  };

  const currentWeekStart = getCurrentWeekStart();
  const previousWeekRange = getPreviousWeekRange();

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

  // Calculate delivered vs pending for current week orders
  const currentWeekDelivered = currentWeekOrders.filter(
    o => o.status === "Delivered" || (o.delivery_date && o.delivery_date <= today)
  );

  const currentWeekDeliveredAmount = currentWeekDelivered.reduce(
    (sum, o) => sum + (Number(o.amount_delivered) || Number(o.order_amount) || 0), 0
  );

  const currentWeekPending = currentWeekOrders.filter(
    o => o.status !== "Delivered" && (!o.delivery_date || o.delivery_date > today)
  );

  const currentWeekPendingAmount = currentWeekPending.reduce(
    (sum, o) => sum + (Number(o.order_amount) || 0), 0
  );

  // Calculate previous week orders delivered this week
  const previousWeekOrdersDeliveredThisWeek = filteredOrders.filter(
    o => {
      const orderDate = o.order_date;
      const isPreviousWeekOrder = orderDate >= previousWeekRange.start && orderDate <= previousWeekRange.end;
      
      let isDeliveredThisWeek = false;
      
      if (o.delivery_date) {
        isDeliveredThisWeek = o.delivery_date >= currentWeekStart;
      } else {
        const lastUpdated = o.updated_at || o.created_at;
        isDeliveredThisWeek = o.status === "Delivered" && lastUpdated >= currentWeekStart;
      }
      
      return isPreviousWeekOrder && isDeliveredThisWeek;
    }
  );

  const previousWeekOrdersDeliveredAmount = previousWeekOrdersDeliveredThisWeek.reduce(
    (sum, o) => sum + (Number(o.amount_delivered) || Number(o.order_amount) || 0), 0
  );

  // Calculate budget metrics
  const budgetSavings = currentWeekOrders.reduce((sum, o) => {
    const ordered = Number(o.order_amount) || 0;
    const delivered = Number(o.amount_delivered) || 0;
    return sum + Math.max(0, ordered - delivered);
  }, 0);

  const weeklyBudgetAmount = currentWeekBudget?.budget_amount || 0;
  const budgetRemaining = weeklyBudgetAmount - totalOrderAmount;
  const availableBudget = budgetRemaining + budgetSavings;

  // Overall Delivery Summary Calculations
  const totalDeliveredAll = currentWeekDeliveredAmount + previousWeekOrdersDeliveredAmount;
  const stillAwaitingDelivery = filteredOrders.filter(o => 
    o.status !== "Delivered" && (!o.delivery_date || o.delivery_date > today)
  );
  const stillAwaitingDeliveryAmount = stillAwaitingDelivery.reduce(
    (sum, o) => sum + (Number(o.order_amount) || 0), 0
  );

  // Navigation handlers
  const handleNavigateToBudget = () => {
    navigate('/orders');
  };

  const handleNavigateToOrders = () => {
    navigate('/orders');
  };

  const handleNavigateToSupplies = () => {
    navigate('/supplies');
  };

  const handleNavigateToIncome = () => {
    navigate('/income');
  };

  const handleNavigateToPendingOrders = () => {
    navigate('/orders');
  };

  const handleNavigateToInventory = () => {
    navigate('/supplies');
  };

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

      {/* Budget Overview Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div onClick={handleNavigateToBudget} className="cursor-pointer">
          <MetricCard
            title="Weekly Budget"
            value={formatCurrency(weeklyBudgetAmount)}
            description={currentWeekBudget ? "Current week" : "Not set"}
            icon={DollarSign}
            variant="default"
          />
        </div>
        <div onClick={handleNavigateToOrders} className="cursor-pointer">
          <MetricCard
            title="Orders Placed"
            value={formatCurrency(totalOrderAmount)}
            description="This week's spending"
            icon={ShoppingCart}
            variant="default"
          />
        </div>
        <div onClick={handleNavigateToOrders} className="cursor-pointer">
          <MetricCard
            title="Budget Savings"
            value={formatCurrency(budgetSavings)}
            description="From partial deliveries"
            icon={TrendingUp}
            variant="success"
          />
        </div>
        <div onClick={handleNavigateToBudget} className="cursor-pointer">
          <MetricCard
            title="Available Budget"
            value={formatCurrency(availableBudget)}
            description={`Remaining: ${formatCurrency(budgetRemaining)}`}
            icon={DollarSign}
            variant={availableBudget >= 0 ? "success" : "warning"}
          />
        </div>
      </div>

      {/* This Week's Orders Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            This Week's Orders
          </CardTitle>
          <CardDescription>
            Breakdown of orders placed and delivered during the current week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div onClick={handleNavigateToOrders} className="cursor-pointer">
              <MetricCard
                title="Orders Placed This Week"
                value={formatCurrency(totalOrderAmount)}
                description={`${currentWeekOrders.length} orders`}
                icon={ShoppingCart}
                variant="default"
              />
            </div>
            <div onClick={handleNavigateToOrders} className="cursor-pointer">
              <MetricCard
                title="Delivered This Week"
                value={formatCurrency(currentWeekDeliveredAmount)}
                description={`${currentWeekDelivered.length} orders`}
                icon={CheckCircle}
                variant="success"
              />
            </div>
            <div onClick={handleNavigateToOrders} className="cursor-pointer">
              <MetricCard
                title="Remaining (Not Delivered)"
                value={formatCurrency(currentWeekPendingAmount)}
                description={`${currentWeekPending.length} orders pending`}
                icon={Clock}
                variant="warning"
              />
            </div>
            <div onClick={handleNavigateToOrders} className="cursor-pointer">
              <MetricCard
                title="Prev Week → This Week"
                value={formatCurrency(previousWeekOrdersDeliveredAmount)}
                description={`${previousWeekOrdersDeliveredThisWeek.length} orders`}
                icon={Truck}
                variant="success"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Delivery Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Overall Delivery Summary
          </CardTitle>
          <CardDescription>
            Combined totals across all time periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div onClick={handleNavigateToOrders} className="cursor-pointer">
              <MetricCard
                title="Total Delivered (All)"
                value={formatCurrency(totalDeliveredAll)}
                description="This week + Previous week deliveries"
                icon={CheckCircle}
                variant="success"
              />
            </div>
            <div onClick={handleNavigateToPendingOrders} className="cursor-pointer">
              <MetricCard
                title="Still Awaiting Delivery"
                value={formatCurrency(stillAwaitingDeliveryAmount)}
                description={`${stillAwaitingDelivery.length} orders pending`}
                icon={Clock}
                variant="warning"
              />
            </div>
            <div onClick={handleNavigateToOrders} className="cursor-pointer">
              <MetricCard
                title="Grand Total Ordered"
                value={formatCurrency(totalOrderAmount)}
                description="This week's total spending"
                icon={ShoppingCart}
                variant="default"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div onClick={handleNavigateToSupplies} className="cursor-pointer">
          <MetricCard
            title="Total Supplies"
            value={filteredSupplies.length.toString()}
            description="Items in inventory"
            icon={Package}
            variant="default"
          />
        </div>
        <div onClick={handleNavigateToPendingOrders} className="cursor-pointer">
          <MetricCard
            title="Pending Orders"
            value={pendingOrders.length.toString()}
            description="All orders awaiting delivery"
            icon={ShoppingCart}
            variant="warning"
          />
        </div>
        <div onClick={handleNavigateToIncome} className="cursor-pointer">
          <MetricCard
            title="Today's Net Income"
            value={formatCurrency(todayIncome)}
            description={`Weekly: ${formatCurrency(weeklyIncome)}`}
            icon={todayIncome >= 0 ? TrendingUp : DollarSign}
            variant={todayIncome >= 0 ? "success" : "destructive"}
          />
        </div>
        <div onClick={handleNavigateToInventory} className="cursor-pointer">
          <MetricCard
            title="Inventory Value"
            value={formatCurrency(filteredSupplies.reduce((sum, s) => sum + (s.amount || 0), 0))}
            description="Total supply amount"
            icon={Package}
            variant="default"
          />
        </div>
      </div>

      {/* Supplies Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <div onClick={handleNavigateToSupplies} className="cursor-pointer">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Inventory Summary</CardTitle>
              <CardDescription>Total supplies and value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Items:</span>
                  <span className="text-sm">{filteredSupplies.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Value:</span>
                  <span className="text-sm">{formatCurrency(filteredSupplies.reduce((sum, s) => sum + (s.amount || 0), 0))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div onClick={handleNavigateToSupplies} className="cursor-pointer">
          <Card className="hover:shadow-md transition-shadow">
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
    </div>
  );
};

export default Dashboard;
