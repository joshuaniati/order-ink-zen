import { useState, useEffect } from "react";
import { Shop } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Printer, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useShops } from "@/hooks/useShops";
import type { Tables } from "@/integrations/supabase/types";

interface CashUpProps {
  selectedShop: Shop;
}

type IncomeRecord = Tables<'income_records'>;

const CashUp = ({ selectedShop }: CashUpProps) => {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncomeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { shops, loading: shopsLoading } = useShops();
  
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    date: today,
    shop: "" as Shop,
    cash_amount: 0,
    card_machine_amount: 0,
    account_amount: 0,
    direct_deposit_amount: 0,
    expenses: 0,
    notes: "",
  });

  const [printConfig, setPrintConfig] = useState({
    startDate: "",
    endDate: today,
    reportType: "weekly" as "weekly" | "custom"
  });

  // Set default shop when shops load
  useEffect(() => {
    if (shops.length > 0 && !formData.shop) {
      setFormData(prev => ({ ...prev, shop: shops[0].name }));
    }
  }, [shops]);

  // Set default print dates
  useEffect(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    setPrintConfig(prev => ({
      ...prev,
      startDate: weekAgo.toISOString().split('T')[0]
    }));
  }, []);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const { data: recordsData, error } = await supabase
          .from('income_records')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;

        setRecords(recordsData || []);
      } catch (error) {
        console.error('Error fetching income records:', error);
        toast.error('Failed to load income records');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRecords = selectedShop === "All" 
    ? records 
    : records.filter(r => r.shop === selectedShop);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const daily_income = formData.cash_amount + formData.card_machine_amount + formData.account_amount + formData.direct_deposit_amount;
    const net_income = daily_income - formData.expenses;
    
    try {
      if (editingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('income_records')
          .update({
            date: formData.date,
            shop: formData.shop,
            cash_amount: formData.cash_amount,
            card_machine_amount: formData.card_machine_amount,
            account_amount: formData.account_amount,
            direct_deposit_amount: formData.direct_deposit_amount,
            daily_income,
            expenses: formData.expenses,
            net_income,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRecord.id);

        if (error) throw error;
        toast.success("Record updated successfully");
      } else {
        // Create new record
        const { error } = await supabase
          .from('income_records')
          .insert({
            date: formData.date,
            shop: formData.shop,
            cash_amount: formData.cash_amount,
            card_machine_amount: formData.card_machine_amount,
            account_amount: formData.account_amount,
            direct_deposit_amount: formData.direct_deposit_amount,
            daily_income,
            expenses: formData.expenses,
            net_income,
            notes: formData.notes,
          });

        if (error) throw error;
        toast.success("Cash up recorded successfully");
      }

      // Refresh records
      const { data: newRecords, error } = await supabase
        .from('income_records')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setRecords(newRecords || []);
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving income record:', error);
      toast.error('Failed to save record');
    }
  };

  const handleEdit = (record: IncomeRecord) => {
    setEditingRecord(record);
    setFormData({
      date: record.date,
      shop: record.shop,
      cash_amount: record.cash_amount,
      card_machine_amount: record.card_machine_amount,
      account_amount: record.account_amount,
      direct_deposit_amount: record.direct_deposit_amount,
      expenses: record.expenses,
      notes: record.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      const { error } = await supabase
        .from('income_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecords(records.filter(record => record.id !== id));
      toast.success("Record deleted successfully");
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData({
      date: today,
      shop: shops[0]?.name || "",
      cash_amount: 0,
      card_machine_amount: 0,
      account_amount: 0,
      direct_deposit_amount: 0,
      expenses: 0,
      notes: "",
    });
  };

  // Get records for printing based on date range
  const getRecordsForPrint = () => {
    let startDate: Date;
    let endDate = new Date(printConfig.endDate);

    if (printConfig.reportType === "weekly") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate = new Date(printConfig.startDate);
    }

    return filteredRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    });
  };

  // Print report function
  const printReport = () => {
    const recordsToPrint = getRecordsForPrint();
    
    if (recordsToPrint.length === 0) {
      toast.error("No records found for the selected period");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the report");
      return;
    }

    const totalIncome = recordsToPrint.reduce((sum, r) => sum + r.daily_income, 0);
    const totalExpenses = recordsToPrint.reduce((sum, r) => sum + r.expenses, 0);
    const totalNet = totalIncome - totalExpenses;

    const startDate = printConfig.reportType === "weekly" 
      ? new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]
      : printConfig.startDate;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cash Up Report - ${selectedShop === "All" ? "All Shops" : selectedShop}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 0;
              color: #333;
              font-size: 12px;
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .title { 
              font-size: 24px; 
              font-weight: bold;
              margin-bottom: 5px;
            }
            .subtitle { 
              font-size: 14px;
              color: #666;
              margin-bottom: 5px;
            }
            .period { 
              font-size: 12px;
              color: #888;
            }
            .summary { 
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
            }
            .summary-item {
              text-align: center;
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
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              font-size: 10px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px 10px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
              font-size: 10px;
            }
            .total-row { 
              background-color: #e9ecef; 
              font-weight: bold; 
            }
            .positive { color: #059669; }
            .negative { color: #dc2626; }
            .footer {
              margin-top: 30px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
              font-size: 10px;
              color: #666;
              text-align: center;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Cash Up Report</div>
            <div class="subtitle">${selectedShop === "All" ? "All Shops" : selectedShop}</div>
            <div class="period">Period: ${startDate} to ${printConfig.endDate}</div>
            <div class="period">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${recordsToPrint.length}</div>
              <div class="summary-label">Total Records</div>
            </div>
            <div class="summary-item">
              <div class="summary-value positive">${formatCurrency(totalIncome)}</div>
              <div class="summary-label">Total Income</div>
            </div>
            <div class="summary-item">
              <div class="summary-value negative">${formatCurrency(totalExpenses)}</div>
              <div class="summary-label">Total Expenses</div>
            </div>
            <div class="summary-item">
              <div class="summary-value ${totalNet >= 0 ? 'positive' : 'negative'}">${formatCurrency(totalNet)}</div>
              <div class="summary-label">Net Income</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${formatCurrency(totalIncome / recordsToPrint.length)}</div>
              <div class="summary-label">Avg Daily Income</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${formatCurrency(totalExpenses / recordsToPrint.length)}</div>
              <div class="summary-label">Avg Daily Expenses</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Shop</th>
                <th>Cash</th>
                <th>Card Machine</th>
                <th>Account</th>
                <th>Direct Deposit</th>
                <th>Total Income</th>
                <th>Expenses</th>
                <th>Net Income</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${recordsToPrint.map(record => `
                <tr>
                  <td>${record.date}</td>
                  <td>${record.shop}</td>
                  <td class="positive">${formatCurrency(record.cash_amount)}</td>
                  <td class="positive">${formatCurrency(record.card_machine_amount)}</td>
                  <td class="positive">${formatCurrency(record.account_amount)}</td>
                  <td class="positive">${formatCurrency(record.direct_deposit_amount)}</td>
                  <td class="positive">${formatCurrency(record.daily_income)}</td>
                  <td class="negative">${formatCurrency(record.expenses)}</td>
                  <td class="${record.net_income >= 0 ? 'positive' : 'negative'}">${formatCurrency(record.net_income)}</td>
                  <td>${record.notes || ''}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2"><strong>Totals</strong></td>
                <td class="positive"><strong>${formatCurrency(recordsToPrint.reduce((sum, r) => sum + r.cash_amount, 0))}</strong></td>
                <td class="positive"><strong>${formatCurrency(recordsToPrint.reduce((sum, r) => sum + r.card_machine_amount, 0))}</strong></td>
                <td class="positive"><strong>${formatCurrency(recordsToPrint.reduce((sum, r) => sum + r.account_amount, 0))}</strong></td>
                <td class="positive"><strong>${formatCurrency(recordsToPrint.reduce((sum, r) => sum + r.direct_deposit_amount, 0))}</strong></td>
                <td class="positive"><strong>${formatCurrency(totalIncome)}</strong></td>
                <td class="negative"><strong>${formatCurrency(totalExpenses)}</strong></td>
                <td class="${totalNet >= 0 ? 'positive' : 'negative'}"><strong>${formatCurrency(totalNet)}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            Generated from Cash Up Management System | ${new Date().toLocaleDateString()} | Page 1 of 1
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setIsPrintDialogOpen(false);
    toast.success("Report generated successfully");
  };

  // Quick print weekly report
  const printWeeklyReport = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    setPrintConfig({
      startDate: weekAgo.toISOString().split('T')[0],
      endDate: today,
      reportType: "weekly"
    });
    
    // Small delay to ensure state is updated
    setTimeout(() => {
      printReport();
    }, 100);
  };

  // Today's metrics
  const todayRecords = filteredRecords.filter(r => r.date === today);
  const todayIncome = todayRecords.reduce((sum, r) => sum + r.daily_income, 0);
  const todayExpenses = todayRecords.reduce((sum, r) => sum + r.expenses, 0);
  const todayNet = todayIncome - todayExpenses;

  // Weekly metrics
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyRecords = filteredRecords.filter(r => new Date(r.date) >= weekAgo);
  const weeklyIncome = weeklyRecords.reduce((sum, r) => sum + r.daily_income, 0);
  const weeklyExpenses = weeklyRecords.reduce((sum, r) => sum + r.expenses, 0);
  const weeklyNet = weeklyIncome - weeklyExpenses;

  if (loading || shopsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading cash up records...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Daily Cash Up</h2>
          <p className="text-muted-foreground">Record daily income and expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printWeeklyReport}>
            <Printer className="mr-2 h-4 w-4" />
            Print Weekly Report
          </Button>
          
          <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Custom Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Custom Report</DialogTitle>
                <DialogDescription>
                  Select the date range for your cash up report
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select 
                    value={printConfig.reportType} 
                    onValueChange={(value: "weekly" | "custom") => setPrintConfig(prev => ({ ...prev, reportType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly Report (Last 7 Days)</SelectItem>
                      <SelectItem value="custom">Custom Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {printConfig.reportType === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={printConfig.startDate}
                        onChange={(e) => setPrintConfig(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={printConfig.endDate}
                        onChange={(e) => setPrintConfig(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={printReport}>
                    <Printer className="mr-2 h-4 w-4" />
                    Generate Report
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
                Record Cash Up
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRecord ? "Edit Record" : "Record Daily Cash Up"}</DialogTitle>
                <DialogDescription>
                  Enter daily financial information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop">Shop *</Label>
                    <Select value={formData.shop} onValueChange={(value) => setFormData({ ...formData, shop: value as Shop })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.name}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cash_amount">Daily Cash Amount (ZAR) *</Label>
                    <Input
                      id="cash_amount"
                      type="number"
                      step="0.01"
                      required
                      value={formData.cash_amount}
                      onChange={(e) => setFormData({ ...formData, cash_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card_machine_amount">Mobile Card Machine Amount (ZAR) *</Label>
                    <Input
                      id="card_machine_amount"
                      type="number"
                      step="0.01"
                      required
                      value={formData.card_machine_amount}
                      onChange={(e) => setFormData({ ...formData, card_machine_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_amount">Account Amount (ZAR) *</Label>
                    <Input
                      id="account_amount"
                      type="number"
                      step="0.01"
                      required
                      value={formData.account_amount}
                      onChange={(e) => setFormData({ ...formData, account_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="direct_deposit_amount">Direct Deposit Amount (ZAR) *</Label>
                    <Input
                      id="direct_deposit_amount"
                      type="number"
                      step="0.01"
                      required
                      value={formData.direct_deposit_amount}
                      onChange={(e) => setFormData({ ...formData, direct_deposit_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expenses">Expenses (ZAR) *</Label>
                  <Input
                    id="expenses"
                    type="number"
                    step="0.01"
                    required
                    value={formData.expenses}
                    onChange={(e) => setFormData({ ...formData, expenses: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Total Daily Income</Label>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(formData.cash_amount + formData.card_machine_amount + formData.account_amount + formData.direct_deposit_amount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Net Income</Label>
                    <div className={`text-2xl font-bold ${
                      ((formData.cash_amount + formData.card_machine_amount + formData.account_amount + formData.direct_deposit_amount) - formData.expenses) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency((formData.cash_amount + formData.card_machine_amount + formData.account_amount + formData.direct_deposit_amount) - formData.expenses)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes about today's cash up..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRecord ? "Update Record" : "Record Cash Up"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Income</CardTitle>
            <CardDescription>Total sales today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(todayIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
            <CardDescription>Operational costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(todayExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Net</CardTitle>
            <CardDescription>Profit/Loss today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${todayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(todayNet)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Weekly Income</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(weeklyIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Weekly Expenses</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(weeklyExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Weekly Net</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${weeklyNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(weeklyNet)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Up History</CardTitle>
          <CardDescription>
            {selectedShop === "All" ? "All shops" : `Shop ${selectedShop}`} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Date</TableHead>
                    <TableHead className="min-w-[120px]">Shop</TableHead>
                    <TableHead className="min-w-[100px] text-right">Cash</TableHead>
                    <TableHead className="min-w-[120px] text-right">Card Machine</TableHead>
                    <TableHead className="min-w-[100px] text-right">Account</TableHead>
                    <TableHead className="min-w-[120px] text-right">Direct Deposit</TableHead>
                    <TableHead className="min-w-[120px] text-right">Total Income</TableHead>
                    <TableHead className="min-w-[100px] text-right">Expenses</TableHead>
                    <TableHead className="min-w-[120px] text-right">Net Income</TableHead>
                    <TableHead className="min-w-[150px]">Notes</TableHead>
                    <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium whitespace-nowrap">{record.date}</TableCell>
                      <TableCell className="whitespace-nowrap">{record.shop}</TableCell>
                      <TableCell className="text-right text-green-600 whitespace-nowrap">{formatCurrency(record.cash_amount)}</TableCell>
                      <TableCell className="text-right text-green-600 whitespace-nowrap">{formatCurrency(record.card_machine_amount)}</TableCell>
                      <TableCell className="text-right text-green-600 whitespace-nowrap">{formatCurrency(record.account_amount)}</TableCell>
                      <TableCell className="text-right text-green-600 whitespace-nowrap">{formatCurrency(record.direct_deposit_amount)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600 whitespace-nowrap">{formatCurrency(record.daily_income)}</TableCell>
                      <TableCell className="text-right text-red-600 whitespace-nowrap">{formatCurrency(record.expenses)}</TableCell>
                      <TableCell className={`text-right font-bold whitespace-nowrap ${
                        record.net_income >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(record.net_income)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={record.notes || ''}>
                        {record.notes}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          {filteredRecords.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No records found. Add your first cash up record to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CashUp;
