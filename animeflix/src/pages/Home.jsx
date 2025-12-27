import React, { useState, useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { AnimeCard } from '../components/AnimeCard';
import { AIRecommendation } from '../components/AIRecommendation';
import { SkeletonCard } from '../components/SkeletonCard';
import { VibeSelector } from '../components/VibeSelector';
import { 
  Play, Calendar as CalendarIcon, Sparkles, Filter, 
  Search as SearchIcon, X, ChevronDown, SortAsc, Star 
} from 'lucide-react';

const STATUS_LABELS = { 
  all: 'Todos', 
  watching: 'Viendo', 
  completed: 'Completados', 
  on_hold: 'En espera', 
  dropped: 'Abandonados', 
  plan_to_watch: 'Por ver' 
};

const getVibeMatch = (anime, vibeId) => {
  if (!vibeId) return true;
  const genres = anime.genres?.map(g => (typeof g === 'object' ? g.name : g).toLowerCase()) || [];
  const matches = {
    sad: ['drama', 'suspense', 'slice of life'],
    hype: ['action', 'sports', 'fantasy'],
    chill: ['iyashikei', 'gourmet', 'slice of life'],
    comedy: ['comedy', 'adventure'],
    brainy: ['mystery', 'psychological', 'sci-fi', 'thriller'],
    romance: ['romance', 'shoujo'],
    epic: ['shounen', 'supernatural', 'military']
  };
  return matches[vibeId]?.some(k => genres.includes(k));
};

export function Home({ setSelectedAnime, calendar = [] }) {
  const { myList, seasonData, isLoading } = useAnimeLibrary();
  
  // --- ESTADOS DE FILTRADO ---
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeVibe, setActiveVibe] = useState(null);
  const [localSearch, setLocalSearch] = useState('');
  const [filterStudio, setFilterStudio] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');

  // --- EXTRACCIÓN DE METADATOS ---
  const studios = useMemo(() => {
    const s = [...new Set(myList.map(a => a.studio).filter(studio => studio && studio !== 'Desconocido'))];
    return s.sort();
  }, [myList]);

  const years = useMemo(() => {
    const y = [...new Set(myList.map(a => a.updated_at ? new Date(a.updated_at).getFullYear().toString() : null).filter(Boolean))];
    return y.sort((a, b) => b - a);
  }, [myList]);

  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach(a => a.genres?.forEach(g => {
      const name = typeof g === 'object' ? g.name : g;
      map[name] = (map[name] || 0) + 1;
    }));
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 5);
  }, [myList]);

  // --- LÓGICA DE FILTRADO MAESTRA ---
  const filteredList = useMemo(() => {
    let list = myList.filter(anime => {
      const matchesStatus = filterStatus === 'all' || anime.status === filterStatus;
      const matchesVibe = getVibeMatch(anime, activeVibe);
      const matchesStudio = filterStudio === 'all' || anime.studio === filterStudio;
      const matchesYear = filterYear === 'all' || (anime.updated_at && new Date(anime.updated_at).getFullYear().toString() === filterYear);
      const matchesSearch = anime.title.toLowerCase().includes(localSearch.toLowerCase());
      
      return matchesStatus && matchesVibe && matchesStudio && matchesSearch && matchesYear;
    });

    return list.sort((a, b) => {
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  }, [myList, filterStatus, activeVibe, localSearch, filterStudio, filterYear, sortBy]);

  const upcomingAnimes = useMemo(() => {
    return myList.filter(a => a.status === 'plan_to_watch' && (a.total_episodes === 0 || a.total_episodes === null));
  }, [myList]);

  const todayAirings = useMemo(() => {
    const watchingIds = myList.filter(a => a.status === 'watching').map(a => a.mal_id);
    return calendar.filter(c => watchingIds.includes(c.mal_id));
  }, [calendar, myList]);

  if (isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-10 mt-10">
      {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <SkeletonCard key={i} />)}
    </div>
  );

  return (
    <div className="space-y-16 animate-in fade-in duration-700">
      
      {/* NOTIFICACIONES */}
      {todayAirings.length > 0 && (
        <div className="bg-netflix-red/10 border-l-4 border-netflix-red p-6 rounded-r-3xl flex items-center gap-6 shadow-2xl animate-in slide-in-from-top">
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
          <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-3 tracking-tighter text-blue-400 italic font-black">
            <CalendarIcon size={24}/> En el Radar
          </h3>
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6 px-2">
            {upcomingAnimes.map(anime => (
              <div key={anime.id} onClick={() => setSelectedAnime(anime)} className="min-w-[150px] group cursor-pointer opacity-70 hover:opacity-100 transition duration-500">
                 <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-blue-500/30 bg-netflix-darkGray shadow-2xl">
                    <img src={anime.image_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-700" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 to-transparent flex items-end justify-center p-4">
                       <span className="text-[8px] font-black uppercase tracking-widest text-white italic">Próximamente</span>
                    </div>
                 </div>
                 <p className="mt-3 text-[10px] font-black truncate uppercase text-center opacity-60 italic">{anime.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <AIRecommendation seasonData={seasonData} dnaStats={dnaStats} onSelect={setSelectedAnime} />

      <section className="space-y-10">
        {/* CABECERA Y BUSCADOR INTERNO */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
          <div className="space-y-2">
            <h3 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4 italic leading-none">
              <div className="w-2 h-10 bg-netflix-red shadow-lg shadow-netflix-red/30"></div> 
              Tu Biblioteca
            </h3>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] ml-6 opacity-50 italic">
              Gestionando {myList.length} obras maestras
            </p>
          </div>

          <div className="relative w-full xl:w-[450px] group">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-netflix-red transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Buscar por título en tu colección..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-[#181818] border border-white/5 rounded-[1.5rem] py-5 pl-16 pr-8 text-sm font-bold focus:outline-none focus:border-netflix-red/50 transition-all shadow-2xl placeholder:text-gray-700 italic"
            />
            {localSearch && (
              <button onClick={() => setLocalSearch('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white bg-white/5 p-1 rounded-full">
                <X size={14}/>
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE FILTROS AVANZADOS */}
        <div className="bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-2xl space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-6">
            
            {/* 1. FILTROS DE ESTADO (LOS 6 RESTAURADOS) */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
              {Object.keys(STATUS_LABELS).map(st => (
                <button 
                  key={st} 
                  onClick={() => setFilterStatus(st)} 
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${filterStatus === st ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-500 hover:text-white'}`}
                >
                  {STATUS_LABELS[st]}
                </button>
              ))}
            </div>

            {/* 2. FILTROS DE METADATA (DROPDOWNS) */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Estudio */}
              <div className="relative">
                <select 
                  value={filterStudio} 
                  onChange={(e) => setFilterStudio(e.target.value)}
                  className="bg-[#181818] border border-white/10 px-6 py-3 rounded-xl text-[9px] font-black uppercase outline-none appearance-none cursor-pointer pr-10 text-white hover:border-white/30 transition shadow-xl"
                >
                  <option value="all">Todos los Estudios</option>
                  {studios.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 text-gray-500 pointer-events-none" size={14}/>
              </div>

              {/* Año */}
              <div className="relative">
                <select 
                  value={filterYear} 
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="bg-[#181818] border border-white/10 px-6 py-3 rounded-xl text-[9px] font-black uppercase outline-none appearance-none cursor-pointer pr-10 text-white hover:border-white/30 transition shadow-xl"
                >
                  <option value="all">Cualquier Año</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 text-gray-500 pointer-events-none" size={14}/>
              </div>

              {/* Ordenamiento */}
              <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-6">
                <SortAsc size={16} className="text-netflix-red"/>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer text-gray-400 hover:text-white transition"
                >
                  <option value="updated_at" className="bg-[#181818]">Recientes</option>
                  <option value="score" className="bg-[#181818]">Nota</option>
                  <option value="title" className="bg-[#181818]">Nombre</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. SELECTOR DE VIBE (INTERIOR DE LA BARRA) */}
          <div className="pt-4 border-t border-white/5">
             <VibeSelector activeVibe={activeVibe} onVibeChange={setActiveVibe} />
          </div>
        </div>

        {/* GRID DE RESULTADOS */}
        {filteredList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-10 gap-y-20">
            {filteredList.map(item => (
              <AnimeCard key={item.id} anime={item} onClick={setSelectedAnime} />
            ))}
          </div>
        ) : (
          <div className="h-96 border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-gray-700 gap-6 bg-white/[0.01] animate-in zoom-in">
             <div className="p-10 bg-white/5 rounded-full shadow-inner">
                <SearchIcon size={64} className="opacity-10"/>
             </div>
             <div className="text-center space-y-2">
                <p className="font-black uppercase tracking-[0.4em] text-sm italic text-gray-500">Sin coincidencias en la biblioteca</p>
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Intenta otra búsqueda o limpia los filtros</p>
             </div>
             <button 
                onClick={() => { setFilterStatus('all'); setActiveVibe(null); setFilterStudio('all'); setFilterYear('all'); setLocalSearch(''); }} 
                className="px-10 py-4 bg-white text-black rounded-full font-black text-[10px] uppercase hover:bg-netflix-red hover:text-white transition-all shadow-2xl active:scale-95"
             >
               Resetear Filtros
             </button>
          </div>
        )}
      </section>
    </div>
  );
}