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
import { Plus, Pencil, Trash2, Store, Search, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useShops } from "@/hooks/useShops";
import { useLocation } from "react-router-dom";

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

type SortField = 'name' | 'amount' | 'shop' | 'created_at';
type SortDirection = 'asc' | 'desc';

const Supplies = ({ selectedShop }: SuppliesProps) => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isShopDialogOpen, setIsShopDialogOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeFilter, setActiveFilter] = useState<string>('');
  
  const { shops, loading: shopsLoading, addShop, refreshShops } = useShops();
  const location = useLocation();
  
  const [supplyFormData, setSupplyFormData] = useState({
    name: "",
    amount: 0,
    phone_number: "",
    shop: "",
  });

  const [shopFormData, setShopFormData] = useState({
    name: "",
  });

  // Handle navigation state from dashboard
  useEffect(() => {
    const navigationState = location.state as {
      filter?: string;
    } | null;

    if (navigationState?.filter) {
      setActiveFilter(navigationState.filter);
      
      switch (navigationState.filter) {
        case 'all':
          setSearchQuery('');
          break;
        case 'recent':
          setSortField('created_at');
          setSortDirection('desc');
          setSearchQuery('');
          break;
        case 'inventory-value':
          setSortField('amount');
          setSortDirection('desc');
          setSearchQuery('');
          break;
        case 'summary':
          setSearchQuery('');
          break;
        default:
          break;
      }
    }
  }, [location.state]);

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

  // Apply search filter
  const searchedSupplies = filteredSupplies.filter(supply => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      supply.name.toLowerCase().includes(query) ||
      supply.shop.toLowerCase().includes(query) ||
      (supply.phone_number && supply.phone_number.includes(query))
    );
  });

  // Sort supplies
  const sortedSupplies = [...searchedSupplies].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortField === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

    // Clear previous errors
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

  // Check if shop name already exists
  const shopExists = (shopName: string) => {
    return shops.some(shop => 
      shop.name.toLowerCase() === shopName.toLowerCase().trim()
    );
  };

  const getFilterDescription = () => {
    switch (activeFilter) {
      case 'all':
        return 'Showing all supplies';
      case 'recent':
        return 'Showing recently added supplies';
      case 'inventory-value':
        return 'Showing supplies sorted by value';
      case 'summary':
        return 'Showing inventory summary';
      default:
        return `${selectedShop === "All" ? "All shops" : selectedShop} - ${filteredSupplies.length} supplies`;
    }
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

  // Calculate inventory summary
  const totalInventoryValue = filteredSupplies.reduce((sum, supply) => sum + (supply.amount || 0), 0);
  const totalItems = filteredSupplies.length;
  const shopsCount = new Set(filteredSupplies.map(s => s.shop)).size;

  if (loading || shopsLoading) {
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
          <p className="text-muted-foreground">{getFilterDescription()}</p>
        </div>
        <div className="flex gap-2">
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
                      // Clear error when user starts typing
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

      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, shop, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          
          {(searchQuery || activeFilter) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
              {activeFilter && (
                <Badge variant="default" className="flex items-center gap-1">
                  Filter: {activeFilter.replace(/-/g, ' ')}
                  <button onClick={() => setActiveFilter('')} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('');
                }}
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Summary Cards */}
      {activeFilter === 'summary' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {shopsCount} shop{shopsCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R {totalInventoryValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total amount across all supplies
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Average per Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R {totalItems > 0 ? (totalInventoryValue / totalItems).toFixed(2) : '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average value per supply item
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Supplies List</CardTitle>
          <CardDescription>
            {getFilterDescription()}
            {sortedSupplies.length !== filteredSupplies.length && ` (${sortedSupplies.length} of ${filteredSupplies.length} shown)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedSupplies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No supplies match your search criteria." : "No supplies found. Click 'Add Supply' to create one."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="name">Name</SortableHeader>
                  <SortableHeader field="amount">Amount</SortableHeader>
                  <TableHead>Phone Number</TableHead>
                  <SortableHeader field="shop">Shop</SortableHeader>
                  <SortableHeader field="created_at">Created</SortableHeader>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSupplies.map((supply) => (
                  <TableRow key={supply.id}>
                    <TableCell className="font-medium">{supply.name}</TableCell>
                    <TableCell>R {supply.amount.toLocaleString()}</TableCell>
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
  );
};

export default Supplies;
