import { useState, useEffect } from "react";
import { Shop, OrderStatus } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { WeeklyBudgetCard } from "@/components/orders/WeeklyBudgetCard";
import { WeeklyBudgetReport } from "@/components/orders/WeeklyBudgetReport";

interface OrdersProps {
  selectedShop: Shop;
}

type Order = Tables<'orders'>;
type Supply = Tables<'supplies'>;
type WeeklyBudget = Tables<'weekly_budgets'>;

const Orders = ({ selectedShop }: OrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [weeklyBudgets, setWeeklyBudgets] = useState<WeeklyBudget[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWeekSelectOpen, setIsWeekSelectOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    supply_id: "",
    order_date: today,
    ordered_by: "",
    contact_person: "",
    order_amount: 0,
    amount_delivered: 0,
    delivery_date: "",
    shop: "",
    notes: "",
  });

  // Function to get Monday of the current week
  const getMonday = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(date.setDate(diff));
  };

  // Function to get Sunday of the current week
  const getSunday = (date: Date) => {
    const monday = getMonday(new Date(date));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday;
  };

  // Function to format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Function to get week range string
  const getWeekRangeString = (monday: Date, sunday: Date) => {
    return `${formatDate(monday)} to ${formatDate(sunday)}`;
  };

  // Initialize selected week to current week
  useEffect(() => {
    const monday = getMonday(new Date());
    const sunday = getSunday(new Date());
    setSelectedWeek(getWeekRangeString(monday, sunday));
    
    // Show week selection popup on first load
    const hasSeenPopup = localStorage.getItem('hasSeenWeekPopup');
    if (!hasSeenPopup) {
      setIsWeekSelectOpen(true);
      localStorage.setItem('hasSeenWeekPopup', 'true');
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [ordersResponse, suppliesResponse, budgetsResponse] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('supplies').select('*'),
        supabase.from('weekly_budgets').select('*')
      ]);

      if (ordersResponse.error) throw ordersResponse.error;
      if (suppliesResponse.error) throw suppliesResponse.error;
      if (budgetsResponse.error) throw budgetsResponse.error;

      setOrders(ordersResponse.data || []);
      setSupplies(suppliesResponse.data || []);
      setWeeklyBudgets(budgetsResponse.data || []);

      const uniqueShops = [...new Set(suppliesResponse.data?.map(s => s.shop).filter(Boolean) || [])];
      setShops(uniqueShops);
      
      if (uniqueShops.length > 0 && !formData.shop) {
        setFormData(prev => ({ ...prev, shop: uniqueShops[0] }));
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get current week's Monday date from selected week string
  const getCurrentWeekMonday = () => {
    if (selectedWeek) {
      return selectedWeek.split(' to ')[0];
    }
    return formatDate(getMonday(new Date()));
  };

  // Filter orders based on selected shop AND selected week
  const filteredOrders = (selectedShop === "All" ? orders : orders.filter(o => o.shop === selectedShop))
    .filter(order => {
      if (!selectedWeek) return true;
      
      const orderDate = new Date(order.order_date);
      const weekMonday = new Date(getCurrentWeekMonday());
      const weekSunday = getSunday(weekMonday);
      
      return orderDate >= weekMonday && orderDate <= weekSunday;
    });

  // Calculate current week's spending for SELECTED SHOP ONLY
  const calculateCurrentWeekSpending = () => {
    const weekMonday = new Date(getCurrentWeekMonday());
    const weekSunday = getSunday(weekMonday);
    
    let weekOrders: Order[] = [];
    
    if (selectedShop === "All") {
      // For "All" shops, include all orders from all shops for the week
      weekOrders = orders.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate >= weekMonday && orderDate <= weekSunday;
      });
    } else {
      // For specific shop, only include orders from that shop for the week
      weekOrders = orders.filter(order => {
        const orderDate = new Date(order.order_date);
        return order.shop === selectedShop && 
               orderDate >= weekMonday && 
               orderDate <= weekSunday;
      });
    }

    return weekOrders.reduce((total, order) => total + (order.order_amount || 0), 0);
  };

  // Get current week's budget for SELECTED SHOP ONLY
  const getCurrentWeekBudget = () => {
    const weekMonday = getCurrentWeekMonday();
    
    if (selectedShop === "All") {
      // For "All" shops, sum budgets for all shops for this week
      const shopBudgets = weeklyBudgets.filter(budget => budget.week_start_date === weekMonday);
      return shopBudgets.reduce((total, budget) => total + (budget.budget_amount || 0), 0);
    } else {
      // For specific shop, get budget for that shop only
      const budget = weeklyBudgets.find(
        b => b.shop === selectedShop && b.week_start_date === weekMonday
      );
      return budget?.budget_amount || 0;
    }
  };

  const currentWeekSpending = calculateCurrentWeekSpending();
  const currentWeekBudget = getCurrentWeekBudget();
  const budgetDifference = currentWeekBudget - currentWeekSpending;

  // Get last week's date range
  const getLastWeekDates = () => {
    const thisWeekMonday = new Date(getCurrentWeekMonday());
    const lastWeekMonday = new Date(thisWeekMonday);
    lastWeekMonday.setDate(thisWeekMonday.getDate() - 7);
    const lastWeekSunday = getSunday(lastWeekMonday);
    return { lastWeekMonday, lastWeekSunday, thisWeekMonday };
  };

  // Calculate last week's orders delivered this week (ONLY for selected shop)
  const calculateLastWeekOrdersDeliveredThisWeek = () => {
    const { lastWeekMonday, lastWeekSunday, thisWeekMonday } = getLastWeekDates();
    const thisWeekSunday = getSunday(thisWeekMonday);
    
    // Filter orders: placed last week, delivered this week, from selected shop
    const lastWeekOrders = orders.filter(order => {
      const orderDate = new Date(order.order_date);
      const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
      
      // Shop filter (always apply unless "All" is selected)
      const shopMatches = selectedShop === "All" || order.shop === selectedShop;
      
      // Order was placed last week and delivered this week
      return shopMatches &&
             orderDate >= lastWeekMonday && 
             orderDate <= lastWeekSunday && 
             deliveryDate &&
             deliveryDate >= thisWeekMonday && 
             deliveryDate <= thisWeekSunday &&
             order.status === "Delivered";
    });

    return {
      orders: lastWeekOrders,
      total: lastWeekOrders.reduce((sum, order) => sum + order.amount_delivered, 0)
    };
  };

  // Calculate ALL orders delivered this week (ONLY for selected shop)
  const calculateThisWeekDelivered = () => {
    const thisWeekMonday = new Date(getCurrentWeekMonday());
    const thisWeekSunday = getSunday(thisWeekMonday);
    
    // Filter orders: delivered this week, from selected shop (regardless of order date)
    const thisWeekDelivered = orders.filter(order => {
      const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
      
      // Shop filter (always apply unless "All" is selected)
      const shopMatches = selectedShop === "All" || order.shop === selectedShop;
      
      // ANY order delivered this week (regardless of order date)
      return shopMatches &&
             deliveryDate &&
             deliveryDate >= thisWeekMonday && 
             deliveryDate <= thisWeekSunday &&
             order.status === "Delivered";
    });

    return {
      orders: thisWeekDelivered,
      total: thisWeekDelivered.reduce((sum, order) => sum + order.amount_delivered, 0)
    };
  };

  const lastWeekDeliveredThisWeek = calculateLastWeekOrdersDeliveredThisWeek();
  const thisWeekDelivered = calculateThisWeekDelivered();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const supply = supplies.find(s => s.id === formData.supply_id);
    if (!supply) {
      toast.error("Please select a valid supply");
      return;
    }

    const status: OrderStatus = 
      formData.amount_delivered === 0 ? "Pending" :
      formData.amount_delivered < formData.order_amount ? "Partial" : "Delivered";

    try {
      if (editingOrder) {
        const { error } = await supabase
          .from('orders')
          .update({
            supply_id: formData.supply_id,
            supply_name: supply.name,
            order_date: formData.order_date,
            ordered_by: formData.ordered_by,
            contact_person: formData.contact_person,
            order_amount: formData.order_amount,
            amount_delivered: formData.amount_delivered,
            delivery_date: formData.delivery_date,
            shop: formData.shop,
            notes: formData.notes,
            status,
          })
          .eq('id', editingOrder.id);

        if (error) throw error;
        toast.success("Order updated successfully");
      } else {
        const { error } = await supabase
          .from('orders')
          .insert({
            supply_id: formData.supply_id,
            supply_name: supply.name,
            order_date: formData.order_date,
            ordered_by: formData.ordered_by,
            contact_person: formData.contact_person,
            order_amount: formData.order_amount,
            amount_delivered: formData.amount_delivered,
            delivery_date: formData.delivery_date,
            shop: formData.shop,
            notes: formData.notes,
            status,
          });

        if (error) throw error;
        toast.success("Order created successfully");
      }

      await fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving order:', error);
      toast.error(`Failed to save order: ${error.message}`);
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      supply_id: order.supply_id,
      order_date: order.order_date,
      ordered_by: order.ordered_by,
      contact_person: order.contact_person,
      order_amount: order.order_amount,
      amount_delivered: order.amount_delivered,
      delivery_date: order.delivery_date,
      shop: order.shop,
      notes: order.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
      toast.success("Order deleted successfully");
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast.error(`Failed to delete order: ${error.message}`);
    }
  };

  const resetForm = () => {
    setEditingOrder(null);
    setFormData({
      supply_id: "",
      order_date: today,
      ordered_by: "",
      contact_person: "",
      order_amount: 0,
      amount_delivered: 0,
      delivery_date: "",
      shop: shops[0] || "",
      notes: "",
    });
  };

  const handleBudgetUpdate = async () => {
    await fetchData();
  };

  // Generate week options (current week and previous 4 weeks)
  const generateWeekOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      options.push({
        value: getWeekRangeString(weekStart, weekEnd),
        label: `Week of ${formatDate(weekStart)} to ${formatDate(weekEnd)}`
      });
    }
    
    return options;
  };

  const weekOptions = generateWeekOptions();

  const pendingOrders = filteredOrders.filter(o => o.status === "Pending");
  const partialOrders = filteredOrders.filter(o => o.status === "Partial");
  const deliveredOrders = filteredOrders.filter(o => o.status === "Delivered");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "secondary" | "default"> = {
      Pending: "secondary",
      Partial: "default",
      Delivered: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Selection Dialog */}
      <Dialog open={isWeekSelectOpen} onOpenChange={setIsWeekSelectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Week</DialogTitle>
            <DialogDescription>
              Please select the week you want to view. The week starts on Monday and ends on Sunday.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select a week" />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setIsWeekSelectOpen(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">Manage purchase orders and deliveries</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-sm">
              {selectedWeek}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWeekSelectOpen(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Change Week
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingOrder ? "Edit Order" : "Create New Order"}</DialogTitle>
                <DialogDescription>
                  Enter order details and delivery information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="supplyId">Select Supply *</Label>
                    <Select value={formData.supply_id} onValueChange={(value) => setFormData({ ...formData, supply_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose supply" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplies.map((supply) => (
                          <SelectItem key={supply.id} value={supply.id}>
                            {supply.name} - {supply.shop}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orderDate">Order Date *</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      required
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orderedBy">Ordered By (Email) *</Label>
                    <Input
                      id="orderedBy"
                      type="email"
                      required
                      value={formData.ordered_by}
                      onChange={(e) => setFormData({ ...formData, ordered_by: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      type="text"
                      required
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="Name of person you spoke to"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orderAmount">Order Amount *</Label>
                    <Input
                      id="orderAmount"
                      type="number"
                      required
                      value={formData.order_amount}
                      onChange={(e) => setFormData({ ...formData, order_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountDelivered">Amount Delivered</Label>
                    <Input
                      id="amountDelivered"
                      type="number"
                      value={formData.amount_delivered}
                      onChange={(e) => setFormData({ ...formData, amount_delivered: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate">Expected Delivery *</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      required
                      value={formData.delivery_date}
                      onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop">Shop *</Label>
                    <Select value={formData.shop} onValueChange={(value) => setFormData({ ...formData, shop: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map((shop) => (
                          <SelectItem key={shop} value={shop}>{shop}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingOrder ? "Update" : "Create"} Order
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Current Week Spending vs Budget - SHOWS FOR BOTH "All" AND SPECIFIC SHOPS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Weekly Budget Overview 
              {selectedShop !== "All" && ` - ${selectedShop}`}
            </span>
            <Badge variant={budgetDifference >= 0 ? "default" : "destructive"}>
              {budgetDifference >= 0 ? "Under Budget" : "Over Budget"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {selectedShop === "All" 
              ? `Total spending across all shops for the week of ${selectedWeek}`
              : `Spending for ${selectedShop} for the week of ${selectedWeek}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(currentWeekBudget)}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedShop === "All" ? "Total Weekly Budget" : "Weekly Budget"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(currentWeekSpending)}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedShop === "All" ? "Total Current Spending" : "Current Spending"}
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                budgetDifference >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.abs(budgetDifference))}
              </div>
              <div className="text-sm text-muted-foreground">
                {budgetDifference >= 0 ? 'Remaining' : 'Over Budget'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Report */}
      {(lastWeekDeliveredThisWeek.orders.length > 0 || thisWeekDelivered.orders.length > 0) && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-amber-700 dark:text-amber-300">
                📦 Weekly Delivery Report
              </span>
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                Week of {selectedWeek}
              </Badge>
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-400">
              Breakdown of all orders delivered during the selected week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(lastWeekDeliveredThisWeek.total)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Last Week's Orders (Delivered This Week)
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {lastWeekDeliveredThisWeek.orders.length} orders
                  </div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-green-400">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(thisWeekDelivered.total)}
                  </div>
                  <div className="text-sm text-muted-foreground font-semibold">
                    Total Delivered This Week
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {thisWeekDelivered.orders.length} orders (includes last week's orders)
                  </div>
                </div>
              </div>
              
              {/* Order Details Table for Last Week Orders */}
              {lastWeekDeliveredThisWeek.orders.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2 text-amber-700 dark:text-amber-300">
                    Last Week's Orders Delivered This Week:
                  </h4>
                  <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Supply</TableHead>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Delivery Date</TableHead>
                          <TableHead>Shop</TableHead>
                          <TableHead className="text-right">Amount Delivered</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lastWeekDeliveredThisWeek.orders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-amber-50 dark:hover:bg-amber-950/50">
                            <TableCell className="font-medium">{order.supply_name}</TableCell>
                            <TableCell>{order.order_date}</TableCell>
                            <TableCell>{order.delivery_date}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{order.shop}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(order.amount_delivered)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Budgets Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          {selectedShop === "All" ? "Weekly Budgets - All Shops" : `Weekly Budget - ${selectedShop}`}
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {selectedShop === "All" ? (
            shops.map((shop) => {
              const budget = weeklyBudgets.find(b => b.shop === shop && b.week_start_date === getCurrentWeekMonday());
              const shopWeekOrders = orders.filter(o => {
                const orderDate = new Date(o.order_date);
                const weekMonday = new Date(getCurrentWeekMonday());
                const weekSunday = getSunday(weekMonday);
                return o.shop === shop && orderDate >= weekMonday && orderDate <= weekSunday;
              });
              
              return (
                <WeeklyBudgetCard
                  key={shop}
                  shop={shop}
                  currentBudget={budget || null}
                  weekOrders={shopWeekOrders}
                  weekStartStr={getCurrentWeekMonday()}
                  onBudgetUpdate={handleBudgetUpdate}
                />
              );
            })
          ) : (
            <WeeklyBudgetCard
              shop={selectedShop}
              currentBudget={weeklyBudgets.find(b => b.shop === selectedShop && b.week_start_date === getCurrentWeekMonday()) || null}
              weekOrders={orders.filter(o => {
                const orderDate = new Date(o.order_date);
                const weekMonday = new Date(getCurrentWeekMonday());
                const weekSunday = getSunday(weekMonday);
                return o.shop === selectedShop && orderDate >= weekMonday && orderDate <= weekSunday;
              })}
              weekStartStr={getCurrentWeekMonday()}
              onBudgetUpdate={handleBudgetUpdate}
            />
          )}
        </div>
      </div>

      {/* Weekly Budget Report - Printable */}
      {selectedShop !== "All" && (
        <div>
          <WeeklyBudgetReport
            shop={selectedShop}
            currentBudget={weeklyBudgets.find(b => b.shop === selectedShop && b.week_start_date === getCurrentWeekMonday()) || null}
            weekOrders={orders.filter(o => {
              const orderDate = new Date(o.order_date);
              const weekMonday = new Date(getCurrentWeekMonday());
              const weekSunday = getSunday(weekMonday);
              return o.shop === selectedShop && orderDate >= weekMonday && orderDate <= weekSunday;
            })}
            weekStartStr={getCurrentWeekMonday()}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pending Orders</CardTitle>
            <CardDescription>Awaiting delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Partial Deliveries</CardTitle>
            <CardDescription>Incomplete orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{partialOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>Fully delivered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{deliveredOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order List</CardTitle>
          <CardDescription>
            {selectedShop === "All" ? "All shops" : `Shop ${selectedShop}`} orders for {selectedWeek}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supply</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Ordered By</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.supply_name}</TableCell>
                  <TableCell>{order.order_date}</TableCell>
                  <TableCell>{order.ordered_by}</TableCell>
                  <TableCell>{order.contact_person}</TableCell>
                  <TableCell>{order.order_amount}</TableCell>
                  <TableCell>{order.amount_delivered}</TableCell>
                  <TableCell>{order.delivery_date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.shop}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(order)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredOrders.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No orders found for the selected week. Create your first order to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;
