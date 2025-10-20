import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useShops } from "@/hooks/useShops";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  BarChart3,
  FileText,
  Store
} from "lucide-react";

interface SidebarProps {
  onNavigate?: () => void;
}

const Sidebar = ({ onNavigate }: SidebarProps = {}) => {
  const location = useLocation();
  const { shops } = useShops();

  const baseNavigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Supplies", href: "/supplies", icon: Package },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Daily Cash Up", href: "/cash-up", icon: DollarSign },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Reports", href: "/reports", icon: FileText },
  ];

  const shopNavigation = shops.map(shop => ({
    name: shop.name,
    href: `/shop/${encodeURIComponent(shop.name)}`,
    icon: Store
  }));

  const navigation = [...baseNavigation, ...shopNavigation];

  return (
    <aside className="w-64 border-r bg-card">
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
