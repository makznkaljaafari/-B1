
import { supabase } from '../supabaseClient';
import { baseService, withRetry } from './base';
import { Sale, Purchase } from '../../types';

export const salesService = {
  async getSales(f = false) { 
    return withRetry<Sale[]>(() => supabase.from('sales').select('*').order('date', { ascending: false }).limit(200), 'sales', f); 
  },
  
  async getPurchases(f = false) { 
    return withRetry<Purchase[]>(() => supabase.from('purchases').select('*').order('date', { ascending: false }).limit(200), 'purchs', f); 
  },

  async saveSale(sale: any, skipQueue = false) { 
    return baseService.safeUpsert('sales', sale, 'saveSale', skipQueue); 
  },

  async savePurchase(purchase: any, skipQueue = false) { 
    return baseService.safeUpsert('purchases', purchase, 'savePurchase', skipQueue); 
  },

  async returnSale(id: string, skipQueue = false) {
    const uid = await baseService.getUserId();
    if (!uid) throw new Error("Unauthenticated");
    if (!navigator.onLine && !skipQueue) {
      return baseService.queueOffline(uid, 'returnSale', { id });
    }
    const { error } = await supabase.rpc('return_sale', { sale_uuid: id, user_uuid: uid });
    if (error) throw error;
    return true;
  },

  async returnPurchase(id: string, skipQueue = false) {
    const uid = await baseService.getUserId();
    if (!uid) throw new Error("Unauthenticated");
    if (!navigator.onLine && !skipQueue) {
      return baseService.queueOffline(uid, 'returnPurchase', { id });
    }
    const { error } = await supabase.rpc('return_purchase', { purchase_uuid: id, user_uuid: uid });
    if (error) throw error;
    return true;
  }
};
