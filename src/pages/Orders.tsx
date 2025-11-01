import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { Tables } from "@/integrations/supabase/types";
import { useRef } from "react";

type Order = Tables<'orders'>;
type WeeklyBudget = Tables<'weekly_budgets'>;

interface WeeklyBudgetReportProps {
  shop: string;
  currentBudget: WeeklyBudget | null;
  weekOrders: Order[];
  weekStartStr: string;
}

export const WeeklyBudgetReport = ({ shop, currentBudget, weekOrders, weekStartStr }: WeeklyBudgetReportProps) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const totalSpent = weekOrders.reduce((total, order) => total + (order.order_amount || 0), 0);
  const budgetAmount = currentBudget?.budget_amount || 0;
  const remainingBudget = budgetAmount - totalSpent;

  const handlePrint = () => {
    const printContent = reportRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Weekly Budget Report - ${shop}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              color: #000;
            }
            .report-header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            .budget-summary { 
              margin-bottom: 30px;
              padding: 20px;
              border: 1px solid #000;
            }
            .invoice-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px;
            }
            .invoice-table th, .invoice-table td { 
              border: 1px solid #000; 
              padding: 12px 8px;
              text-align: left;
            }
            .invoice-table th { 
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .signature-section { 
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .signature-line { 
              border-top: 1px solid #000;
              width: 200px;
              margin-top: 60px;
            }
            .page-break { 
              page-break-after: always; 
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>Weekly Budget Report</h1>
            <h2>${shop}</h2>
            <p>Week Starting: ${weekStartStr}</p>
          </div>

          <div class="budget-summary">
            <h3>Budget Summary</h3>
            <p><strong>Weekly Budget:</strong> ${formatCurrency(budgetAmount)}</p>
            <p><strong>Total Spent:</strong> ${formatCurrency(totalSpent)}</p>
            <p><strong>Remaining Budget:</strong> ${formatCurrency(remainingBudget)}</p>
          </div>

          <h3>Invoice Details</h3>
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Supply Name</th>
                <th>Delivery Date</th>
                <th>Amount</th>
                <th>Invoice Number</th>
                <th>Received By Signature</th>
                <th>Issued By Signature</th>
              </tr>
            </thead>
            <tbody>
              ${weekOrders.map(order => `
                <tr>
                  <td>${order.supply_name || 'N/A'}</td>
                  <td>${order.delivery_date || 'Pending'}</td>
                  <td>${formatCurrency(order.order_amount || 0)}</td>
                  <td style="height: 30px;"></td>
                  <td style="height: 30px;"></td>
                  <td style="height: 30px;"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signature-section">
            <div>
              <p><strong>Received By:</strong></p>
              <div class="signature-line"></div>
              <p>Name & Signature</p>
            </div>
            <div>
              <p><strong>Issued By:</strong></p>
              <div class="signature-line"></div>
              <p>Name & Signature</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Weekly Budget Report - {shop}</span>
          <Button onClick={handlePrint} className="no-print">
            Print Report
          </Button>
        </CardTitle>
        <CardDescription>
          Printable report for week starting {weekStartStr}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={reportRef} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(budgetAmount)}
              </div>
              <div className="text-sm text-muted-foreground">Weekly Budget</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalSpent)}
              </div>
              <div className="text-sm text-muted-foreground">Total Spent</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className={`text-2xl font-bold ${
                remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.abs(remainingBudget))}
              </div>
              <div className="text-sm text-muted-foreground">
                {remainingBudget >= 0 ? 'Remaining' : 'Over Budget'}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Orders for this week:</h4>
            <div className="space-y-2">
              {weekOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center p-2 border rounded">
                  <span>{order.supply_name}</span>
                  <Badge variant="outline">
                    {formatCurrency(order.order_amount || 0)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
