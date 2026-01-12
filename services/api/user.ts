
import { supabase } from '../supabaseClient';
import { baseService, withRetry, cleanPayload } from './base';
import { authService } from '../authService';
import { Customer, Supplier, AppNotification, ActivityLog } from '../../types';
import { logger } from '../loggerService';

export const userService = {
  getUserId: authService.getUserId,
  ensureUserExists: authService.ensureUserExists,
  getFullProfile: authService.getFullProfile,
  updateProfile: authService.updateProfile,

  async getCustomers(f = false) { return withRetry<Customer[]>(() => supabase.from('customers').select('*').order('name'), 'custs', f); },
  async getSuppliers(f = false) { return withRetry<Supplier[]>(() => supabase.from('suppliers').select('*').order('name'), 'supps', f); },
  async getNotifications(f = false) { return withRetry<AppNotification[]>(() => supabase.from('notifications').select('*').order('date', {ascending: false}).limit(50), 'notifs', f); },
  async getActivityLogs() { return withRetry<ActivityLog[]>(() => supabase.from('activity_log').select('*').order('timestamp', { ascending: false }).limit(50), 'logs', true); },

  async saveCustomer(c: any, skipQueue = false) { return baseService.safeUpsert('customers', c, 'saveCustomer', skipQueue); },
  async saveSupplier(s: any, skipQueue = false) { return baseService.safeUpsert('suppliers', s, 'saveSupplier', skipQueue); },
  async saveNotification(n: any, skipQueue = false) { return baseService.safeUpsert('notifications', n, 'saveNotification', skipQueue); },

  async updateSettings(userId: string, settings: any, skipQueue = false) {
    if (!navigator.onLine && !skipQueue) {
      return baseService.queueOffline(userId, 'updateSettings', settings);
    }
    const { data, error } = await supabase.from('user_settings').upsert({ user_id: userId, accounting_settings: settings }, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    return data;
  },

  async markAllNotificationsRead() {
    const uid = await baseService.getUserId();
    if (!uid) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false);
    } catch (e) { logger.error("Failed to mark notifications read", e); }
  },

  async deleteAllNotificationsOlderThan(days: number) {
    const uid = await baseService.getUserId();
    if (!uid) throw new Error("Unauthenticated");
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    try {
      const { error } = await supabase.from('notifications').delete().eq('user_id', uid).lt('date', cutoffDate);
      if (error) throw error;
    } catch (e) { logger.error("Failed to delete old notifications", e); }
  },

  async logActivity(userId: string, action: string, details: string, type: ActivityLog['type']) {
    try {
      await supabase.from('activity_log').insert({ user_id: userId, action, details, type, timestamp: new Date().toISOString() });
    } catch (e) { logger.error(`Error in logActivity:`, e); }
  }
};
