import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useShops = () => {
  const [shops, setShops] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShops = async () => {
    try {
      setLoading(true);
      
      // Fetch shops from all tables to get comprehensive list
      const [suppliesResponse, ordersResponse, incomeResponse] = await Promise.all([
        supabase.from('supplies').select('shop'),
        supabase.from('orders').select('shop'),
        supabase.from('income_records').select('shop')
      ]);

      // Combine all shop values from different tables
      const allShops = new Set<string>();
      
      // Add shops from supplies
      suppliesResponse.data?.forEach(item => {
        if (item.shop) allShops.add(item.shop);
      });
      
      // Add shops from orders
      ordersResponse.data?.forEach(item => {
        if (item.shop) allShops.add(item.shop);
      });
      
      // Add shops from income records
      incomeResponse.data?.forEach(item => {
        if (item.shop) allShops.add(item.shop);
      });

      // Convert Set to array and sort
      const uniqueShops = Array.from(allShops).sort();
      
      // If no shops found in database, use defaults
      if (uniqueShops.length === 0) {
        setShops(['A', 'B', 'C']);
      } else {
        setShops(uniqueShops);
      }
      
    } catch (error) {
      console.error('Error fetching shops:', error);
      // Fallback to default shops
      setShops(['A', 'B', 'C']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const refreshShops = () => {
    fetchShops();
  };

  return { shops, loading, refreshShops };
};
