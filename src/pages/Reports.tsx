import { useState } from "react";
import { Shop } from "@/types";
import { getSupplies, getOrders, getIncomeRecords, getShops } from "@/lib/storage";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, FileText } from "lucide-react";
import { toast } from "sonner";

interface ReportsProps {
  selectedShop: Shop;
}

const Reports = ({ selectedShop }: ReportsProps) => {
  const shops = getShops();
  const [reportShop, setReportShop] = useState<Shop>(selectedShop);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeSupplies, setIncludeSupplies] = useState(true);
  const [includeOrders, setIncludeOrders] = useState(true);
  const [includeIncome, setIncludeIncome] = useState(true);

  const handlePrintCurrent = () => {
    toast.info("Printing current view...");
    window.print();
  };

  const handlePrintCustom = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }
    toast.info("Generating custom report...");
    setTimeout(() => window.print(), 100);
  };

  // Get filtered data
  const supplies = getSupplies().filter(s => 
    (reportShop === "All" || s.shop === reportShop)
  );

  const orders = getOrders().filter(o => {
    const matchesShop = reportShop === "All" || o.shop === reportShop;
    const matchesDate = (!startDate || o.orderDate >= startDate) && 
                       (!endDate || o.orderDate <= endDate);
    return matchesShop && matchesDate;
  });

  const incomeRecords = getIncomeRecords().filter(r => {
    const matchesShop = reportShop === "All" || r.shop === reportShop;
    const matchesDate = (!startDate || r.date >= startDate) && 
                       (!endDate || r.date <= endDate);
    return matchesShop && matchesDate;
  });

  const totalIncome = incomeRecords.reduce((sum, r) => sum + r.dailyIncome, 0);
  const totalExpenses = incomeRecords.reduce((sum, r) => sum + r.expenses, 0);
  const totalNet = incomeRecords.reduce((sum, r) => sum + r.netIncome, 0);
  const totalOrders = orders.reduce((sum, o) => sum + o.orderAmount, 0);

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shop">Shop</Label>
              <Select value={reportShop} onValueChange={(value) => setReportShop(value as Shop)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Shops</SelectItem>
                  {shops.map((shop) => (
                    <SelectItem key={shop} value={shop}>{shop}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
        </CardContent>
      </Card>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Business Report</h1>
        <p className="text-sm text-gray-600">
          Generated on {new Date().toLocaleDateString()}
          {reportShop !== "All" && ` - ${reportShop}`}
          {startDate && endDate && ` - ${startDate} to ${endDate}`}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Supplies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOrders)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalNet)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Supplies Section */}
      {includeSupplies && supplies.length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Supplies Inventory</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {supplies.map((supply) => (
                    <tr key={supply.id} className="border-b">
                      <td className="p-2">{supply.name}</td>
                      <td className="p-2">{supply.amount}</td>
                      <td className="p-2">{supply.phoneNumber}</td>
                      <td className="p-2">{supply.shop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Section */}
      {includeOrders && orders.length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Orders Summary</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="p-2">{order.supplyName}</td>
                      <td className="p-2">{order.orderDate}</td>
                      <td className="p-2">{order.contactPerson}</td>
                      <td className="p-2">{order.orderAmount}</td>
                      <td className="p-2">{order.status}</td>
                      <td className="p-2">{order.shop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income Section */}
      {includeIncome && incomeRecords.length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>Income Records</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {incomeRecords.map((record) => (
                    <tr key={record.id} className="border-b">
                      <td className="p-2">{record.date}</td>
                      <td className="p-2">{record.shop}</td>
                      <td className="p-2">{formatCurrency(record.dailyIncome)}</td>
                      <td className="p-2">{formatCurrency(record.expenses)}</td>
                      <td className="p-2">{formatCurrency(record.netIncome)}</td>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
