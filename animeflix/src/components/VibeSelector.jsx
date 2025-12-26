import React from 'react';
import { CloudRain, Zap, Coffee, Ghost, Brain, Heart, Flame } from 'lucide-react';

const VIBES = [
  { id: 'sad', label: 'Para llorar', icon: <CloudRain size={14}/>, color: 'hover:text-blue-400' },
  { id: 'hype', label: 'Adrenalina', icon: <Zap size={14}/>, color: 'hover:text-yellow-400' },
  { id: 'chill', label: 'Relax / Chill', icon: <Coffee size={14}/>, color: 'hover:text-green-400' },
  { id: 'comedy', label: 'Risas / Brain Off', icon: <Ghost size={14}/>, color: 'hover:text-orange-400' },
  { id: 'brainy', label: 'Trama Cerebral', icon: <Brain size={14}/>, color: 'hover:text-purple-400' },
  { id: 'romance', label: 'Romance / Feel Good', icon: <Heart size={14}/>, color: 'hover:text-pink-400' },
  { id: 'epic', label: 'Épico / Shonen', icon: <Flame size={14}/>, color: 'hover:text-red-500' },
];

export function VibeSelector({ activeVibe, onVibeChange }) {
  return (
    <div className="flex flex-wrap gap-3 mb-10">
      <button
        onClick={() => onVibeChange(null)}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
          !activeVibe ? 'bg-white text-black border-white shadow-lg' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20'
        }`}
      >
        Todos los Vibes
      </button>
      {VIBES.map((vibe) => (
        <button
          key={vibe.id}
          onClick={() => onVibeChange(vibe.id)}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 transition-all ${
            activeVibe === vibe.id 
            ? 'bg-white text-black border-white shadow-lg scale-105' 
            : `bg-white/5 border-white/5 text-gray-500 ${vibe.color}`
          }`}
        >
          {vibe.icon}
          {vibe.label}
        </button>
      ))}
    </div>
  );
}