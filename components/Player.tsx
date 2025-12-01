import React, { useState, useEffect, useRef } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { createWavUrl } from '../services/audioUtils';

interface PlayerProps {
  // Can accept either a pre-generated URL (mixed audio) or raw base64 (simple audio)
  audioUrl?: string; 
  base64Audio?: string | null;
  title: string;
  onReset: () => void;
}

export const Player: React.FC<PlayerProps> = ({ audioUrl: propAudioUrl, base64Audio, title, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [internalAudioUrl, setInternalAudioUrl] = useState<string | null>(null);

  // Refs for Audio Element and Web Audio API
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // 1. Resolve Audio Source
  useEffect(() => {
    let url: string | null = null;
    let shouldRevoke = false;

    if (propAudioUrl) {
      // Use provided URL (likely from mixed audio blob)
      url = propAudioUrl;
      setInternalAudioUrl(url);
    } else if (base64Audio) {
      // Fallback: convert base64 to wav url
      url = createWavUrl(base64Audio);
      setInternalAudioUrl(url);
      shouldRevoke = true;
    }

    return () => {
      if (shouldRevoke && url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [propAudioUrl, base64Audio]);

  // 2. Initialize Audio Context for Visualization
  useEffect(() => {
    if (!internalAudioUrl || !audioRef.current) return;

    const audioEl = audioRef.current;
    
    // Only initialize context once
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      try {
        // Create source from the audio element
        const source = ctx.createMediaElementSource(audioEl);
        sourceNodeRef.current = source;
        
        // Connect: Source -> Analyser -> Destination (Speakers)
        source.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (e) {
        console.error("Error connecting audio graph:", e);
      }
    }

    // Cleanup when component unmounts
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [internalAudioUrl]);

  // 3. Handle Playback Rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Audio Event Handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if(audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Resume context if suspended (needed for browsers like Chrome)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Playback failed", err);
      }
    }
  };

  const handleDownload = () => {
    if (!internalAudioUrl) return;
    
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'daily_briefing';
    const link = document.createElement('a');
    link.href = internalAudioUrl;
    link.download = `${safeTitle}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Hidden Audio Element */}
      {internalAudioUrl && (
        <audio
          ref={audioRef}
          src={internalAudioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}

      {/* Tape/Player Header Style */}
      <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Now Playing</h3>
          <h2 className="text-lg font-serif font-bold leading-tight">{title}</h2>
        </div>
        <button 
          onClick={handleDownload}
          title="Download Audio (WAV)"
          className="p-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-colors text-white focus:outline-none focus:ring-2 focus:ring-white/50"
        >
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <div className="p-6">
        {/* Visualizer */}
        <div className="mb-6 bg-slate-50 rounded-lg border border-slate-100 p-2">
            <AudioVisualizer analyser={analyserRef.current} isPlaying={isPlaying} />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={togglePlay}
            className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-200"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <div className="flex-1">
             <div className="flex justify-between text-xs text-slate-500 font-medium mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
             </div>
             <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden cursor-pointer">
                <div 
                  className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
             </div>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Speed</span>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {[0.75, 1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`
                    px-3 py-1 text-xs font-bold rounded-md transition-all
                    ${playbackRate === rate 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}
                  `}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          <button 
             onClick={onReset}
             className="text-sm text-slate-400 hover:text-indigo-600 font-medium flex items-center gap-2 transition-colors"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
             </svg>
             New Briefing
           </button>
        </div>
      </div>
    </div>
  );
};