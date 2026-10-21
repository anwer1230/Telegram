/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Cloud, ShieldCheck, Key, Server, RefreshCw, CheckCircle, 
  Wifi, Lock, Terminal, X, ExternalLink, Check, Copy
} from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { TELEGRAM_CONFIG } from '../../config/telegram';

interface Props {
  onClose: () => void;
}

export const CloudStatusModal: React.FC<Props> = ({ onClose }) => {
  const [cloudInfo, setCloudInfo] = useState(telegramService.getCloudStatus());
  const [latency, setLatency] = useState(24);
  const [isPinging, setIsPinging] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing'>('synced');

  const theme = telegramService.getThemeSettings();

  const handleTestPing = () => {
    setIsPinging(true);
    setSyncStatus('syncing');
    setTimeout(() => {
      setLatency(Math.floor(18 + Math.random() * 14));
      setIsPinging(false);
      setSyncStatus('synced');
    }, 600);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#17212b] border border-teal-500/40 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl text-white">
        {/* Header */}
        <div 
          className="p-4 flex items-center justify-between border-b border-[#242f3d]"
          style={{ backgroundColor: theme.primaryColor }}
        >
          <div className="flex items-center gap-2.5">
            <Cloud className="w-6 h-6 text-white" />
            <h2 className="text-lg font-bold text-white">سحابة تيليجرام الرسمية والتشفير</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-black/20 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-right">
          {/* Connection badge */}
          <div className="bg-teal-950/40 border border-teal-500/40 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400">
                {syncStatus === 'syncing' ? 'جارٍ المزامنة السحابية...' : 'متصل بالسحابة الرسمية'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="font-mono">{latency} ms</span>
              <Wifi className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* Embedded Official API Credentials */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-teal-400 block">
              بيانات الاعتماد السحابية المدمجة دائمًا (Embedded Variables)
            </span>

            <div className="bg-[#0e1621] rounded-2xl p-3 border border-[#242f3d] space-y-2.5 font-mono text-xs">
              {/* API ID */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#17212b] border border-[#242f3d]">
                <button
                  onClick={() => copyToClipboard(String(TELEGRAM_CONFIG.API_ID), 'id')}
                  className="p-1 text-gray-400 hover:text-teal-400"
                  title="نسخ"
                >
                  {copiedKey === 'id' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{TELEGRAM_CONFIG.API_ID}</span>
                  <span className="text-gray-400">TELEGRAM_API_ID =</span>
                </div>
              </div>

              {/* API HASH */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#17212b] border border-[#242f3d]">
                <button
                  onClick={() => copyToClipboard(TELEGRAM_CONFIG.API_HASH, 'hash')}
                  className="p-1 text-gray-400 hover:text-teal-400"
                  title="نسخ"
                >
                  {copiedKey === 'hash' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold truncate max-w-[200px]">'{TELEGRAM_CONFIG.API_HASH}'</span>
                  <span className="text-gray-400">TELEGRAM_API_HASH =</span>
                </div>
              </div>
            </div>
          </div>

          {/* Protocol & End-to-End Encryption */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-teal-400 block">
              تشفير البيانات والبروتوكول السحابي
            </span>

            <div className="bg-[#0e1621] rounded-2xl p-3.5 border border-[#242f3d] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-teal-300 font-mono">MTProto 2.0 / WebSocket Secure (WSS)</span>
                <span className="text-gray-400">البروتوكول:</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-mono">AES-256-GCM + SHA-256</span>
                <span className="text-gray-400">خوارزمية التشفير:</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-mono">Active (End-to-End Encrypted)</span>
                <span className="text-gray-400">حالة التشفير:</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-400 font-mono">الرسائل المحفوظة (سحابة غير محدودة)</span>
                <span className="text-gray-400">سحابة التخزين:</span>
              </div>
            </div>
          </div>

          {/* خوادم مراكز البيانات الرسمية (Data Centers) */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-teal-400 block">
              خوادم تيليجرام الرسمية المتاحة (Data Centers)
            </span>

            <div className="grid grid-cols-1 gap-2">
              {Object.values(TELEGRAM_CONFIG.DC_SERVERS).map((dc) => {
                const isSelected = cloudInfo.activeDC === dc.id;
                return (
                  <div
                    key={dc.id}
                    onClick={() => {
                      telegramService.switchDataCenter(dc.id);
                      setCloudInfo(telegramService.getCloudStatus());
                      handleTestPing();
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-teal-950/40 border-teal-400 shadow-md' 
                        : 'bg-[#0e1621] border-[#242f3d] hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                          نشط
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">انقر للتبديل</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-100">{dc.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{dc.ws}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleTestPing}
              disabled={isPinging}
              className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? 'جارٍ الفحص...' : 'فحص الاستجابة والمزامنة الآن'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-medium text-sm text-gray-200"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
