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
import type { Tables } from "@/integrations/supabase/types";

interface SuppliesProps {
  selectedShop: Shop;
}

type Supply = Tables<'supplies'>;

const Supplies = ({ selectedShop }: SuppliesProps) => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    amount: 0,
    phone_number: "",
    shop: "",
  });

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("Fetching supplies from Supabase...");
      
      // Fetch supplies
      const { data: suppliesData, error: suppliesError } = await supabase
        .from('supplies')
        .select('*')
        .order('created_at', { ascending: false });

      if (suppliesError) {
        console.error('Supabase supplies error:', suppliesError);
        throw suppliesError;
      }

      console.log("Supplies data received:", suppliesData);
      setSupplies(suppliesData || []);

      // Extract unique shops from supplies
      const uniqueShops = [...new Set(suppliesData?.map(s => s.shop).filter(Boolean) || [])];
      console.log("Unique shops found:", uniqueShops);
      setShops(uniqueShops);
      
      // Set default shop in form if available
      if (uniqueShops.length > 0 && !formData.shop) {
        setFormData(prev => ({ ...prev, shop: uniqueShops[0] }));
      } else if (uniqueShops.length === 0) {
        // If no shops in database, set default to Shop A
        setFormData(prev => ({ ...prev, shop: "A" }));
      }

    } catch (error: any) {
      console.error('Error fetching supplies:', error);
      toast.error(`Failed to load supplies: ${error.message}`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log("Submitting form data:", formData);

      if (editingSupply) {
        // Update existing supply
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

        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }
        toast.success("Supply updated successfully");
      } else {
        // Create new supply
        const { data, error } = await supabase
          .from('supplies')
          .insert({
            name: formData.name,
            amount: formData.amount,
            phone_number: formData.phone_number,
            shop: formData.shop,
          })
          .select();

        if (error) {
          console.error('Supabase insert error:', error);
          throw error;
        }
        console.log("Insert successful, data:", data);
        toast.success("Supply added successfully");
      }

      // Refresh all data including shops list
      await fetchData();
      
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

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      // Refresh data after deletion
      await fetchData();
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
      shop: shops[0] || "A",
    });
  };

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
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="Enter phone number"
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
                      {/* Always show the basic shop options */}
                      {!shops.includes("A") && <SelectItem value="A">Shop A</SelectItem>}
                      {!shops.includes("B") && <SelectItem value="B">Shop B</SelectItem>}
                      {!shops.includes("C") && <SelectItem value="C">Shop C</SelectItem>}
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
