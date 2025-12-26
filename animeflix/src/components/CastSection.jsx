import React, { useState, useEffect } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { User, Link2 } from 'lucide-react';
import { toast } from 'sonner';

export function CastSection({ animeId, accentColor }) {
  const { myList } = useAnimeLibrary();
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCast = async () => {
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/characters`);
        const data = await res.json();
        const mainCast = data.data
          ?.filter(char => char.role === "Main")
          ?.map(char => ({
            character: char.character,
            actor: char.voice_actors.find(va => va.language === "Japanese")
          }))
          .slice(0, 6);
        setCast(mainCast || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (animeId) fetchCast();
  }, [animeId]);

  // FUNCIÓN PARA BUSCAR CONEXIONES EN TU BIBLIOTECA
  const checkConnections = async (actor) => {
    if (!actor) return;
    toast.info(`Buscando otras interpretaciones de ${actor.person.name}...`);
    
    try {
      const res = await fetch(`https://api.jikan.moe/v4/people/${actor.person.mal_id}/anime`);
      const data = await res.json();
      const roles = data.data || [];
      
      // Filtramos cuáles de esos animes están en tu lista personal
      const connections = roles.filter(role => 
        myList.some(myAnime => myAnime.mal_id === role.anime.mal_id && myAnime.mal_id !== animeId)
      );

      if (connections.length > 0) {
        const names = connections.map(c => c.anime.title).join(', ');
        toast.success(`¡Conexión hallada! También aparece en: ${names}`, { duration: 5000 });
      } else {
        toast.info(`${actor.person.name} no aparece en otras series de tu lista.`);
      }
    } catch (e) { toast.error("No se pudo verificar la conexión."); }
  };

  if (loading) return <div className="animate-pulse flex gap-6 mt-4"><div className="w-16 h-16 bg-white/5 rounded-full"></div><div className="w-16 h-16 bg-white/5 rounded-full"></div></div>;
  if (cast.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase text-gray-500 tracking-[0.3em] italic">Cast & Seiyuus</h3>
        <span className="text-[8px] font-bold text-gray-600 uppercase italic">Haz clic para buscar conexiones</span>
      </div>
      <div className="flex gap-8 overflow-x-auto no-scrollbar pb-2">
        {cast.map((item, idx) => (
          <div 
            key={idx} 
            className="flex flex-col items-center min-w-[90px] group cursor-pointer"
            onClick={() => checkConnections(item.actor)}
          >
            <div className="relative w-20 h-20 mb-3">
              <img 
                src={item.actor?.person.images.jpg.image_url} 
                className="w-full h-full object-cover rounded-full border-2 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 shadow-2xl" 
                style={{ borderColor: accentColor + '44' }}
                alt=""
              />
              <div className="absolute -top-1 -right-1 bg-netflix-red p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Link2 size={10} className="text-white"/>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-black overflow-hidden shadow-xl">
                <img src={item.character.images.jpg.image_url} className="w-full h-full object-cover" alt="" />
              </div>
            </div>
            <p className="text-[10px] font-black text-white text-center uppercase tracking-tighter leading-tight italic">{item.actor?.person.name}</p>
            <p className="text-[8px] text-gray-500 text-center uppercase font-bold mt-1 italic line-clamp-1">
              {item.character.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}