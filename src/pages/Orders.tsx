// components/orders/WeeklyBudgetCard.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type WeeklyBudget = Tables<'weekly_budgets'>;
type Order = Tables<'orders'>;

interface WeeklyBudgetCardProps {
  shop: string;
  currentBudget: WeeklyBudget | null;
  weekOrders: Order[];
  weekStartStr: string;
  onBudgetUpdate: () => void;
  totalOrdered: number;
  totalDelivered: number;
  remainingIfAllDelivered: number;
  remainingBasedOnDelivered: number;
  budgetAmount: number;
}

export const WeeklyBudgetCard = ({
  shop,
  currentBudget,
  weekOrders,
  weekStartStr,
  onBudgetUpdate,
  totalOrdered,
  totalDelivered,
  remainingIfAllDelivered,
  remainingBasedOnDelivered,
  budgetAmount
}: WeeklyBudgetCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [budgetAmountInput, setBudgetAmountInput] = useState(currentBudget?.budget_amount || 0);
  const [budgetDateInput, setBudgetDateInput] = useState(currentBudget?.budget_date || weekStartStr);

  const handleSaveBudget = async () => {
    try {
      if (currentBudget) {
        const { error } = await supabase
          .from('weekly_budgets')
          .update({
            budget_amount: budgetAmountInput,
            budget_date: budgetDateInput,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentBudget.id);

        if (error) throw error;
        toast.success("Budget updated successfully");
      } else {
        const { error } = await supabase
          .from('weekly_budgets')
          .insert({
            shop,
            budget_amount: budgetAmountInput,
            budget_date: budgetDateInput,
            week_start_date: weekStartStr
          });

        if (error) throw error;
        toast.success("Budget created successfully");
      }

      setIsEditing(false);
      onBudgetUpdate();
    } catch (error: any) {
      console.error('Error saving budget:', error);
      toast.error(`Failed to save budget: ${error.message}`);
    }
  };

  const handleDeleteBudget = async () => {
    if (!currentBudget) return;

    try {
      const { error } = await supabase
        .from('weekly_budgets')
        .delete()
        .eq('id', currentBudget.id);

      if (error) throw error;

      toast.success("Budget deleted successfully");
      onBudgetUpdate();
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      toast.error(`Failed to delete budget: ${error.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{shop}</CardTitle>
        <CardDescription>
          Week of {weekStartStr}
          {currentBudget?.budget_date && ` | Budget Date: ${currentBudget.budget_date}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="budgetAmount">Budget Amount (ZAR)</Label>
              <Input
                id="budgetAmount"
                type="number"
                value={budgetAmountInput}
                onChange={(e) => setBudgetAmountInput(parseFloat(e.target.value))}
                placeholder="Enter budget amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetDate">Budget Date</Label>
              <Input
                id="budgetDate"
                type="date"
                value={budgetDateInput}
                onChange={(e) => setBudgetDateInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveBudget} className="flex-1">
                Save Budget
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setBudgetAmountInput(currentBudget?.budget_amount || 0);
                  setBudgetDateInput(currentBudget?.budget_date || weekStartStr);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Budget:</span>
              <span className={`text-lg font-bold ${
                remainingBasedOnDelivered >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(budgetAmount)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Orders Placed:</span>
              <span className="text-sm">{formatCurrency(totalOrdered)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount Delivered:</span>
              <span className="text-sm">{formatCurrency(totalDelivered)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Remaining (if all delivered):</span>
              <span className={`text-sm ${
                remainingIfAllDelivered >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(remainingIfAllDelivered)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Available (actual):</span>
              <span className={`text-sm font-medium ${
                remainingBasedOnDelivered >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(remainingBasedOnDelivered)}
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="flex-1"
              >
                {currentBudget ? 'Edit' : 'Set'} Budget
              </Button>
              {currentBudget && (
                <Button
                  onClick={handleDeleteBudget}
                  variant="destructive"
                  size="sm"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
