import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, Clapperboard, Tv, MonitorPlay, Star, Hash, Edit3, Music, 
  RotateCcw, Youtube, ListMusic, Volume2, Share2, Eye, PenLine,
  GitMerge, LayoutGrid 
} from 'lucide-react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { useDynamicColor } from '../hooks/useDynamicColor';
import { AiringCountdown } from './AiringCountdown';
import { CastSection } from './CastSection'; 
import { FranchiseMap } from './FranchiseMap';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export function CinemaModal({ anime: initialAnime, onClose }) {
  const { myList, upsertAnime, deleteAnime, updateSmartStatus, extractYTId } = useAnimeLibrary();
  const [cinemaMode, setCinemaMode] = useState(false);
  const [videoSource, setVideoSource] = useState('trailer');
  const [activeTab, setActiveTab] = useState('info'); 
  const [themes, setThemes] = useState({ openings: [], endings: [] });
  const [promoVideo, setPromoVideo] = useState(null);
  const [fullMetadata, setFullMetadata] = useState(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const anime = myList.find(a => a.mal_id === initialAnime.mal_id) || initialAnime;
  const accentColor = useDynamicColor(anime.image_url);

  useEffect(() => {
    if (anime) fetchExtraData(anime.mal_id);
  }, [anime.mal_id]);

  const fetchExtraData = async (id) => {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
      const { data } = await res.json();
      setFullMetadata(data);
      setPromoVideo(extractYTId(data.trailer));
      setThemes(data.theme || { openings: [], endings: [] });
    } catch (e) { console.error(e); }
  };

  const handleUpdateProgress = async (newCount) => {
    const total = anime.total_episodes || 0;
    const finalCount = total > 0 ? Math.min(newCount, total) : newCount;
    const newStatus = await updateSmartStatus({ ...anime, episodes_watched: finalCount });

    if (newStatus === 'completed' && anime.status !== 'completed') {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [accentColor, '#E50914', '#ffffff'] });
      toast.success(`¡Felicidades por terminar ${anime.title}!`);
    }
    upsertAnime({ ...anime, episodes_watched: finalCount, status: newStatus });
  };

  const handleUpdate = (updates) => upsertAnime({ ...anime, ...updates });

  const openYouTubeSearch = () => {
    let query = videoSource === 'trailer' 
      ? `${anime.title} official trailer` 
      : `${anime.title} ${themes.openings?.[0]?.split('"')[1] || 'opening'}`;
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
  };

  const renderGenres = () => {
    if (!anime.genres || !Array.isArray(anime.genres)) return null;
    return anime.genres.slice(0, 3).map((g, idx) => (
      <span key={idx} className="text-[8px] font-black uppercase border border-white/10 px-2 py-0.5 rounded-full opacity-40 italic">
        {typeof g === 'object' ? g.name : g}
      </span>
    ));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ${cinemaMode ? 'opacity-0' : 'opacity-30 blur-[100px]'}`} style={{ backgroundImage: `url(${anime.image_url})` }}></div>
      <div className={`absolute inset-0 bg-black/80 transition-opacity duration-1000 ${cinemaMode ? 'opacity-95' : 'opacity-80'}`} onClick={onClose}></div>
      
      <div 
        className={`bg-netflix-darkGray/95 w-full max-w-6xl rounded-[4rem] overflow-hidden shadow-2xl relative border flex flex-col md:flex-row max-h-[95vh] z-10 no-scrollbar backdrop-blur-3xl transition-all duration-700 ${cinemaMode ? 'scale-105 bg-black' : 'scale-100'}`} 
        style={{ borderColor: `${accentColor}44` }}
      >
        
        {/* PANEL IZQUIERDO: Navegación y Acciones */}
        <div className={`w-full md:w-[320px] p-8 flex flex-col items-center overflow-y-auto no-scrollbar border-r border-white/5 bg-black/20 transition-all duration-700 ${cinemaMode ? 'opacity-10 blur-xl scale-75 grayscale' : 'opacity-100'}`}>
          <img src={anime.image_url} className="w-48 rounded-2xl shadow-2xl mb-10 transform hover:scale-105 transition duration-1000 border-2" style={{ borderColor: accentColor }} alt="" />
          
          <div className="w-full space-y-3 mb-10">
            <button 
              onClick={() => setActiveTab('info')}
              className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${activeTab === 'info' ? 'bg-white text-black shadow-lg scale-105' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
            >
              <LayoutGrid size={16}/> Información
            </button>
            <button 
              onClick={() => setActiveTab('franchise')}
              className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${activeTab === 'franchise' ? 'bg-white text-black shadow-lg scale-105' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
            >
              <GitMerge size={16}/> Franquicia
            </button>
          </div>

          <div className="w-full space-y-4">
            <button onClick={() => window.open(`https://www.crunchyroll.com/search?q=${encodeURIComponent(anime.title)}`, '_blank')} className="w-full bg-[#f47521] py-5 rounded-[2rem] font-black text-xs flex items-center justify-center gap-2 hover:scale-105 transition shadow-lg uppercase shadow-[#f47521]/20 tracking-widest"><MonitorPlay size={20}/> Crunchyroll</button>
            <div className="bg-black/40 p-5 rounded-[2.5rem] border border-white/5 space-y-4 shadow-inner text-center">
              <p className="text-[9px] font-black text-gray-500 uppercase italic tracking-widest italic leading-none">Rewatches</p>
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => handleUpdate({ rewatch_count: (anime.rewatch_count || 0) + 1 })} className="font-black text-2xl hover:scale-125 transition" style={{ color: accentColor }}>+</button>
                <span className="text-sm font-black italic">{anime.rewatch_count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Contenido Dinámico */}
        <div className="flex-1 p-12 md:p-16 overflow-y-auto no-scrollbar relative z-10">
          
          <div className="absolute top-0 right-0 flex gap-4 p-8 z-20">
             <button onClick={() => setCinemaMode(!cinemaMode)} className={`p-3 rounded-full transition-all shadow-2xl flex items-center justify-center ${cinemaMode ? 'bg-netflix-red text-white' : 'bg-black/50 text-gray-400 hover:bg-white hover:text-black'}`}>{cinemaMode ? <Tv size={20}/> : <Clapperboard size={20}/>}</button>
             <button onClick={onClose} className="bg-black/50 p-3 rounded-full hover:bg-white hover:text-black transition shadow-2xl active:scale-90"><X size={20}/></button>
          </div>

          <div className={`space-y-12 transition-all duration-700 ${cinemaMode ? 'opacity-40 blur-[4px] scale-95 origin-top' : 'opacity-100 scale-100'}`}>
            
            {activeTab === 'info' ? (
              <>
                <header>
                  <div className="flex items-center gap-3 mb-4">
                     <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase italic tracking-widest shadow-lg" style={{ backgroundColor: accentColor }}>Original Animeflix</span>
                     <div className="flex gap-2">{renderGenres()}</div>
                     {fullMetadata && <AiringCountdown broadcast={fullMetadata.broadcast?.string} status={fullMetadata.status} />}
                  </div>
                  <h2 className="text-6xl font-black italic uppercase leading-none mb-8 tracking-tighter italic drop-shadow-2xl">{anime.title}</h2>
                </header>

                <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                  <CastSection animeId={anime.mal_id} accentColor={accentColor} />
                </div>

                <div className="bg-black/40 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
                  <div className="flex justify-between items-end mb-10">
                    <div>
                      <p className="text-[10px] font-black text-netflix-red uppercase italic mb-2 tracking-widest italic tracking-tighter">Tu Progreso</p>
                      <h3 className="text-7xl font-black italic tracking-tighter leading-none italic">
                        EP {anime.episodes_watched} 
                        <span className="text-gray-700 text-3xl font-light ml-3 italic"> 
                          / {anime.total_episodes === 0 ? 'ON AIR' : anime.total_episodes}
                        </span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 bg-black/60 px-6 py-5 rounded-[2rem] border border-white/10 shadow-inner group transition">
                      <Star size={24} className="text-yellow-500 fill-yellow-500 group-hover:scale-110 transition duration-500"/>
                      <input type="number" max="10" value={anime.score || 0} onChange={(e) => handleUpdate({ score: parseInt(e.target.value) || 0 })} className="bg-transparent w-14 font-black text-4xl text-center outline-none italic" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleUpdateProgress(anime.episodes_watched + 1)} className="bg-white text-black py-5 rounded-[2.5rem] font-black text-[10px] hover:bg-gray-200 transition shadow-lg italic uppercase tracking-widest">+1 EP</button>
                    <button onClick={() => handleUpdateProgress(anime.episodes_watched + 12)} className="bg-gray-800 text-white py-5 rounded-[2.5rem] font-black text-[10px] hover:bg-gray-700 transition shadow-lg italic uppercase tracking-widest">+1 TEMP</button>
                  </div>
                </div>

                <div className="bg-black/40 p-12 rounded-[3.5rem] border border-white/5 h-64 flex flex-col shadow-2xl relative overflow-hidden">
                   <div className="flex justify-between items-center mb-6 relative z-10">
                     <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] italic flex items-center gap-3"><Edit3 size={18} style={{ color: accentColor }}/> Diario Personal</p>
                     <button onClick={() => setIsEditingNotes(!isEditingNotes)} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all border ${isEditingNotes ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10'}`}>
                        {isEditingNotes ? 'Vista Previa' : 'Editar'}
                     </button>
                   </div>
                   {isEditingNotes ? (
                     <textarea className="w-full flex-1 bg-transparent border-none text-base font-medium focus:ring-0 resize-none no-scrollbar italic leading-relaxed text-white/80" value={anime.notes || ''} onChange={(e) => handleUpdate({ notes: e.target.value })} />
                   ) : (
                     <div className="prose prose-invert prose-sm italic opacity-70 overflow-y-auto no-scrollbar">
                        <ReactMarkdown>{anime.notes || "_¿Qué piensas de esta serie? Escribe aquí tu diario..._"}</ReactMarkdown>
                     </div>
                   )}
                </div>
              </>
            ) : (
              <FranchiseMap animeId={anime.mal_id} accentColor={accentColor} />
            )}
            
            <button onClick={() => deleteAnime(anime.id)} className="w-full text-[11px] font-black text-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest py-14 italic border border-transparent hover:border-red-500/20 rounded-[3rem] text-center italic">Remover del Catálogo</button>
          </div>
        </div>
      </div>
    </div>
  );
}