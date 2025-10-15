export type Shop = string;

export interface Supply {
  id: string;
  name: string;
  amount: number;
  shop: Shop;
  createdAt: string;
}

export interface WeeklyBudget {
  id: string;
  shop: Shop;
  weekStartDate: string;
  budgetAmount: number;
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
