import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Dices, RefreshCw, DownloadCloud, Sparkles, CheckCircle2, BellRing } from 'lucide-react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

export function Navbar({ onSearchSelect, onRandomClick, syncSeason }) {
  const { malSession, repairADN, checkForNewEpisodes, importFromMAL } = useAnimeLibrary();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const location = useLocation();

  const handleMALLogin = () => {
    const clientId = import.meta.env.VITE_MAL_CLIENT_ID;
    const redirectUri = 'http://localhost:5173/mal-callback';
    const verifier = Array.from(crypto.getRandomValues(new Uint8Array(43))).map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[b % 66]).join("");
    localStorage.setItem('mal_code_verifier', verifier);
    const authUrl = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${clientId}&code_challenge=${verifier}&code_challenge_method=plain&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  };

  const handleMALLogout = async () => {
    await supabase.from('mal_auth').delete().neq('id', '00000000-0000-0000-0000-000000000001');
    toast.success("Cuenta desconectada");
    window.location.reload();
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length > 2) {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime?q=${search}&limit=5`);
          const data = await res.json();
          setSuggestions(data.data || []);
        } catch (e) { console.error(e); }
      } else { setSuggestions([]); }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-white/5 px-6 md:px-12 py-4 flex items-center justify-between transition-all">
      <div className="flex items-center gap-8">
        <h1 className="text-3xl font-black text-netflix-red tracking-tighter cursor-pointer italic" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>ANIMEFLIX</h1>
        <div className="hidden md:flex items-center gap-6 ml-4 border-l border-white/10 pl-8">
          <Link to="/" className={`text-[11px] font-black uppercase transition-colors ${location.pathname === '/' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>Inicio</Link>
          <Link to="/stats" className={`text-[11px] font-black uppercase transition-colors ${location.pathname === '/stats' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>Estadísticas</Link>
          <Link to="/tier-list" className={`text-[11px] font-black uppercase transition-colors ${location.pathname === '/tier-list' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>Tier List</Link>
          <Link to="/ranking-history" className={`text-[11px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/ranking-history' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>Evolución</Link>
          <Link to="/achievements" className={`text-[11px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/achievements' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>Logros</Link>
          <Link to="/calendar" className={`text-[11px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/calendar' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>Calendario</Link>
          <Link to="/wrapped" className={`text-[11px] font-black uppercase transition-colors flex items-center gap-2 ${location.pathname === '/wrapped' ? 'text-netflix-red' : 'text-gray-500 hover:text-white'}`}><Sparkles size={14}/> Wrapped</Link>
          
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={onRandomClick} className="p-2 text-gray-400 hover:text-netflix-red"><Dices size={20}/></button>
        <button onClick={checkForNewEpisodes} className="p-2 text-gray-400 hover:text-yellow-400 relative group">
          <BellRing size={20}/>
          <span className="absolute top-1 right-1 h-2 w-2 bg-yellow-500 rounded-full animate-ping"></span>
        </button>
        <button onClick={repairADN} className="p-2 text-gray-400 hover:text-white"><RefreshCw size={20}/></button>
        
        {malSession ? (
          <button onClick={handleMALLogout} className="text-[9px] font-black text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">MAL ON</button>
        ) : (
          <button onClick={handleMALLogin} className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">MAL OFF</button>
        )}

        <div className="relative">
          <input className="bg-white/5 border border-white/10 py-2 px-6 rounded-full text-xs focus:border-netflix-red outline-none w-40 md:w-64" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {suggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-netflix-darkGray border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[60]">
              {suggestions.map(s => (
                <div key={s.mal_id} onClick={() => { onSearchSelect({...s, image_url: s.images.jpg.large_image_url}); setSearch(''); }} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0">
                  <img src={s.images.jpg.small_image_url} className="w-8 h-10 object-cover rounded" />
                  <p className="text-[10px] font-bold truncate uppercase">{s.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}