import { useState, useEffect, useMemo } from "react";
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
import { Plus, Pencil, Trash2, Search, ArrowUpDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { WeeklyBudgetCard } from "@/components/orders/WeeklyBudgetCard";
import { WeeklyBudgetReport } from "@/components/orders/WeeklyBudgetReport";
import { useLocation } from "react-router-dom";

interface OrdersProps {
  selectedShop: Shop;
}

type Order = Tables<'orders'>;
type Supply = Tables<'supplies'>;
type WeeklyBudget = Tables<'weekly_budgets'>;
type SortField = 'supply_name' | 'order_date' | 'delivery_date' | 'order_amount' | 'amount_delivered';
type SortDirection = 'asc' | 'desc';

const Orders = ({ selectedShop }: OrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [weeklyBudgets, setWeeklyBudgets] = useState<WeeklyBudget[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const [sortField, setSortField] = useState<SortField>('order_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCurrentWeekOnly, setShowCurrentWeekOnly] = useState(true); // Default: this week
  const [activeFilter, setActiveFilter] = useState<string>('');

  const [printDateFrom, setPrintDateFrom] = useState('');
  const [printDateTo, setPrintDateTo] = useState('');
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const location = useLocation();

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

  // === WEEK LOGIC: Monday to Sunday ===
  const getCurrentWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day; // Sunday = 0 → go back 6

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      startDate: monday,
      endDate: sunday,
    };
  };

  const currentWeek = useMemo(() => getCurrentWeekRange(), []);
  const currentWeekStart = currentWeek.start;
  const currentWeekEnd = currentWeek.end;

  const getPreviousWeekRange = () => {
    const monday = new Date(currentWeek.startDate);
    monday.setDate(monday.getDate() - 7);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  };

  const previousWeekRange = useMemo(() => getPreviousWeekRange(), [currentWeek]);

  useEffect(() => {
    setPrintDateFrom(previousWeekRange.start);
    setPrintDateTo(previousWeekRange.end);
  }, [previousWeekRange]);

  // === FETCH DATA ===
  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, suppliesRes, budgetsRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('supplies').select('*'),
        supabase.from('weekly_budgets').select('*')
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (suppliesRes.error) throw suppliesRes.error;
      if (budgetsRes.error) throw budgetsRes.error;

      setOrders(ordersRes.data || []);
      setSupplies(suppliesRes.data || []);
      setWeeklyBudgets(budgetsRes.data || []);

      const uniqueShops = [...new Set(suppliesRes.data?.map(s => s.shop).filter(Boolean) || [])] as string[];
      setShops(uniqueShops);

      if (uniqueShops.length > 0 && !formData.shop) {
        setFormData(prev => ({ ...prev, shop: uniqueShops[0] }));
      }
    } catch (error: any) {
      toast.error(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // === NAVIGATION FILTERS ===
  useEffect(() => {
    const state = location.state as { filter?: string } | null;
    if (!state?.filter) return;

    setActiveFilter(state.filter);
    setShowCurrentWeekOnly(true);
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');

    switch (state.filter) {
      case 'current-week-orders':
        setShowCurrentWeekOnly(true);
        break;
      case 'delivered-this-week':
        setShowCurrentWeekOnly(true);
        setSearchQuery('status:Delivered');
        break;
      case 'remaining-orders':
        setShowCurrentWeekOnly(true);
        setSearchQuery('status:Pending,Partial');
        break;
      case 'previous-week-delivered':
        setShowCurrentWeekOnly(false);
        setSearchQuery('status:Delivered');
        setDateFrom(previousWeekRange.start);
        setDateTo(previousWeekRange.end);
        break;
      default:
        break;
    }
  }, [location.state, previousWeekRange]);

  // === FILTERED & SORTED ORDERS ===
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (selectedShop !== "All" && order.shop !== selectedShop) return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = [
          order.supply_name?.toLowerCase().includes(q),
          order.ordered_by?.toLowerCase().includes(q),
          order.contact_person?.toLowerCase().includes(q),
          q.includes('status:') && q.includes(order.status?.toLowerCase() || '')
        ].some(Boolean);
        if (!matches) return false;
      }

      // Date range
      if (dateFrom && order.order_date < dateFrom) return false;
      if (dateTo && order.order_date > dateTo) return false;

      // Current week filter (based on order_date)
      if (showCurrentWeekOnly) {
        const orderDate = new Date(order.order_date);
        if (orderDate < currentWeek.startDate || orderDate > currentWeek.endDate) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedShop, searchQuery, dateFrom, dateTo, showCurrentWeekOnly, currentWeek]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (sortField.includes('date')) {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      return (aVal < bVal ? -1 : 1) * (sortDirection === 'asc' ? 1 : -1);
    });
  }, [filteredOrders, sortField, sortDirection]);

  // === BUDGET CALCULATIONS (Delivered this week) ===
  const shopsWithBudgets = useMemo(() => {
    return shops.map(shop => {
      const budget = weeklyBudgets.find(b => b.shop === shop && b.week_start_date === currentWeekStart);
      const weekOrders = orders.filter(o => {
        const orderDate = new Date(o.order_date);
        return o.shop === shop &&
               orderDate >= currentWeek.startDate &&
               orderDate <= currentWeek.endDate;
      });

      const totalOrdered = weekOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0);
      const totalDelivered = weekOrders.reduce((sum, o) => sum + (o.amount_delivered || 0), 0);
      const budgetAmount = budget?.budget_amount || 0;
      const remainingBudget = budgetAmount - totalDelivered; // Based on delivered

      return {
        shop,
        budget,
        orders: weekOrders,
        totalOrdered,
        totalDelivered,
        remainingBudget,
        budgetAmount,
      };
    });
  }, [shops, weeklyBudgets, orders, currentWeekStart, currentWeek]);

  // === PRINT DELIVERY LIST (by delivery date) ===
  const getDeliveredByDeliveryDate = (shopName: string, start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    return orders.filter(o => {
      if (o.shop !== shopName || o.status !== "Delivered") return false;
      const delDate = o.delivery_date ? new Date(o.delivery_date) : null;
      return delDate && delDate >= startDate && delDate <= endDate;
    });
  };

  const printDeliveryList = (shopName: string, start: string, end: string) => {
    const delivered = getDeliveredByDeliveryDate(shopName, start, end);
    const total = delivered.reduce((s, o) => s + (o.amount_delivered || 0), 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error("Allow pop-ups to print");

    printWindow.document.write(/* your existing print HTML */);
    // ... (keep your existing print HTML)
    printWindow.document.close();
    setIsPrintDialogOpen(false);
  };

  // ... (keep printAllShopsDeliveryList, handleSubmit, handleEdit, etc.)

  // === RENDER ===
  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">
            {showCurrentWeekOnly
              ? `This week (Mon ${currentWeekStart} – Sun ${currentWeekEnd})`
              : getFilterDescription()}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Print Button */}
          <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Printer className="mr-2 h-4 w-4" />Print</Button>
            </DialogTrigger>
            <DialogContent>
              {/* ... print dialog */}
            </DialogContent>
          </Dialog>

          {/* Create Order */}
          <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Create Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              {/* ... form */}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          {selectedShop === "All" ? "Weekly Budgets" : `Budget - ${selectedShop}`}
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {selectedShop === "All" ? (
            shopsWithBudgets.map(data => (
              <WeeklyBudgetCard
                key={data.shop}
                shop={data.shop}
                currentBudget={data.budget}
                weekOrders={data.orders}
                weekStartStr={currentWeekStart}
                onBudgetUpdate={fetchData}
                totalOrdered={data.totalOrdered}
                totalDelivered={data.totalDelivered}
                remainingBudget={data.remainingBudget}
                budgetAmount={data.budgetAmount}
              />
            ))
          ) : (
            <WeeklyBudgetCard {...shopsWithBudgets.find(s => s.shop === selectedShop)!} onBudgetUpdate={fetchData} />
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {selectedShop !== "All" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Weekly Budget</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(shopsWithBudgets.find(s => s.shop === selectedShop)?.budgetAmount || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Delivered This Week</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(shopsWithBudgets.find(s => s.shop === selectedShop)?.totalDelivered || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Remaining Budget</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${shopsWithBudgets.find(s => s.shop === selectedShop)?.remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(shopsWithBudgets.find(s => s.shop === selectedShop)?.remainingBudget || 0)}
              </div>
              <p className="text-xs text-muted-foreground">After deliveries</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="supply_name">Supply</SortableHeader>
                <SortableHeader field="order_date">Order Date</SortableHeader>
                <TableHead>Ordered By</TableHead>
                <SortableHeader field="order_amount">Amount</SortableHeader>
                <SortableHeader field="amount_delivered">Delivered</SortableHeader>
                <SortableHeader field="delivery_date">Delivery Date</SortableHeader>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell>{order.supply_name}</TableCell>
                  <TableCell>{order.order_date}</TableCell>
                  <TableCell>{order.ordered_by}</TableCell>
                  <TableCell>{formatCurrency(order.order_amount)}</TableCell>
                  <TableCell>{formatCurrency(order.amount_delivered)}</TableCell>
                  <TableCell>{order.delivery_date}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(order)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(order.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;
