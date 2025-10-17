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
import { Plus, Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  
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

  const filteredOrders = selectedShop === "All" 
    ? orders 
    : orders.filter(o => o.shop === selectedShop);

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
            updated_at: new Date().toISOString(),
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

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShop === "All") {
      toast.error("Please select a specific shop to set budget");
      return;
    }

    try {
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { error } = await supabase
        .from('weekly_budgets')
        .upsert({
          shop: selectedShop,
          week_start_date: weekStartStr,
          budget_amount: budgetAmount,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'shop,week_start_date'
        });

      if (error) throw error;

      await fetchData();
      setIsBudgetDialogOpen(false);
      setBudgetAmount(0);
      toast.success("Weekly budget set successfully");
    } catch (error: any) {
      console.error('Error setting budget:', error);
      toast.error(`Failed to set budget: ${error.message}`);
    }
  };

  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekStartStr = weekStart.toISOString().split('T')[0];
  
  const currentBudget = selectedShop !== "All" 
    ? weeklyBudgets.find(b => b.shop === selectedShop && b.week_start_date === weekStartStr)
    : null;
  
  const weekOrders = filteredOrders.filter(o => {
    const orderDate = new Date(o.order_date);
    return orderDate >= new Date(weekStartStr);
  });
  
  const totalOrderAmount = weekOrders.reduce((sum, o) => sum + o.order_amount, 0);
  const budgetBalance = currentBudget ? currentBudget.budget_amount - totalOrderAmount : 0;
  const isOverBudget = currentBudget && totalOrderAmount > currentBudget.budget_amount;

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">Manage purchase orders and deliveries</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Set Weekly Budget</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Weekly Budget</DialogTitle>
                <DialogDescription>
                  Set the budget for {selectedShop !== "All" ? selectedShop : "a shop"} for this week
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBudgetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget Amount (ZAR) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    required
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(parseFloat(e.target.value))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Set Budget</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                        <SelectItem value="A">Shop A</SelectItem>
                        <SelectItem value="B">Shop B</SelectItem>
                        <SelectItem value="C">Shop C</SelectItem>
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

      {currentBudget && selectedShop !== "All" && (
        <Card className={isOverBudget ? "border-red-200" : "border-green-200"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isOverBudget ? (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ) : (
                <TrendingUp className="h-5 w-5 text-green-600" />
              )}
              Weekly Budget Status
            </CardTitle>
            <CardDescription>Current week budget tracking for {selectedShop}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(currentBudget.budget_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalOrderAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(budgetBalance))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={isOverBudget ? "destructive" : "default"} className="text-base">
                  {isOverBudget ? "Over Budget" : "Under Budget"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
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
            {selectedShop === "All" ? "All shops" : `Shop ${selectedShop}`} orders
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
              No orders found. Create your first order to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;
