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
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
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
  const [editingRecord, setEditingRecord] = useState<IncomeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { shops, loading: shopsLoading } = useShops();
  
  // Date range filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
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

  // Set default shop when shops load
  useEffect(() => {
    if (shops.length > 0 && !formData.shop) {
      setFormData(prev => ({ ...prev, shop: shops[0].name }));
    }
  }, [shops]);

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

  // Apply shop and date range filters
  const filteredRecords = records.filter(record => {
    const shopMatches = selectedShop === "All" || record.shop === selectedShop;
    
    let dateMatches = true;
    if (dateFrom && dateTo) {
      const recordDate = new Date(record.date);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      dateMatches = recordDate >= fromDate && recordDate <= toDate;
    } else if (dateFrom) {
      const recordDate = new Date(record.date);
      const fromDate = new Date(dateFrom);
      dateMatches = recordDate >= fromDate;
    } else if (dateTo) {
      const recordDate = new Date(record.date);
      const toDate = new Date(dateTo);
      dateMatches = recordDate <= toDate;
    }
    
    return shopMatches && dateMatches;
  });

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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRecord ? "Edit Record" : "Record Daily Cash Up"}</DialogTitle>
              <DialogDescription>
                Enter daily financial information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="space-y-2">
                <Label>Total Daily Income (Auto-calculated)</Label>
                <div className="text-2xl font-bold">
                  {formatCurrency(formData.cash_amount + formData.card_machine_amount + formData.account_amount + formData.direct_deposit_amount)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Net Income (Auto-calculated)</Label>
                <div className="text-2xl font-bold">
                  {formatCurrency((formData.cash_amount + formData.card_machine_amount + formData.account_amount + formData.direct_deposit_amount) - formData.expenses)}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRecord ? "Update" : "Record"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Today's Performance</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Daily Income</CardTitle>
              <CardDescription>Total sales today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(todayIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Daily Expenses</CardTitle>
              <CardDescription>Operational costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{formatCurrency(todayExpenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Net Income</CardTitle>
              <CardDescription>Profit/Loss today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${todayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(todayNet)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Weekly Summary (Last 7 Days)</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(weeklyIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Weekly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(weeklyExpenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Weekly Net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${weeklyNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(weeklyNet)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cash Up History</CardTitle>
              <CardDescription>
                {selectedShop === "All" ? "All shops" : `Shop ${selectedShop}`} records
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="date-from" className="text-sm">From:</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="date-to" className="text-sm">To:</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Cash</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Total Income</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Net Income</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.date}</TableCell>
                  <TableCell>{record.shop}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(record.cash_amount)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(record.card_machine_amount)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(record.account_amount)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(record.direct_deposit_amount)}</TableCell>
                  <TableCell className="text-green-600 font-bold">{formatCurrency(record.daily_income)}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(record.expenses)}</TableCell>
                  <TableCell className={record.net_income >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {formatCurrency(record.net_income)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{record.notes}</TableCell>
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
