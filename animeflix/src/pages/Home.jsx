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
  Search as SearchIcon, X, ChevronDown, SortAsc, LayoutGrid, Newspaper, Clock, BrainCircuit, RefreshCw
} from 'lucide-react';

const STATUS_LABELS = { all: 'Todos', watching: 'Viendo', completed: 'Completados', on_hold: 'En espera', dropped: 'Abandonados', plan_to_watch: 'Por ver' };

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
  const { myList, seasonData, isLoading, isRepairing } = useAnimeLibrary();
  
  // --- ESTADOS ---
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeVibe, setActiveVibe] = useState(null);
  const [filterStudio, setFilterStudio] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');

  // --- SOLUCIÓN ERROR ESCRITURA ---
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const studios = useMemo(() => [...new Set(myList.map(a => a.studio).filter(s => s && s !== 'Desconocido'))].sort(), [myList]);
  const years = useMemo(() => [...new Set(myList.map(a => a.updated_at ? new Date(a.updated_at).getFullYear().toString() : null).filter(Boolean))].sort((a,b) => b-a), [myList]);

  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach(a => a.genres?.forEach(g => {
      const name = typeof g === 'object' ? g.name : g;
      map[name] = (map[name] || 0) + 1;
    }));
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 5);
  }, [myList]);

  // --- LÓGICA: SEGUIMIENTO EN VIVO (UPCOMING / EN ESPERA) ---
  const liveTracking = useMemo(() => {
    // Priorizamos animes que van a salir o tienen horario (Watching + On Hold)
    return myList.filter(a => (a.status === 'on_hold' || a.status === 'watching') && (a.broadcast?.day || a.aired_from));
  }, [myList]);

  const filteredList = useMemo(() => {
    let list = myList.filter(anime => {
      const matchesStatus = filterStatus === 'all' || anime.status === filterStatus;
      const matchesStudio = filterStudio === 'all' || anime.studio === filterStudio;
      const matchesYear = filterYear === 'all' || (anime.updated_at && new Date(anime.updated_at).getFullYear().toString() === filterYear);
      const matchesSearch = anime.title.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesVibe = getVibeMatch(anime, activeVibe);
      return matchesStatus && matchesStudio && matchesSearch && matchesYear && matchesVibe;
    });
    return list.sort((a, b) => {
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  }, [myList, filterStatus, debouncedSearch, filterStudio, filterYear, sortBy, activeVibe]);

  if (isLoading) return <div className="grid grid-cols-6 gap-10 mt-10">{[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="space-y-16 animate-in fade-in duration-700">
      
      {isRepairing && (
        <div className="fixed bottom-10 right-10 z-[100] bg-netflix-darkGray border border-netflix-red p-6 rounded-[2.5rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom">
           <div className="relative"><BrainCircuit className="text-netflix-red animate-pulse" size={32}/><RefreshCw className="absolute -top-1 -right-1 text-white animate-spin" size={14}/></div>
           <div><p className="text-xs font-black uppercase tracking-widest text-white italic">Analizando Biblioteca</p><p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Sincronizando horarios de Japón</p></div>
        </div>
      )}

      {/* 1. SEGUIMIENTO EN VIVO (COUNTDOWNS) */}
      {liveTracking.length > 0 && (
        <section>
          <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-3 text-white italic tracking-tighter">
            <Clock className="text-netflix-red" size={24}/> Radar de Temporada
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveTracking.slice(0, 6).map(anime => (
              <div key={anime.id} onClick={() => setSelectedAnime(anime)} className="bg-white/5 border border-white/5 p-5 rounded-[2.5rem] flex items-center gap-6 group cursor-pointer hover:bg-white/10 transition-all shadow-xl backdrop-blur-md">
                <div className="w-16 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-white/5 shadow-2xl">
                  <img src={anime.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <h4 className="text-xs font-black uppercase truncate text-gray-200 group-hover:text-white transition-colors">{anime.title}</h4>
                  <AiringCountdown anime={anime} />
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-netflix-red uppercase italic">{STATUS_LABELS[anime.status]}</span>
                    <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">EP {anime.episodes_watched}/{anime.total_episodes || '?'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RECOMENDACIONES IA */}
      <AIRecommendation seasonData={seasonData} dnaStats={dnaStats} onSelect={setSelectedAnime} />

      {/* BIBLIOTECA */}
      <section className="space-y-10">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
          <div className="space-y-2"><h3 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4 italic leading-none italic"><div className="w-2 h-10 bg-netflix-red"></div> Tu Biblioteca</h3></div>
          
          <div className="relative w-full xl:w-[450px] group">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-[#181818] border border-white/5 rounded-[1.5rem] py-5 pl-16 pr-8 text-sm font-bold focus:border-netflix-red/50 outline-none transition-all shadow-2xl text-white italic" 
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14}/></button>}
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-netflix-red text-white' : 'text-gray-500 hover:text-white'}`}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('magazine')} className={`p-2 rounded-lg transition-all ${viewMode === 'magazine' ? 'bg-netflix-red text-white' : 'text-gray-500 hover:text-white'}`}><Newspaper size={18}/></button>
              </div>
              <div className="flex flex-wrap gap-2 p-1.5 bg-black/40 rounded-xl border border-white/5">
                {Object.keys(STATUS_LABELS).map(st => (
                  <button key={st} onClick={() => setFilterStatus(st)} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase transition-all tracking-widest ${filterStatus === st ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-500 hover:text-white'}`}>{STATUS_LABELS[st]}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative"><select value={filterStudio} onChange={(e) => setFilterStudio(e.target.value)} className="bg-[#181818] border border-white/10 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase outline-none text-white appearance-none pr-10 cursor-pointer"><option value="all">Estudio: Todos</option>{studios.map(s => <option key={s} value={s}>{s}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={12}/></div>
              <div className="relative"><select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-[#181818] border border-white/10 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase outline-none text-white appearance-none pr-10 cursor-pointer"><option value="all">Año: Todos</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={12}/></div>
              <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-6">
                <SortAsc size={16} className="text-netflix-red"/><select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer text-gray-400 hover:text-white transition"><option value="updated_at" className="bg-[#181818]">Recientes</option><option value="score" className="bg-[#181818]">Nota</option><option value="title" className="bg-[#181818]">Nombre</option></select>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-white/5"><VibeSelector activeVibe={activeVibe} onVibeChange={setActiveVibe} /></div>
        </div>

        {/* CONTENIDO */}
        {filteredList.length > 0 ? (
          viewMode === 'grid' ? (<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-10 gap-y-20">{filteredList.map(item => <AnimeCard key={item.id} anime={item} onClick={setSelectedAnime} />)}</div>) : (<div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-12 animate-in slide-in-from-bottom-10 duration-700">{filteredList.map(item => <MagazineCard key={item.id} anime={item} onClick={setSelectedAnime} />)}</div>)
        ) : (
          <div className="h-96 border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-gray-700 gap-6 bg-white/[0.01] animate-in zoom-in italic uppercase">
             <div className="p-10 bg-white/5 rounded-full shadow-inner"><SearchIcon size={64} className="opacity-10"/></div>
             <p className="font-black tracking-[0.4em] text-sm">Sin coincidencias</p>
             <button onClick={() => { setFilterStatus('all'); setActiveVibe(null); setFilterStudio('all'); setFilterYear('all'); setSearchTerm(''); }} className="px-10 py-4 bg-white text-black rounded-full font-black text-[10px] uppercase hover:bg-netflix-red hover:text-white transition-all shadow-2xl">Resetear</button>
          </div>
        )}
      </section>
    </div>
  );
}