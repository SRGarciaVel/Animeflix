import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search,
  Dices,
  RefreshCw,
  DownloadCloud,
  Sparkles,
  CheckCircle2,
  BellRing,
  LogIn,
  User,
  LogOut,
  CloudDownload,
  ChevronDown,
  LayoutGrid,
  TrendingUp,
  Award,
  History,
  CalendarDays,
  Newspaper,
  Library
} from "lucide-react";
import { useAnimeLibrary } from "../hooks/useAnimeLibrary";
import { useMALAuth } from "../hooks/useMALAuth";
import { supabase } from "../supabaseClient";
import { toast } from "sonner";

export function Navbar({ onSearchSelect, onRandomClick, syncSeason, user }) {
  const { malSession, repairADN, importFromMAL, isRepairing, isSyncing } = useAnimeLibrary();
  const { login, logout } = useMALAuth();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const location = useLocation();

  const handleMALLogin = () => login();
  const handleMALLogout = () => logout();

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

  const getHDImage = (anime) => anime.images?.jpg?.large_image_url || anime.image_url;
  const displayName = user?.user_metadata?.display_name || "Agente";

  // Componente interno para los items del Dropdown
  const DropdownItem = ({ to, icon: Icon, label, active, color = "text-gray-400" }) => (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all group/item ${active ? 'bg-white/5 border-l-2 border-netflix-red' : ''}`}
    >
      <Icon size={16} className={`${active ? 'text-netflix-red' : color} group-hover/item:scale-110 transition-transform`} />
      <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-gray-500 group-hover:text-gray-200'}`}>
        {label}
      </span>
    </Link>
  );

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-6 md:px-12 py-3 flex items-center justify-between transition-all duration-500">
      <div className="flex items-center gap-10">
        {/* LOGO */}
        <h1 
          className="text-3xl font-black text-netflix-red tracking-tighter cursor-pointer italic hover:scale-105 transition-transform" 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ANIMEFLIX
        </h1>

        {/* 🛡️ NAVEGACIÓN AGRUPADA */}
        {user && (
          <div className="hidden xl:flex items-center gap-2 animate-in fade-in slide-in-from-left duration-700">
            
            <Link to="/" className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${location.pathname === "/" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white hover:bg-white/5"}`}>
              Inicio
            </Link>

            <Link to="/news" className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${location.pathname === "/news" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white hover:bg-white/5"}`}>
              Noticias
            </Link>

            {/* DROPDOWN: TU PROGRESO */}
            <div className="relative group">
              <button className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${["/stats", "/ranking-history", "/achievements", "/wrapped"].includes(location.pathname) ? "text-netflix-red" : "text-gray-500 hover:text-white"}`}>
                Tu Progreso <ChevronDown size={12} className="group-hover:rotate-180 transition-transform"/>
              </button>
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 backdrop-blur-3xl">
                <DropdownItem to="/stats" icon={TrendingUp} label="Análisis ADN" active={location.pathname === "/stats"} />
                <DropdownItem to="/ranking-history" icon={History} label="Evolución" active={location.pathname === "/ranking-history"} />
                <DropdownItem to="/achievements" icon={Award} label="Logros" active={location.pathname === "/achievements"} />
                <DropdownItem to="/wrapped" icon={Sparkles} label="Wrapped 2025" active={location.pathname === "/wrapped"} color="text-netflix-red" />
              </div>
            </div>

            {/* DROPDOWN: ORGANIZADOR */}
            <div className="relative group">
              <button className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${["/tier-list", "/diary", "/calendar"].includes(location.pathname) ? "text-netflix-red" : "text-gray-500 hover:text-white"}`}>
                Organizador <ChevronDown size={12} className="group-hover:rotate-180 transition-transform"/>
              </button>
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 backdrop-blur-3xl">
                <DropdownItem to="/tier-list" icon={Library} label="Tier List" active={location.pathname === "/tier-list"} />
                <DropdownItem to="/diary" icon={Newspaper} label="Diario de Visionado" active={location.pathname === "/diary"} />
                <DropdownItem to="/calendar" icon={CalendarDays} label="Calendario Semanal" active={location.pathname === "/calendar"} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-500">
            
            {/* BOTONES TÉCNICOS COMPACTOS */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 mr-2">
              <button onClick={onRandomClick} className="p-2 text-gray-500 hover:text-netflix-red transition-colors" title="Random"><Dices size={18} /></button>
              <button 
                onClick={() => repairADN()} 
                className={`p-2 transition-all ${isRepairing ? "text-netflix-red" : "text-gray-500 hover:text-white"}`}
                title="Reparar ADN"
              >
                <RefreshCw size={18} className={isRepairing ? "animate-spin" : ""}/>
              </button>
            </div>

            {/* SYNC MAL STATUS */}
            <div className="flex items-center gap-2">
              {malSession ? (
                <button 
                  onClick={importFromMAL} 
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 text-[9px] font-black uppercase border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all shadow-lg"
                >
                  <CloudDownload size={14} className={isSyncing ? "animate-bounce" : ""}/> Sync
                </button>
              ) : (
                <button onClick={handleMALLogin} className="px-4 py-2 rounded-xl bg-white/5 text-gray-500 text-[9px] font-black uppercase border border-white/10 hover:border-blue-500/50 hover:text-blue-400 transition-all italic">Conectar MAL</button>
              )}
            </div>

            {/* BUSCADOR ESTILIZADO */}
            <div className="relative group hidden lg:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-netflix-red transition-colors" size={14} />
              <input 
                className="bg-black/40 border border-white/5 py-2 pl-10 pr-4 rounded-full text-[10px] font-bold focus:border-netflix-red/50 focus:bg-black/60 outline-none w-48 transition-all" 
                placeholder="Añadir..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-72 right-0 bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[60] backdrop-blur-3xl">
                  {suggestions.map((s) => (
                    <div key={s.mal_id} onClick={() => { onSearchSelect({ ...s, image_url: s.images.jpg.large_image_url }); setSearch(""); }} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5">
                      <img src={s.images.jpg.small_image_url} className="w-8 h-10 object-cover rounded shadow-md" alt="" />
                      <p className="text-[10px] font-bold truncate uppercase text-white">{s.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PERFIL */}
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-white uppercase italic leading-none">{displayName}</p>
                <button onClick={() => handleMALLogout()} className="text-[7px] font-bold text-gray-500 hover:text-netflix-red transition-colors uppercase tracking-widest mt-1 italic">MAL Link</button>
              </div>
              <button 
                onClick={() => supabase.auth.signOut()} 
                className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-gray-400 hover:bg-netflix-red hover:text-white hover:border-transparent transition-all active:scale-95 group"
                title="Cerrar Sesión de Animeflix"
              >
                <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        ) : (
          /* --- VISTA: INVITADO --- */
          <div className="flex items-center gap-6 animate-in fade-in duration-1000">
            <Link to="/auth" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Entrar</Link>
            <Link to="/auth" className="bg-white text-black px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-netflix-red hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95">Registrarme</Link>
          </div>
        )}
      </div>
    </nav>
  );
}