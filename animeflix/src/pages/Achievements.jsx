import React, { useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { Trophy, Star, Tv, Book, Repeat, Clock, Flame, Ghost, Heart, Zap, Award, Lock } from 'lucide-react';

export function Achievements() {
  const { myList } = useAnimeLibrary();

  // --- LÓGICA DE CÁLCULO DE LOGROS ---
  const badges = useMemo(() => {
    const totalEps = myList.reduce((acc, curr) => acc + (curr.episodes_watched || 0), 0);
    const completed = myList.filter(a => a.status === 'completed').length;
    const withNotes = myList.filter(a => a.notes && a.notes.length > 10).length;
    const rewatches = myList.reduce((acc, curr) => acc + (curr.rewatch_count || 0), 0);
    
    // Contar géneros para medallas de especialidad
    const genreMap = {};
    myList.forEach(a => a.genres?.forEach(g => {
        const name = typeof g === 'object' ? g.name : g;
        genreMap[name] = (genreMap[name] || 0) + 1;
    }));

    return [
      {
        id: 1,
        name: "Recluta Otaku",
        desc: "Llega a tus primeros 10 episodios vistos.",
        icon: <Tv size={32}/>,
        unlocked: totalEps >= 10,
        color: "text-blue-400"
      },
      {
        id: 2,
        name: "Veterano de Guerra",
        desc: "Supera los 500 episodios vistos.",
        icon: <Flame size={32}/>,
        unlocked: totalEps >= 500,
        color: "text-orange-500"
      },
      {
        id: 3,
        name: "Leyenda Viviente",
        desc: "Alcanza los 1000 episodios vistos.",
        icon: <Trophy size={32}/>,
        unlocked: totalEps >= 1000,
        color: "text-yellow-500"
      },
      {
        id: 4,
        name: "Crítico de Élite",
        desc: "Escribe más de 10 notas personales profundas.",
        icon: <Edit3 size={32}/>,
        unlocked: withNotes >= 10,
        color: "text-purple-400"
      },
      {
        id: 5,
        name: "Amante del Bucle",
        desc: "Realiza tu primer rewatch oficial.",
        icon: <Repeat size={32}/>,
        unlocked: rewatches >= 1,
        color: "text-green-400"
      },
      {
        id: 6,
        name: "Maestro Shonen",
        desc: "Ten 15 o más animes de Acción en tu lista.",
        icon: <Zap size={32}/>,
        unlocked: (genreMap['Action'] || 0) >= 15,
        color: "text-red-500"
      },
      {
        id: 7,
        name: "Corazón de Cristal",
        desc: "Completa 5 animes de Romance o Drama.",
        icon: <Heart size={32}/>,
        unlocked: ((genreMap['Romance'] || 0) + (genreMap['Drama'] || 0)) >= 5,
        color: "text-pink-400"
      },
      {
        id: 8,
        name: "Cazador de Estrenos",
        desc: "Ten 5 series en estado 'Viendo' simultáneamente.",
        icon: <Clock size={32}/>,
        unlocked: myList.filter(a => a.status === 'watching').length >= 5,
        color: "text-cyan-400"
      },
      {
        id: 9,
        name: "Completista",
        desc: "Termina 50 series por completo.",
        icon: <Award size={32}/>,
        unlocked: completed >= 50,
        color: "text-emerald-400"
      }
    ];
  }, [myList]);

  const progress = Math.round((badges.filter(b => b.unlocked).length / badges.length) * 100);

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">
            Hall of <span className="text-netflix-red underline decoration-4">Fame</span>
          </h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] italic">
            Desbloqueado: {progress}% de tu carrera otaku
          </p>
        </div>
        
        {/* Barra de progreso global */}
        <div className="w-full md:w-64 space-y-2">
           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
              <span>Progreso Global</span>
              <span>{badges.filter(b => b.unlocked).length} / {badges.length}</span>
           </div>
           <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-netflix-red transition-all duration-1000 shadow-[0_0_15px_rgba(229,9,20,0.5)]" style={{ width: `${progress}%` }}></div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {badges.map((badge) => (
          <div 
            key={badge.id}
            className={`relative p-8 rounded-[2.5rem] border transition-all duration-500 overflow-hidden group ${
              badge.unlocked 
              ? 'bg-white/5 border-white/10 shadow-2xl hover:bg-white/10' 
              : 'bg-black/20 border-white/5 opacity-40 grayscale'
            }`}
          >
            {/* Brillo de fondo para desbloqueados */}
            {badge.unlocked && (
               <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[80px] opacity-20 ${badge.color.replace('text', 'bg')}`}></div>
            )}

            <div className="flex items-start gap-6 relative z-10">
              <div className={`p-4 rounded-2xl bg-black/40 border border-white/5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${badge.unlocked ? badge.color : 'text-gray-600'}`}>
                {badge.unlocked ? badge.icon : <Lock size={32} />}
              </div>
              <div className="space-y-1">
                <h4 className={`font-black uppercase tracking-tighter text-lg ${badge.unlocked ? 'text-white' : 'text-gray-500'}`}>
                  {badge.name}
                </h4>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  {badge.desc}
                </p>
              </div>
            </div>

            {!badge.unlocked && (
              <div className="mt-6 h-1 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-gray-700 w-1/3"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Icono extra necesario
import { Edit3 } from 'lucide-react';