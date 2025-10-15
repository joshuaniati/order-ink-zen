import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Shop } from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

const MainLayout = () => {
  const [selectedShop, setSelectedShop] = useState<Shop>("All");

  return (
    <div className="min-h-screen bg-background">
      <Header selectedShop={selectedShop} onShopChange={setSelectedShop} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet context={{ selectedShop }} />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
