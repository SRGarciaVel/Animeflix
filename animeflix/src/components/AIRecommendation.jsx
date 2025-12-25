import React from 'react';
import { BrainCircuit, Plus, Sparkles } from 'lucide-react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';

export function AIRecommendation({ seasonData, dnaStats, onSelect }) {
  const { myList, upsertAnime } = useAnimeLibrary();

  // Lógica avanzada de Matching
  const recommendations = React.useMemo(() => {
    if (!dnaStats.length || !seasonData.length) return [];

    const topGenres = dnaStats.map(s => s[0]);
    
    return seasonData
      .filter(anime => !myList.some(m => m.mal_id === anime.mal_id)) // Solo lo que no tengo
      .map(anime => {
        const matches = anime.genres?.filter(g => topGenres.includes(g)).length || 0;
        const score = (matches / topGenres.length) * 100;
        return { ...anime, matchScore: Math.round(score) };
      })
      .filter(a => a.matchScore > 30) // Solo si coincide más de un 30%
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 4);
  }, [dnaStats, seasonData, myList]);

  if (recommendations.length === 0) return null;

  return (
    <section className="animate-in fade-in slide-in-from-left duration-1000">
      <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-3 tracking-tighter">
        <BrainCircuit className="text-netflix-red animate-pulse" size={24}/> 
        IA: Recomendaciones de Temporada
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {recommendations.map(anime => (
          <div 
            key={anime.mal_id} 
            onClick={() => onSelect(anime)}
            className="bg-white/5 p-5 rounded-[2rem] border border-white/5 group cursor-pointer hover:bg-white/10 transition relative overflow-hidden"
          >
            <div className="flex gap-4 items-center">
              <div className="relative">
                <img src={anime.image_url} className="w-20 h-28 object-cover rounded-2xl shadow-2xl" />
                <div className="absolute -top-2 -right-2 bg-netflix-red text-[8px] font-black px-2 py-1 rounded-full shadow-lg">
                  {anime.matchScore}% MATCH
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Basado en tu ADN</p>
                <h4 className="text-xs font-bold truncate uppercase leading-tight text-white group-hover:text-netflix-red transition">
                  {anime.title}
                </h4>
                <div className="flex flex-wrap gap-1 mt-3">
                   {anime.genres?.slice(0, 2).map(g => (
                     <span key={g} className="text-[7px] border border-white/10 px-1.5 py-0.5 rounded-full text-gray-400">{g}</span>
                   ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}