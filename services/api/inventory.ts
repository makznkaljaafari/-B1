
import { supabase } from '../supabaseClient';
import { baseService, withRetry } from './base';
import { QatCategory, Waste } from '../../types';

export const inventoryService = {
  async getCategories(f = false) { 
    return withRetry<QatCategory[]>(() => supabase.from('categories').select('*').order('name'), 'cats', f); 
  },

  async getWaste(f = false) { 
    return withRetry<Waste[]>(() => supabase.from('waste').select('*').order('date', { ascending: false }), 'waste', f); 
  },

  async saveCategory(cat: any, skipQueue = false) { 
    return baseService.safeUpsert('categories', cat, 'saveCategory', skipQueue); 
  },

  async saveWaste(w: any, skipQueue = false) { 
    return baseService.safeUpsert('waste', w, 'saveWaste', skipQueue); 
  }
};
