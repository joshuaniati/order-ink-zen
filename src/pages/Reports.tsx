import { useState, useEffect } from "react";
import { Shop } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface ReportsProps {
  selectedShop: Shop;
}

type Supply = Tables<'supplies'>;
type Order = Tables<'orders'>;
type IncomeRecord = Tables<'income_records'>;

const Reports = ({ selectedShop }: ReportsProps) => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedShops, setSelectedShops] = useState<string[]>(selectedShop === "All" ? [] : [selectedShop]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeSupplies, setIncludeSupplies] = useState(true);
  const [includeOrders, setIncludeOrders] = useState(true);
  const [includeIncome, setIncludeIncome] = useState(true);

  // Helper to check if a shop is selected
  const isShopSelected = (shop: string) => {
    if (selectedShops.length === 0) return true; // All shops
    return selectedShops.includes(shop);
  };

  // Toggle shop selection
  const toggleShop = (shop: string) => {
    setSelectedShops(prev => 
      prev.includes(shop) 
        ? prev.filter(s => s !== shop)
        : [...prev, shop]
    );
  };

  // Select all shops
  const selectAllShops = () => {
    setSelectedShops([]);
  };

  // Clear all selections
  const clearAllShops = () => {
    setSelectedShops([]);
  };

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch supplies
        const { data: suppliesData, error: suppliesError } = await supabase
          .from('supplies')
          .select('*');

        // Fetch orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*');

        // Fetch income records
        const { data: incomeData, error: incomeError } = await supabase
          .from('income_records')
          .select('*');

        if (suppliesError) throw suppliesError;
        if (ordersError) throw ordersError;
        if (incomeError) throw incomeError;

        setSupplies(suppliesData || []);
        setOrders(ordersData || []);
        setIncomeRecords(incomeData || []);

        // Extract unique shops from all data sources
        const allShops = [
          ...new Set([
            ...(suppliesData?.map(s => s.shop) || []),
            ...(ordersData?.map(o => o.shop) || []),
            ...(incomeData?.map(i => i.shop) || [])
          ])
        ];
        setShops(allShops);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get filtered data based on selections
  const filteredSupplies = supplies.filter(s => {
    const matchesShop = isShopSelected(s.shop);
    
    // For supplies, we need to check if they have any orders within the date range
    // or if they were created/active during the date range
    // Since supplies don't have a date field, we'll check their related orders
    if (startDate || endDate) {
      const hasOrdersInRange = orders.some(order => 
        order.supply_id === s.id && 
        (!startDate || order.order_date >= startDate) && 
        (!endDate || order.order_date <= endDate)
      );
      return matchesShop && hasOrdersInRange;
    }
    
    return matchesShop;
  });

  const filteredOrders = orders.filter(o => {
    const matchesShop = isShopSelected(o.shop);
    const matchesDate = (!startDate || o.order_date >= startDate) && 
                       (!endDate || o.order_date <= endDate);
    return matchesShop && matchesDate;
  });

  const filteredIncome = incomeRecords.filter(r => {
    const matchesShop = isShopSelected(r.shop);
    const matchesDate = (!startDate || r.date >= startDate) && 
                       (!endDate || r.date <= endDate);
    return matchesShop && matchesDate;
  });

  const totalIncome = filteredIncome.reduce((sum, r) => sum + r.daily_income, 0);
  const totalExpenses = filteredIncome.reduce((sum, r) => sum + r.expenses, 0);
  const totalNet = filteredIncome.reduce((sum, r) => sum + r.net_income, 0);
  const totalOrders = filteredOrders.reduce((sum, o) => sum + o.order_amount, 0);
  const netDifference = totalIncome - totalOrders;
  
  // Calculate order status totals
  const deliveredOrders = filteredOrders.filter(o => o.status === 'Delivered');
  const pendingOrders = filteredOrders.filter(o => o.status === 'Pending');
  const partialOrders = filteredOrders.filter(o => o.status === 'Partial');
  
  const totalDelivered = deliveredOrders.reduce((sum, o) => sum + o.order_amount, 0);
  const totalPending = pendingOrders.reduce((sum, o) => sum + o.order_amount, 0);
  const partialOrderedAmount = partialOrders.reduce((sum, o) => sum + o.order_amount, 0);
  const partialDeliveredAmount = partialOrders.reduce((sum, o) => sum + o.amount_delivered, 0);
  const partialDifference = partialOrderedAmount - partialDeliveredAmount;

  const handlePrintCustom = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    // Create print content based on selected options
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the report");
      return;
    }

    let printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Business Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              color: #333;
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .report-title { 
              font-size: 24px; 
              font-weight: bold;
              margin-bottom: 10px;
            }
            .report-meta { 
              font-size: 14px;
              color: #666;
              margin-bottom: 5px;
            }
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .summary-card {
              border: 1px solid #ddd;
              padding: 15px;
              text-align: center;
              border-radius: 4px;
            }
            .summary-value {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .summary-label {
              font-size: 11px;
              color: #666;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              border-bottom: 1px solid #333;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px 6px;
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
            .no-data {
              text-align: center;
              padding: 20px;
              color: #666;
              font-style: italic;
            }
            @media print {
              body { margin: 15px; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="report-title">Business Report</div>
            <div class="report-meta">Generated on: ${new Date().toLocaleDateString()}</div>
            <div class="report-meta">Shop(s): ${selectedShops.length === 0 ? "All Shops" : selectedShops.join(', ')}</div>
            ${startDate && endDate ? `<div class="report-meta">Period: ${startDate} to ${endDate}</div>` : ''}
            <div class="report-meta">Report Includes: ${[
              includeSupplies && "Supplies",
              includeOrders && "Orders", 
              includeIncome && "Income Records"
            ].filter(Boolean).join(', ')}</div>
          </div>
    `;

    // Add summary cards
    printContent += `
      <div class="summary-cards">
        ${includeSupplies ? `
          <div class="summary-card">
            <div class="summary-value">${filteredSupplies.length}</div>
            <div class="summary-label">Total Supplies</div>
          </div>
        ` : ''}
        ${includeOrders ? `
          <div class="summary-card">
            <div class="summary-value">${formatCurrency(totalOrders)}</div>
            <div class="summary-label">Total Orders</div>
          </div>
        ` : ''}
        ${includeIncome ? `
          <div class="summary-card">
            <div class="summary-value">${formatCurrency(totalIncome)}</div>
            <div class="summary-label">Total Income</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${formatCurrency(netDifference)}</div>
            <div class="summary-label">Net Difference (Income - Orders)</div>
          </div>
        ` : ''}
      </div>
    `;

    // Add supplies section if selected
    if (includeSupplies && filteredSupplies.length > 0) {
      printContent += `
        <div class="section">
          <div class="section-title">Supplies Inventory</div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>Phone Number</th>
                <th>Shop</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSupplies.map(supply => `
                <tr>
                  <td>${supply.name || 'N/A'}</td>
                  <td>${supply.amount || 'N/A'}</td>
                  <td>${supply.phone_number || 'N/A'}</td>
                  <td>${supply.shop || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (includeSupplies) {
      printContent += `
        <div class="section">
          <div class="section-title">Supplies Inventory</div>
          <div class="no-data">No supplies data found for the selected filters</div>
        </div>
      `;
    }

    // Add orders section if selected
    if (includeOrders && filteredOrders.length > 0) {
      printContent += `
        <div class="section">
          <div class="section-title">Orders Summary</div>
          
          <div class="summary-cards" style="margin-bottom: 20px;">
            <div class="summary-card">
              <div class="summary-value">${formatCurrency(totalDelivered)}</div>
              <div class="summary-label">Total Delivered (${deliveredOrders.length} orders)</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${formatCurrency(totalPending)}</div>
              <div class="summary-label">Total Not Delivered (${pendingOrders.length} orders)</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${formatCurrency(partialDifference)}</div>
              <div class="summary-label">Partial Outstanding (${partialOrders.length} orders)</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${formatCurrency(totalOrders)}</div>
              <div class="summary-label">Total Orders (${filteredOrders.length})</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Supply</th>
                <th>Date</th>
                <th>Contact Person</th>
                <th>Ordered</th>
                <th>Delivered</th>
                <th>Status</th>
                <th>Shop</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map(order => `
                <tr>
                  <td>${order.supply_name || 'N/A'}</td>
                  <td>${order.order_date || 'N/A'}</td>
                  <td>${order.contact_person || 'N/A'}</td>
                  <td>${formatCurrency(order.order_amount || 0)}</td>
                  <td>${formatCurrency(order.amount_delivered || 0)}</td>
                  <td>${order.status || 'N/A'}</td>
                  <td>${order.shop || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (includeOrders) {
      printContent += `
        <div class="section">
          <div class="section-title">Orders Summary</div>
          <div class="no-data">No orders data found for the selected filters</div>
        </div>
      `;
    }

    // Add income section if selected
    if (includeIncome && filteredIncome.length > 0) {
      printContent += `
        <div class="section">
          <div class="section-title">Income Records</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Shop</th>
                <th>Daily Income</th>
                <th>Expenses</th>
                <th>Net Income</th>
              </tr>
            </thead>
            <tbody>
              ${filteredIncome.map(record => `
                <tr>
                  <td>${record.date || 'N/A'}</td>
                  <td>${record.shop || 'N/A'}</td>
                  <td>${formatCurrency(record.daily_income || 0)}</td>
                  <td>${formatCurrency(record.expenses || 0)}</td>
                  <td>${formatCurrency(record.net_income || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="2"><strong>Totals</strong></td>
                <td><strong>${formatCurrency(totalIncome)}</strong></td>
                <td><strong>${formatCurrency(totalExpenses)}</strong></td>
                <td><strong>${formatCurrency(totalNet)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    } else if (includeIncome) {
      printContent += `
        <div class="section">
          <div class="section-title">Income Records</div>
          <div class="no-data">No income data found for the selected filters</div>
        </div>
      `;
    }

    // Close the HTML
    printContent += `
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
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    toast.success("Generating custom report...");
  };

  const handlePrintCurrent = () => {
    toast.info("Printing current view...");
    setTimeout(() => window.print(), 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">Generate and print business reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrintCurrent}>
            <Printer className="mr-2 h-4 w-4" />
            Print Current View
          </Button>
          <Button onClick={handlePrintCustom}>
            <FileText className="mr-2 h-4 w-4" />
            Generate & Print
          </Button>
        </div>
      </div>

      {/* Filters - Hidden when printing */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Customize Report</CardTitle>
          <CardDescription>Select data and filters for your report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Shops</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={selectAllShops}
                  >
                    All Shops
                  </Button>
                  {selectedShops.length > 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={clearAllShops}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 border rounded-md max-h-40 overflow-y-auto">
                {shops.map((shop) => (
                  <div key={shop} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`shop-${shop}`}
                      checked={selectedShops.includes(shop)}
                      onCheckedChange={() => toggleShop(shop)}
                    />
                    <label 
                      htmlFor={`shop-${shop}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {shop}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          </div>
          
          <div className="space-y-2">
            <Label>Include in Report</Label>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="supplies" 
                  checked={includeSupplies}
                  onCheckedChange={(checked) => setIncludeSupplies(checked as boolean)}
                />
                <label htmlFor="supplies" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Supplies
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="orders" 
                  checked={includeOrders}
                  onCheckedChange={(checked) => setIncludeOrders(checked as boolean)}
                />
                <label htmlFor="orders" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Orders
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="income" 
                  checked={includeIncome}
                  onCheckedChange={(checked) => setIncludeIncome(checked as boolean)}
                />
                <label htmlFor="income" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Income Records
                </label>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedShops.length > 0 || startDate || endDate) && (
            <div className="pt-4 border-t">
              <Label>Active Filters:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedShops.length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Shops: {selectedShops.join(', ')}
                  </span>
                )}
                {startDate && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    From: {startDate}
                  </span>
                )}
                {endDate && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    To: {endDate}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Business Report</h1>
        <p className="text-sm text-gray-600">
          Generated on {new Date().toLocaleDateString()}
          {selectedShops.length > 0 && ` - ${selectedShops.join(', ')}`}
          {startDate && endDate && ` - ${startDate} to ${endDate}`}
        </p>
        <p className="text-sm text-gray-600">
          Report Includes: {[
            includeSupplies && "Supplies",
            includeOrders && "Orders", 
            includeIncome && "Income Records"
          ].filter(Boolean).join(', ')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
        {includeSupplies && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Supplies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredSupplies.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {startDate || endDate ? 'Filtered by date range' : 'All supplies'}
              </p>
            </CardContent>
          </Card>
        )}
        {includeOrders && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalOrders)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {startDate || endDate ? 'Filtered by date range' : 'All orders'}
              </p>
            </CardContent>
          </Card>
        )}
        {includeIncome && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {startDate || endDate ? 'Filtered by date range' : 'All income'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Net Difference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(netDifference)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Income - Orders
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Supplies Section */}
      {includeSupplies && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Supplies Inventory</CardTitle>
            <CardDescription>
              {startDate || endDate 
                ? 'Supplies with orders in the selected date range' 
                : 'All supplies inventory'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSupplies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Phone Number</th>
                      <th className="text-left p-2">Shop</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSupplies.map((supply) => (
                      <tr key={supply.id} className="border-b">
                        <td className="p-2">{supply.name}</td>
                        <td className="p-2">{supply.amount}</td>
                        <td className="p-2">{supply.phone_number}</td>
                        <td className="p-2">{supply.shop}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {startDate || endDate 
                  ? 'No supplies found with orders in the selected date range' 
                  : 'No supplies found for the selected shop'
                }
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders Section */}
      {includeOrders && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Orders Summary</CardTitle>
            <CardDescription>
              {startDate || endDate 
                ? `Orders from ${startDate || 'beginning'} to ${endDate || 'now'}`
                : 'All orders'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Supply</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Contact Person</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Shop</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b">
                        <td className="p-2">{order.supply_name}</td>
                        <td className="p-2">{order.order_date}</td>
                        <td className="p-2">{order.contact_person}</td>
                        <td className="p-2">{formatCurrency(order.order_amount)}</td>
                        <td className="p-2">{order.status}</td>
                        <td className="p-2">{order.shop}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {startDate || endDate 
                  ? 'No orders found in the selected date range' 
                  : 'No orders found for the selected shop'
                }
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Income Section */}
      {includeIncome && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Income Records</CardTitle>
            <CardDescription>
              {startDate || endDate 
                ? `Income records from ${startDate || 'beginning'} to ${endDate || 'now'}`
                : 'All income records'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredIncome.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Shop</th>
                      <th className="text-left p-2">Daily Income</th>
                      <th className="text-left p-2">Expenses</th>
                      <th className="text-left p-2">Net Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncome.map((record) => (
                      <tr key={record.id} className="border-b">
                        <td className="p-2">{record.date}</td>
                        <td className="p-2">{record.shop}</td>
                        <td className="p-2">{formatCurrency(record.daily_income)}</td>
                        <td className="p-2">{formatCurrency(record.expenses)}</td>
                        <td className="p-2">{formatCurrency(record.net_income)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-bold">
                      <td className="p-2" colSpan={2}>Totals</td>
                      <td className="p-2">{formatCurrency(totalIncome)}</td>
                      <td className="p-2">{formatCurrency(totalExpenses)}</td>
                      <td className="p-2">{formatCurrency(totalNet)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {startDate || endDate 
                  ? 'No income records found in the selected date range' 
                  : 'No income records found for the selected shop'
                }
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!includeSupplies && !includeOrders && !includeIncome && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Please select at least one data type to include in the report.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
