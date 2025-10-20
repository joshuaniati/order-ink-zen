import { Shop } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { useShops } from "@/hooks/useShops";
import { useState } from "react";

interface HeaderProps {
  selectedShop: Shop;
  onShopChange: (shop: Shop) => void;
}

const Header = ({ selectedShop, onShopChange }: HeaderProps) => {
  const { shops, addShop } = useShops();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newShopName, setNewShopName] = useState("");

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newShopName.trim()) {
      try {
        await addShop(newShopName.trim());
        setNewShopName("");
        setIsDialogOpen(false);
        toast.success("Shop added successfully");
      } catch (error: any) {
        toast.error(error.message || "Failed to add shop");
      }
    }
  };

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary">
              <Store className="h-4 w-4 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-bold text-foreground">Supply Manager</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Multi-Shop Management System</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="sm:hidden md:inline">Add Shop</span>
                  <span className="hidden sm:inline md:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90vw] sm:max-w-md">
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
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm text-muted-foreground">Shop:</span>
              <Select value={selectedShop} onValueChange={(value) => onShopChange(value)}>
                <SelectTrigger className="w-full sm:w-40 md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-[100]">
                  <SelectItem value="All">All Shops</SelectItem>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.name}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
