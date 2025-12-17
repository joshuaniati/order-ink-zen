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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Store, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useShops } from "@/hooks/useShops";
import { formatCurrency } from "@/lib/currency";

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
}

const Supplies = ({ selectedShop }: SuppliesProps) => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isShopDialogOpen, setIsShopDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);
  const [printShopFilter, setPrintShopFilter] = useState<string>("");
  const [selectedSuppliesForPrint, setSelectedSuppliesForPrint] = useState<string[]>([]);
  
  const { shops, loading: shopsLoading, addShop } = useShops();
  
  const [supplyFormData, setSupplyFormData] = useState({
    name: "",
    amount: 0,
    phone_number: "",
    shop: "",
  });

  const [shopFormData, setShopFormData] = useState({
    name: "",
  });

  // Set default shop when shops load
  useEffect(() => {
    if (shops.length > 0 && !supplyFormData.shop) {
      setSupplyFormData(prev => ({ ...prev, shop: shops[0].name }));
    }
  }, [shops]);

  const fetchSupplies = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('supplies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSupplies(data || []);
      
    } catch (err: any) {
      console.error("Error:", err);
      toast.error(`Failed to load supplies: ${err.message}`);
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

  // Supplies filtered by shop for selection
  const suppliesForSelection = printShopFilter && printShopFilter !== "all"
    ? supplies.filter(s => s.shop === printShopFilter)
    : supplies;

  // Toggle supply selection for print
  const toggleSupplyForPrint = (supplyId: string) => {
    setSelectedSuppliesForPrint(prev =>
      prev.includes(supplyId)
        ? prev.filter(id => id !== supplyId)
        : [...prev, supplyId]
    );
  };

  // Select all supplies for current filter
  const selectAllSuppliesForPrint = () => {
    const filteredIds = suppliesForSelection.map(s => s.id);
    setSelectedSuppliesForPrint(filteredIds);
  };

  // Clear all supply selections
  const clearAllSuppliesForPrint = () => {
    setSelectedSuppliesForPrint([]);
  };

  const handlePrint = () => {
    if (selectedSuppliesForPrint.length === 0) {
      toast.error("Please select at least one supply");
      return;
    }

    const suppliesToPrint = supplies.filter(s => selectedSuppliesForPrint.includes(s.id));
    const shopName = printShopFilter && printShopFilter !== "all" ? printShopFilter : "All Shops";

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the form");
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Supplies Order List - ${shopName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .form-title { 
              font-size: 22px; 
              font-weight: bold;
              margin-bottom: 8px;
            }
            .shop-name {
              font-size: 18px;
              color: #555;
              margin-bottom: 5px;
            }
            .print-date {
              font-size: 12px;
              color: #777;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #333;
              padding: 12px 10px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
              font-size: 13px;
            }
            td {
              font-size: 12px;
            }
            .remark-col {
              width: 25%;
            }
            .ordered-col {
              width: 12%;
              text-align: center;
            }
            .checkbox {
              width: 18px;
              height: 18px;
              border: 2px solid #333;
              display: inline-block;
            }
            .total-row {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            @media print {
              body { margin: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="form-title">Supplies Order List</div>
            <div class="shop-name">${shopName}</div>
            <div class="print-date">Date: ${new Date().toLocaleDateString()}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Supply Name</th>
                <th>Suggested Amount</th>
                <th>Phone Number</th>
                <th class="remark-col">Remark</th>
                <th class="ordered-col">Ordered</th>
              </tr>
            </thead>
            <tbody>
              ${suppliesToPrint.map(supply => `
                <tr>
                  <td>${supply.name}</td>
                  <td>R ${supply.amount.toFixed(2)}</td>
                  <td>${supply.phone_number || '-'}</td>
                  <td class="remark-col"></td>
                  <td class="ordered-col"><div class="checkbox"></div></td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>Total</td>
                <td>R ${suppliesToPrint.reduce((sum, s) => sum + s.amount, 0).toFixed(2)}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setIsPrintDialogOpen(false);
    toast.success("Generating order list...");
  };

  const handleSupplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSupply) {
        const { error } = await supabase
          .from('supplies')
          .update({
            name: supplyFormData.name,
            amount: supplyFormData.amount,
            phone_number: supplyFormData.phone_number,
            shop: supplyFormData.shop,
          })
          .eq('id', editingSupply.id);

        if (error) throw error;
        toast.success("Supply updated successfully");
      } else {
        const { error } = await supabase
          .from('supplies')
          .insert({
            name: supplyFormData.name,
            amount: supplyFormData.amount,
            phone_number: supplyFormData.phone_number,
            shop: supplyFormData.shop,
          });

        if (error) throw error;
        toast.success("Supply added successfully");
      }

      await fetchSupplies();
      setIsDialogOpen(false);
      resetSupplyForm();
    } catch (error: any) {
      console.error('Error saving supply:', error);
      toast.error(`Failed to save supply: ${error.message}`);
    }
  };

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopFormData.name.trim()) {
      toast.error("Please enter a shop name");
      return;
    }

    setShopError(null);

    try {
      await addShop(shopFormData.name.trim());
      toast.success("Shop added successfully");
      setIsShopDialogOpen(false);
      resetShopForm();
    } catch (error: any) {
      console.error('Error saving shop:', error);
      setShopError(error.message);
    }
  };

  const handleEdit = (supply: Supply) => {
    setEditingSupply(supply);
    setSupplyFormData({
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

  const resetSupplyForm = () => {
    setEditingSupply(null);
    setSupplyFormData({
      name: "",
      amount: 0,
      phone_number: "",
      shop: shops[0]?.name || "",
    });
  };

  const resetShopForm = () => {
    setShopFormData({
      name: "",
    });
    setShopError(null);
  };

  const shopExists = (shopName: string) => {
    return shops.some(shop => 
      shop.name.toLowerCase() === shopName.toLowerCase().trim()
    );
  };

  if (loading || shopsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading supplies...</div>
      </div>
    );
  }

  return (
    <>
      {/* Screen content - hidden when printing */}
      <div className="space-y-6 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Supplies</h2>
            <p className="text-muted-foreground">Manage inventory across all shops</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Printer className="mr-2 h-4 w-4" />
                  Print List
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Print Supplies List</DialogTitle>
                  <DialogDescription>
                    Select supplies to print an order list with checkboxes
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Filter by Shop (optional)</Label>
                    <Select value={printShopFilter} onValueChange={setPrintShopFilter}>
                      <SelectTrigger className="w-full md:w-[250px]">
                        <SelectValue placeholder="All Shops" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Shops</SelectItem>
                        {shops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.name}>
                            {shop.name} ({supplies.filter(s => s.shop === shop.name).length} supplies)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Select Supplies</Label>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={selectAllSuppliesForPrint}
                        >
                          Select All
                        </Button>
                        {selectedSuppliesForPrint.length > 0 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={clearAllSuppliesForPrint}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md max-h-60 overflow-y-auto">
                      {suppliesForSelection.map((supply) => (
                        <div key={supply.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`supply-print-${supply.id}`}
                            checked={selectedSuppliesForPrint.includes(supply.id)}
                            onCheckedChange={() => toggleSupplyForPrint(supply.id)}
                          />
                          <label 
                            htmlFor={`supply-print-${supply.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {supply.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedSuppliesForPrint.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {selectedSuppliesForPrint.length} supplies selected
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handlePrint} disabled={selectedSuppliesForPrint.length === 0}>
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isShopDialogOpen} onOpenChange={(open) => {
              setIsShopDialogOpen(open);
              if (!open) resetShopForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Store className="mr-2 h-4 w-4" />
                  Add Shop
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Shop</DialogTitle>
                  <DialogDescription>
                    Create a new shop that will be available for all supplies
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleShopSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shopName">Shop Name *</Label>
                    <Input
                      id="shopName"
                      required
                      value={shopFormData.name}
                      onChange={(e) => {
                        setShopFormData({ name: e.target.value });
                        if (shopError) setShopError(null);
                      }}
                      placeholder="Enter shop name"
                      className={shopError ? "border-destructive" : ""}
                    />
                    {shopError && (
                      <p className="text-sm text-destructive">{shopError}</p>
                    )}
                    {shopFormData.name.trim() && shopExists(shopFormData.name) && (
                      <p className="text-sm text-destructive">
                        Shop "{shopFormData.name}" already exists
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsShopDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={shopExists(shopFormData.name) || !shopFormData.name.trim()}
                    >
                      Add Shop
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetSupplyForm();
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
                    Enter supply details and select which shop it belongs to
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSupplySubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Supply Name *</Label>
                      <Input
                        id="name"
                        required
                        value={supplyFormData.name}
                        onChange={(e) => setSupplyFormData({ ...supplyFormData, name: e.target.value })}
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
                        value={supplyFormData.amount}
                        onChange={(e) => setSupplyFormData({ ...supplyFormData, amount: parseFloat(e.target.value) || 0 })}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Phone Number</Label>
                      <Input
                        id="phone_number"
                        type="tel"
                        value={supplyFormData.phone_number}
                        onChange={(e) => setSupplyFormData({ ...supplyFormData, phone_number: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop">Shop *</Label>
                      <Select 
                        value={supplyFormData.shop} 
                        onValueChange={(value) => setSupplyFormData({ ...supplyFormData, shop: value })}
                        required
                      >
                        <SelectTrigger className="bg-card border-input">
                          <SelectValue placeholder="Select a shop" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border z-[100] max-h-[300px] overflow-auto">
                          {shops.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                              No shops available. Please add a shop first.
                            </div>
                          ) : (
                            shops.map((shop) => (
                              <SelectItem 
                                key={shop.id} 
                                value={shop.name}
                                className="cursor-pointer"
                              >
                                {shop.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {shops.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {shops.length} shop{shops.length !== 1 ? 's' : ''} available
                        </p>
                      )}
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Supplies List</CardTitle>
            <CardDescription>
              {selectedShop === "All" ? "All shops" : selectedShop} - {filteredSupplies.length} supplies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSupplies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No supplies found. Click "Add Supply" to create one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupplies.map((supply) => (
                    <TableRow key={supply.id}>
                      <TableCell className="font-medium">{supply.name}</TableCell>
                      <TableCell>{formatCurrency(supply.amount)}</TableCell>
                      <TableCell>{supply.phone_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{supply.shop}</Badge>
                      </TableCell>
                      <TableCell>{new Date(supply.created_at).toLocaleDateString()}</TableCell>
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

    </>
  );
};

export default Supplies;