import { Supply, Order, DailyIncome, WeeklyBudget } from "@/types";

const SUPPLIES_KEY = "supplies";
const ORDERS_KEY = "orders";
const INCOME_KEY = "income";
const SHOPS_KEY = "shops";
const WEEKLY_BUDGET_KEY = "weekly_budgets";

// Supplies
export const getSupplies = (): Supply[] => {
  const data = localStorage.getItem(SUPPLIES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSupply = (supply: Supply): void => {
  const supplies = getSupplies();
  const index = supplies.findIndex((s) => s.id === supply.id);
  if (index > -1) {
    supplies[index] = supply;
  } else {
    supplies.push(supply);
  }
  localStorage.setItem(SUPPLIES_KEY, JSON.stringify(supplies));
};

export const deleteSupply = (id: string): void => {
  const supplies = getSupplies().filter((s) => s.id !== id);
  localStorage.setItem(SUPPLIES_KEY, JSON.stringify(supplies));
};

// Orders
export const getOrders = (): Order[] => {
  const data = localStorage.getItem(ORDERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveOrder = (order: Order): void => {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === order.id);
  if (index > -1) {
    orders[index] = order;
  } else {
    orders.push(order);
  }
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
};

export const deleteOrder = (id: string): void => {
  const orders = getOrders().filter((o) => o.id !== id);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
};

// Daily Income
export const getIncomeRecords = (): DailyIncome[] => {
  const data = localStorage.getItem(INCOME_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveIncomeRecord = (record: DailyIncome): void => {
  const records = getIncomeRecords();
  const index = records.findIndex((r) => r.id === record.id);
  if (index > -1) {
    records[index] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(INCOME_KEY, JSON.stringify(records));
};

export const deleteIncomeRecord = (id: string): void => {
  const records = getIncomeRecords().filter((r) => r.id !== id);
  localStorage.setItem(INCOME_KEY, JSON.stringify(records));
};

// Shops
export const getShops = (): string[] => {
  const data = localStorage.getItem(SHOPS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveShop = (shopName: string): void => {
  const shops = getShops();
  if (!shops.includes(shopName)) {
    shops.push(shopName);
    localStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
  }
};

export const deleteShop = (shopName: string): void => {
  const shops = getShops().filter((s) => s !== shopName);
  localStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
};

// Weekly Budgets
export const getWeeklyBudgets = (): WeeklyBudget[] => {
  const data = localStorage.getItem(WEEKLY_BUDGET_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveWeeklyBudget = (budget: WeeklyBudget): void => {
  const budgets = getWeeklyBudgets();
  const index = budgets.findIndex((b) => b.id === budget.id);
  if (index > -1) {
    budgets[index] = budget;
  } else {
    budgets.push(budget);
  }
  localStorage.setItem(WEEKLY_BUDGET_KEY, JSON.stringify(budgets));
};

export const getCurrentWeekBudget = (shop: string): WeeklyBudget | null => {
  const budgets = getWeeklyBudgets();
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekStartStr = weekStart.toISOString().split('T')[0];
  
  return budgets.find(b => b.shop === shop && b.weekStartDate === weekStartStr) || null;
};
