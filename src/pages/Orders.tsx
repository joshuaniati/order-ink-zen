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
import { Plus, Pencil, Trash2, Search, ArrowUpDown, Printer, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { WeeklyBudgetCard } from "@/components/orders/WeeklyBudgetCard";
import { WeeklyBudgetReport } from "@/components/orders/WeeklyBudgetReport";
import { useLocation } from "react-router-dom";

interface OrdersProps {
  selectedShop: Shop;
}

type Order = Tables<'orders'>;
type Supply = Tables<'supplies'>;
type WeeklyBudget = Tables<'weekly_budgets'>;

type SortField = 'supply_name' | 'order_date' | 'delivery_date' | 'order_amount' | 'amount_delivered';
type SortDirection = 'asc' | 'desc';

const Orders = ({ selectedShop }: OrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [weeklyBudgets, setWeeklyBudgets] = useState<WeeklyBudget[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [sortField, setSortField] = useState<SortField>('order_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCurrentWeekOnly, setShowCurrentWeekOnly] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('');
  
  // New state for print date range
  const [printDateFrom, setPrintDateFrom] = useState('');
  const [printDateTo, setPrintDateTo] = useState('');
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const location = useLocation();
  
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

  // Get current week's start date (Monday) and end date (Sunday)
  const getCurrentWeekRange = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculate Monday (start of week)
    const monday = new Date(now);
    const diffToMonday = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go to previous Monday
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    // Calculate Sunday (end of week)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const currentWeekRange = getCurrentWeekRange();
  const currentWeekStart = currentWeekRange.start;
  const currentWeekEnd = currentWeekRange.end;

  // Get current period from today to end of current week (Sunday)
  const getCurrentPeriodRange = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    
    const sunday = new Date(currentWeekRange.end);
    sunday.setHours(23, 59, 59, 999);
    
    return {
      start: start.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const currentPeriodRange = getCurrentPeriodRange();

  // Get previous week's start and end dates (Monday to Sunday)
  const getPreviousWeekRange = () => {
    const currentRange = getCurrentWeekRange();
    const monday = new Date(currentRange.start);
    const sunday = new Date(currentRange.end);
    
    // Go back 7 days to get previous week
    monday.setDate(monday.getDate() - 7);
    sunday.setDate(sunday.getDate() - 7);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const previousWeekRange = getPreviousWeekRange();

  // Initialize print dates with previous week range
  useEffect(() => {
    if (previousWeekRange.start && previousWeekRange.end) {
      setPrintDateFrom(previousWeekRange.start);
      setPrintDateTo(previousWeekRange.end);
    }
  }, [previousWeekRange]);

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

      const uniqueShops = [...new Set(suppliesResponse.data?.map(s => s.shop).filter(Boolean) || [])] as string[];
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

  // Handle navigation state from dashboard
  useEffect(() => {
    const navigationState = location.state as {
      filter?: string;
      currentWeekStart?: string;
      previousWeekRange?: any;
    } | null;

    if (navigationState?.filter) {
      setActiveFilter(navigationState.filter);
      
      switch (navigationState.filter) {
        case 'current-week-orders':
          setShowCurrentWeekOnly(true);
          setSearchQuery('');
          setDateFrom('');
          setDateTo('');
          break;
          
        case 'delivered-this-week':
          setShowCurrentWeekOnly(true);
          setSearchQuery('status:Delivered');
          setDateFrom('');
          setDateTo('');
          break;
          
        case 'remaining-orders':
          setShowCurrentWeekOnly(true);
          setSearchQuery('status:Pending,Partial');
          setDateFrom('');
          setDateTo('');
          break;
          
        case 'previous-week-delivered':
          setShowCurrentWeekOnly(false);
          setSearchQuery('status:Delivered');
          setDateFrom(previousWeekRange.start);
          setDateTo(previousWeekRange.end);
          break;
          
        case 'total-delivered':
          setShowCurrentWeekOnly(false);
          setSearchQuery('status:Delivered');
          setDateFrom('');
          setDateTo('');
          break;
          
        case 'still-awaiting':
          setShowCurrentWeekOnly(false);
          setSearchQuery('status:Pending,Partial');
          setDateFrom('');
          setDateTo('');
          break;
          
        case 'pending':
          setShowCurrentWeekOnly(false);
          setSearchQuery('status:Pending');
          setDateFrom('');
          setDateTo('');
          break;
          
        case 'budget':
        case 'budget-savings':
        case 'available-budget':
          setShowCurrentWeekOnly(true);
          setSearchQuery('');
          setDateFrom('');
          setDateTo('');
          break;
          
        default:
          break;
      }
    }
  }, [location.state]);

  const filteredOrders = orders.filter(order => {
    if (selectedShop !== "All" && order.shop !== selectedShop) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = order.supply_name?.toLowerCase().includes(query);
      const matchesOrderedBy = order.ordered_by?.toLowerCase().includes(query);
      const matchesContact = order.contact_person?.toLowerCase().includes(query);
      const matchesStatus = query.includes('status:') && 
        (query.includes(order.status?.toLowerCase() || ''));
      
      if (!matchesName && !matchesOrderedBy && !matchesContact && !matchesStatus) {
        return false;
      }
    }

    if (dateFrom && order.order_date < dateFrom) {
      return false;
    }
    if (dateTo && order.order_date > dateTo) {
      return false;
    }

    if (showCurrentWeekOnly) {
      const orderDate = new Date(order.order_date);
      const periodStart = new Date(currentPeriodRange.start);
      const periodEnd = new Date(currentPeriodRange.end);
      
      // Show orders from today until end of current week (Sunday)
      if (orderDate < periodStart || orderDate > periodEnd) {
        return false;
      }
    }

    return true;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortField.includes('date')) {
      aValue = new Date(aValue || 0).getTime();
      bValue = new Date(bValue || 0).getTime();
    }

    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

  const handleBudgetUpdate = async () => {
    await fetchData();
  };

  // Updated function to include orders delivered during the selected date range
  const getDeliveredOrdersByDateRange = (shopName: string, startDate: string, endDate: string) => {
    return orders.filter(order => {
      const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);
      rangeEnd.setHours(23, 59, 59, 999);
      
      // Include orders that were delivered within the selected date range, regardless of when they were ordered
      return order.shop === shopName && 
             order.status === "Delivered" &&
             deliveryDate && 
             deliveryDate >= rangeStart && 
             deliveryDate <= rangeEnd;
    });
  };

  // Print compact delivery list for selected date range
  const printDeliveryList = (shopName: string, startDate: string, endDate: string) => {
    const deliveredOrders = getDeliveredOrdersByDateRange(shopName, startDate, endDate);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the delivery list");
      return;
    }

    const totalAmount = deliveredOrders.reduce((sum, order) => sum + (order.amount_delivered || 0), 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery List - ${shopName}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 0;
              color: #333;
              font-size: 11px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 12px;
              border-bottom: 2px solid #333;
              padding-bottom: 8px;
            }
            .shop-name { 
              font-size: 18px; 
              font-weight: bold;
              margin-bottom: 4px;
            }
            .period { 
              font-size: 10px;
              color: #666;
              line-height: 1.3;
            }
            .subtitle {
              font-size: 9px;
              color: #888;
              margin-bottom: 8px;
              text-align: center;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 12px;
              font-size: 10px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
              font-size: 10px;
            }
            .total-row { 
              background-color: #f0f0f0; 
              font-weight: bold; 
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 8px;
              padding: 6px;
              border: 1px solid #ddd;
            }
            .signature-line {
              border-top: 1px solid #333;
              width: 120px;
              margin-top: 20px;
            }
            .signature-label {
              margin-top: 3px;
              font-size: 9px;
              text-align: center;
            }
            .invoice-row {
              page-break-inside: avoid;
            }
            .signature-container {
              display: flex;
              justify-content: space-between;
              gap: 10px;
            }
            .signature-container > div {
              flex: 1;
            }
            .invoice-number {
              height: 16px;
              border-bottom: 1px solid #333;
              min-width: 80px;
              display: inline-block;
            }
            .final-auth {
              margin-top: 12px;
              padding: 10px;
              border: 1px solid #333;
              background-color: #f9f9f9;
            }
            .final-auth-title {
              text-align: center;
              font-weight: bold;
              margin-bottom: 8px;
              font-size: 11px;
            }
            .footer-note {
              margin-top: 10px;
              font-size: 9px;
              color: #666;
              text-align: center;
              line-height: 1.4;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${shopName} - Delivery List</div>
            <div class="period">Delivery Period: ${startDate} to ${endDate}</div>
            <div class="subtitle">Includes all orders delivered in the selected date range (regardless of order date)</div>
            <div class="period">Generated: ${new Date().toLocaleDateString()}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 35%;">Supply Name</th>
                <th style="width: 12%;">Order Date</th>
                <th style="width: 12%;">Delivery Date</th>
                <th style="width: 15%;">Amount (ZAR)</th>
                <th style="width: 15%;">Invoice #</th>
                <th style="width: 23%;">Signatures</th>
              </tr>
            </thead>
            <tbody>
              ${deliveredOrders.map(order => `
                <tr class="invoice-row">
                  <td>${order.supply_name || 'N/A'}</td>
                  <td>${order.order_date || 'N/A'}</td>
                  <td>${order.delivery_date || 'N/A'}</td>
                  <td>${formatCurrency(order.amount_delivered || 0)}</td>
                  <td><div class="invoice-number"></div></td>
                  <td>
                    <div class="signature-container">
                      <div>
                        <div class="signature-line"></div>
                        <div class="signature-label">Handed By</div>
                      </div>
                      <div>
                        <div class="signature-line"></div>
                        <div class="signature-label">Received By</div>
                      </div>
                    </div>
                  </td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total Amount</strong></td>
                <td></td>
                <td></td>
                <td><strong>${formatCurrency(totalAmount)}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
          
          <div class="final-auth">
            <div class="final-auth-title">FINAL AUTHORIZATION</div>
            <div class="signature-section">
              <div>
                <div class="signature-line" style="width: 180px;"></div>
                <div class="signature-label">Manager/Authorized Signatory</div>
              </div>
              <div>
                <div class="signature-line" style="width: 180px;"></div>
                <div class="signature-label">Accounting Department</div>
              </div>
            </div>
          </div>
          
          <div class="footer-note">
            For accounting department payment processing | All invoices must be signed by both parties | Invoice numbers filled manually during processing
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setIsPrintDialogOpen(false);
  };

  // Print all shops with compact layout for selected date range
  const printAllShopsDeliveryList = (startDate: string, endDate: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the delivery lists");
      return;
    }

    let allContent = '';
    
    shops.forEach(shopName => {
      const deliveredOrders = getDeliveredOrdersByDateRange(shopName, startDate, endDate);
      if (deliveredOrders.length === 0) return;
      
      const totalAmount = deliveredOrders.reduce((sum, order) => sum + (order.amount_delivered || 0), 0);

      const shopContent = `
        <div style="page-break-after: always;">
          <div class="header">
            <div class="shop-name">${shopName} - Delivery List</div>
            <div class="period">Delivery Period: ${startDate} to ${endDate}</div>
            <div class="subtitle">Includes all orders delivered in the selected date range (regardless of order date)</div>
            <div class="period">Generated: ${new Date().toLocaleDateString()}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 35%;">Supply Name</th>
                <th style="width: 12%;">Order Date</th>
                <th style="width: 12%;">Delivery Date</th>
                <th style="width: 15%;">Amount (ZAR)</th>
                <th style="width: 15%;">Invoice #</th>
                <th style="width: 23%;">Signatures</th>
              </tr>
            </thead>
            <tbody>
              ${deliveredOrders.map(order => `
                <tr class="invoice-row">
                  <td>${order.supply_name || 'N/A'}</td>
                  <td>${order.order_date || 'N/A'}</td>
                  <td>${order.delivery_date || 'N/A'}</td>
                  <td>${formatCurrency(order.amount_delivered || 0)}</td>
                  <td><div class="invoice-number"></div></td>
                  <td>
                    <div class="signature-container">
                      <div>
                        <div class="signature-line"></div>
                        <div class="signature-label">Handed By</div>
                      </div>
                      <div>
                        <div class="signature-line"></div>
                        <div class="signature-label">Received By</div>
                      </div>
                    </div>
                  </td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total Amount</strong></td>
                <td></td>
                <td></td>
                <td><strong>${formatCurrency(totalAmount)}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
          
          <div class="final-auth">
            <div class="final-auth-title">FINAL AUTHORIZATION</div>
            <div class="signature-section">
              <div>
                <div class="signature-line" style="width: 180px;"></div>
                <div class="signature-label">Manager/Authorized Signatory</div>
              </div>
              <div>
                <div class="signature-line" style="width: 180px;"></div>
                <div class="signature-label">Accounting Department</div>
              </div>
            </div>
          </div>
          
          <div class="footer-note">
            For accounting department payment processing | All invoices must be signed by both parties | Invoice numbers filled manually during processing
          </div>
        </div>
      `;
      
      allContent += shopContent;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Shops Delivery Lists</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 0;
              color: #333;
              font-size: 11px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 12px;
              border-bottom: 2px solid #333;
              padding-bottom: 8px;
            }
            .shop-name { 
              font-size: 18px; 
              font-weight: bold;
              margin-bottom: 4px;
            }
            .period { 
              font-size: 10px;
              color: #666;
              line-height: 1.3;
            }
            .subtitle {
              font-size: 9px;
              color: #888;
              margin-bottom: 8px;
              text-align: center;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 12px;
              font-size: 10px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
              font-size: 10px;
            }
            .total-row { 
              background-color: #f0f0f0; 
              font-weight: bold; 
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 8px;
              padding: 6px;
              border: 1px solid #ddd;
            }
            .signature-line {
              border-top: 1px solid #333;
              width: 120px;
              margin-top: 20px;
            }
            .signature-label {
              margin-top: 3px;
              font-size: 9px;
              text-align: center;
            }
            .invoice-row {
              page-break-inside: avoid;
            }
            .signature-container {
              display: flex;
              justify-content: space-between;
              gap: 10px;
            }
            .signature-container > div {
              flex: 1;
            }
            .invoice-number {
              height: 16px;
              border-bottom: 1px solid #333;
              min-width: 80px;
              display: inline-block;
            }
            .final-auth {
              margin-top: 12px;
              padding: 10px;
              border: 1px solid #333;
              background-color: #f9f9f9;
            }
            .final-auth-title {
              text-align: center;
              font-weight: bold;
              margin-bottom: 8px;
              font-size: 11px;
            }
            .footer-note {
              margin-top: 10px;
              font-size: 9px;
              color: #666;
              text-align: center;
              line-height: 1.4;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${allContent || '<div class="header"><div class="shop-name">No delivered orders found for the selected date range</div></div>'}
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setIsPrintDialogOpen(false);
  };

  const shopsWithBudgets = shops.map(shop => {
    const budget = weeklyBudgets.find(b => b.shop === shop && b.week_start_date === currentWeekStart);
    const shopWeekOrders = orders.filter(o => {
      const orderDate = new Date(o.order_date);
      return o.shop === shop && orderDate >= new Date(currentWeekStart) && orderDate <= new Date(currentWeekEnd);
    });

    const totalOrdered = shopWeekOrders.reduce((sum, order) => sum + (order.order_amount || 0), 0);
    const totalDelivered = shopWeekOrders.reduce((sum, order) => sum + (order.amount_delivered || 0), 0);
    const budgetAmount = budget?.budget_amount || 0;
    const remainingIfAllDelivered = budgetAmount - totalOrdered;
    const remainingBasedOnDelivered = budgetAmount - totalDelivered;

    return {
      shop,
      budget,
      orders: shopWeekOrders,
      totalOrdered,
      totalDelivered,
      remainingIfAllDelivered,
      remainingBasedOnDelivered,
      budgetAmount
    };
  });

  const pendingOrders = sortedOrders.filter(o => o.status === "Pending");
  const partialOrders = sortedOrders.filter(o => o.status === "Partial");
  const deliveredOrders = sortedOrders.filter(o => o.status === "Delivered");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "secondary" | "default" | "destructive"> = {
      Pending: "secondary",
      Partial: "default",
      Delivered: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
        {sortField === field && (
          <span className="ml-1 text-xs">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </TableHead>
  );

  const getFilterDescription = () => {
    switch (activeFilter) {
      case 'current-week-orders':
        return `Showing orders placed from today (${currentPeriodRange.start}) to end of week (${currentPeriodRange.end})`;
      case 'delivered-this-week':
        return `Showing orders delivered from today (${currentPeriodRange.start}) to end of week (${currentPeriodRange.end})`;
      case 'remaining-orders':
        return `Showing pending orders from today (${currentPeriodRange.start}) to end of week (${currentPeriodRange.end})`;
      case 'previous-week-delivered':
        return `Showing previous week orders delivered (${previousWeekRange.start} to ${previousWeekRange.end})`;
      case 'total-delivered':
        return 'Showing all delivered orders';
      case 'still-awaiting':
        return 'Showing all orders awaiting delivery';
      case 'pending':
        return 'Showing all pending orders';
      case 'budget':
        return `Showing current week orders (${currentWeekStart} to ${currentWeekEnd}) for budget overview`;
      default:
        return `${selectedShop === "All" ? "All shops" : `Shop ${selectedShop}`} orders`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">{getFilterDescription()}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Print Delivery List
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Print Delivery List</DialogTitle>
                <DialogDescription>
                  Select the date range for the delivery list you want to print
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="printDateFrom">From Date (Monday)</Label>
                  <Input
                    id="printDateFrom"
                    type="date"
                    value={printDateFrom}
                    onChange={(e) => setPrintDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="printDateTo">To Date (Sunday)</Label>
                  <Input
                    id="printDateTo"
                    type="date"
                    value={printDateTo}
                    onChange={(e) => setPrintDateTo(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPrintDateFrom(previousWeekRange.start);
                      setPrintDateTo(previousWeekRange.end);
                    }}
                    className="flex-1"
                  >
                    Last Week
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPrintDateFrom(currentWeekStart);
                      setPrintDateTo(currentWeekEnd);
                    }}
                    className="flex-1"
                  >
                    This Week
                  </Button>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsPrintDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!printDateFrom || !printDateTo) {
                        toast.error("Please select both start and end dates");
                        return;
                      }
                      if (selectedShop === "All") {
                        printAllShopsDeliveryList(printDateFrom, printDateTo);
                      } else {
                        printDeliveryList(selectedShop, printDateFrom, printDateTo);
                      }
                    }}
                    disabled={!printDateFrom || !printDateTo}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingOrder ? "Edit Order" : "Create New Order"}</DialogTitle>
                <DialogDescription>
                  Enter order details and delivery information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
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
                  <div className="space-y-2">
                    <Label htmlFor="orderDate">Order Date *</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      required
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orderedBy">Ordered By (Email) *</Label>
                    <Input
                      id="orderedBy"
                      type="email"
                      required
                      value={formData.ordered_by}
                      onChange={(e) => setFormData({ ...formData, ordered_by: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      type="text"
                      required
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="Name of person you spoke to"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orderAmount">Order Amount (ZAR) *</Label>
                    <Input
                      id="orderAmount"
                      type="number"
                      required
                      value={formData.order_amount}
                      onChange={(e) => setFormData({ ...formData, order_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountDelivered">Amount Delivered (ZAR)</Label>
                    <Input
                      id="amountDelivered"
                      type="number"
                      value={formData.amount_delivered}
                      onChange={(e) => setFormData({ ...formData, amount_delivered: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate">Expected Delivery *</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      required
                      value={formData.delivery_date}
                      onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    />
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
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or status:"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weekFilter">Week Filter</Label>
              <Select value={showCurrentWeekOnly ? "current" : "all"} onValueChange={(value) => setShowCurrentWeekOnly(value === "current")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="current">From Today to Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(searchQuery || dateFrom || dateTo || showCurrentWeekOnly || activeFilter) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
              {dateFrom && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  From: {dateFrom}
                  <button onClick={() => setDateFrom('')} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
              {dateTo && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  To: {dateTo}
                  <button onClick={() => setDateTo('')} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
              {showCurrentWeekOnly && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  From Today to Sunday
                  <button onClick={() => setShowCurrentWeekOnly(false)} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
              {activeFilter && (
                <Badge variant="default" className="flex items-center gap-1">
                  Filter: {activeFilter.replace(/-/g, ' ')}
                  <button onClick={() => setActiveFilter('')} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setDateFrom('');
                  setDateTo('');
                  setShowCurrentWeekOnly(false);
                  setActiveFilter('');
                }}
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-3">
          {selectedShop === "All" ? "Weekly Budgets - All Shops" : `Weekly Budget - ${selectedShop}`}
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {selectedShop === "All" ? (
            shopsWithBudgets.map(({ shop, budget, orders: shopOrders, totalOrdered, totalDelivered, remainingIfAllDelivered, remainingBasedOnDelivered, budgetAmount }) => (
              <WeeklyBudgetCard
                key={shop}
                shop={shop}
                currentBudget={budget}
                weekOrders={shopOrders}
                weekStartStr={currentWeekStart}
                onBudgetUpdate={handleBudgetUpdate}
                totalOrdered={totalOrdered}
                totalDelivered={totalDelivered}
                remainingIfAllDelivered={remainingIfAllDelivered}
                remainingBasedOnDelivered={remainingBasedOnDelivered}
                budgetAmount={budgetAmount}
              />
            ))
          ) : (
            <WeeklyBudgetCard
              shop={selectedShop}
              currentBudget={shopsWithBudgets.find(s => s.shop === selectedShop)?.budget || null}
              weekOrders={shopsWithBudgets.find(s => s.shop === selectedShop)?.orders || []}
              weekStartStr={currentWeekStart}
              onBudgetUpdate={handleBudgetUpdate}
              totalOrdered={shopsWithBudgets.find(s => s.shop === selectedShop)?.totalOrdered || 0}
              totalDelivered={shopsWithBudgets.find(s => s.shop === selectedShop)?.totalDelivered || 0}
              remainingIfAllDelivered={shopsWithBudgets.find(s => s.shop === selectedShop)?.remainingIfAllDelivered || 0}
              remainingBasedOnDelivered={shopsWithBudgets.find(s => s.shop === selectedShop)?.remainingBasedOnDelivered || 0}
              budgetAmount={shopsWithBudgets.find(s => s.shop === selectedShop)?.budgetAmount || 0}
            />
          )}
        </div>
      </div>

      {selectedShop !== "All" && (
        <div>
          <WeeklyBudgetReport
            shop={selectedShop}
            currentBudget={shopsWithBudgets.find(s => s.shop === selectedShop)?.budget || null}
            weekOrders={shopsWithBudgets.find(s => s.shop === selectedShop)?.orders || []}
            weekStartStr={currentWeekStart}
            totalOrdered={shopsWithBudgets.find(s => s.shop === selectedShop)?.totalOrdered || 0}
            totalDelivered={shopsWithBudgets.find(s => s.shop === selectedShop)?.totalDelivered || 0}
            remainingIfAllDelivered={shopsWithBudgets.find(s => s.shop === selectedShop)?.remainingIfAllDelivered || 0}
            remainingBasedOnDelivered={shopsWithBudgets.find(s => s.shop === selectedShop)?.remainingBasedOnDelivered || 0}
            budgetAmount={shopsWithBudgets.find(s => s.shop === selectedShop)?.budgetAmount || 0}
          />
        </div>
      )}

      {selectedShop !== "All" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Weekly Budget:</span>
                  <span className="text-sm font-medium">{formatCurrency(shopsWithBudgets.find(s => s.shop === selectedShop)?.budgetAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Orders Placed:</span>
                  <span className="text-sm font-medium">{formatCurrency(shopsWithBudgets.find(s => s.shop === selectedShop)?.totalOrdered || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount Delivered:</span>
                  <span className="text-sm font-medium">{formatCurrency(shopsWithBudgets.find(s => s.shop === selectedShop)?.totalDelivered || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
              <CardDescription>If all orders delivered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(shopsWithBudgets.find(s => s.shop === selectedShop)?.remainingIfAllDelivered || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {shopsWithBudgets.find(s => s.shop === selectedShop)?.orders.length || 0} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Available Budget</CardTitle>
              <CardDescription>Based on actual deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (shopsWithBudgets.find(s => s.shop === selectedShop)?.remainingBasedOnDelivered || 0) >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formatCurrency(shopsWithBudgets.find(s => s.shop === selectedShop)?.remainingBasedOnDelivered || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Actual cash remaining
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pending Orders</CardTitle>
            <CardDescription>Awaiting delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingOrders.length}</div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(pendingOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0))} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Partial Deliveries</CardTitle>
            <CardDescription>Incomplete orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{partialOrders.length}</div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(partialOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0))} ordered
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>Fully delivered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{deliveredOrders.length}</div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(deliveredOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0))} total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order List</CardTitle>
          <CardDescription>
            {getFilterDescription()}
            {sortedOrders.length !== filteredOrders.length && ` (${sortedOrders.length} of ${filteredOrders.length} shown)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="supply_name">Supply</SortableHeader>
                <SortableHeader field="order_date">Order Date</SortableHeader>
                <TableHead>Ordered By</TableHead>
                <TableHead>Contact Person</TableHead>
                <SortableHeader field="order_amount">Amount (ZAR)</SortableHeader>
                <SortableHeader field="amount_delivered">Delivered (ZAR)</SortableHeader>
                <SortableHeader field="delivery_date">Delivery Date</SortableHeader>
                <TableHead>Shop</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.supply_name}</TableCell>
                  <TableCell>{order.order_date}</TableCell>
                  <TableCell>{order.ordered_by}</TableCell>
                  <TableCell>{order.contact_person}</TableCell>
                  <TableCell>{formatCurrency(order.order_amount)}</TableCell>
                  <TableCell>{formatCurrency(order.amount_delivered)}</TableCell>
                  <TableCell>{order.delivery_date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.shop}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(order)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sortedOrders.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              {searchQuery || dateFrom || dateTo || showCurrentWeekOnly 
                ? "No orders match your search criteria. Try adjusting your filters."
                : "No orders found. Create your first order to get started."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;
