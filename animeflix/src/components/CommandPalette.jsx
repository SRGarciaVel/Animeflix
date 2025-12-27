import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home, BarChart2, Trophy, Dices, Terminal, Sparkles } from 'lucide-react';

export function CommandPalette({ isOpen, onClose, onRandom }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = [
    { icon: <Home size={18}/>, label: 'Ir al Inicio', action: () => navigate('/') },
    { icon: <BarChart2 size={18}/>, label: 'Ver Estadísticas', action: () => navigate('/stats') },
    { icon: <Trophy size={18}/>, label: 'Tier List Personal', action: () => navigate('/tier-list') },
    { icon: <Dices size={18}/>, label: 'Anime Aleatorio', action: onRandom },
    { icon: <Sparkles size={18}/>, label: 'Ver mi Wrapped del Año', action: () => navigate('/wrapped') },
    { icon: <Award size={18}/>, label: 'Ver Galería de Logros', action: () => navigate('/achievements') },
  ];

  const filteredCommands = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-netflix-darkGray w-full max-w-xl rounded-[2rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden relative z-10">
        <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-black/20">
          <Terminal className="text-netflix-red" size={20} />
          <input 
            autoFocus
            className="bg-transparent border-none outline-none text-xl font-bold w-full placeholder:text-gray-700 italic"
            placeholder="¿Qué quieres hacer?..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
                if(e.key === 'Enter' && filteredCommands[0]) {
                    filteredCommands[0].action();
                    onClose();
                }
                if(e.key === 'Escape') onClose();
            }}
          />
          <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded text-gray-500 tracking-tighter">ESC PARA SALIR</span>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto no-scrollbar">
          {filteredCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => { cmd.action(); onClose(); }}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group border border-transparent hover:border-white/5 mb-2"
            >
              <div className="flex items-center gap-4">
                <div className="text-gray-500 group-hover:text-netflix-red transition-colors">
                  {cmd.icon}
                </div>
                <span className="font-black text-sm uppercase tracking-widest text-gray-300 group-hover:text-white">
                  {cmd.label}
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-400">ENTER</span>
            </button>
          ))}
          {filteredCommands.length === 0 && (
             <p className="text-center py-10 text-xs font-bold text-gray-600 uppercase tracking-widest italic">Comando no encontrado...</p>
          )}
        </div>
      </div>
    </div>
  );
}