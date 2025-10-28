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
import { Plus, Pencil, Trash2, Search, ArrowUpDown, Printer, Archive } from "lucide-react";
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
  const [archiving, setArchiving] = useState(false);

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

  // Admin cleanup states
  const [deleteBeforeDate, setDeleteBeforeDate] = useState('2024-01-27');
  const [customDate, setCustomDate] = useState('');
  const [cleanupLoading, setCleanupLoading] = useState(false);

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

  // === ARCHIVE FUNCTIONALITY ===
  const archiveDeliveredOrders = async () => {
    if (!confirm("Are you sure you want to archive all delivered orders from last week? This will move them to the delivered orders table and start a fresh week.")) {
      return;
    }

    try {
      setArchiving(true);

      // First, check if the delivered_orders table exists
      const { data: tableExists, error: checkError } = await supabase
        .from('delivered_orders')
        .select('id')
        .limit(1);

      if (checkError) {
        toast.error("Archive functionality not available yet. The delivered_orders table needs to be created first.");
        return;
      }

      // Get all delivered orders from previous week
      const previousWeekOrders = orders.filter(order => {
        const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
        const weekStart = new Date(previousWeekRange.start);
        const weekEnd = new Date(previousWeekRange.end);
        
        return order.status === "Delivered" &&
               deliveryDate &&
               deliveryDate >= weekStart &&
               deliveryDate <= weekEnd;
      });

      if (previousWeekOrders.length === 0) {
        toast.info("No delivered orders found from last week to archive.");
        return;
      }

      // Insert into delivered_orders table
      const { error: insertError } = await supabase
        .from('delivered_orders')
        .insert(previousWeekOrders.map(order => ({
          original_order_id: order.id,
          supply_id: order.supply_id,
          supply_name: order.supply_name,
          order_date: order.order_date,
          ordered_by: order.ordered_by,
          contact_person: order.contact_person,
          order_amount: order.order_amount,
          amount_delivered: order.amount_delivered,
          delivery_date: order.delivery_date,
          shop: order.shop,
          notes: order.notes,
          status: order.status,
          archived_at: new Date().toISOString()
        })));

      if (insertError) throw insertError;

      // Delete from orders table
      const orderIds = previousWeekOrders.map(order => order.id);
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (deleteError) throw deleteError;

      toast.success(`Successfully archived ${previousWeekOrders.length} delivered orders from last week.`);
      await fetchData();

    } catch (error: any) {
      console.error('Error archiving orders:', error);
      toast.error(`Failed to archive orders: ${error.message}`);
    } finally {
      setArchiving(false);
    }
  };

  // === ADMIN CLEANUP FUNCTION ===
  const handleAdminCleanup = async () => {
    if (!deleteBeforeDate) {
      toast.error("Please select a date");
      return;
    }

    const confirmMessage = `🚨 DANGEROUS ACTION 🚨\n\nThis will PERMANENTLY DELETE:\n• All orders before ${deleteBeforeDate}\n• All cash-ups before ${deleteBeforeDate}\n• All income records before ${deleteBeforeDate}\n\nThis cannot be undone!\n\nType "DELETE ${deleteBeforeDate}" to confirm:`;
    
    const userInput = prompt(confirmMessage);
    if (userInput !== `DELETE ${deleteBeforeDate}`) {
      toast.error("Cleanup cancelled - confirmation text did not match");
      return;
    }

    try {
      setCleanupLoading(true);
      
      // Delete orders before the specified date
      const { error: ordersError, count: ordersDeleted } = await supabase
        .from('orders')
        .delete()
        .lt('order_date', deleteBeforeDate)
        .select('*', { count: 'exact' });

      if (ordersError) throw ordersError;

      // Delete cash-ups before the specified date
      let cashupsDeleted = 0;
      try {
        const { error: cashupsError, count: cashupsCount } = await supabase
          .from('cash_ups')
          .delete()
          .lt('created_at', deleteBeforeDate)
          .select('*', { count: 'exact' });

        if (cashupsError && !cashupsError.message.includes('does not exist')) {
          throw cashupsError;
        }
        cashupsDeleted = cashupsCount || 0;
      } catch (cashupsError) {
        console.log('Cash-ups table might not exist, continuing...');
      }

      // Delete income records before the specified date
      let incomeRecordsDeleted = 0;
      try {
        const { error: incomeError, count: incomeCount } = await supabase
          .from('income_records')
          .delete()
          .lt('created_at', deleteBeforeDate)
          .select('*', { count: 'exact' });

        if (incomeError && !incomeError.message.includes('does not exist')) {
          throw incomeError;
        }
        incomeRecordsDeleted = incomeCount || 0;
      } catch (incomeError) {
        console.log('Income records table might not exist, continuing...');
      }

      toast.success(`✅ Cleanup completed!\n• Orders deleted: ${ordersDeleted || 0}\n• Cash-ups deleted: ${cashupsDeleted}\n• Income records deleted: ${incomeRecordsDeleted}`);
      
      // Refresh the data
      await fetchData();

    } catch (error: any) {
      console.error('Error during cleanup:', error);
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setCleanupLoading(false);
    }
  };

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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery List - ${shopName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${shopName} - Delivery List</h2>
            <p>Period: ${start} to ${end}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Supply</th>
                <th>Order Date</th>
                <th>Delivery Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${delivered.map(order => `
                <tr>
                  <td>${order.supply_name}</td>
                  <td>${order.order_date}</td>
                  <td>${order.delivery_date}</td>
                  <td>${formatCurrency(order.amount_delivered || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 20px; font-weight: bold;">
            Total: ${formatCurrency(total)}
          </div>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setIsPrintDialogOpen(false);
  };

  const printAllShopsDeliveryList = (start: string, end: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error("Allow pop-ups to print");

    let content = '';
    shops.forEach(shop => {
      const delivered = getDeliveredByDeliveryDate(shop, start, end);
      if (delivered.length > 0) {
        const total = delivered.reduce((s, o) => s + (o.amount_delivered || 0), 0);
        content += `
          <div style="page-break-after: always;">
            <div class="header">
              <h2>${shop} - Delivery List</h2>
              <p>Period: ${start} to ${end}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Supply</th>
                  <th>Order Date</th>
                  <th>Delivery Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${delivered.map(order => `
                  <tr>
                    <td>${order.supply_name}</td>
                    <td>${order.order_date}</td>
                    <td>${order.delivery_date}</td>
                    <td>${formatCurrency(order.amount_delivered || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="margin-top: 20px; font-weight: bold;">
              Total: ${formatCurrency(total)}
            </div>
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Shops Delivery List</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    setIsPrintDialogOpen(false);
  };

  // === ORDER ACTIONS ===
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "secondary" | "default" | "destructive"> = {
      Pending: "secondary",
      Partial: "default",
      Delivered: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
        {sortField === field && (
          <span className="ml-1 text-xs">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </TableHead>
  );

  const getFilterDescription = () => {
    switch (activeFilter) {
      case 'current-week-orders':
        return `Showing orders placed this week`;
      case 'delivered-this-week':
        return `Showing orders delivered this week`;
      case 'remaining-orders':
        return `Showing pending orders this week`;
      case 'previous-week-delivered':
        return `Showing previous week delivered orders`;
      default:
        return `${selectedShop === "All" ? "All shops" : `Shop ${selectedShop}`} orders`;
    }
  };

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
          {/* Archive Button */}
          <Button 
            variant="outline" 
            onClick={archiveDeliveredOrders}
            disabled={archiving}
          >
            <Archive className="mr-2 h-4 w-4" />
            {archiving ? "Archiving..." : "Archive Last Week"}
          </Button>

          {/* Print Button */}
          <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Printer className="mr-2 h-4 w-4" />Print</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Print Delivery List</DialogTitle>
                <DialogDescription>
                  Select date range for delivery list
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={printDateFrom}
                    onChange={(e) => setPrintDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={printDateTo}
                    onChange={(e) => setPrintDateTo(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPrintDateFrom(previousWeekRange.start);
                      setPrintDateTo(previousWeekRange.end);
                    }}
                    className="flex-1"
                  >
                    Last Week
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPrintDateFrom(currentWeekStart);
                      setPrintDateTo(currentWeekEnd);
                    }}
                    className="flex-1"
                  >
                    This Week
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    if (!printDateFrom || !printDateTo) {
                      toast.error("Please select dates");
                      return;
                    }
                    if (selectedShop === "All") {
                      printAllShopsDeliveryList(printDateFrom, printDateTo);
                    } else {
                      printDeliveryList(selectedShop, printDateFrom, printDateTo);
                    }
                  }}
                  className="w-full"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Order */}
          <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Create Order</Button>
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
                    <Label htmlFor="orderAmount">Order Amount (ZAR) *</Label>
                    <Input
                      id="orderAmount"
                      type="number"
                      required
                      value={formData.order_amount}
                      onChange={(e) => setFormData({ ...formData, order_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountDelivered">Amount Delivered (ZAR)</Label>
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
            <WeeklyBudgetCard 
              {...shopsWithBudgets.find(s => s.shop === selectedShop)!} 
              onBudgetUpdate={fetchData} 
            />
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

      {/* Hidden Admin Section */}
      <div className="fixed bottom-4 right-4 opacity-20 hover:opacity-100 transition-opacity">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm" className="text-xs">
              🗑️ Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">Admin Cleanup</DialogTitle>
              <DialogDescription>
                ⚠️ Dangerous: Delete all orders and cash-ups before a specific date
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deleteBeforeDate">Delete records before:</Label>
                <Input
                  id="deleteBeforeDate"
                  type="date"
                  value={deleteBeforeDate}
                  onChange={(e) => setDeleteBeforeDate(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  All orders and cash-ups created before this date will be permanently deleted.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customDate">Or custom date:</Label>
                <Input
                  id="customDate"
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    if (e.target.value) {
                      setDeleteBeforeDate(e.target.value);
                    }
                  }}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteBeforeDate('2024-01-26')}
                  className="flex-1"
                >
                  Set to Jan 26
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteBeforeDate('2024-01-27')}
                  className="flex-1"
                >
                  Set to Jan 27
                </Button>
              </div>
              
              <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  🚨 This will delete:
                </p>
                <ul className="text-sm text-destructive/80 mt-2 space-y-1">
                  <li>• All orders before {deleteBeforeDate}</li>
                  <li>• All cash-ups before {deleteBeforeDate}</li>
                  <li>• All income records before {deleteBeforeDate}</li>
                  <li>• This action cannot be undone!</li>
                </ul>
              </div>
              
              <Button 
                variant="destructive" 
                onClick={handleAdminCleanup}
                disabled={!deleteBeforeDate || cleanupLoading}
                className="w-full"
              >
                {cleanupLoading ? (
                  <>⏳ Deleting Records...</>
                ) : (
                  <>🗑️ Delete All Records Before {deleteBeforeDate}</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Orders;
