import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Shop {
  id: string;
  name: string;
  created_at: string;
}

export const useShops = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .order('name');

      if (error) throw error;

      setShops(data || []);
    } catch (err: any) {
      console.error('Error fetching shops:', err);
      setError(err.message);
      // Fallback to default shops if table doesn't exist
      setShops([
        { id: '1', name: 'A', created_at: new Date().toISOString() },
        { id: '2', name: 'B', created_at: new Date().toISOString() },
        { id: '3', name: 'C', created_at: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addShop = async (shopName: string) => {
    try {
      // Check if shop already exists
      const existingShop = shops.find(shop => 
        shop.name.toLowerCase() === shopName.toLowerCase()
      );
      
      if (existingShop) {
        throw new Error(`Shop "${shopName}" already exists`);
      }

      const { data, error } = await supabase
        .from('shops')
        .insert([{ name: shopName }])
        .select();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error(`Shop "${shopName}" already exists`);
        }
        throw error;
      }

      await fetchShops(); // Refresh the list
      return data?.[0];
    } catch (error: any) {
      console.error('Error adding shop:', error);
      throw error;
    }
  };

  const deleteShop = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchShops(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting shop:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  return {
    shops,
    loading,
    error,
    refreshShops: fetchShops,
    addShop,
    deleteShop
  };
};
