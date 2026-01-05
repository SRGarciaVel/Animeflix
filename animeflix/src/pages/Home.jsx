import React, { useState, useMemo, useEffect } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { AnimeCard } from '../components/AnimeCard';
import { MagazineCard } from '../components/MagazineCard';
import { AIRecommendation } from '../components/AIRecommendation';
import { SkeletonCard } from '../components/SkeletonCard';
import { VibeSelector } from '../components/VibeSelector';
import { AiringCountdown } from '../components/AiringCountdown';
import { 
  Play, Calendar as CalendarIcon, Sparkles, Filter, 
  Search as SearchIcon, X, ChevronDown, SortAsc, LayoutGrid, Newspaper, Clock, BrainCircuit, RefreshCw, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_LABELS = { 
  all: 'Todos', 
  watching: 'Viendo', 
  completed: 'Completados', 
  on_hold: 'En espera', 
  dropped: 'Abandonados', 
  plan_to_watch: 'Por ver' 
};

// Mapeo de Géneros a Vibes
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

export function Home({ setSelectedAnime, calendar = [], user }) {
  const { myList, seasonData, isLoading, isRepairing } = useAnimeLibrary();
  
  // --- ESTADOS ---
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeVibe, setActiveVibe] = useState(null);
  const [filterStudio, setFilterStudio] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');

  // Fix Teclado (Debounce)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // --- MEMOS ---
  const studios = useMemo(() => [...new Set(myList.map(a => a.studio).filter(s => s && s !== 'Desconocido'))].sort(), [myList]);

  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach(a => a.genres?.forEach(g => {
      const name = typeof g === 'object' ? g.name : g;
      map[name] = (map[name] || 0) + 1;
    }));
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 5);
  }, [myList]);

  // Lógica de Radar: Prioriza animes en emisión o con fecha futura
  const liveTracking = useMemo(() => {
    const now = new Date();
    return myList.filter(a => {
      const hasSchedule = a.broadcast?.day || a.aired_from;
      const isFutureOrToday = a.aired_from ? new Date(a.aired_from) >= new Date(now.setHours(0,0,0,0)) : true;
      const validStatus = ['on_hold', 'watching', 'plan_to_watch'].includes(a.status);
      return validStatus && hasSchedule && isFutureOrToday;
    }).sort((a, b) => {
      if (a.aired_from && b.aired_from) return new Date(a.aired_from) - new Date(b.aired_from);
      return 0;
    });
  }, [myList]);

  const filteredList = useMemo(() => {
    let list = myList.filter(anime => {
      const mStatus = filterStatus === 'all' || anime.status === filterStatus;
      const mStudio = filterStudio === 'all' || anime.studio === filterStudio;
      const mSearch = anime.title.toLowerCase().includes(debouncedSearch.toLowerCase());
      const mVibe = getVibeMatch(anime, activeVibe);
      return mStatus && mStudio && mSearch && mVibe;
    });
    return list.sort((a, b) => {
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  }, [myList, filterStatus, debouncedSearch, filterStudio, sortBy, activeVibe]);

  const upcomingAnimes = useMemo(() => {
    return myList.filter(a => a.status === 'plan_to_watch' && (a.total_episodes === 0 || a.total_episodes === null));
  }, [myList]);

  // --- VISTA PÚBLICA (INVITADO) ---
  if (!user) {
    return (
      <div className="space-y-24 py-12 max-w-7xl mx-auto text-center animate-in fade-in">
        <header className="space-y-6">
          <h2 className="text-7xl font-black italic uppercase tracking-tighter">TU VIDA, <span className="text-netflix-red underline decoration-[12px]">TU ANIME</span></h2>
          <p className="text-gray-500 font-bold uppercase tracking-[0.5em] text-[10px]">Tu catálogo personal de nivel profesional</p>
          <div className="pt-6">
            <Link to="/auth" className="inline-block bg-white text-black px-14 py-5 rounded-[2rem] font-black uppercase text-xs hover:bg-netflix-red hover:text-white transition-all shadow-2xl hover:scale-105 active:scale-95">Empezar ahora</Link>
          </div>
        </header>
        <section className="space-y-12">
          <h3 className="text-xl font-black uppercase italic flex items-center gap-3 justify-center text-white italic tracking-widest"><Sparkles className="text-netflix-red" size={24}/> Tendencias Globales</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 opacity-30 grayscale hover:grayscale-0 transition-all duration-1000">
            {seasonData.slice(0, 12).map(a => (
              <div key={a.mal_id} className="aspect-[2/3] bg-white/5 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5">
                <img src={a.image_url} className="w-full h-full object-cover" alt="" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // --- VISTA PRIVADA (DASHBOARD) ---
  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-in fade-in">
      
      {/* 🟢 LADO IZQUIERDO: BIBLIOTECA */}
      <div className="flex-1 space-y-16">
        <AIRecommendation seasonData={seasonData} dnaStats={dnaStats} onSelect={setSelectedAnime} />

        <section className="space-y-10">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
            <div className="space-y-2">
              <h3 className="text-4xl font-black italic uppercase tracking-tighter italic flex items-center gap-4">
                <div className="w-2 h-10 bg-netflix-red shadow-lg"></div> Mi Catálogo
              </h3>
            </div>
            
            {/* BUSCADOR LOCAL */}
            <div className="relative w-full xl:w-[450px] group">
              <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input 
                type="text" 
                placeholder="Buscar en mi colección..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-[#181818] border border-white/5 rounded-[1.5rem] py-5 pl-16 pr-8 text-sm font-bold focus:border-netflix-red/50 outline-none transition-all shadow-2xl text-white italic" 
              />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white bg-white/5 p-1 rounded-full"><X size={14}/></button>}
            </div>
          </div>

          {/* BARRA DE FILTROS */}
          <div className="bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-netflix-red text-white' : 'text-gray-500 hover:text-white'}`}><LayoutGrid size={18}/></button>
                  <button onClick={() => setViewMode('magazine')} className={`p-2 rounded-lg transition-all ${viewMode === 'magazine' ? 'bg-netflix-red text-white' : 'text-gray-500 hover:text-white'}`}><Newspaper size={18}/></button>
                </div>
                {/* FILTROS DE ESTADO (6 ORIGINALES) */}
                <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                  {Object.keys(STATUS_LABELS).map(st => (
                    <button key={st} onClick={() => setFilterStatus(st)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${filterStatus === st ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>{STATUS_LABELS[st]}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative"><select value={filterStudio} onChange={(e) => setFilterStudio(e.target.value)} className="bg-[#181818] border border-white/10 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase text-white outline-none appearance-none pr-10 cursor-pointer italic"><option value="all" className="bg-[#181818]">Estudios</option>{studios.map(s => <option key={s} value={s}>{s}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={12}/></div>
                <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-6">
                  <SortAsc size={16} className="text-netflix-red"/><select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer text-gray-400 hover:text-white transition italic"><option value="updated_at" className="bg-[#181818]">Recientes</option><option value="score" className="bg-[#181818]">Nota</option><option value="title" className="bg-[#181818]">Nombre</option></select>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-white/5"><VibeSelector activeVibe={activeVibe} onVibeChange={setActiveVibe} /></div>
          </div>

          {/* LISTADO */}
          {filteredList.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-8 gap-y-16">
                {filteredList.map(item => <AnimeCard key={item.id} anime={item} onClick={setSelectedAnime} />)}
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 xl:columns-3 gap-10 animate-in slide-in-from-bottom-10">
                {filteredList.map(item => <MagazineCard key={item.id} anime={item} onClick={setSelectedAnime} />)}
              </div>
            )
          ) : (
            <div className="h-96 border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-gray-700 gap-6 bg-white/[0.01]">
               <div className="p-10 bg-white/5 rounded-full shadow-inner"><SearchIcon size={64} className="opacity-10"/></div>
               <p className="font-black tracking-[0.4em] text-sm italic uppercase">Sin coincidencias</p>
            </div>
          )}
        </section>
      </div>

      {/* 🔴 LADO DERECHO: LIVE RADAR */}
      <aside className="w-full lg:w-80 space-y-8">
        <div className="sticky top-24 space-y-8">
          <div className="bg-white/5 border border-white/5 p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-md relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform duration-700"><Activity size={120} className="text-netflix-red" /></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="bg-netflix-red p-2.5 rounded-2xl shadow-lg shadow-netflix-red/20"><Clock className="text-white animate-pulse" size={20}/></div>
              <div><h4 className="text-sm font-black uppercase italic tracking-tighter text-white leading-none">Live Radar</h4><p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Broadcast Sync</p></div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 mb-2">
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Próximos Estrenos</span>
               <span className="h-1.5 w-1.5 rounded-full bg-netflix-red animate-ping"></span>
            </div>
            {liveTracking.length > 0 ? liveTracking.slice(0, 8).map(anime => (
              <div key={anime.id} onClick={() => setSelectedAnime(anime)} className="bg-white/[0.03] border border-white/5 p-4 rounded-[2rem] hover:bg-white/10 transition-all duration-500 group cursor-pointer shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-lg"><img src={anime.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="" /></div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <h5 className="text-[10px] font-black uppercase truncate text-gray-200 italic leading-none">{anime.title}</h5>
                    <AiringCountdown anime={anime} />
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-10 border-2 border-dashed border-white/5 rounded-[2rem] text-center opacity-30 italic"><p className="text-[9px] font-bold uppercase tracking-widest italic">Sin estrenos próximos</p></div>
            )}
          </div>
        </div>
      </aside>

      {/* REPARACIÓN ADN */}
      {isRepairing && (
        <div className="fixed bottom-10 left-10 z-[100] bg-netflix-darkGray border border-netflix-red p-6 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom flex items-center gap-6 backdrop-blur-xl">
           <div className="relative"><BrainCircuit className="text-netflix-red animate-pulse" size={32}/><RefreshCw className="absolute -top-1 -right-1 text-white animate-spin" size={14}/></div>
           <div><p className="text-xs font-black uppercase tracking-widest text-white italic tracking-tighter">Sincronizando</p><p className="text-[10px] text-gray-500 font-bold uppercase mt-1 italic">Analizando tu biblioteca...</p></div>
        </div>
      )}
    </div>
  );
}