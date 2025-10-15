import { useState } from "react";
import { Shop, DailyIncome } from "@/types";
import { getIncomeRecords, saveIncomeRecord, deleteIncomeRecord } from "@/lib/storage";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CashUpProps {
  selectedShop: Shop;
}

const CashUp = ({ selectedShop }: CashUpProps) => {
  const [records, setRecords] = useState<DailyIncome[]>(getIncomeRecords());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyIncome | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    date: today,
    shop: "A" as Shop,
    dailyIncome: 0,
    expenses: 0,
    notes: "",
  });

  const filteredRecords = selectedShop === "All" 
    ? records 
    : records.filter(r => r.shop === selectedShop);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const netIncome = formData.dailyIncome - formData.expenses;
    const record: DailyIncome = {
      id: editingRecord?.id || crypto.randomUUID(),
      netIncome,
      ...formData,
      createdAt: editingRecord?.createdAt || new Date().toISOString(),
    };
    
    saveIncomeRecord(record);
    setRecords(getIncomeRecords());
    setIsDialogOpen(false);
    resetForm();
    toast.success(editingRecord ? "Record updated" : "Cash up recorded");
  };

  const handleEdit = (record: DailyIncome) => {
    setEditingRecord(record);
    setFormData({
      date: record.date,
      shop: record.shop,
      dailyIncome: record.dailyIncome,
      expenses: record.expenses,
      notes: record.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteIncomeRecord(id);
      setRecords(getIncomeRecords());
      toast.success("Record deleted");
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData({
      date: today,
      shop: "A",
      dailyIncome: 0,
      expenses: 0,
      notes: "",
    });
  };

  // Today's metrics
  const todayRecords = filteredRecords.filter(r => r.date === today);
  const todayIncome = todayRecords.reduce((sum, r) => sum + r.dailyIncome, 0);
  const todayExpenses = todayRecords.reduce((sum, r) => sum + r.expenses, 0);
  const todayNet = todayIncome - todayExpenses;

  // Weekly metrics
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyRecords = filteredRecords.filter(r => new Date(r.date) >= weekAgo);
  const weeklyIncome = weeklyRecords.reduce((sum, r) => sum + r.dailyIncome, 0);
  const weeklyExpenses = weeklyRecords.reduce((sum, r) => sum + r.expenses, 0);
  const weeklyNet = weeklyIncome - weeklyExpenses;

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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Shop A</SelectItem>
                    <SelectItem value="B">Shop B</SelectItem>
                    <SelectItem value="C">Shop C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyIncome">Daily Income (ZAR) *</Label>
                <Input
                  id="dailyIncome"
                  type="number"
                  step="0.01"
                  required
                  value={formData.dailyIncome}
                  onChange={(e) => setFormData({ ...formData, dailyIncome: parseFloat(e.target.value) })}
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
                  onChange={(e) => setFormData({ ...formData, expenses: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Net Income (Auto-calculated)</Label>
                <div className="text-2xl font-bold">
                  {formatCurrency(formData.dailyIncome - formData.expenses)}
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
              <div className="text-3xl font-bold text-success">{formatCurrency(todayIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Daily Expenses</CardTitle>
              <CardDescription>Operational costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{formatCurrency(todayExpenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Net Income</CardTitle>
              <CardDescription>Profit/Loss today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${todayNet >= 0 ? 'text-success' : 'text-destructive'}`}>
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
              <div className={`text-2xl font-bold ${weeklyNet >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(weeklyNet)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Up History</CardTitle>
          <CardDescription>
            {selectedShop === "All" ? "All shops" : `Shop ${selectedShop}`} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Income</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Net Income</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.date}</TableCell>
                    <TableCell>Shop {record.shop}</TableCell>
                    <TableCell className="text-success">{formatCurrency(record.dailyIncome)}</TableCell>
                    <TableCell className="text-destructive">{formatCurrency(record.expenses)}</TableCell>
                    <TableCell className={record.netIncome >= 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>
                      {formatCurrency(record.netIncome)}
                    </TableCell>
                    <TableCell>{record.notes}</TableCell>
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
