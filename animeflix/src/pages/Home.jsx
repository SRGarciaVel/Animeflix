import React, { useState, useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { AnimeCard } from '../components/AnimeCard';
import { AIRecommendation } from '../components/AIRecommendation';
import { SkeletonCard } from '../components/SkeletonCard';
import { VibeSelector } from '../components/VibeSelector';
import { Play, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

const STATUS_LABELS = { 
  all: 'Todos', watching: 'Viendo', completed: 'Completados', 
  on_hold: 'En espera', dropped: 'Abandonados', plan_to_watch: 'Por ver' 
};

// Lógica de mapeo de Géneros a Vibes
const getVibeMatch = (anime, vibeId) => {
  if (!vibeId) return true;
  const genres = anime.genres?.map(g => (typeof g === 'object' ? g.name : g).toLowerCase()) || [];
  
  const matches = {
    sad: ['drama', 'suspense', 'slice of life'],
    hype: ['action', 'sports', 'fantasy'],
    chill: ['iyashikei', 'gourmet', 'slice of life', 'nature'],
    comedy: ['comedy', 'parody', 'ecchi', 'adventure'],
    brainy: ['mystery', 'psychological', 'sci-fi', 'thriller'],
    romance: ['romance', 'shoujo', 'josei'],
    epic: ['shounen', 'supernatural', 'military', 'historical']
  };

  return matches[vibeId]?.some(keyword => genres.includes(keyword));
};

export function Home({ setSelectedAnime, calendar = [] }) {
  const { myList, seasonData, isLoading } = useAnimeLibrary();
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeVibe, setActiveVibe] = useState(null);

  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach(a => {
      const genres = Array.isArray(a.genres) ? a.genres : [];
      genres.forEach(g => {
        const name = typeof g === 'object' ? g.name : g;
        map[name] = (map[name] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 5);
  }, [myList]);

  const upcomingAnimes = useMemo(() => {
    return myList.filter(a => a.status === 'plan_to_watch' && (a.total_episodes === 0 || a.total_episodes === null));
  }, [myList]);

  const todayAirings = useMemo(() => {
    const watchingIds = myList.filter(a => a.status === 'watching').map(a => a.mal_id);
    return calendar.filter(c => watchingIds.includes(c.mal_id));
  }, [calendar, myList]);

  // --- FILTRADO COMBINADO (STATUS + VIBE) ---
  const filteredList = useMemo(() => {
    return myList.filter(anime => {
      const matchesStatus = filterStatus === 'all' || anime.status === filterStatus;
      const matchesVibe = getVibeMatch(anime, activeVibe);
      return matchesStatus && matchesVibe;
    });
  }, [myList, filterStatus, activeVibe]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-10">
        {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in duration-700">
      
      {/* NOTIFICACIONES */}
      {todayAirings.length > 0 && (
        <div className="bg-netflix-red/10 border-l-4 border-netflix-red p-6 rounded-r-3xl flex items-center gap-6 shadow-2xl animate-in slide-in-from-top duration-700">
          <div className="bg-netflix-red p-3 rounded-full animate-pulse shadow-lg shadow-netflix-red/20"><Play fill="white" size={20}/></div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-netflix-red mb-1 italic">Novedad de Hoy</p>
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

      {/* EN EL RADAR */}
      {upcomingAnimes.length > 0 && (
        <section>
          <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-3 tracking-tighter text-blue-400 italic">
            <CalendarIcon size={24}/> En el Radar
          </h3>
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6">
            {upcomingAnimes.map(anime => (
              <div key={anime.id} onClick={() => setSelectedAnime(anime)} className="min-w-[150px] group cursor-pointer opacity-70 hover:opacity-100 transition duration-500">
                 <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-blue-500/30 bg-netflix-darkGray">
                    <img src={anime.image_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-700" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 to-transparent flex items-end justify-center p-4 text-center">
                       <span className="text-[8px] font-black uppercase tracking-widest text-white leading-tight">Próximamente</span>
                    </div>
                 </div>
                 <p className="mt-3 text-[10px] font-bold truncate uppercase text-center opacity-60 italic">{anime.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* IA RECOMENDACIONES */}
      <AIRecommendation seasonData={seasonData} dnaStats={dnaStats} onSelect={setSelectedAnime} />

      {/* BIBLIOTECA CON VIBE SELECTOR */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
          <div className="space-y-2">
            <h3 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4 italic leading-none">
              <div className="w-2 h-10 bg-netflix-red shadow-[0_0_25px_#E50914]"></div>
              Tu Biblioteca
            </h3>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] ml-6 opacity-50">
              Personal Catalog
            </p>
          </div>

          <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
            {Object.keys(STATUS_LABELS).map(st => (
              <button 
                key={st} 
                onClick={() => setFilterStatus(st)} 
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === st ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-500 hover:text-white'}`}
              >
                {STATUS_LABELS[st]}
              </button>
            ))}
          </div>
        </div>

        {/* SELECTOR DE VIBE (NUEVO) */}
        <VibeSelector activeVibe={activeVibe} onVibeChange={setActiveVibe} />

        {filteredList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-10 gap-y-20">
            {filteredList.map(item => (
              <AnimeCard key={item.id} anime={item} onClick={setSelectedAnime} />
            ))}
          </div>
        ) : (
          <div className="h-64 border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-gray-700 gap-4">
             <Sparkles size={48} className="opacity-20"/>
             <p className="font-black uppercase tracking-[0.3em] text-xs italic">No hay animes con este Vibe en tu lista</p>
             <button onClick={() => setActiveVibe(null)} className="text-[10px] text-netflix-red font-black underline uppercase">Limpiar Vibe</button>
          </div>
        )}
      </section>
    </div>
  );
}