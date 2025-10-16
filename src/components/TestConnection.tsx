import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DatabaseTest = () => {
  const [status, setStatus] = useState("Testing database...");

  useEffect(() => {
    const testDatabase = async () => {
      try {
        // Test supplies table
        const { data, error } = await supabase.from('supplies').select('*').limit(1);
        
        if (error) {
          setStatus(`❌ ERROR: ${error.message}`);
        } else {
          setStatus("✅ SUCCESS: Supplies table exists and is accessible!");
        }
      } catch (err: any) {
        setStatus(`❌ ERROR: ${err.message}`);
      }
    };

    testDatabase();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="font-bold mb-2">Database Connection Test</h3>
      <p className="text-sm font-mono">{status}</p>
    </div>
  );
};
