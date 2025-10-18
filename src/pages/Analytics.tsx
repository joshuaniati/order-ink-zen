import { Shop } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";

interface AnalyticsProps {
  selectedShop: Shop;
}

type IncomeRecord = Tables<'income_records'>;

const Analytics = ({ selectedShop }: AnalyticsProps) => {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const { data: recordsData, error } = await supabase
          .from('income_records')
          .select('*')
          .order('date', { ascending: true });

        if (error) throw error;

        setRecords(recordsData || []);
      } catch (error) {
        console.error('Error fetching income records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRecords = selectedShop === "All" 
    ? records 
    : records.filter(r => r.shop === selectedShop);

  // Last 7 days data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const chartData = last7Days.map(date => {
    const dayRecords = filteredRecords.filter(r => r.date === date);
    const income = dayRecords.reduce((sum, r) => sum + r.daily_income, 0);
    const expenses = dayRecords.reduce((sum, r) => sum + r.expenses, 0);
    return {
      date: new Date(date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
      income,
      expenses,
      net: income - expenses,
    };
  });

  // Shop comparison - dynamically get unique shops from records
  const uniqueShops = [...new Set(records.map(r => r.shop))];
  const shopData = uniqueShops.map(shop => {
    const shopRecords = records.filter(r => r.shop === shop);
    const income = shopRecords.reduce((sum, r) => sum + r.daily_income, 0);
    const expenses = shopRecords.reduce((sum, r) => sum + r.expenses, 0);
    return {
      shop,
      income,
      expenses,
      net: income - expenses,
      margin: income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0,
    };
  });

  const totalIncome = filteredRecords.reduce((sum, r) => sum + r.daily_income, 0);
  const totalExpenses = filteredRecords.reduce((sum, r) => sum + r.expenses, 0);
  const totalNet = totalIncome - totalExpenses;
  const avgDailyIncome = filteredRecords.length > 0 ? totalIncome / filteredRecords.length : 0;

  // Simple bar chart component
  const SimpleBarChart = ({ data }: { data: typeof chartData }) => {
    const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expenses))) * 1.1;
    
    return (
      <div className="w-full h-64 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="w-16 text-sm text-muted-foreground">{item.date}</div>
            <div className="flex-1 flex space-x-1">
              {/* Income bar */}
              <div 
                className="bg-green-500 rounded-l flex items-center justify-end pr-2 text-white text-sm"
                style={{ width: `${(item.income / maxValue) * 100}%`, minWidth: '20px' }}
              >
                {item.income > 0 && formatCurrency(item.income)}
              </div>
              {/* Expenses bar */}
              <div 
                className="bg-red-500 rounded-r flex items-center pl-2 text-white text-sm"
                style={{ width: `${(item.expenses / maxValue) * 100}%`, minWidth: '20px' }}
              >
                {item.expenses > 0 && formatCurrency(item.expenses)}
              </div>
            </div>
          </div>
        ))}
        <div className="flex space-x-4 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Income</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Expenses</span>
          </div>
        </div>
      </div>
    );
  };

  // Simple line chart component
  const SimpleLineChart = ({ data }: { data: typeof chartData }) => {
    const values = data.map(d => d.net);
    const maxValue = Math.max(...values.map(v => Math.abs(v))) * 1.2;
    const minValue = Math.min(...values) * 1.2;
    
    return (
      <div className="w-full h-64 relative">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 0.25, 0.5, 0.75, 1].map((position) => (
            <div 
              key={position}
              className="border-t border-gray-200"
              style={{ order: 1 - position }}
            />
          ))}
        </div>
        
        {/* Chart line and points */}
        <div className="absolute inset-0 flex items-center">
          <div className="flex-1 flex items-center justify-between relative">
            {data.map((item, index) => {
              const value = item.net;
              const percentage = ((value - minValue) / (maxValue - minValue)) * 100;
              
              return (
                <div key={index} className="flex flex-col items-center relative" style={{ flex: 1 }}>
                  {/* Point */}
                  <div 
                    className={`w-3 h-3 rounded-full border-2 border-white z-10 ${
                      value >= 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ 
                      marginBottom: `${percentage}%`,
                      order: 1 
                    }}
                  />
                  {/* Line segment */}
                  {index < data.length - 1 && (
                    <div 
                      className={`absolute h-0.5 ${
                        value >= 0 && data[index + 1].net >= 0 ? 'bg-green-500' : 
                        value < 0 && data[index + 1].net < 0 ? 'bg-red-500' : 'bg-gray-400'
                      }`}
                      style={{
                        width: '50%',
                        left: '50%',
                        top: `calc(${percentage}% + 6px)`,
                        transform: 'rotate(0deg)'
                      }}
                    />
                  )}
                  {/* Date label */}
                  <div className="text-xs text-muted-foreground mt-2" style={{ order: 2 }}>
                    {item.date}
                  </div>
                  {/* Value label */}
                  <div className={`text-xs font-medium mt-1 ${
                    value >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} style={{ order: 0 }}>
                    {formatCurrency(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

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
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Income</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
          <SimpleBarChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Net Income Trend</CardTitle>
          <CardDescription>Profitability over time</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleLineChart data={chartData} />
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
                      <p className="font-bold text-green-600">{formatCurrency(shop.income)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expenses</p>
                      <p className="font-bold text-red-600">{formatCurrency(shop.expenses)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Income</p>
                      <p className={`font-bold ${shop.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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

      {filteredRecords.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No data available for analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
