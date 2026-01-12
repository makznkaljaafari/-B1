
import React, { Component, ReactNode } from 'react';
import { indexedDbService } from '../services/indexedDbService';
import { logger } from '../services/loggerService';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  isRecovering: boolean;
}

// Fixed: Correctly define class component with Props and State generic types
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined, isRecovering: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, isRecovering: false };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.error('CRITICAL APP CRASH', { error, errorInfo });
    // يمكن هنا إرسال تقرير الخطأ إلى Supabase logs
  }

  handleSelfHealing = async () => {
    // Fixed: setState is now correctly recognized as a member of Component
    this.setState({ isRecovering: true });
    try {
      // مسح الكاش المحلي الذي قد يكون هو سبب الانهيار
      await indexedDbService.clearCache();
      localStorage.removeItem('theme'); // استعادة المظهر الافتراضي
      
      // انتظار بسيط لضمان المسح
      await new Promise(r => setTimeout(r, 1000));
      window.location.href = '/'; // إعادة التوجيه للرئيسية
    } catch (e) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-white text-right font-tajawal" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl border-4 border-rose-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full"></div>
            
            <div className="text-7xl mb-8 animate-bounce text-center">🛡️</div>
            <h1 className="text-2xl font-black mb-4 text-center">نظام الحماية الذكي تفعل!</h1>
            <p className="text-slate-400 mb-8 font-bold leading-relaxed text-sm">
              حدث تداخل في البيانات تسبب في توقف الواجهة. بياناتك آمنة في السحابة، ويمكننا إصلاح التطبيق لك الآن.
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={this.handleSelfHealing}
                disabled={this.state.isRecovering}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {this.state.isRecovering ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : 'إصلاح المشكلة وإعادة التشغيل 🛠️'}
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-bold transition-all text-sm"
              >
                محاولة تحديث الصفحة فقط 🔄
              </button>
            </div>
            
            <div className="mt-10 pt-6 border-t border-white/5 text-center">
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
                Safe Mode v3.1 | Error ID: {this.state.error?.name || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Fixed: props.children is now correctly typed and accessible
    return this.props.children;
  }
}

export default ErrorBoundary;