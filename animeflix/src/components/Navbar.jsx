import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Dices, RefreshCw, DownloadCloud, Sparkles } from 'lucide-react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';

export function Navbar({ onSearchSelect, onRandomClick, syncSeason }) {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const location = useLocation(); // Para saber en qué página estamos
  const { importFromMAL, repairADN, isSyncing } = useAnimeLibrary();

  // Búsqueda predictiva (Debounced a 500ms para no saturar la API)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length > 2) {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime?q=${search}&limit=5`);
          const data = await res.json();
          setSuggestions(data.data || []);
        } catch (e) {
          console.error("Error en búsqueda:", e);
        }
      } else {
        setSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Función para obtener imagen HD
  const getHDImage = (anime) => anime.images?.jpg?.large_image_url || anime.image_url;

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-white/5 px-6 md:px-12 py-4 flex items-center justify-between transition-all">
      <div className="flex items-center gap-8">
        {/* LOGO */}
        <h1 
          className="text-3xl font-black text-netflix-red tracking-tighter cursor-pointer italic hover:scale-105 transition" 
          onClick={() => window.scrollTo({top:0, behavior:'smooth'})}
        >
          ANIMEFLIX
        </h1>

        {/* NAVEGACIÓN DE RUTAS */}
        <div className="hidden md:flex items-center gap-6 ml-4 border-l border-white/10 pl-8">
          <Link 
            to="/" 
            className={`text-[11px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
          >
            Inicio
          </Link>
          <Link 
            to="/stats" 
            className={`text-[11px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/stats' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
          >
            Estadísticas
          </Link>
        </div>
        <Link 
            to="/tier-list" 
            className={`text-[11px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/tier-list' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
        >
            Tier List
        </Link>
        <Link 
          to="/wrapped" 
          className={`text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${location.pathname === '/wrapped' ? 'text-netflix-red' : 'text-gray-500 hover:text-white'}`}
        >
          <Sparkles size={14}/> Wrapped 2025
        </Link>

        {/* BOTONES DE ACCIÓN RÁPIDA */}
        <div className="hidden lg:flex items-center gap-4 ml-4">
          <button 
            onClick={onRandomClick} 
            className="text-[10px] font-bold uppercase tracking-widest hover:text-netflix-red transition flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10"
          >
            <Dices size={14} className="text-netflix-red"/> Random
          </button>
          <button 
            onClick={importFromMAL} 
            className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-white transition flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/> Sync MAL
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* HERRAMIENTAS TÉCNICAS */}
        <div className="flex items-center gap-4 border-r border-white/10 pr-6 mr-2">
           <button 
            onClick={repairADN} 
            className="text-gray-400 hover:text-netflix-red transition-colors" 
            title="Reparar ADN (Géneros)"
           >
             <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''}/>
           </button>
           <button 
            onClick={syncSeason} 
            className="text-gray-400 hover:text-white transition-colors" 
            title="Sincronizar Temporada Actual"
           >
             <DownloadCloud size={20}/>
           </button>
        </div>

        {/* BUSCADOR CON DROPDOWN */}
        <div className="relative">
          <input 
            className="bg-white/5 border border-white/10 py-2 px-6 pr-12 rounded-full text-xs focus:outline-none focus:border-netflix-red w-48 md:w-80 transition-all placeholder:text-gray-600" 
            placeholder="Buscar para añadir..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          <Search className="absolute right-5 top-2.5 text-gray-500" size={16} />
          
          {/* SUGERENCIAS PREDICTIVAS */}
          {suggestions.length > 0 && (
            <div className="absolute top-full mt-3 w-full bg-netflix-darkGray border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl z-[60] animate-in fade-in slide-in-from-top-2 duration-300">
              {suggestions.map(s => (
                <div 
                  key={s.mal_id} 
                  onClick={() => { 
                    onSearchSelect({
                      ...s,
                      image_url: getHDImage(s) // Nos aseguramos de pasar la imagen correcta
                    }); 
                    setSearch(''); 
                  }} 
                  className="flex items-center gap-4 p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                >
                  <img 
                    src={s.images?.jpg?.small_image_url} 
                    className="w-10 h-14 object-cover rounded-lg shadow-md" 
                    alt={s.title} 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black truncate uppercase text-white">{s.title}</p>
                    <p className="text-[9px] text-gray-500 uppercase font-bold mt-1">Añadir a mi lista</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}