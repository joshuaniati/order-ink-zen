import { useState } from "react";
import { Shop, Supply } from "@/types";
import { getSupplies, saveSupply, deleteSupply, getShops } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SuppliesProps {
  selectedShop: Shop;
}

const Supplies = ({ selectedShop }: SuppliesProps) => {
  const [supplies, setSupplies] = useState<Supply[]>(getSupplies());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const shops = getShops();
  
  const [formData, setFormData] = useState({
    name: "",
    amount: 0,
    phoneNumber: "",
    shop: shops[0] || "",
  });

  const filteredSupplies = selectedShop === "All" 
    ? supplies 
    : supplies.filter(s => s.shop === selectedShop);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supply: Supply = {
      id: editingSupply?.id || crypto.randomUUID(),
      ...formData,
      createdAt: editingSupply?.createdAt || new Date().toISOString(),
    };
    
    saveSupply(supply);
    setSupplies(getSupplies());
    setIsDialogOpen(false);
    resetForm();
    toast.success(editingSupply ? "Supply updated" : "Supply added");
  };

  const handleEdit = (supply: Supply) => {
    setEditingSupply(supply);
    setFormData({
      name: supply.name,
      amount: supply.amount,
      phoneNumber: supply.phoneNumber,
      shop: supply.shop,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this supply?")) {
      deleteSupply(id);
      setSupplies(getSupplies());
      toast.success("Supply deleted");
    }
  };

  const resetForm = () => {
    setEditingSupply(null);
    setFormData({
      name: "",
      amount: 0,
      phoneNumber: "",
      shop: shops[0] || "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Supplies</h2>
          <p className="text-muted-foreground">Manage inventory across all shops</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Supply
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSupply ? "Edit Supply" : "Add New Supply"}</DialogTitle>
              <DialogDescription>
                Enter supply details and inventory information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Supply Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
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
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSupply ? "Update" : "Add"} Supply
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Supplies</CardTitle>
            <CardDescription>Items in inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredSupplies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Amount</CardTitle>
            <CardDescription>Combined quantity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredSupplies.reduce((sum, s) => sum + s.amount, 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supply List</CardTitle>
          <CardDescription>
            {selectedShop === "All" ? "All shops" : `Shop ${selectedShop}`} inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSupplies.map((supply) => (
                <TableRow key={supply.id}>
                  <TableCell className="font-medium">{supply.name}</TableCell>
                  <TableCell>{supply.amount}</TableCell>
                  <TableCell>{supply.phoneNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{supply.shop}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(supply)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(supply.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredSupplies.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No supplies found. Add your first supply to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Supplies;
