import React, { useState, useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { AnimeCard } from '../components/AnimeCard';
import { AIRecommendation } from '../components/AIRecommendation';
import { SkeletonCard } from '../components/SkeletonCard';
import { Play } from 'lucide-react';

const STATUS_LABELS = { 
  all: 'Todos', watching: 'Viendo', completed: 'Completados', 
  on_hold: 'En espera', dropped: 'Abandonados', plan_to_watch: 'Por ver' 
};

export function Home({ setSelectedAnime, calendar }) {
  const { myList, seasonData, isLoading } = useAnimeLibrary();
  const [filterStatus, setFilterStatus] = useState('all');

  // ADN simplificado para el componente de IA
  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach(a => a.genres?.forEach(g => map[g] = (map[g] || 0) + 1));
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 5);
  }, [myList]);

  const todayAirings = useMemo(() => {
    const watchingIds = myList.filter(a => a.status === 'watching').map(a => a.mal_id);
    return calendar.filter(c => watchingIds.includes(c.mal_id));
  }, [calendar, myList]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-10">
        {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in duration-700">
      
      {/* NOTIFICACIONES DE ESTRENO */}
      {todayAirings.length > 0 && (
        <div className="bg-netflix-red/10 border-l-4 border-netflix-red p-6 rounded-r-3xl flex items-center gap-6 shadow-2xl shadow-netflix-red/10 animate-bounce-subtle">
          <div className="bg-netflix-red p-3 rounded-full animate-pulse"><Play fill="white" size={20}/></div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-netflix-red mb-1 italic">Novedades de hoy</p>
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
              {todayAirings.map(a => (
                <span key={a.mal_id} className="text-xs font-black bg-black/40 px-4 py-2 rounded-full border border-white/5 whitespace-nowrap uppercase italic tracking-tighter shadow-xl">
                  {a.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* IA SUGERENCIAS (Componente nuevo) */}
      <AIRecommendation 
        seasonData={seasonData} 
        dnaStats={dnaStats} 
        onSelect={setSelectedAnime} 
      />

      {/* BIBLIOTECA */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="space-y-2">
            <h3 className="text-5xl font-black italic uppercase tracking-tighter flex items-center gap-5">
              <div className="w-2.5 h-12 bg-netflix-red shadow-[0_0_25px_#E50914]"></div>
              Tu Biblioteca
            </h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest ml-8 italic">
              Gestionando {myList.length} títulos
            </p>
          </div>

          <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-[1.5rem] border border-white/5 shadow-2xl backdrop-blur-md">
            {Object.keys(STATUS_LABELS).map(st => (
              <button 
                key={st} 
                onClick={() => setFilterStatus(st)} 
                className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filterStatus === st ? 'bg-white text-black shadow-xl scale-105' : 'text-gray-500 hover:text-white'}`}
              >
                {STATUS_LABELS[st]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-10 gap-y-20">
          {myList.filter(a => filterStatus === 'all' || a.status === filterStatus).map(item => (
            <AnimeCard key={item.id} anime={item} onClick={setSelectedAnime} />
          ))}
        </div>
      </section>
    </div>
  );
}