import React, { useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { Sparkles, Trophy, Tv, Clock } from 'lucide-react';

export function Stats() {
  const { myList } = useAnimeLibrary();

  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach(a => a.genres?.forEach(g => map[g] = (map[g] || 0) + 1));
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 10);
  }, [myList]);

  const achievements = useMemo(() => {
    const total = myList.reduce((acc, curr) => acc + (curr.episodes_watched || 0), 0);
    const badges = [];
    if (total > 500) badges.push({ name: "Leyenda", desc: "Más de 500 episodios vistos", icon: <Trophy className="text-yellow-500" size={40}/> });
    if (myList.filter(a => a.status === 'completed').length > 10) badges.push({ name: "Maestro", desc: "Más de 10 series completadas", icon: <Tv className="text-green-400" size={40}/> });
    return badges;
  }, [myList]);

  const totalTime = ((myList.reduce((acc, curr) => acc + (curr.episodes_watched || 0), 0) * 23) / 1440).toFixed(1);

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700">
      <h2 className="text-5xl font-black italic uppercase tracking-tighter text-netflix-red">Tu Perfil Otaku</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* ADN OTALU DETALLADO */}
        <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5">
          <p className="text-sm font-black text-netflix-red uppercase tracking-widest mb-8 flex items-center gap-3"><Sparkles/> Análisis de ADN (Top 10 Géneros)</p>
          <div className="space-y-6">
            {dnaStats.map(([genre, count]) => (
              <div key={genre} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                  <span>{genre}</span>
                  <span className="opacity-50">{count} series</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-netflix-red" style={{ width: `${(count / dnaStats[0][1]) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* TIEMPO TOTAL */}
          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 text-center">
            <Clock className="mx-auto mb-4 text-gray-500" size={48}/>
            <p className="text-sm font-black uppercase tracking-widest text-gray-400">Tiempo invertido en anime</p>
            <h4 className="text-8xl font-black italic">{totalTime} <span className="text-2xl font-light opacity-30">DÍAS</span></h4>
          </div>

          {/* LOGROS */}
          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5">
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-3"><Trophy/> Medallas de Honor</p>
            <div className="grid grid-cols-2 gap-6">
              {achievements.map(a => (
                <div key={a.name} className="bg-black/40 p-6 rounded-3xl border border-white/5 flex flex-col items-center text-center gap-3 transition hover:scale-105">
                  {a.icon}
                  <div>
                    <p className="text-xs font-black uppercase">{a.name}</p>
                    <p className="text-[10px] text-gray-500">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}