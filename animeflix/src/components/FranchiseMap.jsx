import React, { useState, useEffect, useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { 
  GitMerge, Plus, CheckCircle2, Film, ExternalLink, 
  Loader2, BookOpen, Monitor, Trophy, Star, Bookmark 
} from 'lucide-react';

// Componente para una entrada individual con jerarquía de título mejorada
function FranchiseEntry({ item, inList, myMatch, onAdd }) {
  const [extraInfo, setExtraInfo] = useState(null);
  const isAnime = item.type === 'anime';

  useEffect(() => {
    if (!inList && isAnime) {
      const fetchPreview = async () => {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${item.mal_id}`);
          const { data } = await res.json();
          setExtraInfo(data);
        } catch (e) { console.error(e); }
      };
      const timeout = setTimeout(fetchPreview, Math.random() * 2000);
      return () => clearTimeout(timeout);
    }
  }, [inList, isAnime, item.mal_id]);

  const displayImage = inList ? myMatch.image_url : extraInfo?.images?.jpg?.large_image_url;

  return (
    <div className={`flex items-center justify-between p-5 rounded-[2.5rem] border transition-all duration-500 group ${
      inList ? 'bg-netflix-red/5 border-netflix-red/20 shadow-lg' : 'bg-white/[0.02] border-white/5 hover:bg-white/10'
    }`}>
      <div className="flex items-center gap-5 flex-1 min-w-0">
        {/* IMAGEN DE LA OBRA */}
        <div className="w-16 h-24 rounded-2xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/5 relative shadow-2xl transition-transform group-hover:scale-105 duration-500">
          {displayImage ? (
            <img src={displayImage} className="w-full h-full object-cover animate-in fade-in duration-1000" alt={item.name} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-800">
               {isAnime ? <Monitor size={28}/> : <BookOpen size={28}/>}
            </div>
          )}
          {inList && (
            <div className="absolute inset-0 bg-netflix-red/40 flex items-center justify-center backdrop-blur-[2px]">
               <CheckCircle2 size={24} className="text-white drop-shadow-lg"/>
            </div>
          )}
        </div>

        {/* INFORMACIÓN DETALLADA: TÍTULO + METADATA */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* TÍTULO PRINCIPAL (Resaltado) */}
          <h4 className={`text-sm font-black uppercase tracking-tighter leading-tight italic line-clamp-2 ${inList ? 'text-white' : 'text-gray-300 group-hover:text-white transition-colors'}`}>
            {item.name || item.title}
          </h4>

          {/* FILA DE METADATA */}
          <div className="flex flex-wrap items-center gap-3">
             {/* ETIQUETA DE FORMATO */}
             <span className={`flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-full border ${isAnime ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'} uppercase italic`}>
               {isAnime ? <Monitor size={10}/> : <BookOpen size={10}/>}
               {item.type}
             </span>

             {/* PUNTUACIÓN DE MAL */}
             {(extraInfo?.score || inList) && (
               <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/5 px-2 py-0.5 rounded-full border border-yellow-500/20">
                 <Star size={10} fill="currentColor"/>
                 <span className="text-[10px] font-black italic">{inList ? (myMatch.mal_score || 'N/A') : extraInfo?.score}</span>
               </div>
             )}

             {/* ESTADO EN TU LISTA */}
             {inList && (
               <span className="text-[8px] font-black text-netflix-red uppercase tracking-widest bg-netflix-red/10 px-2 py-0.5 rounded-full animate-pulse">
                 En Colección
               </span>
             )}
          </div>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="flex items-center gap-3 ml-6">
        {isAnime && !inList && (
          <button 
            onClick={() => onAdd(item.mal_id)} 
            className="bg-white text-black p-2.5 rounded-full hover:bg-netflix-red hover:text-white transition-all shadow-xl active:scale-90 group-hover:rotate-90 duration-500"
            title="Añadir a mi biblioteca"
          >
            <Plus size={20} />
          </button>
        )}
        <button 
          onClick={() => window.open(item.url, '_blank')} 
          className="p-2.5 rounded-full bg-white/5 text-gray-500 hover:text-white transition-all hover:bg-white/10"
          title="Ver en MyAnimeList"
        >
          <ExternalLink size={18}/>
        </button>
      </div>
    </div>
  );
}

export function FranchiseMap({ animeId, accentColor }) {
  const { myList, addToLibrary } = useAnimeLibrary();
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelations = async () => {
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/relations`);
        const data = await res.json();
        setRelations(data.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (animeId) fetchRelations();
  }, [animeId]);

  // Lógica de Maestría (Calculada sobre animes)
  const masteryStats = useMemo(() => {
    if (relations.length === 0) return null;
    let totalAnimes = 0;
    let ownedAnimes = 0;

    relations.forEach(rel => {
      rel.entry.forEach(item => {
        if (item.type === 'anime') {
          totalAnimes++;
          if (myList.some(m => Number(m.mal_id) === Number(item.mal_id))) {
            ownedAnimes++;
          }
        }
      });
    });

    return {
      percent: totalAnimes > 0 ? Math.round((ownedAnimes / totalAnimes) * 100) : 0,
      owned: ownedAnimes,
      total: totalAnimes
    };
  }, [relations, myList]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-5">
      <Loader2 className="animate-spin text-netflix-red" size={48} />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600 animate-pulse italic">Mapeando Multiverso...</p>
    </div>
  );

  if (relations.length === 0) return (
    <div className="text-center py-24 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
      <Info className="mx-auto mb-4 text-gray-700" size={32}/>
      <p className="opacity-40 italic text-sm font-medium">No se encontraron conexiones para esta obra.</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-16">
      
      {/* PANEL DE MAESTRÍA */}
      {masteryStats && masteryStats.total > 0 && (
        <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group backdrop-blur-xl">
           <div className="absolute -right-12 -top-12 opacity-10 group-hover:rotate-12 transition-transform duration-1000 group-hover:scale-110">
              <Trophy size={200} style={{ color: accentColor }}/>
           </div>
           <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Análisis de Franquicia</p>
                   <h4 className="text-6xl font-black italic uppercase tracking-tighter leading-none">
                     {masteryStats.percent}% <span className="text-base font-light text-gray-400 tracking-normal ml-3">Completado</span>
                   </h4>
                </div>
                <div className="text-right">
                   <p className="text-[11px] font-black text-white/70 uppercase italic leading-none tracking-widest">
                     {masteryStats.owned} / {masteryStats.total}
                   </p>
                   <p className="text-[8px] font-bold text-netflix-red uppercase tracking-widest mt-2 italic">Series detectadas</p>
                </div>
              </div>
              <div className="h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                 <div 
                  className="h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${masteryStats.percent}%`, backgroundColor: accentColor, boxShadow: `0 0 20px ${accentColor}` }}
                 ></div>
              </div>
           </div>
        </div>
      )}

      {/* BLOQUES DE RELACIONES */}
      <div className="space-y-16">
        {relations.map((rel, idx) => (
          <div key={idx} className="relative">
            <div className="flex items-center gap-6 mb-8">
               <div className="w-2.5 h-2.5 rounded-full bg-netflix-red shadow-[0_0_15px_#E50914]"></div>
               <h4 className="text-[12px] font-black text-white uppercase tracking-[0.5em] italic opacity-100">
                 {rel.relation}
               </h4>
               <div className="flex-1 h-[1px] bg-gradient-to-r from-white/20 to-transparent"></div>
            </div>

            <div className="grid gap-5 ml-8">
              {rel.entry.map(item => (
                <FranchiseEntry 
                  key={item.mal_id}
                  item={item}
                  inList={myList.some(m => Number(m.mal_id) === Number(item.mal_id))}
                  myMatch={myList.find(m => Number(m.mal_id) === Number(item.mal_id))}
                  onAdd={addToLibrary}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}