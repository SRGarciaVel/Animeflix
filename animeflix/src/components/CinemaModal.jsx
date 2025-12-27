import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown'; // Librería de Markdown
import { 
  X, Clapperboard, Tv, MonitorPlay, Star, Hash, Edit3, Music, 
  RotateCcw, Youtube, ListMusic, Volume2, Share2, Eye, PenLine 
} from 'lucide-react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { useDynamicColor } from '../hooks/useDynamicColor';
import { AiringCountdown } from './AiringCountdown';
import { CastSection } from './CastSection'; 
import { CromoGenerator } from './CromoGenerator';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export function CinemaModal({ anime: initialAnime, onClose }) {
  const { myList, upsertAnime, deleteAnime, updateSmartStatus, extractYTId } = useAnimeLibrary();
  const [cinemaMode, setCinemaMode] = useState(false);
  const [videoSource, setVideoSource] = useState('trailer');
  const [themes, setThemes] = useState({ openings: [], endings: [] });
  const [promoVideo, setPromoVideo] = useState(null);
  const [fullMetadata, setFullMetadata] = useState(null);
  
  // Estados para nuevas funcionalidades Punto 5
  const [isCromoOpen, setIsCromoOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Sincronización con la data global
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
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ${cinemaMode ? 'opacity-0' : 'opacity-30 blur-[100px]'}`} 
        style={{ backgroundImage: `url(${anime.image_url})` }}
      ></div>
      <div className={`absolute inset-0 bg-black/80 transition-opacity duration-1000 ${cinemaMode ? 'opacity-95' : 'opacity-80'}`} onClick={onClose}></div>
      
      <div 
        className={`bg-netflix-darkGray/95 w-full max-w-6xl rounded-[4rem] overflow-hidden shadow-2xl relative border flex flex-col md:flex-row max-h-[95vh] z-10 no-scrollbar backdrop-blur-3xl transition-all duration-700 ${cinemaMode ? 'scale-105 bg-black' : 'scale-100'}`} 
        style={{ borderColor: `${accentColor}44` }}
      >
        
        {/* BOTONES DE CONTROL SUPERIOR */}
        <div className="absolute top-6 right-6 flex gap-4 z-[70]">
           <button 
            onClick={() => setIsCromoOpen(true)} 
            className="p-3 rounded-full bg-black/50 text-yellow-500 hover:bg-white hover:text-black transition shadow-2xl active:scale-90"
            title="Generar Cromo"
           >
             <Share2 size={20}/>
           </button>
           <button 
            onClick={() => setCinemaMode(!cinemaMode)} 
            className={`p-3 rounded-full transition-all shadow-2xl flex items-center justify-center ${cinemaMode ? 'bg-netflix-red text-white' : 'bg-black/50 text-gray-400 hover:bg-white hover:text-black'}`}
           >
             {cinemaMode ? <Tv size={20}/> : <Clapperboard size={20}/>}
           </button>
           <button onClick={onClose} className="bg-black/50 p-3 rounded-full hover:bg-white hover:text-black transition shadow-2xl active:scale-90"><X size={20}/></button>
        </div>
        
        {/* PANEL IZQUIERDO */}
        <div className={`w-full md:w-[320px] p-8 flex flex-col items-center overflow-y-auto no-scrollbar border-r border-white/5 bg-black/20 transition-all duration-700 ${cinemaMode ? 'opacity-10 blur-xl scale-75 grayscale' : 'opacity-100'}`}>
          <img src={anime.image_url} className="w-48 rounded-2xl shadow-2xl mb-8 transform hover:scale-105 transition duration-1000 border-2" style={{ borderColor: accentColor }} alt="" />
          <div className="w-full space-y-4">
            <button onClick={() => window.open(`https://www.crunchyroll.com/search?q=${encodeURIComponent(anime.title)}`, '_blank')} className="w-full bg-[#f47521] py-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 hover:scale-105 transition shadow-lg uppercase shadow-[#f47521]/20 tracking-widest"><MonitorPlay size={18}/> Crunchyroll</button>
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-4 shadow-inner">
              <p className="text-[9px] font-black text-gray-500 uppercase text-center italic">Multimedia</p>
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[9px] font-black uppercase text-gray-400 italic">Rewatches</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => handleUpdate({ rewatch_count: (anime.rewatch_count || 0) + 1 })} className="font-black text-xl hover:scale-125 transition" style={{ color: accentColor }}>+</button>
                  <span className="text-sm font-black italic">{anime.rewatch_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div className="flex-1 p-10 md:p-14 overflow-y-auto no-scrollbar relative z-10">
          {cinemaMode && (
            <div className="mb-8 animate-in slide-in-from-bottom-10 duration-1000 text-center">
              <div className="flex gap-4 mb-4 justify-center">
                <button onClick={() => setVideoSource('trailer')} className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${videoSource === 'trailer' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}><Youtube size={12}/> Trailer</button>
                <button onClick={() => setVideoSource('opening')} className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${videoSource === 'opening' ? 'text-white' : 'bg-white/10 text-white'}`} style={videoSource === 'opening' ? { backgroundColor: accentColor } : {}}><ListMusic size={12}/> Opening</button>
              </div>
              <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-2xl" style={{ boxShadow: `0 0 100px ${accentColor}33` }}>
                {promoVideo ? (
                  <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${promoVideo}?autoplay=1&mute=1&controls=1&rel=0&origin=${window.location.origin}&iv_load_policy=3&playsinline=1`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-netflix-darkGray p-12 text-center">
                    <Youtube size={48} style={{ color: accentColor }} className="animate-pulse"/><p className="text-[10px] font-black uppercase opacity-40 italic">Buscando {videoSource}...</p>
                    <button onClick={openYouTubeSearch} className="px-8 py-3 rounded-full font-black text-[9px] hover:scale-110 transition shadow-2xl uppercase italic" style={{ backgroundColor: accentColor }}>Abrir en YouTube</button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`space-y-10 transition-all duration-700 ${cinemaMode ? 'opacity-40 blur-[4px] scale-95 origin-top' : 'opacity-100 scale-100'}`}>
            <header>
              <div className="flex items-center gap-3 mb-3">
                 <span className="text-[8px] font-black px-2 py-1 rounded-full uppercase italic tracking-widest shadow-lg" style={{ backgroundColor: accentColor }}>Original Animeflix</span>
                 <div className="flex gap-2">{renderGenres()}</div>
                 {fullMetadata && <AiringCountdown broadcast={fullMetadata.broadcast?.string} status={fullMetadata.status} />}
              </div>
              <h2 className="text-5xl font-black italic uppercase leading-none mb-6 tracking-tighter drop-shadow-2xl italic">{anime.title}</h2>
            </header>

            <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 shadow-2xl"><CastSection animeId={anime.mal_id} accentColor={accentColor} /></div>

            <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 shadow-2xl">
              <div className="flex justify-between items-end mb-8">
                <div><p className="text-[9px] font-black text-netflix-red uppercase italic mb-1 tracking-widest opacity-60">Status</p><h3 className="text-5xl font-black italic tracking-tighter leading-none italic">EP {anime.episodes_watched} <span className="text-gray-700 text-3xl font-light ml-2"> / {anime.total_episodes === 0 ? 'ON AIR' : anime.total_episodes}</span></h3></div>
                <div className="flex items-center gap-3 bg-black/60 px-5 py-3 rounded-2xl border border-white/10 group transition"><Star size={20} className="text-yellow-500 fill-yellow-500 group-hover:scale-110 transition duration-500"/><input type="number" max="10" value={anime.score || 0} onChange={(e) => handleUpdate({ score: parseInt(e.target.value) || 0 })} className="bg-transparent w-10 font-black text-3xl text-center outline-none italic" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleUpdateProgress(anime.episodes_watched + 1)} className="bg-white text-black py-4 rounded-2xl font-black text-[10px] hover:bg-gray-200 transition shadow-lg italic">+1 EP</button>
                <button onClick={() => handleUpdateProgress(anime.episodes_watched + 12)} className="bg-gray-800 text-white py-4 rounded-2xl font-black text-[10px] hover:bg-gray-700 transition shadow-lg italic">+1 TEMP</button>
              </div>
            </div>

            {/* 📝 SECCIÓN DE NOTAS PRO (PUNTO 5.2 MARKDOWN) */}
            <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 min-h-[300px] flex flex-col shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-6 relative z-10">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] italic flex items-center gap-3">
                   <Edit3 size={18} style={{ color: accentColor }}/> Diario Personal
                </p>
                <button 
                  onClick={() => setIsEditingNotes(!isEditingNotes)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${isEditingNotes ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                >
                  {isEditingNotes ? <Eye size={12}/> : <PenLine size={12}/>}
                  {isEditingNotes ? 'Vista Previa' : 'Editar Nota'}
                </button>
              </div>

              {isEditingNotes ? (
                <textarea 
                  className="w-full flex-1 bg-transparent border-none text-base font-medium focus:ring-0 resize-none no-scrollbar italic leading-relaxed text-white/80"
                  placeholder="Escribe tus teorías o momentos favoritos... (Soporta Markdown: **negrita**, - listas, etc)"
                  value={anime.notes || ''}
                  onChange={(e) => handleUpdate({ notes: e.target.value })}
                />
              ) : (
                <div className="w-full flex-1 italic leading-relaxed text-white/70 prose prose-invert prose-sm max-w-none no-scrollbar">
                   <ReactMarkdown>
                     {anime.notes || "_No hay pensamientos registrados para esta serie aún. ¡Empieza a escribir!_"}
                   </ReactMarkdown>
                </div>
              )}
              
              {/* Brillo sutil de fondo en las notas */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 blur-[100px] opacity-10 pointer-events-none" style={{ backgroundColor: accentColor }}></div>
            </div>
            
            <button onClick={() => deleteAnime(anime.id)} className="w-full text-[11px] font-black text-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest py-10 italic border border-transparent hover:border-red-500/20 rounded-[2rem] text-center italic">Remove from catalog</button>
          </div>
        </div>
      </div>

      {/* MODAL GENERADOR DE CROMOS */}
      {isCromoOpen && (
        <CromoGenerator anime={anime} accentColor={accentColor} onClose={() => setIsCromoOpen(false)} />
      )}
    </div>
  );
}