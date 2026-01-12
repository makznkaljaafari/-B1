
import { supabase } from './supabaseClient';

export const authService = {
  async getUserId() {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  },

  async ensureUserExists(userId: string) {
    const { data: profile } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
    if (!profile) {
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        await supabase.from('users').upsert({
          id: userId, 
          email: auth.user.email,
          full_name: auth.user.user_metadata?.full_name || 'مدير جديد',
          agency_name: auth.user.user_metadata?.agency_name || 'وكالة الشويع للقات'
        });
      }
    }
  },

  async getFullProfile(userId: string) {
    const [u, s] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
    ]);
    return { ...(u?.data || {}), ...(s?.data?.accounting_settings || {}) };
  },

  async updateProfile(userId: string, updates: any) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  }
};
