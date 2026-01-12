
import { supabase } from './supabaseClient';
import { logger } from './loggerService';
import { indexedDbService } from './indexedDbService';
import { syncService } from './syncService';
import { baseService, cleanPayload } from './api/base';
import { salesService } from './api/sales';
import { inventoryService } from './api/inventory';
import { userService } from './api/user';
import { financeApiService } from './api/finance';

export const dataService = {
  onOfflineQueueCountChange: (count: number) => {},
  
  async updateOfflineQueueCount() {
    try {
      const count = await indexedDbService.getQueueCount();
      this.onOfflineQueueCountChange(count);
    } catch (e) {
      logger.error("Failed to update queue count", e);
    }
  },

  // Auth & Profile
  getUserId: userService.getUserId,
  ensureUserExists: userService.ensureUserExists,
  getFullProfile: userService.getFullProfile,
  updateProfile: userService.updateProfile,
  updateSettings: userService.updateSettings,

  async processOfflineQueue() {
    const uid = await this.getUserId();
    if (!uid || !navigator.onLine) return;
    
    const actions = {
      saveSale: this.saveSale.bind(this),
      savePurchase: this.savePurchase.bind(this),
      saveCustomer: this.saveCustomer.bind(this),
      saveSupplier: this.saveSupplier.bind(this),
      saveVoucher: this.saveVoucher.bind(this),
      saveExpense: this.saveExpense.bind(this),
      saveCategory: this.saveCategory.bind(this),
      deleteRecord: this.deleteRecord.bind(this),
      returnSale: this.returnSale.bind(this),
      returnPurchase: this.returnPurchase.bind(this),
      updateSettings: this.updateSettings.bind(this),
      saveWaste: this.saveWaste.bind(this),
      saveOpeningBalance: this.saveOpeningBalance.bind(this),
      saveExpenseTemplate: this.saveExpenseTemplate.bind(this),
      saveNotification: this.saveNotification.bind(this)
    };

    try {
      await syncService.processQueue(uid, actions);
      await this.updateOfflineQueueCount();
    } catch (e) {
      logger.error("Global Sync Processing Error", e);
    }
  },

  // Inventory
  getCategories: inventoryService.getCategories,
  getWaste: inventoryService.getWaste,
  saveCategory: inventoryService.saveCategory,
  saveWaste: inventoryService.saveWaste,

  // Sales & Business
  getSales: salesService.getSales,
  getPurchases: salesService.getPurchases,
  saveSale: salesService.saveSale,
  savePurchase: salesService.savePurchase,
  returnSale: salesService.returnSale,
  returnPurchase: salesService.returnPurchase,

  // CRM
  getCustomers: userService.getCustomers,
  getSuppliers: userService.getSuppliers,
  saveCustomer: userService.saveCustomer,
  saveSupplier: userService.saveSupplier,

  // Finance
  getVouchers: financeApiService.getVouchers,
  getExpenses: financeApiService.getExpenses,
  getExpenseTemplates: financeApiService.getExpenseTemplates,
  saveVoucher: financeApiService.saveVoucher,
  saveExpense: financeApiService.saveExpense,
  saveExpenseTemplate: financeApiService.saveExpenseTemplate,
  saveOpeningBalance: financeApiService.saveOpeningBalance,

  // Notifications & Logging
  getNotifications: userService.getNotifications,
  getActivityLogs: userService.getActivityLogs,
  saveNotification: userService.saveNotification,
  markAllNotificationsRead: userService.markAllNotificationsRead,
  deleteAllNotificationsOlderThan: userService.deleteAllNotificationsOlderThan,
  logActivity: userService.logActivity,

  async deleteRecord(table: string, id: string, imageUrl?: string, recordTypeForImage?: string, skipQueue = false) {
    if (!id || id === 'new') return true; // منع محاولة حذف سجل غير موجود

    const uid = await this.getUserId();
    if (!uid) throw new Error("Unauthenticated");

    if (!navigator.onLine && !skipQueue) {
      await indexedDbService.addOperation({ 
        userId: uid!, 
        action: 'deleteRecord', 
        tableName: table, 
        originalId: id, 
        payload: { id, imageUrl, record_type_for_image: recordTypeForImage } 
      });
      await this.updateOfflineQueueCount();
      return true;
    }
    
    try {
      const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', uid);
      if (error) throw error;
      return true;
    } catch (e) {
      logger.error(`Critical failure deleting from ${table}`, e);
      throw e;
    }
  },

  base64ToBytes(base64: string): Uint8Array {
    try {
      if (!base64) return new Uint8Array(0);
      const binary_string = window.atob(base64.split(',')[1] || base64);
      const len = binary_string.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) { bytes[i] = binary_string.charCodeAt(i); }
      return bytes;
    } catch (e) {
      logger.error("Base64 Collapse:", e);
      return new Uint8Array(0);
    }
  },

  async prepareBackupPackage(userId: string, currentDataContext?: any) {
    const timestamp = new Date().toISOString();
    return {
      metadata: { app: "Al-Shwaia Smart", version: "3.1.1", userId, timestamp },
      data: currentDataContext || {
        customers: await this.getCustomers(),
        suppliers: await this.getSuppliers(),
        categories: await this.getCategories(),
        sales: await this.getSales(),
        purchases: await this.getPurchases(),
        vouchers: await this.getVouchers(),
        expenses: await this.getExpenses(),
        waste: await this.getWaste()
      }
    };
  },

  async restoreBackupData(userId: string, backupData: any) {
    if (!backupData?.data) throw new Error("ملف النسخة الاحتياطية تالف.");
    
    const { data } = backupData;
    const tables = [
      { name: 'customers', payload: data.customers },
      { name: 'suppliers', payload: data.suppliers },
      { name: 'categories', payload: data.categories },
      { name: 'sales', payload: data.sales },
      { name: 'purchases', payload: data.purchases }
    ];

    for (const table of tables) {
      if (Array.isArray(table.payload) && table.payload.length > 0) {
        const cleaned = table.payload.map(item => ({ ...cleanPayload(item), user_id: userId }));
        await supabase.from(table.name).upsert(cleaned);
      }
    }
    return true;
  }
};
