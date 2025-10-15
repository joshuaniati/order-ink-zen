import { useState } from "react";
import { Shop, Order, OrderStatus } from "@/types";
import { getOrders, saveOrder, deleteOrder, getSupplies } from "@/lib/storage";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface OrdersProps {
  selectedShop: Shop;
}

const Orders = ({ selectedShop }: OrdersProps) => {
  const [orders, setOrders] = useState<Order[]>(getOrders());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  const supplies = getSupplies();
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    supplyId: "",
    orderDate: today,
    orderedBy: "",
    orderAmount: 0,
    amountDelivered: 0,
    deliveryDate: "",
    shop: "A" as Shop,
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
      orderAmount: 0,
      amountDelivered: 0,
      deliveryDate: "",
      shop: "A",
      notes: "",
    });
  };

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
                          {supply.name} - Shop {supply.shop}
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
                  <Select value={formData.shop} onValueChange={(value) => setFormData({ ...formData, shop: value as Shop })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                  <TableCell>{order.orderAmount}</TableCell>
                  <TableCell>{order.amountDelivered}</TableCell>
                  <TableCell>{order.deliveryDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Shop {order.shop}</Badge>
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
