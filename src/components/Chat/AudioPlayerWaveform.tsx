import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import { voicePlayback, type VoicePlaybackState } from '../../services/voicePlaybackService';

interface AudioPlayerWaveformProps {
  messageId?: string;
  chatId?: string;
  senderName?: string;
  duration: number; // in seconds
  waveform?: number[];
  audioUrl?: string;
  isOutgoing?: boolean;
}

export const AudioPlayerWaveform: React.FC<AudioPlayerWaveformProps> = ({
  messageId,
  chatId = '',
  senderName = '',
  duration,
  waveform = [],
  audioUrl,
  isOutgoing = false,
}) => {
  // Generate stable fallback waveform if empty
  const defaultWaveform = useMemo(() => {
    if (waveform && waveform.length > 0) return waveform;
    return [
      22, 35, 55, 75, 45, 28, 65, 88, 98, 60,
      35, 50, 72, 92, 78, 42, 28, 58, 82, 68,
      48, 32, 62, 76, 38, 22, 45, 68, 52, 25,
    ];
  }, [waveform]);

  const [playbackState, setPlaybackState] = useState<VoicePlaybackState>(voicePlayback.getState());
  const [isHovering, setIsHovering] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);

  // Fallback ID if messageId wasn't passed
  const effectiveId = useRef(messageId || `audio_synth_${Math.random().toString(36).slice(2, 8)}`).current;

  // Subscribe to central playback state
  useEffect(() => {
    const unsubscribe = voicePlayback.subscribe((newState) => {
      setPlaybackState(newState);
    });
    return () => unsubscribe();
  }, []);

  const isCurrentActive = playbackState.activeMessageId === effectiveId;
  const isPlaying = isCurrentActive && playbackState.isPlaying;
  const currentProgress = isCurrentActive ? playbackState.progress : 0;
  const currentTime = isCurrentActive ? playbackState.currentTime : 0;
  const currentSpeed = isCurrentActive ? playbackState.playbackSpeed : 1;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    voicePlayback.togglePlay({
      messageId: effectiveId,
      chatId,
      senderName,
      duration,
      waveform: defaultWaveform,
      audioUrl,
    });
  };

  const handleSpeedToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSpeed: Record<number, 1 | 1.5 | 2> = { 1: 1.5, 1.5: 2, 2: 1 };
    const newSpeed = nextSpeed[currentSpeed];
    if (isCurrentActive) {
      voicePlayback.setSpeed(newSpeed);
    } else {
      voicePlayback.play({
        messageId: effectiveId,
        chatId,
        senderName,
        duration,
        waveform: defaultWaveform,
        audioUrl,
      });
      voicePlayback.setSpeed(newSpeed);
    }
  };

  const calculateProgressFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!waveformContainerRef.current) return 0;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    return Math.max(0, Math.min(1, clickX / rect.width));
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const progress = calculateProgressFromEvent(e);
    if (!isCurrentActive) {
      voicePlayback.play({
        messageId: effectiveId,
        chatId,
        senderName,
        duration,
        waveform: defaultWaveform,
        audioUrl,
      });
    }
    voicePlayback.seek(progress);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const progress = calculateProgressFromEvent(e);
    setHoverProgress(progress);
    if (isDragging && isCurrentActive) {
      voicePlayback.seek(progress);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentTimeDisplay = isPlaying || (isCurrentActive && currentTime > 0)
    ? formatTime(currentTime)
    : formatTime(duration);

  // Waveform bars with real-time dynamic frequency and wave bounce
  const renderedBars = useMemo(() => {
    return defaultWaveform.map((amp, index) => {
      const barRatio = index / defaultWaveform.length;
      const isPlayed = barRatio <= currentProgress;
      const isHoverCovered = hoverProgress !== null && barRatio <= hoverProgress;

      // Base height
      const baseHeight = Math.max(4, Math.round((amp / 100) * 22));

      // Dynamic bounce when actively playing
      let dynamicHeight = baseHeight;
      if (isPlaying) {
        // Map bar index to real-time frequency data
        const freqIdx = Math.floor((index / defaultWaveform.length) * playbackState.frequencyData.length);
        const freqVal = playbackState.frequencyData[freqIdx] || 0;

        // Traveling pulse factor around the playhead
        const distToCursor = Math.abs(barRatio - currentProgress);
        const rippleFactor = Math.max(0, 1 - distToCursor * 6);

        // Boost bar height dynamically
        const liveBounce = Math.round(freqVal * 12 * (0.6 + rippleFactor * 0.8));
        dynamicHeight = Math.max(4, Math.min(26, baseHeight + liveBounce));
      }

      return {
        key: index,
        height: dynamicHeight,
        isPlayed,
        isHoverCovered,
      };
    });
  }, [defaultWaveform, currentProgress, hoverProgress, isPlaying, playbackState.frequencyData]);

  return (
    <div
      id={`tg-audio-player-${effectiveId}`}
      className="flex items-center gap-3 py-1 px-1 min-w-[210px] max-w-[280px] select-none group/voice"
    >
      {/* Play/Pause Button with dynamic acoustic pulse */}
      <div className="relative shrink-0">
        {isPlaying && (
          <span className="absolute -inset-1 rounded-full bg-[#2481cc]/25 animate-ping" />
        )}
        <button
          onClick={togglePlay}
          className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md ${
            isOutgoing
              ? 'bg-[#2481cc] text-white hover:bg-[#1c6fad]'
              : 'bg-[#2481cc] text-white hover:bg-[#1c6fad]'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Waveform Bars & Time Info */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        {/* Dynamic Waveform Visualizer */}
        <div
          ref={waveformContainerRef}
          onClick={handleWaveformClick}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => {
            setIsHovering(false);
            setHoverProgress(null);
            setIsDragging(false);
          }}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseMove={handleMouseMove}
          className="relative flex items-center gap-[2px] h-7 cursor-pointer py-1"
        >
          {renderedBars.map((bar) => {
            const activeColor = bar.isPlayed
              ? (isOutgoing ? 'bg-[#2481cc]' : 'bg-[#2481cc]')
              : (isHovering && bar.isHoverCovered)
              ? 'bg-sky-400/60'
              : (isOutgoing ? 'bg-gray-400/40' : 'bg-gray-500/40');

            return (
              <span
                key={bar.key}
                className={`w-[2.5px] rounded-full transition-all duration-75 ${activeColor}`}
                style={{
                  height: `${bar.height}px`,
                }}
              />
            );
          })}

          {/* Hover Scrubbing Time Badge */}
          {isHovering && hoverProgress !== null && (
            <div
              className="absolute -top-5 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 text-white shadow-xs pointer-events-none z-10"
              style={{ left: `${hoverProgress * 100}%` }}
            >
              {formatTime(hoverProgress * duration)}
            </div>
          )}
        </div>

        {/* Timestamp & Speed Button */}
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span className="font-mono">{currentTimeDisplay}</span>
          <button
            onClick={handleSpeedToggle}
            className="px-1.5 py-0.5 rounded bg-black/15 hover:bg-black/25 dark:bg-white/10 dark:hover:bg-white/15 font-semibold text-[10px] text-sky-400 transition-colors active:scale-95"
            title="Toggle playback speed (1x, 1.5x, 2x)"
          >
            {currentSpeed}x
          </button>
        </div>
      </div>
    </div>
  );
};
