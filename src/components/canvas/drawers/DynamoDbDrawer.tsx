'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Database, RefreshCw, Layers, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { DynamoDbNodeData } from '@/types/canvas';
import type { TableRecord } from '@/lib/dataStore';

interface DynamoDbDrawerProps {
  dbData: DynamoDbNodeData;
  onClose: () => void;
  refreshTrigger?: number;
}

export default function DynamoDbDrawer({
  dbData,
  onClose,
  refreshTrigger,
}: DynamoDbDrawerProps) {
  const [items, setItems] = useState<TableRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TableRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/data?tableName=${encodeURIComponent(dbData.tableName || 'OrdersTable')}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch table items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dbData.tableName]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords, refreshTrigger]);

  const pkName = dbData.primaryKey || 'orderId';

  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-xl bg-slate-900/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                DynamoDB Inspector
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                LIVE TABLE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Table: <span className="text-indigo-400 font-bold">{dbData.tableName}</span> ({pkName})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Refresh Table Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-5 pb-3 grid grid-cols-3 gap-3 border-b border-slate-800">
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Items</span>
          <span className="text-lg font-bold text-white font-mono">{items.length}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Partition Key</span>
          <span className="text-xs font-bold text-indigo-400 font-mono truncate block mt-1">{pkName}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Billing Mode</span>
          <span className="text-xs font-bold text-emerald-400 font-mono block mt-1">PAY_PER_REQUEST</span>
        </div>
      </div>

      {/* Table Records List */}
      <div className="flex-1 overflow-auto p-5">
        {items.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-2xl">
            <Layers className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No records in this table yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Click the API Gateway node on the canvas to open the API Tester and fire a live request!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((row, idx) => (
              <div
                key={row[pkName] || idx}
                onClick={() => setSelectedRecord(row === selectedRecord ? null : row)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedRecord === row
                    ? 'bg-slate-800/80 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/40">
                    {row[pkName] || `item-${idx}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">
                      {row.createdAt ? new Date(row.createdAt).toLocaleTimeString() : 'Just now'}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      ACTIVE
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 font-medium">
                  {row.item ? (
                    <span>Item: <strong className="text-white">{row.item}</strong></span>
                  ) : (
                    <span>Payload: {Object.keys(row).filter((k) => !k.startsWith('_')).slice(0, 3).join(', ')}</span>
                  )}
                  {row.price && <span className="ml-2 text-emerald-400 font-mono">${row.price}</span>}
                  {row.qty && <span className="ml-2 text-slate-400">×{row.qty}</span>}
                </div>

                {selectedRecord === row && (
                  <pre className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-auto max-h-40">
                    {JSON.stringify(row, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>DynamoDB DocumentClient Connected</span>
        </div>
        <span>Auto-synced</span>
      </div>
    </div>
  );
}
