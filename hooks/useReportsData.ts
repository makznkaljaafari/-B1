
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { getFinancialForecast } from '../services/geminiService';
import { useIsMounted } from './useIsMounted';
import { AppError, Sale, Purchase, Expense, QatCategory } from '../types';

interface UseReportsProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  categories: QatCategory[];
  currency: 'YER' | 'SAR';
  addNotification: any;
}

export const useReportsData = ({ sales, purchases, expenses, categories, currency, addNotification }: UseReportsProps) => {
  const [forecast, setForecast] = useState<string>('');
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const isComponentMounted = useIsMounted();
  const lastSummaryRef = useRef<string>('');

  const metrics = useMemo(() => {
    const fSales = sales.filter(s => !s.is_returned && s.currency === currency);
    const fPurchases = purchases.filter(p => !p.is_returned && p.currency === currency);
    const fExpenses = expenses.filter(e => e.currency === currency);
    
    const totalSales = fSales.reduce((sum, s) => sum + s.total, 0);
    const totalPurchases = fPurchases.reduce((sum, p) => sum + p.total, 0);
    const totalExpenses = fExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = (totalSales - totalPurchases) - totalExpenses;
    const stockValue = categories.filter(c => c.currency === currency).reduce((sum, cat) => sum + (cat.stock * cat.price), 0);

    return { totalSales, totalPurchases, totalExpenses, netProfit, stockValue };
  }, [sales, purchases, expenses, categories, currency]);

  const fetchForecast = useCallback(async () => {
    if (isForecastLoading) return;
    setIsForecastLoading(true);
    try {
      const data = await getFinancialForecast(sales, expenses, categories);
      if (isComponentMounted()) setForecast(data);
    } catch (e: any) {
      if (isComponentMounted()) {
        const errorMessage = e instanceof AppError ? e.message : "فشل جلب التوقعات حالياً.";
        addNotification("خطأ في توقعات AI ❌", errorMessage, "warning");
        setForecast("فشل جلب التوقعات حالياً.");
      }
    } finally {
      if (isComponentMounted()) setIsForecastLoading(false);
    }
  }, [sales, expenses, categories, isComponentMounted, isForecastLoading, addNotification]);

  useEffect(() => {
    const summary = `${sales.length}-${expenses.length}-${categories.length}-${currency}`;
    if (summary !== lastSummaryRef.current && !forecast) {
      lastSummaryRef.current = summary;
      fetchForecast();
    }
  }, [sales.length, expenses.length, categories.length, currency, forecast, fetchForecast]);

  return { metrics, forecast, isForecastLoading, fetchForecast };
};
