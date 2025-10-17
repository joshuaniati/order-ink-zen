import { useState, useEffect } from "react";
import { Shop } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useShopManagement } from "@/hooks/useShopManagement";

interface SuppliesProps {
  selectedShop: Shop;
}

const Supplies = ({ selectedShop }: SuppliesProps) => {
  const [supplies, setSupplies] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState<boolean | null>(null);
  const { shops, refreshShops } = useShopManagement();
  
  const [formData, setFormData] = useState({
    name: "",
    amount: 0,
    phone_number: "",
    shop: "",
  });

  // First, check if tables exist
  const checkTables = async () => {
    try {
      const { data, error } = await supabase.from('supplies').select('count');
      
      if (error) {
        console.error("Table check failed:", error);
        setTablesExist(false);
        return false;
      }
      
      setTablesExist(true);
      return true;
    } catch (err) {
      console.error("Table check error:", err);
      setTablesExist(false);
      return false;
    }
  };

  const fetchSupplies = async () => {
    try {
      setLoading(true);
      
      const tablesReady = await checkTables();
      if (!tablesReady) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('supplies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSupplies(data || []);
      
    } catch (err: any) {
      console.error("Error fetching supplies:", err);
      toast.error(`Database error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('supplies')
        .insert({
          name: formData.name,
          amount: formData.amount,
          phone_number: formData.phone_number,
          shop: formData.shop,
        });

      if (error) throw error;
      
      toast.success("Supply added successfully!");
      await fetchSupplies();
      refreshShops();
      setIsDialogOpen(false);
      setFormData({
        name: "",
        amount: 0,
        phone_number: "",
        shop: "",
      });
    } catch (error: any) {
      console.error('Error saving supply:', error);
      toast.error(`Failed to save supply: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Checking database...</div>
      </div>
    );
  }

  if (tablesExist === false) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Supplies</h2>
            <p className="text-muted-foreground">Manage inventory across all shops</p>
          </div>
        </div>
        
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Database Setup Required</CardTitle>
            <CardDescription className="text-yellow-700">
              The database tables need to be created in Supabase before you can use this app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-yellow-800">
                Follow these steps to set up the database:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
                <li>Go to your Supabase dashboard</li>
                <li>Click on <strong>SQL Editor</strong> in the left sidebar</li>
                <li>Create a new query and run the table creation SQL</li>
                <li>After running the SQL, refresh this page</li>
              </ol>
              <p className="text-sm text-yellow-800 mt-4">
                If you need help, the SQL code is available in the project documentation.
              </p>
            </div>
          </CardContent>
        </Card>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Supply</DialogTitle>
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
                <Select
                  required
                  value={formData.shop}
                  onValueChange={(value) => setFormData({ ...formData, shop: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop} value={shop}>
                        {shop}
                      </SelectItem>
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
                Add Supply
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

{supplies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No supplies found. Add your first supply to get started.</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Supply
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Supplies</CardTitle>
            <CardDescription>View and manage your supply inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.map((supply) => (
                  <TableRow key={supply.id}>
                    <TableCell className="font-medium">{supply.name}</TableCell>
                    <TableCell>{supply.amount}</TableCell>
                    <TableCell>{supply.phone_number}</TableCell>
                    <TableCell>{supply.shop}</TableCell>
                    <TableCell>{new Date(supply.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Supplies;
