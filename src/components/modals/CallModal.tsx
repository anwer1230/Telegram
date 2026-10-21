/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, ShieldCheck } from 'lucide-react';
import { ChatItem } from '../../types/telegram';

interface Props {
  chat: ChatItem;
  isVideo?: boolean;
  onClose: () => void;
}

export const CallModal: React.FC<Props> = ({ chat, isVideo, onClose }) => {
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play realistic Telegram Web call tone using Web Audio API
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        let isRunning = true;
        const playBeep = () => {
          if (!isRunning || ctx.state === 'closed') return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(425, ctx.currentTime); // Standard Euro/Telegram ring frequency
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 1.2);
        };

        playBeep();
        const interval = setInterval(playBeep, 3500);

        // Auto connect after 3.5 seconds
        const connectTimeout = setTimeout(() => {
          clearInterval(interval);
          setCallStatus('connected');
        }, 3600);

        return () => {
          isRunning = false;
          clearInterval(interval);
          clearTimeout(connectTimeout);
          try { ctx.close(); } catch (e) {}
        };
      }
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  }, []);

  // Request real microphone on call connect
  useEffect(() => {
    if (callStatus === 'connected') {
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then((stream) => {
          mediaStreamRef.current = stream;
        })
        .catch((err) => console.log('Mic not accessible:', err));
    }

    return () => {
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [callStatus]);

  // Duration timer
  useEffect(() => {
    let timer: any;
    if (callStatus === 'connected') {
      timer = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // inverted
      });
    }
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
    }
    setTimeout(onClose, 500);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-8 text-white">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between text-xs text-teal-300">
        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-teal-500/30">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>مكالمة مشفرة سحابياً بتقنية End-to-End</span>
        </div>
        <span className="font-mono text-gray-400">MTProto Voice Call</span>
      </div>

      {/* Center user info */}
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="relative">
          <img
            src={chat.avatar}
            alt={chat.title}
            className={`w-32 h-32 rounded-full object-cover border-4 border-teal-500/80 shadow-2xl ${
              callStatus === 'calling' ? 'animate-pulse' : ''
            }`}
          />
          {callStatus === 'connected' && (
            <span className="absolute bottom-1 left-2 w-5 h-5 bg-emerald-500 border-2 border-black rounded-full" />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white">{chat.title}</h2>
          <p className="text-sm font-mono mt-1 text-teal-300">
            {callStatus === 'calling' 
              ? 'جارٍ الاتصال عبر سحابة تيليجرام...' 
              : callStatus === 'connected' 
              ? `متصل (${formatDuration(duration)})` 
              : 'تم إنهاء المكالمة'}
          </p>
        </div>
      </div>

      {/* Bottom Call Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isMuted ? 'bg-red-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
          title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={handleEndCall}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-xl transition-transform active:scale-90"
          title="إنهاء المكالمة"
        >
          <PhoneOff className="w-7 h-7" />
        </button>

        <button
          className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          title="مكبر الصوت"
        >
          <Volume2 className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
