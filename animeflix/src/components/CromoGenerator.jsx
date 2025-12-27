import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { Download, Star, Share2, Sparkles } from 'lucide-react';

export function CromoGenerator({ anime, accentColor, onClose }) {
  const cardRef = useRef(null);

  const handleDownload = () => {
    if (cardRef.current === null) return;
    toPng(cardRef.current, { cacheBust: true })
      .then((dataUrl) => {
        download(dataUrl, `cromo-${anime.title}.png`);
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="flex flex-col items-center gap-8">
        
        {/* LA TARJETA (Lo que se convertirá en imagen) */}
        <div 
          ref={cardRef}
          className="w-[350px] aspect-[2/3] relative rounded-[3rem] overflow-hidden bg-netflix-darkGray shadow-2xl border-4"
          style={{ borderColor: accentColor }}
        >
          <img src={anime.image_url} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          
          <div className="absolute inset-x-0 bottom-0 p-8 space-y-4 text-center">
            <div className="flex justify-center mb-2">
               <span className="bg-netflix-red text-[8px] font-black px-2 py-1 rounded-full uppercase italic tracking-widest">Animeflix Original</span>
            </div>
            <h3 className="text-2xl font-black italic uppercase leading-none tracking-tighter text-white drop-shadow-lg">{anime.title}</h3>
            
            <div className="flex justify-center gap-4 py-2 border-y border-white/10">
               <div className="text-center">
                  <p className="text-[8px] font-bold text-gray-500 uppercase">Tu Nota</p>
                  <div className="flex items-center gap-1 text-yellow-500"><Star size={12} fill="currentColor"/> <span className="text-sm font-black">{anime.score}/10</span></div>
               </div>
               <div className="text-center">
                  <p className="text-[8px] font-bold text-gray-500 uppercase">Episodios</p>
                  <p className="text-sm font-black text-white">{anime.episodes_watched} / {anime.total_episodes || '?'}</p>
               </div>
            </div>

            <p className="text-[9px] text-gray-300 italic line-clamp-3 leading-relaxed">
              "{anime.notes || 'Sin reseña personal...'}"
            </p>
            
            <div className="pt-4 flex justify-center gap-2">
               {anime.genres?.slice(0, 2).map(g => (
                 <span key={g} className="text-[7px] font-black uppercase bg-white/10 px-2 py-1 rounded-lg">{g}</span>
               ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
           <button onClick={handleDownload} className="bg-netflix-red px-8 py-3 rounded-full font-black text-xs flex items-center gap-3 hover:scale-105 transition shadow-2xl">
              <Download size={18}/> Descargar Cromo
           </button>
           <button onClick={onClose} className="bg-white/5 px-8 py-3 rounded-full font-black text-xs border border-white/10 hover:bg-white/10 transition">
              Cerrar
           </button>
        </div>
      </div>
    </div>
  );
}