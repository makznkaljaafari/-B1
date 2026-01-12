
import { indexedDbService } from './indexedDbService';
import { supabaseStorageService } from './supabaseStorageService';
import { logger } from './loggerService';
import { dataService } from './dataService';

export const syncService = {
  async processQueue(userId: string, apiActions: any) {
    if (!navigator.onLine) return;
    const operations = await indexedDbService.getAllOperations();
    if (operations.length === 0) return;

    logger.info(`🔄 Syncing ${operations.length} operations...`);

    for (const op of operations) {
      try {
        let currentPayload = { ...op.payload };
        
        // معالجة الصور المعلقة باستخدام الوظيفة المركزية في dataService
        if (op.payload.image_base64_data && op.payload.record_type_for_image) {
          const bytes = dataService.base64ToBytes(op.payload.image_base64_data);
          const imageFile = new File([bytes], op.payload.image_file_name || 'upload.jpg', { type: op.payload.image_mime_type });
          const imageUrl = await supabaseStorageService.uploadImage(
            userId, op.payload.record_type_for_image, op.tempId || op.originalId || 'offline', imageFile
          );
          currentPayload.image_url = imageUrl;
        }

        // تنفيذ العملية
        await apiActions[op.action](currentPayload, true);
        await indexedDbService.removeOperation(op.id);
      } catch (e: any) {
        logger.error(`Sync error for ${op.action}:`, e);
      }
    }
  }
};
