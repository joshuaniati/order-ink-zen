import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const TestConnection = () => {
  const [status, setStatus] = useState("Testing...");

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test if we can query the supplies table
        const { data, error } = await supabase.from('supplies').select('count');
        
        if (error) {
          setStatus(`ERROR: ${error.message}`);
        } else {
          setStatus("SUCCESS: Tables are working!");
        }
      } catch (err: any) {
        setStatus(`ERROR: ${err.message}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold mb-2">Database Connection Test</h3>
      <p className="text-sm">{status}</p>
    </div>
  );
};
