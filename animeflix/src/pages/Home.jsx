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

export function Home({ setSelectedAnime, calendar = [], user }) {
  const { myList, seasonData, isLoading, isRepairing } = useAnimeLibrary();
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeVibe, setActiveVibe] = useState(null);
  const [filterStudio, setFilterStudio] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');

  // Fix Teclado Lag
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const studios = useMemo(() => [...new Set(myList.map(a => a.studio).filter(s => s && s !== 'Desconocido'))].sort(), [myList]);

  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach(a => a.genres?.forEach(g => {
      const name = typeof g === 'object' ? g.name : g;
      map[name] = (map[name] || 0) + 1;
    }));
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 5);
  }, [myList]);

  const liveTracking = useMemo(() => {
    const now = new Date();
    return myList.filter(a => (a.status === 'on_hold' || a.status === 'watching') && (a.broadcast?.day || a.aired_from));
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

  if (!user) {
    return (
      <div className="space-y-24 py-12 max-w-7xl mx-auto text-center animate-in fade-in">
        <h2 className="text-7xl font-black italic uppercase tracking-tighter">TU VIDA, <span className="text-netflix-red underline">TU ANIME</span></h2>
        <Link to="/auth" className="inline-block bg-white text-black px-14 py-5 rounded-[2rem] font-black uppercase text-xs hover:bg-netflix-red hover:text-white transition-all shadow-2xl">Empezar ahora</Link>
        <div className="grid grid-cols-6 gap-4 opacity-30 grayscale">{seasonData.slice(0, 12).map(a => <div key={a.mal_id} className="aspect-[2/3] bg-white/5 rounded-3xl overflow-hidden"><img src={a.image_url} className="w-full h-full object-cover"/></div>)}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-10">
      <div className="flex-1 space-y-16">
        <AIRecommendation seasonData={seasonData} dnaStats={dnaStats} onSelect={setSelectedAnime} />
        <section className="space-y-10">
          <div className="flex justify-between items-end">
            <h3 className="text-4xl font-black italic uppercase tracking-tighter italic"><div className="w-2 h-10 bg-netflix-red shadow-lg inline-block mr-4"></div> Mi Catálogo</h3>
            <div className="relative w-96 group">
              <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#181818] border border-white/5 rounded-2xl py-4 pl-16 pr-8 text-sm focus:border-netflix-red/50 outline-none text-white italic" />
            </div>
          </div>
          <div className="bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex justify-between">
              <div className="flex gap-4">
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-netflix-red text-white' : 'text-gray-500'}`}><LayoutGrid size={18}/></button>
                  <button onClick={() => setViewMode('magazine')} className={`p-2 rounded-lg ${viewMode === 'magazine' ? 'bg-netflix-red text-white' : 'text-gray-500'}`}><Newspaper size={18}/></button>
                </div>
                <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                  {Object.keys(STATUS_LABELS).map(st => <button key={st} onClick={() => setFilterStatus(st)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${filterStatus === st ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>{STATUS_LABELS[st]}</button>)}
                </div>
              </div>
              <select value={filterStudio} onChange={(e) => setFilterStudio(e.target.value)} className="bg-[#181818] border border-white/10 px-6 py-2 rounded-xl text-[9px] font-black uppercase text-white outline-none"><option value="all">Todos los Estudios</option>{studios.map(s => <option key={s} value={s}>{s}</option>)}</select>
            </div>
            <div className="pt-4 border-t border-white/5"><VibeSelector activeVibe={activeVibe} onVibeChange={setActiveVibe} /></div>
          </div>
          <div className={viewMode === 'grid' ? "grid grid-cols-5 gap-10" : "columns-3 gap-10"}>
            {filteredList.map(item => viewMode === 'grid' ? <AnimeCard key={item.id} anime={item} onClick={setSelectedAnime} /> : <MagazineCard key={item.id} anime={item} onClick={setSelectedAnime} />)}
          </div>
        </section>
      </div>
      <aside className="w-80 space-y-8 sticky top-24 h-fit">
        <div className="bg-white/5 border border-white/5 p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-4 mb-8">
            <Clock className="text-netflix-red animate-pulse" size={20}/>
            <h4 className="text-sm font-black uppercase italic italic">Live Radar</h4>
          </div>
          <div className="space-y-4">
            {liveTracking.slice(0, 5).map(a => (
              <div key={a.id} onClick={() => setSelectedAnime(a)} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/10 transition">
                <img src={a.image_url} className="w-10 h-14 object-cover rounded-lg" />
                <div className="min-w-0 flex-1"><h5 className="text-[10px] font-black uppercase truncate text-gray-200">{a.title}</h5><AiringCountdown anime={a} /></div>
              </div>
            ))}
          </div>
        </div>
      </aside>
      {isRepairing && <div className="fixed bottom-10 left-10 z-[100] bg-netflix-darkGray border border-netflix-red p-6 rounded-[2.5rem] shadow-2xl flex items-center gap-6"><BrainCircuit className="text-netflix-red animate-pulse" size={32}/><p className="text-xs font-black uppercase tracking-widest text-white italic">Reparando ADN...</p></div>}
    </div>
  );
}