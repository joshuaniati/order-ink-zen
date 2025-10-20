import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<'orders'>;
type WeeklyBudget = Tables<'weekly_budgets'>;

interface WeeklyBudgetReportProps {
  shop: string;
  currentBudget: WeeklyBudget | null;
  weekOrders: Order[];
  weekStartStr: string;
}

export const WeeklyBudgetReport = ({ 
  shop, 
  currentBudget, 
  weekOrders,
  weekStartStr
}: WeeklyBudgetReportProps) => {
  const totalOrderAmount = weekOrders.reduce((sum, o) => sum + o.order_amount, 0);
  const totalDelivered = weekOrders.reduce((sum, o) => sum + o.amount_delivered, 0);
  const totalPending = totalOrderAmount - totalDelivered;
  
  const budgetAmount = currentBudget?.budget_amount || 0;
  const budgetUsed = totalOrderAmount;
  const budgetRemaining = budgetAmount - budgetUsed;
  const isOverBudget = budgetRemaining < 0;

  const deliveredOrders = weekOrders.filter(o => o.status === 'delivered');
  const partialOrders = weekOrders.filter(o => o.status === 'partial');
  const pendingOrders = weekOrders.filter(o => o.status === 'pending');

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="print:shadow-none print:border-none">
      <CardHeader className="print:pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl print:text-3xl">{shop} - Weekly Budget Report</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Week of {format(new Date(weekStartStr), 'MMM dd, yyyy')}
            </p>
          </div>
          <Button 
            onClick={handlePrint} 
            variant="outline" 
            size="sm"
            className="print:hidden"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Budget Overview */}
        <div className="border rounded-lg p-4 print:border-gray-300">
          <h3 className="font-semibold text-lg mb-4">Budget Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Weekly Budget</p>
              <p className="text-xl font-bold">{formatCurrency(budgetAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Budget Used</p>
              <p className="text-xl font-bold text-blue-600 print:text-blue-800">{formatCurrency(budgetUsed)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining Budget</p>
              <p className={`text-xl font-bold ${isOverBudget ? 'text-red-600 print:text-red-800' : 'text-green-600 print:text-green-800'}`}>
                {formatCurrency(budgetRemaining)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className={`text-xl font-bold ${isOverBudget ? 'text-red-600 print:text-red-800' : 'text-green-600 print:text-green-800'}`}>
                {isOverBudget ? 'Over Budget' : 'Under Budget'}
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="border rounded-lg p-4 print:border-gray-300">
          <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-xl font-bold">{weekOrders.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Order Amount</p>
              <p className="text-xl font-bold">{formatCurrency(totalOrderAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivered Amount</p>
              <p className="text-xl font-bold text-green-600 print:text-green-800">{formatCurrency(totalDelivered)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className="text-xl font-bold text-amber-600 print:text-amber-800">{formatCurrency(totalPending)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivered Orders</p>
              <p className="text-xl font-bold text-green-600 print:text-green-800">{deliveredOrders.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="text-xl font-bold text-amber-600 print:text-amber-800">{pendingOrders.length + partialOrders.length}</p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="border rounded-lg p-4 print:border-gray-300">
          <h3 className="font-semibold text-lg mb-4">Order Details</h3>
          
          {/* Delivered Orders */}
          {deliveredOrders.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-green-600 print:text-green-800 mb-2">Delivered Orders ({deliveredOrders.length})</h4>
              <div className="space-y-2">
                {deliveredOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-start text-sm border-b pb-2 print:border-gray-200">
                    <div className="flex-1">
                      <p className="font-medium">{order.supply_name}</p>
                      <p className="text-muted-foreground">{format(new Date(order.order_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(order.order_amount)}</p>
                      <p className="text-xs text-green-600 print:text-green-800">Delivered: {formatCurrency(order.amount_delivered)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partial Orders */}
          {partialOrders.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-amber-600 print:text-amber-800 mb-2">Partially Delivered Orders ({partialOrders.length})</h4>
              <div className="space-y-2">
                {partialOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-start text-sm border-b pb-2 print:border-gray-200">
                    <div className="flex-1">
                      <p className="font-medium">{order.supply_name}</p>
                      <p className="text-muted-foreground">{format(new Date(order.order_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(order.order_amount)}</p>
                      <p className="text-xs text-amber-600 print:text-amber-800">
                        Delivered: {formatCurrency(order.amount_delivered)} | 
                        Pending: {formatCurrency(order.order_amount - order.amount_delivered)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Orders */}
          {pendingOrders.length > 0 && (
            <div>
              <h4 className="font-medium text-red-600 print:text-red-800 mb-2">Pending Orders ({pendingOrders.length})</h4>
              <div className="space-y-2">
                {pendingOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-start text-sm border-b pb-2 print:border-gray-200">
                    <div className="flex-1">
                      <p className="font-medium">{order.supply_name}</p>
                      <p className="text-muted-foreground">{format(new Date(order.order_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(order.order_amount)}</p>
                      <p className="text-xs text-red-600 print:text-red-800">Not yet delivered</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {weekOrders.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No orders for this week</p>
          )}
        </div>

        {/* Print footer */}
        <div className="hidden print:block text-sm text-center text-muted-foreground mt-8 pt-4 border-t print:border-gray-300">
          <p>Printed on {format(new Date(), 'PPP')}</p>
        </div>
      </CardContent>
    </Card>
  );
};
