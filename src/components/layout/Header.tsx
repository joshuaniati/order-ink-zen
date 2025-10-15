import { useState, useEffect } from "react";
import { Shop } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getShops, saveShop } from "@/lib/storage";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Store } from "lucide-react";

interface HeaderProps {
  selectedShop: Shop;
  onShopChange: (shop: Shop) => void;
}

const Header = ({ selectedShop, onShopChange }: HeaderProps) => {
  const [shops, setShops] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newShopName, setNewShopName] = useState("");

  // Initialize shops and remove defaults
  useEffect(() => {
    const currentShops = getShops();
    const defaultShops = ["Shop A", "Shop B", "Shop C"];
    
    // Filter out the default shops
    const filteredShops = currentShops.filter(shop => !defaultShops.includes(shop));
    
    // If we filtered anything out, update storage
    if (filteredShops.length !== currentShops.length) {
      // Clear all shops from storage
      localStorage.removeItem('shops');
      // Re-add only the non-default shops
      filteredShops.forEach(shop => saveShop(shop));
      setShops(filteredShops);
    } else {
      setShops(currentShops);
    }
  }, []);

  const handleAddShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (newShopName.trim()) {
      saveShop(newShopName.trim());
      setShops(getShops());
      setNewShopName("");
      setIsDialogOpen(false);
      toast.success("Shop added successfully");
    }
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Supply Manager</h1>
              <p className="text-sm text-muted-foreground">Multi-Shop Management System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Shop</DialogTitle>
                  <DialogDescription>Enter the name for your new shop</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddShop} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shopName">Shop Name *</Label>
                    <Input
                      id="shopName"
                      required
                      value={newShopName}
                      onChange={(e) => setNewShopName(e.target.value)}
                      placeholder="e.g., Downtown Store"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Shop</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <span className="text-sm text-muted-foreground">Shop:</span>
            <Select value={selectedShop} onValueChange={(value) => onShopChange(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Shops</SelectItem>
                {shops.map((shop) => (
                  <SelectItem key={shop} value={shop}>{shop}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
