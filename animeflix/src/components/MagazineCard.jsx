import React from 'react';
import { Bookmark, Star, Quote } from 'lucide-react';

export function MagazineCard({ anime, onClick }) {
  const getHDImage = (url) => url ? url.replace(/\/r\/\d+x\d+/, '').replace(/\/v\/\d+x\d+/, '').split('?')[0] : '';

  return (
    <div 
      onClick={() => onClick(anime)}
      className="break-inside-avoid mb-8 group cursor-pointer border-b border-white/10 pb-8 hover:border-netflix-red transition-colors duration-500"
    >
      <div className="relative overflow-hidden rounded-sm shadow-2xl mb-4">
        <img 
          src={getHDImage(anime.image_url)} 
          className="w-full h-auto grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
          alt="" 
        />
        <div className="absolute top-4 left-0 bg-netflix-red text-white px-4 py-1 text-[9px] font-black uppercase tracking-widest italic shadow-xl">
          {anime.status.replace('_', ' ')}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-xl font-black uppercase tracking-tighter leading-none italic group-hover:text-netflix-red transition-colors">
            {anime.title}
          </h3>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star size={12} fill="currentColor"/>
            <span className="text-xs font-black">{anime.score || 'N/A'}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {anime.genres?.slice(0, 3).map(g => (
            <span key={g} className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">#{g}</span>
          ))}
        </div>

        {anime.notes && (
          <div className="relative pt-2">
            <Quote size={12} className="text-netflix-red mb-1 opacity-50"/>
            <p className="text-[10px] text-gray-400 leading-relaxed italic line-clamp-3 pl-4 border-l border-white/5">
              {anime.notes.replace(/[#*]/g, '')}
            </p>
          </div>
        )}

        <div className="pt-4 flex items-center justify-between border-t border-white/5 mt-4">
           <span className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest">
             {anime.studio || 'Studio Unknown'}
           </span>
           <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-netflix-red opacity-50" 
                style={{ width: `${(anime.episodes_watched / (anime.total_episodes || 1)) * 100}%` }}
              ></div>
           </div>
        </div>
      </div>
    </div>
  );
}