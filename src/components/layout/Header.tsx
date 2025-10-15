import { Shop } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store } from "lucide-react";

interface HeaderProps {
  selectedShop: Shop;
  onShopChange: (shop: Shop) => void;
}

const Header = ({ selectedShop, onShopChange }: HeaderProps) => {
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
            <span className="text-sm text-muted-foreground">Shop:</span>
            <Select value={selectedShop} onValueChange={(value) => onShopChange(value as Shop)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Shops</SelectItem>
                <SelectItem value="A">Shop A</SelectItem>
                <SelectItem value="B">Shop B</SelectItem>
                <SelectItem value="C">Shop C</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
