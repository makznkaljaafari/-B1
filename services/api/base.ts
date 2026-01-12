
import { supabase } from '../supabaseClient';
import { logger } from '../loggerService';
import { indexedDbService } from '../indexedDbService';
import { authService } from '../authService';

// نظام كاش محصن مع وقت انتهاء صلاحية ذكي
export const CACHE_TTL = 30000; // 30 ثانية للبيانات الحساسة
export let l1Cache: Record<string, { data: any, timestamp: number }> = {};

// وظيفة لتنظيف الذاكرة تلقائياً لمنع تسرب الذاكرة (Memory Leaks)
const autoCleanCache = () => {
  const now = Date.now();
  Object.keys(l1Cache).forEach(key => {
    if (now - l1Cache[key].timestamp > CACHE_TTL * 2) {
      delete l1Cache[key];
    }
  });
};

setInterval(autoCleanCache, 60000);

export const cleanPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return {};
  const cleaned = { ...payload };
  const keysToRemove = [
    'image_base64_data', 'image_mime_type', 'image_file_name', 
    'record_type_for_image', 'tempId', 'originalId', 
    'created_at', 'updated_at', '_offline'
  ];
  keysToRemove.forEach(key => delete cleaned[key]);
  return cleaned;
};

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<{ data: T | null, error: any }>, 
  key: string, 
  forceFresh = false, 
  retries = 3
): Promise<T> {
  // التحقق من الكاش أولاً لتجنب الانهيار أثناء التحميل
  if (!forceFresh && l1Cache[key] && (Date.now() - l1Cache[key].timestamp < CACHE_TTL)) {
    return (l1Cache[key].data || []) as T;
  }
  
  for (let i = 0; i <= retries; i++) {
    try {
      const { data, error } = await fn();
      
      if (!error && data !== null) {
        l1Cache[key] = { data, timestamp: Date.now() };
        indexedDbService.saveData(key, data).catch(() => {});
        return data as T;
      }
      if (error) throw error;
    } catch (err: any) {
      const isTransient = 
        !navigator.onLine || 
        err.status === 429 || 
        err.status >= 500;
      
      if (isTransient && i < retries) {
        await wait(1000 * Math.pow(2, i)); 
        continue;
      }
      break;
    }
  }
  
  // خط الدفاع الأخير: استعادة البيانات المحلية فوراً لمنع تعليق الواجهة
  const localData = await indexedDbService.getData(key);
  if (localData) {
    logger.info(`Emergency: Serving offline data for ${key}`);
    return localData as T;
  }
  
  return [] as unknown as T; // إرجاع مصفوفة فارغة بدلاً من undefined لمنع الانهيار في .map()
}

export const baseService = {
  async getUserId() {
    try {
      return await authService.getUserId();
    } catch {
      return null;
    }
  },

  async queueOffline(uid: string, action: string, payload: any) {
    const tempId = payload.id || crypto.randomUUID();
    try {
      await indexedDbService.addOperation({ 
        userId: uid, 
        action: action as any, 
        tempId, 
        payload: { ...payload, id: tempId, user_id: uid } 
      });
      return { ...payload, id: tempId, created_at: new Date().toISOString(), _offline: true };
    } catch (e) {
      logger.error("Critical: Failed to queue offline operation", e);
      throw new Error("مساحة التخزين ممتلئة أو المتصفح يمنع التخزين المحلي.");
    }
  },

  async safeUpsert(table: string, payload: any, actionName: string, skipQueue = false) {
    const uid = await this.getUserId();
    if (!uid) throw new Error("يرجى إعادة تسجيل الدخول (انتهت الجلسة)");

    try {
      if (!navigator.onLine && !skipQueue) {
        return await this.queueOffline(uid, actionName, payload);
      }

      const { data, error } = await supabase
        .from(table)
        .upsert({ ...cleanPayload(payload), user_id: uid })
        .select()
        .single();
        
      if (error) throw error;
      
      delete l1Cache[table]; 
      return data;
    } catch (e: any) {
      if (!navigator.onLine && !skipQueue) {
        return await this.queueOffline(uid, actionName, payload);
      }
      logger.error(`Upsert Collapse on ${table}:`, e);
      throw e;
    }
  }
};
