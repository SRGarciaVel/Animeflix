import React, { useState, useEffect } from 'react';
import { X, Clapperboard, Tv, MonitorPlay, Star, Hash, Edit3, Music, RotateCcw, Youtube, ListMusic } from 'lucide-react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { useDynamicColor } from '../hooks/useDynamicColor';
import { AiringCountdown } from './AiringCountdown';
import { CastSection } from './CastSection'; 
import { toast } from 'sonner';

export function CinemaModal({ anime: initialAnime, onClose }) {
  const { myList, upsertAnime, deleteAnime } = useAnimeLibrary();
  const [cinemaMode, setCinemaMode] = useState(false);
  const [videoSource, setVideoSource] = useState('trailer');
  const [themes, setThemes] = useState({ openings: [], endings: [] });
  const [promoVideo, setPromoVideo] = useState(null);
  const [fullMetadata, setFullMetadata] = useState(null);

  const anime = myList.find(a => a.mal_id === initialAnime.mal_id) || initialAnime;
  const accentColor = useDynamicColor(anime.image_url);

  useEffect(() => {
    if (anime) fetchExtraData(anime.mal_id);
  }, [anime.mal_id]);

  const fetchExtraData = async (id) => {
    try {
      const infoRes = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
      const infoData = await infoRes.json();
      setFullMetadata(infoData.data);
      setPromoVideo(infoData.data?.trailer?.youtube_id || null);

      const themeRes = await fetch(`https://api.jikan.moe/v4/anime/${id}/themes`);
      const themeData = await themeRes.json();
      setThemes(themeData.data || { openings: [], endings: [] });
    } catch (e) { console.error(e); }
  };

  const handleUpdateProgress = async (newCount) => {
    const total = anime.total_episodes || 0;
    const finalCount = total > 0 ? Math.min(newCount, total) : newCount;
    // La lógica de estado automático está en el handleUpdate
    let newStatus = anime.status;
    if (anime.episodes_watched === 0 && finalCount > 0) newStatus = 'watching';
    if (total > 0 && finalCount === total) newStatus = 'on_hold';

    upsertAnime({ ...anime, episodes_watched: finalCount, status: newStatus });
  };

  const handleUpdate = (updates) => {
    upsertAnime({ ...anime, ...updates });
  };

  const openYouTubeSearch = () => {
    let query = videoSource === 'trailer' 
      ? `${anime.title} official trailer` 
      : `${anime.title} ${themes.openings?.[0]?.split('"')[1] || 'opening'}`;
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
  };

  const renderGenres = () => {
    if (!anime.genres || !Array.isArray(anime.genres)) return null;
    return anime.genres.slice(0, 3).map((g, idx) => {
      const genreName = typeof g === 'object' ? g.name : g;
      return (
        <span key={idx} className="text-[8px] font-black uppercase border border-white/10 px-2 py-0.5 rounded-full opacity-40 italic">
          {genreName}
        </span>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ${cinemaMode ? 'opacity-0' : 'opacity-30 blur-[100px]'}`} 
        style={{ backgroundImage: `url(${anime.image_url})` }}
      ></div>
      <div className={`absolute inset-0 bg-black/80 transition-opacity duration-1000 ${cinemaMode ? 'opacity-95' : 'opacity-80'}`} onClick={onClose}></div>
      
      <div 
        className={`bg-netflix-darkGray/95 w-full max-w-6xl rounded-[4rem] overflow-hidden shadow-2xl relative border flex flex-col md:flex-row max-h-[95vh] z-10 no-scrollbar backdrop-blur-3xl transition-all duration-700 ${cinemaMode ? 'scale-105 bg-black' : 'scale-100'}`}
        style={{ borderColor: `${accentColor}44` }}
      >
        <div className="absolute top-8 right-8 flex gap-4 z-[70]">
           <button onClick={() => setCinemaMode(!cinemaMode)} className={`p-4 rounded-full transition-all shadow-2xl flex items-center justify-center ${cinemaMode ? 'bg-netflix-red text-white' : 'bg-black/50 text-gray-400 hover:bg-white hover:text-black'}`}>{cinemaMode ? <Tv size={24}/> : <Clapperboard size={24}/>}</button>
           <button onClick={onClose} className="bg-black/50 p-4 rounded-full hover:bg-white hover:text-black transition shadow-2xl active:scale-90"><X size={24}/></button>
        </div>
        
        <div className={`w-full md:w-[350px] p-10 flex flex-col items-center overflow-y-auto no-scrollbar border-r border-white/5 bg-black/20 transition-all duration-700 ${cinemaMode ? 'opacity-10 blur-xl scale-75 grayscale' : 'opacity-100'}`}>
          <img src={anime.image_url} className="w-56 rounded-3xl shadow-2xl mb-8 transform hover:scale-105 transition duration-1000 border-4 shadow-black" style={{ borderColor: accentColor }} alt="" />
          <div className="w-full space-y-4">
            <button onClick={() => window.open(`https://www.crunchyroll.com/search?q=${anime.title}`, '_blank')} className="w-full bg-[#f47521] py-5 rounded-[2rem] font-black text-xs flex items-center justify-center gap-3 hover:scale-105 transition shadow-lg uppercase shadow-[#f47521]/20 tracking-widest"><MonitorPlay size={20}/> Crunchyroll</button>
            <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-inner">
              <p className="text-[10px] font-black text-gray-500 uppercase text-center italic tracking-widest">Multimedia</p>
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <span className="text-[9px] font-black uppercase text-gray-400 italic">Rewatches</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => handleUpdate({ rewatch_count: (anime.rewatch_count || 0) + 1 })} className="font-black text-2xl hover:scale-125 transition" style={{ color: accentColor }}>+</button>
                  <span className="text-sm font-black italic">{anime.rewatch_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-12 md:p-16 overflow-y-auto no-scrollbar relative z-10">
          {cinemaMode && (
            <div className="mb-12 animate-in slide-in-from-bottom-10 duration-1000 text-center">
              <div className="flex gap-4 mb-6 justify-center">
                <button onClick={() => setVideoSource('trailer')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 ${videoSource === 'trailer' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}><Youtube size={14}/> Trailer</button>
                <button onClick={() => setVideoSource('opening')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 ${videoSource === 'opening' ? 'text-white' : 'bg-white/10 text-white'}`} style={videoSource === 'opening' ? { backgroundColor: accentColor } : {}}><ListMusic size={14}/> Opening</button>
              </div>
              <div className="relative aspect-video rounded-[3rem] overflow-hidden border border-white/10 bg-black shadow-2xl" style={{ boxShadow: `0 0 100px ${accentColor}33` }}>
                {videoSource === 'trailer' && promoVideo ? (
                  <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${promoVideo}?autoplay=1&rel=0`} allow="autoplay; encrypted-media" allowFullScreen></iframe>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-netflix-darkGray p-12">
                    <Youtube size={64} style={{ color: accentColor }} className="animate-pulse"/>
                    <button onClick={openYouTubeSearch} className="px-10 py-4 rounded-full font-black text-xs hover:scale-110 transition shadow-2xl uppercase italic" style={{ backgroundColor: accentColor }}>Abrir en YouTube</button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`space-y-12 transition-all duration-700 ${cinemaMode ? 'opacity-40 blur-[4px] scale-95 origin-top' : 'opacity-100 scale-100'}`}>
            <header>
              <div className="flex items-center gap-3 mb-4">
                 <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase italic tracking-widest shadow-lg" style={{ backgroundColor: accentColor }}>Original Animeflix</span>
                 <div className="flex gap-2">{renderGenres()}</div>
                 {fullMetadata && <AiringCountdown broadcast={fullMetadata.broadcast?.string} status={fullMetadata.status} />}
              </div>
              <h2 className="text-6xl font-black italic uppercase leading-none mb-8 tracking-tighter drop-shadow-2xl">{anime.title}</h2>
            </header>

            {/* SECCIÓN DE CAST & CONEXIONES */}
            <div className="bg-black/40 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <CastSection animeId={anime.mal_id} accentColor={accentColor} />
            </div>

            <div className="bg-black/40 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <p className="text-[10px] font-black text-netflix-red uppercase italic mb-2 tracking-widest italic tracking-tighter">Tu Progreso</p>
                  <h3 className="text-6xl font-black italic tracking-tighter leading-none italic">EP {anime.episodes_watched} <span className="text-gray-700 text-3xl font-light ml-3 italic"> / {anime.total_episodes === 0 ? 'ON AIR' : anime.total_episodes}</span></h3>
                </div>
                <div className="flex items-center gap-3 bg-black/60 px-6 py-5 rounded-[2rem] border border-white/10">
                  <Star size={24} className="text-yellow-500 fill-yellow-500 group-hover:scale-110 transition duration-500"/>
                  <input type="number" max="10" value={anime.score || 0} onChange={(e) => handleUpdate({ score: parseInt(e.target.value) || 0 })} className="bg-transparent w-14 font-black text-4xl text-center outline-none italic" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleUpdateProgress(anime.episodes_watched + 1)} className="bg-white text-black py-5 rounded-[2.5rem] font-black text-xs hover:bg-gray-200 transition shadow-lg italic">+1 EPISODIO</button>
                <button onClick={() => handleUpdateProgress(anime.episodes_watched + 12)} className="bg-gray-800 text-white py-5 rounded-[2.5rem] font-black text-xs hover:bg-gray-700 transition shadow-lg italic">+1 TEMP</button>
              </div>
            </div>

            <div className="bg-black/40 p-12 rounded-[3.5rem] border border-white/5 h-56 flex flex-col shadow-2xl">
              <p className="text-[11px] font-black text-gray-500 uppercase mb-6 flex items-center gap-4 tracking-[0.4em] italic tracking-tighter"><Edit3 size={20}/> Notas</p>
              <textarea className="w-full flex-1 bg-transparent border-none text-base font-medium focus:ring-0 resize-none no-scrollbar italic leading-relaxed" placeholder="Notas..." value={anime.notes || ''} onChange={(e) => handleUpdate({ notes: e.target.value })} />
            </div>
            
            <button onClick={() => deleteAnime(anime.id)} className="w-full text-[11px] font-black text-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest py-14 italic border border-transparent hover:border-red-500/20 rounded-[3rem] text-center italic">Remover del Catálogo</button>
          </div>
        </div>
      </div>
    </div>
  );
}