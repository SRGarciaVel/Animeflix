import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { NewsCard } from '../components/NewsCard';
import { AnimeCard } from '../components/AnimeCard';
import { CinemaModal } from '../components/CinemaModal';
import { 
  Newspaper, Radio, Loader2, Sparkles, 
  CalendarClock, ChevronRight, Play 
} from 'lucide-react';

const getNextSeasonInfo = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const seasons = ["winter", "spring", "summer", "fall"];
  const seasonNames = { winter: "Invierno", spring: "Primavera", summer: "Verano", fall: "Otoño" };
  const currentIdx = Math.floor(month / 3);
  const nextIdx = (currentIdx + 1) % 4;
  const nextYear = nextIdx === 0 ? year + 1 : year;
  return { code: seasons[nextIdx], name: seasonNames[nextIdx], year: nextYear };
};

export function News() {
  const { myList, addToLibrary } = useAnimeLibrary();
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef(null);
  const nextSeason = getNextSeasonInfo();

  // 1. QUERY: NOTICIAS
  const relevantIds = useMemo(() => {
    return myList.filter(a => a.status === 'watching' || a.status === 'on_hold').slice(0, 5).map(a => a.mal_id);
  }, [myList]);

  const { data: newsFeed = [], isLoading: loadingNews } = useQuery({
    queryKey: ['animeNews', relevantIds],
    queryFn: async () => {
      let allNews = [];
      const targetIds = relevantIds.length > 0 ? relevantIds : [52991, 51009, 54789];
      for (const id of targetIds) {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${id}/news`);
          const data = await res.json();
          if (data.data) allNews = [...allNews, ...data.data];
          await new Promise(r => setTimeout(r, 500));
        } catch (e) { console.error(e); }
      }
      return allNews.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12);
    }
  });

  // 2. QUERY: PRÓXIMA TEMPORADA
  const { data: upcomingAnime = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['upcomingSeason'],
    queryFn: async () => {
      const res = await fetch(`https://api.jikan.moe/v4/seasons/upcoming?limit=25`);
      const data = await res.json();
      return data.data || [];
    }
  });

  // --- 🚀 LÓGICA DE SCROLL AUTOMÁTICO REFINADO ---
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || isPaused || loadingUpcoming || upcomingAnime.length === 0) return;

    let animationFrameId;
    const speed = 0.5; // Velocidad ultra suave

    const scroll = () => {
      if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 1) {
        container.scrollLeft = 0;
      } else {
        container.scrollLeft += speed;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, loadingUpcoming, upcomingAnime]);

  return (
    <div className="space-y-16 pb-20 animate-in fade-in duration-700">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
        <div className="flex items-center gap-6">
          <div className="bg-netflix-red p-4 rounded-3xl shadow-2xl shadow-netflix-red/20 rotate-3">
            <Newspaper className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl">
              Anime <span className="text-netflix-red">Radar</span>
            </h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mt-1 italic opacity-70">
              Tendencias & Próximos Estrenos
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/5 backdrop-blur-md">
           <Radio size={16} className="text-netflix-red animate-pulse"/>
           <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Global Feed Active</span>
        </div>
      </header>

      {/* 🎡 CARRUSEL ESTANDARIZADO CON MÁSCARA DE DESVANECIMIENTO */}
      <section className="space-y-8 relative">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
             <CalendarClock className="text-blue-400" size={24}/>
             <h3 className="text-xl font-black uppercase italic tracking-tighter text-white italic">
               Hype Radar: {nextSeason.name} {nextSeason.year}
             </h3>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic">Cinema Auto-Scroll</span>
          </div>
        </div>

        {/* 
            Contenedor con MÁSCARA GRADIENTE (mask-image)
            Esto crea el efecto de entrada/salida suave profesional 
        */}
        <div className="relative group/container">
          <div 
            ref={scrollRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
              maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
            }}
            className="flex gap-8 overflow-x-auto no-scrollbar pb-20 pt-10 px-[10%] -mx-[5%] overflow-y-visible cursor-grab active:cursor-grabbing"
          >
            {loadingUpcoming ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="min-w-[200px] w-[200px] aspect-[2/3] bg-white/5 rounded-[2.5rem] animate-pulse"></div>
              ))
            ) : (
              upcomingAnime.map(anime => (
                <div key={anime.mal_id} className="min-w-[180px] w-[180px] flex-shrink-0">
                  <AnimeCard 
                    anime={anime} 
                    onClick={() => setSelectedAnime({...anime, image_url: anime.images.jpg.large_image_url})} 
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* FEED DE NOTICIAS */}
      <section className="space-y-10">
        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
           <Sparkles className="text-netflix-red" size={24}/>
           <h3 className="text-xl font-black uppercase italic tracking-tighter text-white italic">Noticias del Momento</h3>
        </div>
        
        {loadingNews ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <Loader2 className="animate-spin text-netflix-red" size={48} />
             <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-600 italic">Sintonizando MyAnimeList...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
             {newsFeed.map((article, idx) => (
               <NewsCard key={idx} article={article} />
             ))}
          </div>
        )}
      </section>

      {selectedAnime && (
        <CinemaModal anime={selectedAnime} onClose={() => setSelectedAnime(null)} />
      )}
    </div>
  );
}