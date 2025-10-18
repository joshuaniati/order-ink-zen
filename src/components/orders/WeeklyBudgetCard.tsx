import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingDown, TrendingUp, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<'orders'>;
type WeeklyBudget = Tables<'weekly_budgets'>;

interface WeeklyBudgetCardProps {
  shop: string;
  currentBudget: WeeklyBudget | null;
  weekOrders: Order[];
  weekStartStr: string;
  onBudgetUpdate: () => void;
}

export const WeeklyBudgetCard = ({ 
  shop, 
  currentBudget, 
  weekOrders, 
  weekStartStr,
  onBudgetUpdate 
}: WeeklyBudgetCardProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState(currentBudget?.budget_amount || 0);

  const totalOrderAmount = weekOrders.reduce((sum, o) => sum + o.order_amount, 0);
  const budgetBalance = currentBudget ? currentBudget.budget_amount - totalOrderAmount : 0;
  const isOverBudget = currentBudget && totalOrderAmount > currentBudget.budget_amount;

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('weekly_budgets')
        .upsert({
          shop: shop,
          week_start_date: weekStartStr,
          budget_amount: budgetAmount,
        }, {
          onConflict: 'shop,week_start_date'
        });

      if (error) throw error;

      setIsDialogOpen(false);
      onBudgetUpdate();
      toast.success(`Weekly budget for ${shop} set successfully`);
    } catch (error: any) {
      console.error('Error setting budget:', error);
      toast.error(`Failed to set budget: ${error.message}`);
    }
  };

  return (
    <Card className={isOverBudget ? "border-red-200" : currentBudget ? "border-green-200" : "border-gray-200"}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentBudget && (
              isOverBudget ? (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ) : (
                <TrendingUp className="h-5 w-5 text-green-600" />
              )
            )}
            {shop}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setBudgetAmount(currentBudget?.budget_amount || 0)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Weekly Budget - {shop}</DialogTitle>
                <DialogDescription>
                  Set the budget for {shop} for this week
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBudgetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`budget-${shop}`}>Budget Amount (ZAR) *</Label>
                  <Input
                    id={`budget-${shop}`}
                    type="number"
                    step="0.01"
                    required
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(parseFloat(e.target.value))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Set Budget</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>Current week budget tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Weekly Budget</span>
            <span className="font-bold">
              {currentBudget ? formatCurrency(currentBudget.budget_amount) : "Not Set"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Orders This Week</span>
            <span className="font-semibold text-blue-600">{formatCurrency(totalOrderAmount)}</span>
          </div>
          {currentBudget && (
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Balance</span>
              <span className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(budgetBalance)}
                {isOverBudget && " (Over Budget)"}
              </span>
            </div>
          )}
          {!currentBudget && (
            <div className="text-sm text-muted-foreground pt-2 border-t">
              Click the edit icon to set a budget
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
