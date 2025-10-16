import { useState } from "react";
import { Shop, Order, OrderStatus } from "@/types";
import { getOrders, saveOrder, deleteOrder, getSupplies, getShops, getCurrentWeekBudget, saveWeeklyBudget } from "@/lib/storage";
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

interface OrdersProps {
  selectedShop: Shop;
}

const Orders = ({ selectedShop }: OrdersProps) => {
  const [orders, setOrders] = useState<Order[]>(getOrders());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [budgetAmount, setBudgetAmount] = useState(0);
  
  const supplies = getSupplies();
  const shops = getShops();
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    supplyId: "",
    orderDate: today,
    orderedBy: "",
    contactPerson: "",
    orderAmount: 0,
    amountDelivered: 0,
    deliveryDate: "",
    shop: shops[0] || "",
    notes: "",
  });

  const filteredOrders = selectedShop === "All" 
    ? orders 
    : orders.filter(o => o.shop === selectedShop);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supply = supplies.find(s => s.id === formData.supplyId);
    if (!supply) return;

    const status: OrderStatus = 
      formData.amountDelivered === 0 ? "Pending" :
      formData.amountDelivered < formData.orderAmount ? "Partial" : "Delivered";

    const order: Order = {
      id: editingOrder?.id || crypto.randomUUID(),
      supplyName: supply.name,
      status,
      ...formData,
      createdAt: editingOrder?.createdAt || new Date().toISOString(),
    };
    
    saveOrder(order);
    setOrders(getOrders());
    setIsDialogOpen(false);
    resetForm();
    toast.success(editingOrder ? "Order updated" : "Order created");
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      supplyId: order.supplyId,
      orderDate: order.orderDate,
      orderedBy: order.orderedBy,
      contactPerson: order.contactPerson,
      orderAmount: order.orderAmount,
      amountDelivered: order.amountDelivered,
      deliveryDate: order.deliveryDate,
      shop: order.shop,
      notes: order.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      deleteOrder(id);
      setOrders(getOrders());
      toast.success("Order deleted");
    }
  };

  const resetForm = () => {
    setEditingOrder(null);
    setFormData({
      supplyId: "",
      orderDate: today,
      orderedBy: "",
      contactPerson: "",
      orderAmount: 0,
      amountDelivered: 0,
      deliveryDate: "",
      shop: shops[0] || "",
      notes: "",
    });
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShop === "All") {
      toast.error("Please select a specific shop to set budget");
      return;
    }
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const budget = {
      id: crypto.randomUUID(),
      shop: selectedShop,
      weekStartDate: weekStartStr,
      budgetAmount,
      createdAt: new Date().toISOString(),
    };
    
    saveWeeklyBudget(budget);
    setIsBudgetDialogOpen(false);
    setBudgetAmount(0);
    toast.success("Weekly budget set");
  };

  // Get current week's budget for selected shop
  const currentBudget = selectedShop !== "All" ? getCurrentWeekBudget(selectedShop) : null;
  
  // Calculate total order amount for current week
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekStartStr = weekStart.toISOString().split('T')[0];
  
  const weekOrders = filteredOrders.filter(o => {
    const orderDate = new Date(o.orderDate);
    return orderDate >= new Date(weekStartStr);
  });
  
  const totalOrderAmount = weekOrders.reduce((sum, o) => sum + o.orderAmount, 0);
  const budgetBalance = currentBudget ? currentBudget.budgetAmount - totalOrderAmount : 0;
  const isOverBudget = currentBudget && totalOrderAmount > currentBudget.budgetAmount;

  const pendingOrders = filteredOrders.filter(o => o.status === "Pending");
  const partialOrders = filteredOrders.filter(o => o.status === "Partial");
  const deliveredOrders = filteredOrders.filter(o => o.status === "Delivered");

  const getStatusBadge = (status: OrderStatus) => {
    const variants = {
      Pending: "secondary" as const,
      Partial: "default" as const,
      Delivered: "default" as const,
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

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
                  <Select value={formData.supplyId} onValueChange={(value) => setFormData({ ...formData, supplyId: value })}>
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
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderedBy">Ordered By (Email) *</Label>
                  <Input
                    id="orderedBy"
                    type="email"
                    required
                    value={formData.orderedBy}
                    onChange={(e) => setFormData({ ...formData, orderedBy: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Name of person you spoke to"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderAmount">Order Amount *</Label>
                  <Input
                    id="orderAmount"
                    type="number"
                    required
                    value={formData.orderAmount}
                    onChange={(e) => setFormData({ ...formData, orderAmount: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amountDelivered">Amount Delivered</Label>
                  <Input
                    id="amountDelivered"
                    type="number"
                    value={formData.amountDelivered}
                    onChange={(e) => setFormData({ ...formData, amountDelivered: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Expected Delivery *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    required
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop">Shop *</Label>
                  <Select value={formData.shop} onValueChange={(value) => setFormData({ ...formData, shop: value })}>
                    <SelectTrigger>
                      <SelectValue />
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

      {currentBudget && selectedShop !== "All" && (
        <Card className={isOverBudget ? "border-destructive" : "border-primary"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isOverBudget ? (
                <TrendingDown className="h-5 w-5 text-destructive" />
              ) : (
                <TrendingUp className="h-5 w-5 text-primary" />
              )}
              Weekly Budget Status
            </CardTitle>
            <CardDescription>Current week budget tracking for {selectedShop}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(currentBudget.budgetAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalOrderAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
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
                  <TableCell className="font-medium">{order.supplyName}</TableCell>
                  <TableCell>{order.orderDate}</TableCell>
                  <TableCell>{order.orderedBy}</TableCell>
                  <TableCell>{order.contactPerson}</TableCell>
                  <TableCell>{order.orderAmount}</TableCell>
                  <TableCell>{order.amountDelivered}</TableCell>
                  <TableCell>{order.deliveryDate}</TableCell>
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
