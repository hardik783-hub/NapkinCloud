'use client';

import React, { useEffect } from 'react';
import { Info, AlertTriangle, XCircle, CheckCircle2, X } from 'lucide-react';

type ToastType = 'info' | 'warning' | 'error' | 'success';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    info: 'border-cyan-500/50 text-cyan-400',
    warning: 'border-amber-500/50 text-amber-400',
    error: 'border-rose-500/50 text-rose-400',
    success: 'border-emerald-500/50 text-emerald-400',
  };

  const icons = {
    info: <Info className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    error: <XCircle className="w-4 h-4" />,
    success: <CheckCircle2 className="w-4 h-4" />,
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 bg-[#0E0E0E] border rounded-lg shadow-lg ${colors[type]} max-w-md w-full`}>
        <div className="flex-shrink-0">
          {icons[type]}
        </div>
        <p className="flex-1 text-sm font-medium text-slate-200 truncate">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
