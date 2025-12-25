import React, { useState, useEffect } from 'react';
import { X, Clapperboard, Tv, MonitorPlay, Star, Hash, Edit3, Music, RotateCcw, Youtube, ListMusic } from 'lucide-react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';

export function CinemaModal({ anime: initialAnime, onClose }) {
  const { myList, upsertAnime, deleteAnime } = useAnimeLibrary();
  const [cinemaMode, setCinemaMode] = useState(false);
  const [videoSource, setVideoSource] = useState('trailer');
  const [themes, setThemes] = useState({ openings: [], endings: [] });
  const [promoVideo, setPromoVideo] = useState(null);

  // Buscamos la versión más reciente del anime en nuestra lista local sincronizada
  const anime = myList.find(a => a.mal_id === initialAnime.mal_id) || initialAnime;

  useEffect(() => {
    if (anime) fetchExtraData(anime.mal_id);
  }, [anime.mal_id]);

  const fetchExtraData = async (id) => {
    try {
      const themeRes = await fetch(`https://api.jikan.moe/v4/anime/${id}/themes`);
      const themeData = await themeRes.json();
      setThemes(themeData.data || { openings: [], endings: [] });

      const infoRes = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
      const infoData = await infoRes.json();
      setPromoVideo(infoData.data?.trailer?.youtube_id || null);
    } catch (e) { console.error(e); }
  };

  // --- LÓGICA DE INCREMENTO CON CAMBIO DE ESTADO AUTOMÁTICO ---
  const handleIncrement = (amount) => {
    const currentEps = anime.episodes_watched || 0;
    const total = anime.total_episodes || 0;
    let newCount = currentEps + amount;

    if (total > 0) newCount = Math.min(newCount, total);

    let newStatus = anime.status;

    // REGLA 1: Si estaba en 0 y ahora tiene 1 o más, pasa a "Viendo"
    if (currentEps === 0 && newCount > 0) {
      newStatus = 'watching';
    }

    // REGLA 2: Si llega al total de episodios, pasa a "Completado"
    if (total > 0 && newCount === total) {
      newStatus = 'completed';
    }

    handleUpdate({ episodes_watched: newCount, status: newStatus });
  };

  const handleUpdate = (updates) => {
    upsertAnime({ ...anime, ...updates });
  };

  // --- LÓGICA DE YOUTUBE SEPARADA ---
  const openYouTubeSearch = () => {
    let query = "";
    if (videoSource === 'trailer') {
      // Búsqueda específica de Trailer
      query = `${anime.title} official trailer`;
    } else {
      // Búsqueda específica de Opening usando metadata de Jikan
      const opName = themes.openings?.[0]?.split('"')[1] || "";
      query = `${anime.title} ${opName} opening official`;
    }
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      {/* Fondo con desenfoque dinámico */}
      <div className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ${cinemaMode ? 'opacity-0' : 'opacity-30 blur-[100px]'}`} style={{ backgroundImage: `url(${anime.image_url})` }}></div>
      <div className="absolute inset-0 bg-black/80" onClick={onClose}></div>
      
      <div className={`bg-netflix-darkGray/95 w-full max-w-6xl rounded-[4rem] overflow-hidden shadow-2xl relative border border-white/10 flex flex-col md:flex-row max-h-[95vh] z-10 no-scrollbar backdrop-blur-3xl transition-all duration-700 ${cinemaMode ? 'scale-105 bg-black' : 'scale-100'}`}>
        
        {/* BOTONES SUPERIORES */}
        <div className="absolute top-8 right-8 flex gap-4 z-[70]">
           <button 
            onClick={() => setCinemaMode(!cinemaMode)} 
            className={`p-4 rounded-full transition-all shadow-2xl flex items-center justify-center ${cinemaMode ? 'bg-netflix-red text-white' : 'bg-black/50 text-gray-400 hover:bg-white hover:text-black'}`}
           >
             {cinemaMode ? <Tv size={24}/> : <Clapperboard size={24}/>}
           </button>
           <button onClick={onClose} className="bg-black/50 p-4 rounded-full hover:bg-white hover:text-black transition shadow-2xl"><X size={24}/></button>
        </div>
        
        {/* PANEL LATERAL IZQUIERDO */}
        <div className={`w-full md:w-[350px] p-10 flex flex-col items-center overflow-y-auto no-scrollbar border-r border-white/5 bg-black/20 transition-all duration-700 ${cinemaMode ? 'opacity-10 blur-xl scale-75' : 'opacity-100'}`}>
          <img src={anime.image_url} className="w-56 rounded-3xl shadow-2xl mb-8 transform hover:scale-105 transition duration-1000 border border-white/10" />
          <div className="w-full space-y-4">
            <button onClick={() => window.open(`https://www.crunchyroll.com/search?q=${anime.title}`, '_blank')} className="w-full bg-[#f47521] py-5 rounded-[2rem] font-black text-xs flex items-center justify-center gap-3 hover:scale-105 transition shadow-lg uppercase tracking-widest shadow-[#f47521]/20"><MonitorPlay size={20}/> Crunchyroll</button>
            
            <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <p className="text-[10px] font-black text-gray-500 uppercase text-center italic tracking-widest">Rewatches</p>
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <button onClick={() => handleUpdate({ rewatch_count: (anime.rewatch_count || 0) + 1 })} className="font-black text-netflix-red text-2xl hover:scale-125 transition">+</button>
                <span className="text-sm font-black italic">{anime.rewatch_count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL PRINCIPAL DERECHO */}
        <div className="flex-1 p-12 md:p-16 overflow-y-auto no-scrollbar relative z-10">
          
          {/* MODO CINE CONTROLES */}
          {cinemaMode && (
            <div className="mb-12 animate-in slide-in-from-bottom-10 duration-1000">
              <div className="flex gap-4 mb-6 justify-center">
                <button 
                  onClick={() => setVideoSource('trailer')} 
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 ${videoSource === 'trailer' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                >
                  <Youtube size={14}/> Trailer Oficial
                </button>
                <button 
                  onClick={() => setVideoSource('opening')} 
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 ${videoSource === 'opening' ? 'bg-netflix-red text-white' : 'bg-white/10 text-white'}`}
                >
                  <ListMusic size={14}/> Opening (YouTube)
                </button>
              </div>

              <div className="relative aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_120px_rgba(229,9,20,0.4)] bg-black">
                {videoSource === 'trailer' && promoVideo ? (
                  <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${promoVideo}?autoplay=1&rel=0`} allow="autoplay; encrypted-media" allowFullScreen></iframe>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-netflix-darkGray p-12 text-center">
                    <Youtube size={64} className="text-netflix-red animate-pulse"/>
                    <p className="text-xs font-black uppercase tracking-widest opacity-50 italic">Buscando {videoSource === 'trailer' ? 'Trailer' : 'Opening'} de {anime.title}...</p>
                    <button onClick={openYouTubeSearch} className="bg-netflix-red px-10 py-4 rounded-full font-black text-xs hover:scale-110 transition shadow-2xl uppercase italic">Abrir en YouTube</button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`space-y-12 transition-all duration-700 ${cinemaMode ? 'opacity-40 blur-[4px] scale-95 origin-top' : 'opacity-100 scale-100'}`}>
            <h2 className="text-6xl font-black italic uppercase leading-none mb-8 tracking-tighter drop-shadow-2xl">{anime.title}</h2>
            
            <div className="bg-black/40 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <p className="text-[10px] font-black text-netflix-red uppercase italic mb-2 tracking-widest italic">Progreso Actual</p>
                  <h3 className="text-6xl font-black italic tracking-tighter leading-none italic">
                    EP {anime.episodes_watched} 
                    <span className="text-gray-700 text-3xl font-light ml-3 italic"> 
                      / {anime.total_episodes === 0 ? 'ON AIR' : anime.total_episodes}
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-3 bg-black/60 px-6 py-5 rounded-[2rem] border border-white/10 shadow-inner group">
                  <Star size={24} className="text-yellow-500 fill-yellow-500 group-hover:scale-110 transition duration-500"/>
                  <input type="number" max="10" value={anime.score} onChange={(e) => handleUpdate({ score: parseInt(e.target.value) })} className="bg-transparent w-14 font-black text-4xl text-center outline-none italic" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleIncrement(1)} className="bg-white text-black py-5 rounded-[2.5rem] font-black text-xs hover:bg-gray-200 transition shadow-lg italic">+1 EPISODIO</button>
                <button onClick={() => handleIncrement(12)} className="bg-gray-800 text-white py-5 rounded-[2.5rem] font-black text-xs hover:bg-gray-700 transition shadow-lg italic">+1 TEMP</button>
              </div>

              <div className="relative mt-8 group">
                <Hash className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-netflix-red transition" size={24}/>
                <input 
                  type="number" 
                  placeholder="Capítulo exacto..." 
                  className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] py-6 text-center font-black text-2xl outline-none focus:border-netflix-red transition shadow-inner italic" 
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') { 
                      const val = parseInt(e.target.value);
                      let newStatus = anime.status;
                      if (val > 0 && anime.episodes_watched === 0) newStatus = 'watching';
                      if (anime.total_episodes > 0 && val === anime.total_episodes) newStatus = 'completed';
                      handleUpdate({ episodes_watched: val, status: newStatus }); 
                      e.target.value = ''; 
                    } 
                  }} 
                />
              </div>
            </div>

            {/* NOTAS */}
            <div className="bg-black/40 p-12 rounded-[3.5rem] border border-white/5 h-56 flex flex-col shadow-2xl">
              <p className="text-[11px] font-black text-gray-500 uppercase mb-6 flex items-center gap-4 tracking-[0.4em] italic"><Edit3 size={20}/> Diario Personal</p>
              <textarea className="w-full flex-1 bg-transparent border-none text-base font-medium focus:ring-0 resize-none no-scrollbar italic leading-relaxed" placeholder="Anota tus impresiones..." value={anime.notes || ''} onChange={(e) => handleUpdate({ notes: e.target.value })} />
            </div>
            
            <button onClick={() => deleteAnime(anime.id)} className="w-full text-[11px] font-black text-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest py-14 italic border border-transparent hover:border-red-500/20 rounded-[3rem] italic">Eliminar del Catálogo</button>
          </div>
        </div>
      </div>
    </div>
  );
}