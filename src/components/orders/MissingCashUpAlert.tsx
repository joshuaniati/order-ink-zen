import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type IncomeRecord = Tables<'income_records'>;

interface MissingCashUpAlertProps {
  selectedShop: string;
  incomeRecords: IncomeRecord[];
}

export const MissingCashUpAlert = ({ selectedShop, incomeRecords }: MissingCashUpAlertProps) => {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  const missingDays = useMemo(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    const missing: string[] = [];
    
    for (let i = 0; i < today.getDay() || today.getDay() === 0 ? 6 : today.getDay(); i++) {
      const checkDate = new Date(weekStart);
      checkDate.setDate(weekStart.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasRecord = incomeRecords.some(record => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        const shopMatches = selectedShop === "All" || record.shop === selectedShop;
        return recordDate === dateStr && shopMatches;
      });
      
      if (!hasRecord) {
        missing.push(checkDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      }
    }
    
    return missing;
  }, [incomeRecords, selectedShop]);

  if (dismissed || missingDays.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="relative">
      <AlertCircle className="h-4 w-4" />
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
      <AlertTitle>Missing Daily Cash Up</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>
          {selectedShop === "All" ? "Some shops have" : `${selectedShop} has`} missing cash up records for this week: {missingDays.join(", ")}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => navigate("/cash-up")}
        >
          Go to Cash Up
        </Button>
      </AlertDescription>
    </Alert>
  );
};
