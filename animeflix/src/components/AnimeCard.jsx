import React from 'react';
import { Play } from 'lucide-react';

export function AnimeCard({ anime, onClick }) {
  // Función para imagen HD que ya teníamos
  const getHDImage = (url) => url ? url.replace(/\/r\/\d+x\d+/, '').replace(/\/v\/\d+x\d+/, '').split('?')[0] : '';

  return (
    <div className="group cursor-pointer" onClick={() => onClick(anime)}>
      <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 group-hover:scale-105">
        <img 
          src={getHDImage(anime.image_url)} 
          className="w-full h-full object-cover group-hover:brightness-50 transition duration-1000" 
          alt={anime.title}
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500">
          <Play fill="white" size={48} className="drop-shadow-2xl shadow-netflix-red/50"/>
        </div>
        
        {/* Barra de progreso inferior */}
        <div className="absolute bottom-0 w-full h-2 bg-black/80">
          <div 
            className="h-full bg-netflix-red shadow-[0_0_20px_#E50914]" 
            style={{ width: `${(anime.episodes_watched / (anime.total_episodes || 1)) * 100}%` }}
          ></div>
        </div>
      </div>
      <div className="mt-6 text-center italic">
        <h4 className="font-black text-[13px] truncate uppercase tracking-tighter opacity-80 group-hover:opacity-100 transition">
          {anime.title}
        </h4>
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-1">
          Ep {anime.episodes_watched} / {anime.total_episodes === 0 ? 'ON AIR' : anime.total_episodes}
        </p>
      </div>
    </div>
  );
}