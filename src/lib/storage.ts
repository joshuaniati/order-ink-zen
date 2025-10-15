import { Supply, Order, DailyIncome } from "@/types";

const SUPPLIES_KEY = "supplies";
const ORDERS_KEY = "orders";
const INCOME_KEY = "income";

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
