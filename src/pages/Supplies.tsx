import { useState } from "react";
import { Shop, Supply } from "@/types";
import { getSupplies, saveSupply, deleteSupply } from "@/lib/storage";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface SuppliesProps {
  selectedShop: Shop;
}

const Supplies = ({ selectedShop }: SuppliesProps) => {
  const [supplies, setSupplies] = useState<Supply[]>(getSupplies());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    currentStock: 0,
    unit: "",
    pricePerUnit: 0,
    supplier: "",
    minStockLevel: 0,
    shop: "A" as Shop,
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
      category: supply.category,
      currentStock: supply.currentStock,
      unit: supply.unit,
      pricePerUnit: supply.pricePerUnit,
      supplier: supply.supplier,
      minStockLevel: supply.minStockLevel,
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
      category: "",
      currentStock: 0,
      unit: "",
      pricePerUnit: 0,
      supplier: "",
      minStockLevel: 0,
      shop: "A",
    });
  };

  const lowStockCount = filteredSupplies.filter(s => s.currentStock <= s.minStockLevel).length;
  const totalValue = filteredSupplies.reduce((sum, s) => sum + (s.currentStock * s.pricePerUnit), 0);

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
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentStock">Current Stock *</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    required
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    required
                    placeholder="e.g., kg, pieces, liters"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerUnit">Price per Unit (ZAR) *</Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    step="0.01"
                    required
                    value={formData.pricePerUnit}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStockLevel">Min Stock Level *</Label>
                  <Input
                    id="minStockLevel"
                    type="number"
                    required
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) })}
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

      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="flex items-center gap-2">
              {lowStockCount > 0 && <AlertTriangle className="h-5 w-5 text-warning" />}
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Items need reordering</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock Value</CardTitle>
            <CardDescription>Total inventory worth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalValue)}</div>
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
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSupplies.map((supply) => (
                <TableRow key={supply.id}>
                  <TableCell className="font-medium">{supply.name}</TableCell>
                  <TableCell>{supply.category}</TableCell>
                  <TableCell>{supply.currentStock}</TableCell>
                  <TableCell>{supply.unit}</TableCell>
                  <TableCell>{formatCurrency(supply.pricePerUnit)}</TableCell>
                  <TableCell>{supply.supplier}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Shop {supply.shop}</Badge>
                  </TableCell>
                  <TableCell>
                    {supply.currentStock <= supply.minStockLevel ? (
                      <Badge variant="destructive">Low Stock</Badge>
                    ) : (
                      <Badge variant="default">In Stock</Badge>
                    )}
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
