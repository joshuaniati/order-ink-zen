export type Shop = "A" | "B" | "C" | "All";

export interface Supply {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  pricePerUnit: number;
  supplier: string;
  minStockLevel: number;
  shop: Shop;
  createdAt: string;
}

export type OrderStatus = "Pending" | "Partial" | "Delivered";

export interface Order {
  id: string;
  supplyId: string;
  supplyName: string;
  orderDate: string;
  orderedBy: string;
  orderAmount: number;
  amountDelivered: number;
  deliveryDate: string;
  status: OrderStatus;
  shop: Shop;
  notes?: string;
  createdAt: string;
}

export interface DailyIncome {
  id: string;
  date: string;
  shop: Shop;
  dailyIncome: number;
  expenses: number;
  netIncome: number;
  notes?: string;
  createdAt: string;
}
