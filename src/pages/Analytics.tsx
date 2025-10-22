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
type ShopRecord = Tables<'shops'>;
type Order = Tables<'orders'>;

const Analytics = ({ selectedShop }: AnalyticsProps) => {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [recordsResponse, shopsResponse, ordersResponse] = await Promise.all([
          supabase
            .from('income_records')
            .select('*')
            .order('date', { ascending: true }),
          supabase
            .from('shops')
            .select('*')
            .order('name', { ascending: true }),
          supabase
            .from('orders')
            .select('*')
            .order('order_date', { ascending: true })
        ]);

        if (recordsResponse.error) throw recordsResponse.error;
        if (shopsResponse.error) throw shopsResponse.error;
        if (ordersResponse.error) throw ordersResponse.error;

        setRecords(recordsResponse.data || []);
        setShops(shopsResponse.data || []);
        setOrders(ordersResponse.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRecords = selectedShop === "All" 
    ? records 
    : records.filter(r => r.shop === selectedShop);

  const filteredOrders = selectedShop === "All" 
    ? orders 
    : orders.filter(o => o.shop === selectedShop);

  // Calculate cost of goods sold (COGS) from orders
  const calculateCOGS = (date: string) => {
    const dayOrders = filteredOrders.filter(o => o.order_date === date);
    return dayOrders.reduce((sum, order) => sum + (Number(order.order_amount) || 0), 0);
  };

  // Last 7 days data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const chartData = last7Days.map(date => {
    const dayRecords = filteredRecords.filter(r => r.date === date);
    const income = dayRecords.reduce((sum, r) => sum + r.daily_income, 0);
    const cogs = calculateCOGS(date); // Cost of Goods Sold (inventory purchases)
    const otherExpenses = dayRecords.reduce((sum, r) => sum + (r.expenses || 0), 0);
    const totalExpenses = cogs + otherExpenses;
    
    return {
      date: new Date(date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
      income,
      cogs,
      otherExpenses,
      totalExpenses,
      grossProfit: income - cogs,
      net: income - totalExpenses,
    };
  });

  // Shop comparison - use all shops from shops table
  const shopData = shops.map(shop => {
    const shopRecords = records.filter(r => r.shop === shop.name);
    const shopOrders = orders.filter(o => o.shop === shop.name);
    
    const income = shopRecords.reduce((sum, r) => sum + Number(r.daily_income), 0);
    const cogs = shopOrders.reduce((sum, o) => sum + (Number(o.order_amount) || 0), 0);
    const otherExpenses = shopRecords.reduce((sum, r) => sum + Number(r.expenses || 0), 0);
    const totalExpenses = cogs + otherExpenses;
    const grossProfit = income - cogs;
    const net = income - totalExpenses;
    
    return {
      shop: shop.name,
      income,
      cogs,
      otherExpenses,
      totalExpenses,
      grossProfit,
      net,
      grossMargin: income > 0 ? ((grossProfit) / income * 100).toFixed(1) : '0',
      netMargin: income > 0 ? ((net) / income * 100).toFixed(1) : '0',
    };
  });

  // Calculate totals
  const totalIncome = filteredRecords.reduce((sum, r) => sum + r.daily_income, 0);
  const totalCOGS = filteredOrders.reduce((sum, o) => sum + (Number(o.order_amount) || 0), 0);
  const totalOtherExpenses = filteredRecords.reduce((sum, r) => sum + (r.expenses || 0), 0);
  const totalExpenses = totalCOGS + totalOtherExpenses;
  const totalGrossProfit = totalIncome - totalCOGS;
  const totalNet = totalIncome - totalExpenses;
  const avgDailyIncome = filteredRecords.length > 0 ? totalIncome / filteredRecords.length : 0;

  // Simple bar chart component
  const SimpleBarChart = ({ data }: { data: typeof chartData }) => {
    const maxValue = Math.max(...data.map(d => Math.max(d.income, d.totalExpenses))) * 1.1;
    
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
              {/* COGS bar */}
              <div 
                className="bg-blue-500 flex items-center justify-end pr-2 text-white text-sm"
                style={{ width: `${(item.cogs / maxValue) * 100}%`, minWidth: '20px' }}
              >
                {item.cogs > 0 && formatCurrency(item.cogs)}
              </div>
              {/* Other Expenses bar */}
              <div 
                className="bg-red-500 rounded-r flex items-center pl-2 text-white text-sm"
                style={{ width: `${(item.otherExpenses / maxValue) * 100}%`, minWidth: '20px' }}
              >
                {item.otherExpenses > 0 && formatCurrency(item.otherExpenses)}
              </div>
            </div>
          </div>
        ))}
        <div className="flex space-x-4 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Revenue</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>COGS</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Other Expenses</span>
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
            <CardTitle>COGS</CardTitle>
            <CardDescription>Cost of Goods Sold</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalCOGS)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Gross Profit: {formatCurrency(totalGrossProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Other Expenses</CardTitle>
            <CardDescription>Operating costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalOtherExpenses)}</div>
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
            <p className="text-sm text-muted-foreground mt-1">
              Margin: {totalIncome > 0 ? ((totalNet / totalIncome) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Expenses (Last 7 Days)</CardTitle>
          <CardDescription>Daily financial performance breakdown</CardDescription>
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
            <CardDescription>All-time performance by shop ({shops.length} {shops.length === 1 ? 'shop' : 'shops'})</CardDescription>
          </CardHeader>
          <CardContent>
            {shopData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No shops found. Add shops in the Supplies page first.
              </div>
            ) : (
              <div className="space-y-6">
                {shopData.map((shop) => (
                  <div key={shop.shop} className="border-b pb-6 last:border-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg">{shop.shop}</h4>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">
                          Gross Margin: {shop.grossMargin}%
                        </span>
                        <br />
                        <span className="text-sm text-muted-foreground">
                          Net Margin: {shop.netMargin}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Revenue</p>
                        <p className="font-bold text-green-600">{formatCurrency(shop.income)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">COGS</p>
                        <p className="font-bold text-blue-600">{formatCurrency(shop.cogs)}</p>
                        <p className="text-xs text-muted-foreground">
                          Gross: {formatCurrency(shop.grossProfit)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Other Expenses</p>
                        <p className="font-bold text-orange-600">{formatCurrency(shop.otherExpenses)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Net Income</p>
                        <p className={`font-bold ${shop.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(shop.net)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {filteredRecords.length === 0 && filteredOrders.length === 0 && (
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
