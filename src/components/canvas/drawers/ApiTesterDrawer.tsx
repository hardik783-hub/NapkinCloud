'use client';

import React, { useState } from 'react';
import { X, Globe, Send, Loader2, CheckCircle2, Clock, Copy, Check } from 'lucide-react';
import type { ApiGatewayNodeData } from '@/types/canvas';

interface ApiTesterDrawerProps {
  apiData: ApiGatewayNodeData;
  tableName?: string;
  primaryKey?: string;
  onClose: () => void;
  onRequestSuccess?: (createdRecord: any) => void;
}

export default function ApiTesterDrawer({
  apiData,
  tableName = 'OrdersTable',
  primaryKey = 'orderId',
  onClose,
  onRequestSuccess,
}: ApiTesterDrawerProps) {
  const [requestBody, setRequestBody] = useState(
    JSON.stringify(
      {
        item: 'MacBook Pro M3 Max',
        qty: 1,
        price: 3499,
        customerEmail: 'builder@wemakedevs.org',
      },
      null,
      2
    )
  );
  const [isLoading, setIsLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    setResponseResult(null);

    try {
      let parsed = {};
      try {
        parsed = JSON.parse(requestBody);
      } catch {
        alert('Invalid JSON in request body');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        liveUrl: apiData.liveUrl,
        path: apiData.path,
        method: apiData.method,
        payload: parsed,
      }),
      });

      const data = await res.json();
      setResponseResult(data);

      if (data.success && data.item && onRequestSuccess) {
        onRequestSuccess(data.item);
      }
    } catch (err: any) {
      setResponseResult({
        success: false,
        statusCode: 500,
        error: err.message || 'Request failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (!responseResult) return;
    navigator.clipboard.writeText(JSON.stringify(responseResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-lg bg-slate-900/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live API Tester
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Target: <span className="text-cyan-400 font-bold">{apiData.method} {apiData.path}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-5 space-y-4">
        {/* Endpoint Bar */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
            {apiData.method}
          </span>
          <span className="flex-1 text-slate-300 truncate">
            {apiData.liveUrl || `https://api.napkincloud.live/prod${apiData.path}`}
          </span>
        </div>

        {/* Payload Editor */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              JSON Request Body
            </label>
            <span className="text-[10px] text-slate-500 font-mono">Auto-injects {primaryKey}</span>
          </div>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            rows={8}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Invoking AWS Lambda & DynamoDB...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send Live Request</span>
            </>
          )}
        </button>

        {/* Response Panel */}
        {responseResult && (
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Response Received</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-bold">
                  {responseResult.statusCode} OK
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {responseResult.latencyMs}ms
                </span>
                <button
                  onClick={handleCopyResponse}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-auto max-h-52">
              {JSON.stringify(responseResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
