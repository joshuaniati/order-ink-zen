import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Shop } from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const MainLayout = () => {
  const [selectedShop, setSelectedShop] = useState<Shop>("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header selectedShop={selectedShop} onShopChange={setSelectedShop} />
      <div className="flex flex-col md:flex-row">
        {/* Mobile Menu Button */}
        <div className="md:hidden fixed bottom-4 left-4 z-50">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="h-14 w-14 rounded-full shadow-lg">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden md:block">
          <Sidebar />
        </aside>

        <main className="flex-1 p-4 md:p-6 w-full overflow-x-auto">
          <Outlet context={{ selectedShop }} />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
