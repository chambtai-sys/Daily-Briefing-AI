import React from 'react';
import { VoiceName } from '../types';
import { RadioGroup } from '@headlessui/react'; // Just using standard HTML for simplicity if library not requested, but sticking to standard React for this prompt to minimize deps.

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onChange: (voice: VoiceName) => void;
  disabled?: boolean;
}

const VOICES = [
  { name: VoiceName.Puck, desc: "Playful & Energetic" },
  { name: VoiceName.Kore, desc: "Calm & Soothing" },
  { name: VoiceName.Fenrir, desc: "Deep & Authoritative" },
  { name: VoiceName.Charon, desc: "Steady & News-like" },
  { name: VoiceName.Zephyr, desc: "Bright & Clear" },
];

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onChange, disabled }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
        Select Your Host
      </label>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {VOICES.map((voice) => (
          <button
            key={voice.name}
            onClick={() => onChange(voice.name)}
            disabled={disabled}
            className={`
              relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200
              ${selectedVoice === voice.name 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="font-bold text-sm mb-1">{voice.name}</span>
            <span className="text-[10px] opacity-80 leading-tight text-center">{voice.desc}</span>
            
            {selectedVoice === voice.name && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};