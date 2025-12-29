import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Volume2 } from 'lucide-react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';

export function AnimeCard({ anime, onClick }) {
  const { upsertAnime, extractYTId } = useAnimeLibrary();
  const [isHovered, setIsHovered] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [youtubeId, setYoutubeId] = useState(anime.youtube_id || null);
  
  // Estados para controlar la dirección de la expansión (Evita que se salga de la pantalla)
  const [originClass, setOriginClass] = useState('origin-center');
  const [translateClass, setTranslateClass] = useState('-translate-x-1/2');
  const [leftPos, setLeftPos] = useState('left-1/2');

  const cardRef = useRef(null);
  const hoverTimer = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Adaptador para soportar imágenes de Supabase o de la API de Jikan directamente
  const imageDisplay = anime.image_url || anime.images?.jpg?.large_image_url;
  const getHDImage = (url) => url ? url.replace(/\/r\/\d+x\d+/, '').replace(/\/v\/\d+x\d+/, '').split('?')[0] : '';
  
  const isUpdated = anime.total_episodes > anime.episodes_watched && anime.status === 'on_hold';

  const handleMouseEnter = () => {
    // 1. Lógica de posicionamiento inteligente (Detección de bordes)
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const margin = 200; // Umbral para detectar bordes

      if (rect.left < margin) {
        setOriginClass('origin-left');
        setTranslateClass('translate-x-0');
        setLeftPos('left-0');
      } else if (screenWidth - rect.right < margin) {
        setOriginClass('origin-right');
        setTranslateClass('translate-x-0');
        setLeftPos('left-auto right-0');
      } else {
        setOriginClass('origin-center');
        setTranslateClass('-translate-x-1/2');
        setLeftPos('left-1/2');
      }
    }

    setIsHovered(true);
    
    // 2. Temporizador para activar la experiencia de trailer (Netflix Style)
    hoverTimer.current = setTimeout(async () => {
      if (!isMounted.current) return;

      if (youtubeId) {
        setShowVideo(true);
      } else {
        setIsLoadingVideo(true);
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/full`);
          const { data } = await res.json();
          const id = extractYTId(data.trailer);

          if (id && isMounted.current) {
            setYoutubeId(id);
            if (isHovered) setShowVideo(true);
            
            // Solo persistimos en la DB si el anime ya es parte de nuestra lista
            if (anime.id) {
              upsertAnime({ ...anime, youtube_id: id });
            }
          }
        } catch (e) { 
          console.error("Error al obtener trailer:", e); 
        } finally {
          if (isMounted.current) setIsLoadingVideo(false);
        }
      }
    }, 700); 
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowVideo(false);
    setIsLoadingVideo(false);
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  return (
    <div 
      ref={cardRef}
      className={`relative w-full h-full aspect-[2/3] transition-all duration-300 ${isHovered ? 'z-[100]' : 'z-10'}`} 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      {/* TARJETA BASE: Mantiene el lugar exacto en el grid sin moverse */}
      <div className="w-full h-full rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/5">
        <img 
          src={getHDImage(imageDisplay)} 
          className="w-full h-full object-cover opacity-100" 
          alt="" 
        />
      </div>

      {/* TARJETA FLOTANTE: Es la que se expande y muestra el video */}
      <div 
        onClick={() => onClick(anime)}
        className={`absolute top-1/2 ${leftPos} ${translateClass} -translate-y-1/2 cursor-pointer transition-all duration-500 ease-out ${originClass}
          ${isHovered 
            ? 'w-[180%] z-[110] opacity-100 shadow-[0_40px_100px_rgba(0,0,0,1)]' 
            : 'w-full z-0 opacity-0 pointer-events-none'
          }
        `}
      >
        <div className={`relative w-full h-full rounded-[2rem] overflow-hidden border-2 border-white/20 bg-netflix-darkGray shadow-2xl transition-all duration-500 ${isHovered ? 'aspect-video' : 'aspect-[2/3]'}`}>
          
          <img 
            src={getHDImage(imageDisplay)} 
            className={`w-full h-full object-cover transition-opacity duration-700 ${showVideo ? 'opacity-0' : 'opacity-100'}`} 
            alt="" 
          />

          {isLoadingVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
              <Loader2 className="text-netflix-red animate-spin" size={40} />
            </div>
          )}

          {/* VIDEO EN 16:9 (CON SONIDO Y SIN FRANJAS) */}
          {showVideo && youtubeId && (
            <div className="absolute inset-0 bg-black animate-in fade-in duration-1000">
              <iframe 
                className="w-full h-full pointer-events-none scale-[1.02]" 
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=0&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=${window.location.origin}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              ></iframe>
              
              <div className="absolute top-4 right-4 flex gap-2">
                 <div className="bg-black/60 p-2 rounded-full border border-white/10 backdrop-blur-md">
                    <Volume2 size={12} className="text-white animate-pulse" />
                 </div>
              </div>
            </div>
          )}

          {isUpdated && !showVideo && (
            <div className="absolute top-6 left-6 z-10 bg-yellow-500 text-black text-[9px] font-black px-3 py-1 rounded-full shadow-2xl uppercase tracking-widest animate-bounce">
              Nueva Temporada
            </div>
          )}

          {/* INFO OVERLAY */}
          <div className={`absolute bottom-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent transition-opacity duration-500 ${showVideo ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex justify-between items-end">
              <div className="flex-1 min-w-0 pr-4 text-left">
                <p className="text-[10px] font-black text-netflix-red uppercase tracking-[0.3em] mb-1 italic">Reproduciendo</p>
                <h4 className="font-black text-sm truncate uppercase tracking-tighter text-white italic leading-none">
                  {anime.title}
                </h4>
              </div>
              <div className="bg-white text-black p-2 rounded-full shadow-xl">
                <Play size={16} fill="black" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* TÍTULO INFERIOR ESTÁTICO (Solo se ve cuando no hay hover) */}
      <div className={`mt-4 text-center transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
        <h4 className="font-black text-[12px] truncate uppercase tracking-tighter opacity-70 italic">
          {anime.title}
        </h4>
      </div>
    </div>
  );
}