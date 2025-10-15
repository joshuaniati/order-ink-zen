import { Shop } from "@/types";
import { getIncomeRecords } from "@/lib/storage";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AnalyticsProps {
  selectedShop: Shop;
}

const Analytics = ({ selectedShop }: AnalyticsProps) => {
  const allRecords = getIncomeRecords();
  const records = selectedShop === "All" 
    ? allRecords 
    : allRecords.filter(r => r.shop === selectedShop);

  // Last 7 days data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const chartData = last7Days.map(date => {
    const dayRecords = records.filter(r => r.date === date);
    const income = dayRecords.reduce((sum, r) => sum + r.dailyIncome, 0);
    const expenses = dayRecords.reduce((sum, r) => sum + r.expenses, 0);
    return {
      date: new Date(date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
      income,
      expenses,
      net: income - expenses,
    };
  });

  // Shop comparison
  const shopData = ["A", "B", "C"].map(shop => {
    const shopRecords = allRecords.filter(r => r.shop === shop);
    const income = shopRecords.reduce((sum, r) => sum + r.dailyIncome, 0);
    const expenses = shopRecords.reduce((sum, r) => sum + r.expenses, 0);
    return {
      shop: `Shop ${shop}`,
      income,
      expenses,
      net: income - expenses,
      margin: income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0,
    };
  });

  const totalIncome = records.reduce((sum, r) => sum + r.dailyIncome, 0);
  const totalExpenses = records.reduce((sum, r) => sum + r.expenses, 0);
  const totalNet = totalIncome - totalExpenses;
  const avgDailyIncome = records.length > 0 ? totalIncome / records.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics & Reports</h2>
        <p className="text-muted-foreground">Comprehensive business intelligence</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Income</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalNet >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totalNet)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg Daily</CardTitle>
            <CardDescription>Average revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgDailyIncome)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses (Last 7 Days)</CardTitle>
          <CardDescription>Daily financial performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="income" fill="hsl(var(--success))" name="Income" />
              <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Net Income Trend</CardTitle>
          <CardDescription>Profitability over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Net Income" 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {selectedShop === "All" && (
        <Card>
          <CardHeader>
            <CardTitle>Shop Performance Comparison</CardTitle>
            <CardDescription>All-time performance by shop</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shopData.map((shop) => (
                <div key={shop.shop} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{shop.shop}</h4>
                    <span className="text-sm text-muted-foreground">
                      Profit Margin: {shop.margin}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-bold text-success">{formatCurrency(shop.income)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expenses</p>
                      <p className="font-bold text-destructive">{formatCurrency(shop.expenses)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Income</p>
                      <p className={`font-bold ${shop.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(shop.net)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
