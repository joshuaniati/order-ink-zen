import { useState, useEffect } from "react";
import { Shop } from "@/types";
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
import { supabase } from "@/integrations/supabase/client";

interface SuppliesProps {
  selectedShop: Shop;
}

interface Supply {
  id: string;
  name: string;
  amount: number;
  phone_number?: string;
  shop: string;
  created_at: string;
  updated_at: string;
}

const Supplies = ({ selectedShop }: SuppliesProps) => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    amount: 0,
    phone_number: "",
    shop: "A",
  });

  const fetchSupplies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching supplies...");
      
      const { data, error } = await supabase
        .from('supplies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        setError(error.message);
        return;
      }

      console.log("Supplies fetched:", data);
      setSupplies(data || []);
      
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplies();
  }, []);

  const filteredSupplies = selectedShop === "All" 
    ? supplies 
    : supplies.filter(s => s.shop === selectedShop);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSupply) {
        const { error } = await supabase
          .from('supplies')
          .update({
            name: formData.name,
            amount: formData.amount,
            phone_number: formData.phone_number,
            shop: formData.shop,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSupply.id);

        if (error) throw error;
        toast.success("Supply updated successfully");
      } else {
        const { error } = await supabase
          .from('supplies')
          .insert({
            name: formData.name,
            amount: formData.amount,
            phone_number: formData.phone_number,
            shop: formData.shop,
          });

        if (error) throw error;
        toast.success("Supply added successfully");
      }

      await fetchSupplies();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving supply:', error);
      toast.error(`Failed to save supply: ${error.message}`);
    }
  };

  const handleEdit = (supply: Supply) => {
    setEditingSupply(supply);
    setFormData({
      name: supply.name,
      amount: supply.amount,
      phone_number: supply.phone_number || "",
      shop: supply.shop,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supply?")) return;

    try {
      const { error } = await supabase
        .from('supplies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchSupplies();
      toast.success("Supply deleted successfully");
    } catch (error: any) {
      console.error('Error deleting supply:', error);
      toast.error(`Failed to delete supply: ${error.message}`);
    }
  };

  const resetForm = () => {
    setEditingSupply(null);
    setFormData({
      name: "",
      amount: 0,
      phone_number: "",
      shop: "A",
    });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Supplies</h2>
            <p className="text-muted-foreground">Manage inventory across all shops</p>
          </div>
        </div>
        
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Setup Required</CardTitle>
            <CardDescription>
              The database tables need to be created first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Error: {error}
            </p>
            <div className="space-y-2 text-sm">
              <p>To set up the database:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to your Supabase dashboard</li>
                <li>Open the SQL Editor</li>
                <li>Run the table creation SQL</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading supplies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Supplies</h2>
          <p className="text-muted-foreground">Manage inventory across all shops</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supply
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
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
                  placeholder="Enter supply name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  required
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop">Shop *</Label>
                <Select value={formData.shop} onValueChange={(value) => setFormData({ ...formData, shop: value })}>
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
            <div className="text-3xl font-bold">
              {filteredSupplies.reduce((sum, s) => sum + (s.amount || 0), 0)}
            </div>
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
          {supplies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No supplies found.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Supply
              </Button>
            </div>
          ) : (
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
                    <TableCell>{supply.phone_number || "N/A"}</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Supplies;
