
import { supabase } from '../supabaseClient';
import { baseService, withRetry } from './base';
import { Voucher, Expense, ExpenseTemplate } from '../../types';

export const financeApiService = {
  async getVouchers(f = false) { return withRetry<Voucher[]>(() => supabase.from('vouchers').select('*').order('date', { ascending: false }), 'vchs', f); },
  async getExpenses(f = false) { return withRetry<Expense[]>(() => supabase.from('expenses').select('*').order('date', { ascending: false }), 'exps', f); },
  async getExpenseTemplates(f = false) { return withRetry<ExpenseTemplate[]>(() => supabase.from('expense_templates').select('*').order('title'), 'exp_templates', f); },

  async saveVoucher(v: any, skipQueue = false) { return baseService.safeUpsert('vouchers', v, 'saveVoucher', skipQueue); },
  async saveExpense(e: any, skipQueue = false) { return baseService.safeUpsert('expenses', e, 'saveExpense', skipQueue); },
  async saveExpenseTemplate(t: any, skipQueue = false) { return baseService.safeUpsert('expense_templates', t, 'saveExpenseTemplate', skipQueue); },
  async saveOpeningBalance(b: any, skipQueue = false) { return baseService.safeUpsert('opening_balances', b, 'saveOpeningBalance', skipQueue); }
};
