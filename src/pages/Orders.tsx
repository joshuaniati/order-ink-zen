import { useState, useEffect } from "react";
import { Shop, OrderStatus } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Calendar, Edit, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { WeeklyBudgetCard } from "@/components/orders/WeeklyBudgetCard";
import { WeeklyBudgetReport } from "@/components/orders/WeeklyBudgetReport";

interface OrdersProps {
  selectedShop: Shop;
}

type Order = Tables<'orders'>;
type Supply = Tables<'supplies'>;
type WeeklyBudget = Tables<'weekly_budgets'>;

const Orders = ({ selectedShop }: OrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [weeklyBudgets, setWeeklyBudgets] = useState<WeeklyBudget[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWeekSelectOpen, setIsWeekSelectOpen] = useState(false);
  const [isBudgetEditOpen, setIsBudgetEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingBudget, setEditingBudget] = useState<WeeklyBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    supply_id: "",
    order_date: today,
    ordered_by: "",
    contact_person: "",
    order_amount: 0,
    amount_delivered: 0,
    delivery_date: "",
    shop: "",
    notes: "",
  });

  const [budgetFormData, setBudgetFormData] = useState({
    budget_amount: 0,
    week_start_date: "",
    shop: "",
  });

  // Function to get Monday of the current week
  const getMonday = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  // Function to get Sunday of the current week
  const getSunday = (date: Date) => {
    const monday = getMonday(new Date(date));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday;
  };

  // Function to format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Function to get week range string
  const getWeekRangeString = (monday: Date, sunday: Date) => {
    return `${formatDate(monday)} to ${formatDate(sunday)}`;
  };

  // Initialize selected week to current week
  useEffect(() => {
    const monday = getMonday(new Date());
    const sunday = getSunday(new Date());
    setSelectedWeek(getWeekRangeString(monday, sunday));
    
    const hasSeenPopup = localStorage.getItem('hasSeenWeekPopup');
    if (!hasSeenPopup) {
      setIsWeekSelectOpen(true);
      localStorage.setItem('hasSeenWeekPopup', 'true');
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [ordersResponse, suppliesResponse, budgetsResponse] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('supplies').select('*'),
        supabase.from('weekly_budgets').select('*')
      ]);

      if (ordersResponse.error) throw ordersResponse.error;
      if (suppliesResponse.error) throw suppliesResponse.error;
      if (budgetsResponse.error) throw budgetsResponse.error;

      setOrders(ordersResponse.data || []);
      setSupplies(suppliesResponse.data || []);
      setWeeklyBudgets(budgetsResponse.data || []);

      const uniqueShops = [...new Set(suppliesResponse.data?.map(s => s.shop).filter(Boolean) || [])];
      setShops(uniqueShops);
      
      if (uniqueShops.length > 0 && !formData.shop) {
        setFormData(prev => ({ ...prev, shop: uniqueShops[0] }));
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get current week's Monday date from selected week string
  const getCurrentWeekMonday = () => {
    if (selectedWeek) {
      return selectedWeek.split(' to ')[0];
    }
    return formatDate(getMonday(new Date()));
  };

  // Get last week's Monday date
  const getLastWeekMonday = () => {
    const currentMonday = new Date(getCurrentWeekMonday());
    const lastWeekMonday = new Date(currentMonday);
    lastWeekMonday.setDate(currentMonday.getDate() - 7);
    return formatDate(lastWeekMonday);
  };

  // Filter orders based on selected shop AND selected week - INCLUDING last week orders delivered this week
  const filteredOrders = (selectedShop === "All" ? orders : orders.filter(o => o.shop === selectedShop))
    .filter(order => {
      if (!selectedWeek) return true;
      
      const orderDate = new Date(order.order_date);
      const weekMonday = new Date(getCurrentWeekMonday());
      const weekSunday = getSunday(weekMonday);
      
      // Include orders placed this week OR delivered this week (even if placed last week)
      const placedThisWeek = orderDate >= weekMonday && orderDate <= weekSunday;
      
      // Check if delivered this week (regardless of order date)
      const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
      const deliveredThisWeek = deliveryDate && 
                               deliveryDate >= weekMonday && 
                               deliveryDate <= weekSunday &&
                               order.status === "Delivered";
      
      return placedThisWeek || deliveredThisWeek;
    });

  // Calculate current week's spending for SELECTED SHOP ONLY
  const calculateCurrentWeekSpending = () => {
    const weekMonday = new Date(getCurrentWeekMonday());
    const weekSunday = getSunday(weekMonday);
    
    let weekOrders: Order[] = [];
    
    if (selectedShop === "All") {
      weekOrders = orders.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate >= weekMonday && orderDate <= weekSunday;
      });
    } else {
      weekOrders = orders.filter(order => {
        const orderDate = new Date(order.order_date);
        return order.shop === selectedShop && 
               orderDate >= weekMonday && 
               orderDate <= weekSunday;
      });
    }

    return weekOrders.reduce((total, order) => total + (order.order_amount || 0), 0);
  };

  // Get current week's budget for SELECTED SHOP ONLY
  const getCurrentWeekBudget = () => {
    const weekMonday = getCurrentWeekMonday();
    
    if (selectedShop === "All") {
      const shopBudgets = weeklyBudgets.filter(budget => budget.week_start_date === weekMonday);
      return shopBudgets.reduce((total, budget) => total + (budget.budget_amount || 0), 0);
    } else {
      const budget = weeklyBudgets.find(
        b => b.shop === selectedShop && b.week_start_date === weekMonday
      );
      return budget?.budget_amount || 0;
    }
  };

  // Get last week's budget for SELECTED SHOP ONLY
  const getLastWeekBudget = () => {
    const lastWeekMonday = getLastWeekMonday();
    
    if (selectedShop === "All") {
      const shopBudgets = weeklyBudgets.filter(budget => budget.week_start_date === lastWeekMonday);
      return shopBudgets.reduce((total, budget) => total + (budget.budget_amount || 0), 0);
    } else {
      const budget = weeklyBudgets.find(
        b => b.shop === selectedShop && b.week_start_date === lastWeekMonday
      );
      return budget?.budget_amount || 0;
    }
  };

  const currentWeekSpending = calculateCurrentWeekSpending();
  const currentWeekBudget = getCurrentWeekBudget();
  const lastWeekBudget = getLastWeekBudget();
  const budgetDifference = currentWeekBudget - currentWeekSpending;

  // Get delivered orders for the current week for each shop - INCLUDING last week orders delivered this week
  const getWeeklyDeliveredOrders = (shopName: string) => {
    const weekMonday = new Date(getCurrentWeekMonday());
    const weekSunday = getSunday(weekMonday);
    
    return orders.filter(order => {
      const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
      const shopMatches = shopName === "All" || order.shop === shopName;
      
      return shopMatches && 
             order.status === "Delivered" &&
             deliveryDate &&
             deliveryDate >= weekMonday && 
             deliveryDate <= weekSunday;
    });
  };

  // Get last week orders delivered this week
  const getLastWeekOrdersDeliveredThisWeek = (shopName: string) => {
    const weekMonday = new Date(getCurrentWeekMonday());
    const weekSunday = getSunday(weekMonday);
    const lastWeekMonday = new Date(weekMonday);
    lastWeekMonday.setDate(weekMonday.getDate() - 7);
    const lastWeekSunday = getSunday(lastWeekMonday);
    
    return orders.filter(order => {
      const orderDate = new Date(order.order_date);
      const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
      const shopMatches = shopName === "All" || order.shop === shopName;
      
      return shopMatches &&
             orderDate >= lastWeekMonday && 
             orderDate <= lastWeekSunday && 
             deliveryDate &&
             deliveryDate >= weekMonday && 
             deliveryDate <= weekSunday &&
             order.status === "Delivered";
    });
  };

  // Print weekly delivery list for a specific shop with individual signatures
  const printWeeklyDeliveryList = (shopName: string) => {
    const deliveredOrders = getWeeklyDeliveredOrders(shopName);
    const lastWeekOrders = getLastWeekOrdersDeliveredThisWeek(shopName);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the delivery list");
      return;
    }

    const totalAmount = deliveredOrders.reduce((sum, order) => sum + (order.amount_delivered || 0), 0);
    const lastWeekTotal = lastWeekOrders.reduce((sum, order) => sum + (order.amount_delivered || 0), 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Weekly Delivery List - ${shopName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 15px;
              color: #333;
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 1px solid #333;
              padding-bottom: 15px;
            }
            .shop-name { 
              font-size: 18px; 
              font-weight: bold;
              margin-bottom: 5px;
            }
            .period { 
              font-size: 12px;
              color: #666;
            }
            .summary { 
              margin-bottom: 20px;
              padding: 10px;
              background-color: #f9f9f9;
              border-radius: 4px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              font-size: 11px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px 4px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .total-row { 
              background-color: #f0f0f0; 
              font-weight: bold; 
            }
            .last-week-row {
              background-color: #fff3cd;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
              padding: 8px;
              border: 1px solid #ddd;
            }
            .signature-line {
              border-top: 1px solid #333;
              width: 150px;
              margin-top: 30px;
            }
            .signature-label {
              margin-top: 3px;
              font-size: 10px;
              text-align: center;
            }
            .invoice-row {
              border-bottom: 1px solid #333;
            }
            .signature-container {
              display: flex;
              justify-content: space-between;
              margin-top: 5px;
            }
            .invoice-number {
              height: 15px;
              border-bottom: 1px solid #333;
              min-width: 80px;
              display: inline-block;
            }
            @media print {
              body { margin: 10px; }
              .no-print { display: none; }
              .invoice-row { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${shopName} - Weekly Delivery List</div>
            <div class="period">Period: ${selectedWeek}</div>
            <div class="period">Generated on: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="summary">
            <strong>Summary:</strong><br>
            - Total Orders Delivered This Week: ${deliveredOrders.length}<br>
            - Last Week Orders Delivered This Week: ${lastWeekOrders.length}<br>
            - Total Amount: ${formatCurrency(totalAmount)}<br>
            - Last Week Orders Total: ${formatCurrency(lastWeekTotal)}
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 20%">Supply Name</th>
                <th style="width: 12%">Order Date</th>
                <th style="width: 12%">Date Delivered</th>
                <th style="width: 12%">Amount (ZAR)</th>
                <th style="width: 14%">Invoice Number</th>
                <th style="width: 30%">Signatures</th>
              </tr>
            </thead>
            <tbody>
              ${deliveredOrders.map(order => {
                const isLastWeekOrder = lastWeekOrders.some(lastWeekOrder => lastWeekOrder.id === order.id);
                return `
                  <tr class="invoice-row ${isLastWeekOrder ? 'last-week-row' : ''}">
                    <td>${order.supply_name || 'N/A'}</td>
                    <td>${order.order_date || 'N/A'}</td>
                    <td>${order.delivery_date || 'N/A'}</td>
                    <td>${formatCurrency(order.amount_delivered || 0)}</td>
                    <td>
                      <div class="invoice-number"></div>
                    </td>
                    <td>
                      <div class="signature-container">
                        <div>
                          <div class="signature-line"></div>
                          <div class="signature-label">Handed Over By</div>
                        </div>
                        <div>
                          <div class="signature-line"></div>
                          <div class="signature-label">Received By</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>Total Amount</strong></td>
                <td><strong>${formatCurrency(totalAmount)}</strong></td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>

          ${lastWeekOrders.length > 0 ? `
            <div style="margin-top: 20px; padding: 10px; background-color: #fff3cd; border-radius: 4px;">
              <strong>Note:</strong> ${lastWeekOrders.length} orders marked in yellow were placed last week but delivered this week.
            </div>
          ` : ''}
          
          <div style="margin-top: 20px; padding: 15px; border: 1px solid #333; background-color: #f9f9f9;">
            <div style="text-align: center; font-weight: bold; margin-bottom: 10px; font-size: 11px;">FINAL AUTHORIZATION</div>
            <div class="signature-section">
              <div>
                <div class="signature-line" style="width: 200px;"></div>
                <div class="signature-label">Manager/Authorized Signatory</div>
              </div>
              <div>
                <div class="signature-line" style="width: 200px;"></div>
                <div class="signature-label">Accounting Department</div>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 15px; font-size: 10px; color: #666; text-align: center;">
            This document is for accounting department payment processing<br>
            All individual invoices must be signed by both parties<br>
            Invoice numbers to be filled manually during payment processing
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  // Print all shops weekly delivery lists with individual signatures
  const printAllShopsWeeklyDelivery = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the delivery lists");
      return;
    }

    let allContent = '';
    
    shops.forEach(shopName => {
      const deliveredOrders = getWeeklyDeliveredOrders(shopName);
      const lastWeekOrders = getLastWeekOrdersDeliveredThisWeek(shopName);
      if (deliveredOrders.length === 0) return;
      
      const totalAmount = deliveredOrders.reduce((sum, order) => sum + (order.amount_delivered || 0), 0);
      const lastWeekTotal = lastWeekOrders.reduce((sum, order) => sum + (order.amount_delivered || 0), 0);

      const shopContent = `
        <div style="page-break-after: always;">
          <div class="header">
            <div class="shop-name">${shopName} - Weekly Delivery List</div>
            <div class="period">Period: ${selectedWeek}</div>
            <div class="period">Generated on: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="summary">
            <strong>Summary:</strong><br>
            - Total Orders Delivered This Week: ${deliveredOrders.length}<br>
            - Last Week Orders Delivered This Week: ${lastWeekOrders.length}<br>
            - Total Amount: ${formatCurrency(totalAmount)}<br>
            - Last Week Orders Total: ${formatCurrency(lastWeekTotal)}
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 20%">Supply Name</th>
                <th style="width: 12%">Order Date</th>
                <th style="width: 12%">Date Delivered</th>
                <th style="width: 12%">Amount (ZAR)</th>
                <th style="width: 14%">Invoice Number</th>
                <th style="width: 30%">Signatures</th>
              </tr>
            </thead>
            <tbody>
              ${deliveredOrders.map(order => {
                const isLastWeekOrder = lastWeekOrders.some(lastWeekOrder => lastWeekOrder.id === order.id);
                return `
                  <tr class="invoice-row ${isLastWeekOrder ? 'last-week-row' : ''}">
                    <td>${order.supply_name || 'N/A'}</td>
                    <td>${order.order_date || 'N/A'}</td>
                    <td>${order.delivery_date || 'N/A'}</td>
                    <td>${formatCurrency(order.amount_delivered || 0)}</td>
                    <td>
                      <div class="invoice-number"></div>
                    </td>
                    <td>
                      <div class="signature-container">
                        <div>
                          <div class="signature-line"></div>
                          <div class="signature-label">Handed Over By</div>
                        </div>
                        <div>
                          <div class="signature-line"></div>
                          <div class="signature-label">Received By</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>Total Amount</strong></td>
                <td><strong>${formatCurrency(totalAmount)}</strong></td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>

          ${lastWeekOrders.length > 0 ? `
            <div style="margin-top: 20px; padding: 10px; background-color: #fff3cd; border-radius: 4px;">
              <strong>Note:</strong> ${lastWeekOrders.length} orders marked in yellow were placed last week but delivered this week.
            </div>
          ` : ''}
          
          <div style="margin-top: 20px; padding: 15px; border: 1px solid #333; background-color: #f9f9f9;">
            <div style="text-align: center; font-weight: bold; margin-bottom: 10px; font-size: 11px;">FINAL AUTHORIZATION</div>
            <div class="signature-section">
              <div>
                <div class="signature-line" style="width: 200px;"></div>
                <div class="signature-label">Manager/Authorized Signatory</div>
              </div>
              <div>
                <div class="signature-line" style="width: 200px;"></div>
                <div class="signature-label">Accounting Department</div>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 15px; font-size: 10px; color: #666; text-align: center;">
            This document is for accounting department payment processing<br>
            All individual invoices must be signed by both parties<br>
            Invoice numbers to be filled manually during payment processing
          </div>
        </div>
      `;
      
      allContent += shopContent;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Shops Weekly Delivery Lists</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 15px;
              color: #333;
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 1px solid #333;
              padding-bottom: 15px;
            }
            .shop-name { 
              font-size: 18px; 
              font-weight: bold;
              margin-bottom: 5px;
            }
            .period { 
              font-size: 12px;
              color: #666;
            }
            .summary { 
              margin-bottom: 20px;
              padding: 10px;
              background-color: #f9f9f9;
              border-radius: 4px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              font-size: 11px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px 4px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .total-row { 
              background-color: #f0f0f0; 
              font-weight: bold; 
            }
            .last-week-row {
              background-color: #fff3cd;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
              padding: 8px;
              border: 1px solid #ddd;
            }
            .signature-line {
              border-top: 1px solid #333;
              width: 150px;
              margin-top: 30px;
            }
            .signature-label {
              margin-top: 3px;
              font-size: 10px;
              text-align: center;
            }
            .invoice-row {
              border-bottom: 1px solid #333;
            }
            .signature-container {
              display: flex;
              justify-content: space-between;
              margin-top: 5px;
            }
            .invoice-number {
              height: 15px;
              border-bottom: 1px solid #333;
              min-width: 80px;
              display: inline-block;
            }
            @media print {
              body { margin: 10px; }
              .no-print { display: none; }
              .invoice-row { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${allContent || '<div class="header"><div class="shop-name">No delivered orders found for this week</div></div>'}
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const supply = supplies.find(s => s.id === formData.supply_id);
    if (!supply) {
      toast.error("Please select a valid supply");
      return;
    }

    const status: OrderStatus = 
      formData.amount_delivered === 0 ? "Pending" :
      formData.amount_delivered < formData.order_amount ? "Partial" : "Delivered";

    try {
      if (editingOrder) {
        const { error } = await supabase
          .from('orders')
          .update({
            supply_id: formData.supply_id,
            supply_name: supply.name,
            order_date: formData.order_date,
            ordered_by: formData.ordered_by,
            contact_person: formData.contact_person,
            order_amount: formData.order_amount,
            amount_delivered: formData.amount_delivered,
            delivery_date: formData.delivery_date,
            shop: formData.shop,
            notes: formData.notes,
            status,
          })
          .eq('id', editingOrder.id);

        if (error) throw error;
        toast.success("Order updated successfully");
      } else {
        const { error } = await supabase
          .from('orders')
          .insert({
            supply_id: formData.supply_id,
            supply_name: supply.name,
            order_date: formData.order_date,
            ordered_by: formData.ordered_by,
            contact_person: formData.contact_person,
            order_amount: formData.order_amount,
            amount_delivered: formData.amount_delivered,
            delivery_date: formData.delivery_date,
            shop: formData.shop,
            notes: formData.notes,
            status,
          });

        if (error) throw error;
        toast.success("Order created successfully");
      }

      await fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving order:', error);
      toast.error(`Failed to save order: ${error.message}`);
    }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBudget) {
        const { error } = await supabase
          .from('weekly_budgets')
          .update({
            budget_amount: budgetFormData.budget_amount,
          })
          .eq('id', editingBudget.id);

        if (error) throw error;
        toast.success("Budget updated successfully");
      } else {
        const { error } = await supabase
          .from('weekly_budgets')
          .insert({
            budget_amount: budgetFormData.budget_amount,
            week_start_date: budgetFormData.week_start_date,
            shop: budgetFormData.shop,
          });

        if (error) throw error;
        toast.success("Budget created successfully");
      }

      await fetchData();
      setIsBudgetEditOpen(false);
      resetBudgetForm();
    } catch (error: any) {
      console.error('Error saving budget:', error);
      toast.error(`Failed to save budget: ${error.message}`);
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      supply_id: order.supply_id,
      order_date: order.order_date,
      ordered_by: order.ordered_by,
      contact_person: order.contact_person,
      order_amount: order.order_amount,
      amount_delivered: order.amount_delivered,
      delivery_date: order.delivery_date,
      shop: order.shop,
      notes: order.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleEditBudget = (budget: WeeklyBudget | null, weekStartDate?: string) => {
    setEditingBudget(budget);
    setBudgetFormData({
      budget_amount: budget?.budget_amount || 0,
      week_start_date: budget?.week_start_date || weekStartDate || getCurrentWeekMonday(),
      shop: budget?.shop || selectedShop,
    });
    setIsBudgetEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
      toast.success("Order deleted successfully");
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast.error(`Failed to delete order: ${error.message}`);
    }
  };

  const resetForm = () => {
    setEditingOrder(null);
    setFormData({
      supply_id: "",
      order_date: today,
      ordered_by: "",
      contact_person: "",
      order_amount: 0,
      amount_delivered: 0,
      delivery_date: "",
      shop: shops[0] || "",
      notes: "",
    });
  };

  const resetBudgetForm = () => {
    setEditingBudget(null);
    setBudgetFormData({
      budget_amount: 0,
      week_start_date: getCurrentWeekMonday(),
      shop: selectedShop,
    });
  };

  const handleBudgetUpdate = async () => {
    await fetchData();
  };

  // Generate week options (current week and previous 4 weeks)
  const generateWeekOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() === 0 ? -6 : today.getDay() - 1) - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      options.push({
        value: getWeekRangeString(weekStart, weekEnd),
        label: `Week of ${formatDate(weekStart)} to ${formatDate(weekEnd)}`
      });
    }
    
    return options;
  };

  const weekOptions = generateWeekOptions();

  const pendingOrders = filteredOrders.filter(o => o.status === "Pending");
  const partialOrders = filteredOrders.filter(o => o.status === "Partial");
  const deliveredOrders = filteredOrders.filter(o => o.status === "Delivered");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "secondary" | "default"> = {
      Pending: "secondary",
      Partial: "default",
      Delivered: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Selection Dialog */}
      <Dialog open={isWeekSelectOpen} onOpenChange={setIsWeekSelectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Week</DialogTitle>
            <DialogDescription>
              Please select the week you want to view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select a week" />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setIsWeekSelectOpen(false)}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Budget Edit Dialog */}
      <Dialog open={isBudgetEditOpen} onOpenChange={(open) => {
        setIsBudgetEditOpen(open);
        if (!open) resetBudgetForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? "Edit Weekly Budget" : "Create Weekly Budget"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBudgetSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budgetAmount">Budget Amount *</Label>
              <Input
                id="budgetAmount"
                type="number"
                required
                value={budgetFormData.budget_amount}
                onChange={(e) => setBudgetFormData({ ...budgetFormData, budget_amount: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBudgetEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingBudget ? "Update" : "Create"} Budget
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Header Section - More Compact */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {selectedWeek}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWeekSelectOpen(true)}
              className="h-7 text-xs"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Change Week
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Print Weekly Delivery List Button */}
          {selectedShop === "All" ? (
            <Button 
              variant="outline" 
              onClick={printAllShopsWeeklyDelivery}
              disabled={shops.every(shop => getWeeklyDeliveredOrders(shop).length === 0)}
              size="sm"
            >
              <Printer className="mr-2 h-3 w-3" />
              Print All Lists
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => printWeeklyDeliveryList(selectedShop)}
              disabled={getWeeklyDeliveredOrders(selectedShop).length === 0}
              size="sm"
            >
              <Printer className="mr-2 h-3 w-3" />
              Print List
            </Button>
          )}
          
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-3 w-3" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Current Week Budget Overview - More Compact */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center space-y-1">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(currentWeekBudget)}
            </div>
            <div className="text-xs text-muted-foreground">Weekly Budget</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(currentWeekSpending)}
            </div>
            <div className="text-xs text-muted-foreground">Current Spending</div>
          </div>
          <div className="text-center space-y-1">
            <div className={`text-lg font-bold ${
              budgetDifference >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(Math.abs(budgetDifference))}
            </div>
            <div className="text-xs text-muted-foreground">
              {budgetDifference >= 0 ? 'Remaining' : 'Over Budget'}
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-lg font-bold text-purple-600">
              {formatCurrency(lastWeekBudget)}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              Last Week
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => {
                  const lastWeekMonday = getLastWeekMonday();
                  const lastWeekBudget = weeklyBudgets.find(
                    b => b.shop === selectedShop && b.week_start_date === lastWeekMonday
                  );
                  handleEditBudget(lastWeekBudget || null, lastWeekMonday);
                }}
              >
                <Edit className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Delivery Report Section */}
      {getLastWeekOrdersDeliveredThisWeek(selectedShop).length > 0 && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-amber-700 dark:text-amber-300">
                📦 Last Week Orders Delivered This Week
              </span>
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                {getLastWeekOrdersDeliveredThisWeek(selectedShop).length} orders
              </Badge>
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-400">
              Orders placed last week but delivered during {selectedWeek}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getLastWeekOrdersDeliveredThisWeek(selectedShop).map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-amber-200">
                  <div>
                    <div className="font-medium">{order.supply_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Ordered: {order.order_date} | Delivered: {order.delivery_date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(order.amount_delivered)}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(order)}
                      className="h-6 w-6 p-0 mt-1"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Budgets Section - More Compact */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold">
          {selectedShop === "All" ? "Weekly Budgets - All Shops" : `Weekly Budget - ${selectedShop}`}
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {selectedShop === "All" ? (
            shops.map((shop) => {
              const budget = weeklyBudgets.find(b => b.shop === shop && b.week_start_date === getCurrentWeekMonday());
              const shopWeekOrders = orders.filter(o => {
                const orderDate = new Date(o.order_date);
                const weekMonday = new Date(getCurrentWeekMonday());
                const weekSunday = getSunday(weekMonday);
                return o.shop === shop && orderDate >= weekMonday && orderDate <= weekSunday;
              });
              
              return (
                <WeeklyBudgetCard
                  key={shop}
                  shop={shop}
                  currentBudget={budget || null}
                  weekOrders={shopWeekOrders}
                  weekStartStr={getCurrentWeekMonday()}
                  onBudgetUpdate={handleBudgetUpdate}
                />
              );
            })
          ) : (
            <WeeklyBudgetCard
              shop={selectedShop}
              currentBudget={weeklyBudgets.find(b => b.shop === selectedShop && b.week_start_date === getCurrentWeekMonday()) || null}
              weekOrders={orders.filter(o => {
                const orderDate = new Date(o.order_date);
                const weekMonday = new Date(getCurrentWeekMonday());
                const weekSunday = getSunday(weekMonday);
                return o.shop === selectedShop && orderDate >= weekMonday && orderDate <= weekSunday;
              })}
              weekStartStr={getCurrentWeekMonday()}
              onBudgetUpdate={handleBudgetUpdate}
            />
          )}
        </div>
      </div>

      {/* Weekly Budget Report - Printable */}
      {selectedShop !== "All" && (
        <div className="mt-2">
          <WeeklyBudgetReport
            shop={selectedShop}
            currentBudget={weeklyBudgets.find(b => b.shop === selectedShop && b.week_start_date === getCurrentWeekMonday()) || null}
            weekOrders={orders.filter(o => {
              const orderDate = new Date(o.order_date);
              const weekMonday = new Date(getCurrentWeekMonday());
              const weekSunday = getSunday(weekMonday);
              return o.shop === selectedShop && orderDate >= weekMonday && orderDate <= weekSunday;
            })}
            weekStartStr={getCurrentWeekMonday()}
          />
        </div>
      )}

      {/* Stats Cards - More Compact */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="space-y-1">
            <div className="text-lg font-bold">{pendingOrders.length}</div>
            <div className="text-xs text-muted-foreground">Pending Orders</div>
            <div className="text-xs text-blue-600">
              {formatCurrency(pendingOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0))} total
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <div className="text-lg font-bold">{partialOrders.length}</div>
            <div className="text-xs text-muted-foreground">Partial Deliveries</div>
            <div className="text-xs text-orange-600">
              {formatCurrency(partialOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0))} ordered
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <div className="text-lg font-bold">{deliveredOrders.length}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-xs text-green-600">
              {formatCurrency(deliveredOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0))} total
            </div>
          </div>
        </Card>
      </div>

      {/* Order List - More Compact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Order List</CardTitle>
          <CardDescription className="text-xs">
            {selectedShop === "All" ? "All shops" : `Shop ${selectedShop}`} orders for {selectedWeek}
            <br />
            <span className="text-amber-600">
              Includes orders placed last week but delivered this week
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2">Supply</TableHead>
                <TableHead className="py-2">Order Date</TableHead>
                <TableHead className="py-2">Delivery Date</TableHead>
                <TableHead className="py-2">Ordered By</TableHead>
                <TableHead className="py-2">Amount</TableHead>
                <TableHead className="py-2">Status</TableHead>
                <TableHead className="py-2 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const isLastWeekOrder = getLastWeekOrdersDeliveredThisWeek(selectedShop).some(
                  lastWeekOrder => lastWeekOrder.id === order.id
                );
                
                return (
                  <TableRow key={order.id} className={`h-12 ${isLastWeekOrder ? 'bg-amber-50' : ''}`}>
                    <TableCell className="py-2 font-medium">{order.supply_name}</TableCell>
                    <TableCell className="py-2">
                      {order.order_date}
                      {isLastWeekOrder && <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-800 text-xs">Last Week</Badge>}
                    </TableCell>
                    <TableCell className="py-2">{order.delivery_date}</TableCell>
                    <TableCell className="py-2">{order.ordered_by}</TableCell>
                    <TableCell className="py-2">{formatCurrency(order.order_amount)}</TableCell>
                    <TableCell className="py-2">{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(order)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(order.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredOrders.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No orders found for the selected week.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Dialog - RESTORED TO ORIGINAL LAYOUT */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingOrder ? "Edit Order" : "Create New Order"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplyId">Select Supply *</Label>
                <Select value={formData.supply_id} onValueChange={(value) => setFormData({ ...formData, supply_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose supply" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplies.map((supply) => (
                      <SelectItem key={supply.id} value={supply.id}>
                        {supply.name} - {supply.shop}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderDate">Order Date *</Label>
                  <Input
                    type="date"
                    required
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Delivery Date</Label>
                  <Input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderedBy">Ordered By *</Label>
                  <Input
                    required
                    value={formData.ordered_by}
                    onChange={(e) => setFormData({ ...formData, ordered_by: e.target.value })}
                    placeholder="Person who placed the order"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Supplier contact person"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderAmount">Order Amount *</Label>
                  <Input
                    type="number"
                    required
                    value={formData.order_amount}
                    onChange={(e) => setFormData({ ...formData, order_amount: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amountDelivered">Amount Delivered</Label>
                  <Input
                    type="number"
                    value={formData.amount_delivered}
                    onChange={(e) => setFormData({ ...formData, amount_delivered: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shop">Shop *</Label>
                <Select value={formData.shop} onValueChange={(value) => setFormData({ ...formData, shop: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop} value={shop}>{shop}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or comments..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingOrder ? "Update" : "Create"} Order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
