import React from 'react';
import { MusicStyle } from '../types';

interface MusicSelectorProps {
  selectedMusic: MusicStyle;
  onChange: (style: MusicStyle) => void;
  disabled?: boolean;
}

const OPTIONS = [
  { id: MusicStyle.NO_MUSIC, label: 'No Music', icon: '🔇' },
  { id: MusicStyle.CALM, label: 'Morning Calm', icon: '🌅' },
  { id: MusicStyle.UPBEAT, label: 'Upbeat News', icon: '⚡' },
  { id: MusicStyle.FOCUS, label: 'Deep Focus', icon: '🧠' },
];

export const MusicSelector: React.FC<MusicSelectorProps> = ({ selectedMusic, onChange, disabled }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
        Background Ambience
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            disabled={disabled}
            className={`
              flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
              ${selectedMusic === opt.id 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-xl mb-1">{opt.icon}</span>
            <span className="text-xs font-bold">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};