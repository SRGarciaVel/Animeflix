import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  Search, Plus, Play, Info, CheckCircle2, X, Star, 
  Calendar as CalendarIcon, Trash2, Clock, Tv, Sparkles, Hash, 
  Edit3, ExternalLink, RotateCcw, Filter, Dices, Music, Trophy, DownloadCloud, RefreshCw
} from 'lucide-react';

const DAYS_ES = { sunday: "Dom", monday: "Lun", tuesday: "Mar", wednesday: "Mié", thursday: "Jue", friday: "Vie", saturday: "Sáb" };
const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function App() {
  // --- ESTADOS ---
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [myList, setMyList] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [themes, setThemes] = useState({ openings: [], endings: [] });
  const [recommendations, setRecommendations] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [selectedDay, setSelectedDay] = useState(DAYS_EN[new Date().getDay()]);
  const [seasonData, setSeasonData] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // --- EFECTOS ---
  useEffect(() => { fetchMyList(); fetchSeasonCache(); }, []);
  useEffect(() => { fetchCalendar(selectedDay); }, [selectedDay]);

  useEffect(() => {
    if (selectedAnime) fetchExtraData(selectedAnime.mal_id);
    else setThemes({ openings: [], endings: [] });
  }, [selectedAnime]);

  // Autocomplete (Jikan sigue sirviendo para esto)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length > 2) {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${search}&limit=5`);
        const data = await res.json();
        setSuggestions(data.data || []);
      } else { setSuggestions([]); }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // --- FUNCIONES DE DATOS ---
  const fetchMyList = async () => {
    const { data } = await supabase.from('anime_list').select('*').order('updated_at', { ascending: false });
    setMyList(data || []);
  };

  const fetchExtraData = async (id) => {
    try {
      const recRes = await fetch(`https://api.jikan.moe/v4/anime/${id}/recommendations`);
      const recData = await recRes.json();
      setRecommendations(recData.data?.slice(0, 6) || []);

      const themeRes = await fetch(`https://api.jikan.moe/v4/anime/${id}/themes`);
      const themeData = await themeRes.json();
      setThemes(themeData.data || { openings: [], endings: [] });
    } catch (e) { console.error(e); }
  };

  const fetchCalendar = async (day) => {
    const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${day}`);
    const data = await res.json();
    setCalendar(data.data || []);
  };

  const fetchSeasonCache = async () => {
    const { data } = await supabase.from('season_cache').select('*').limit(20);
    setSeasonData(data || []);
  };

  // --- NUEVA FUNCIÓN: SYNC CON API OFICIAL MAL ---
  const importFromMAL = async () => {
    const username = prompt("Introduce tu nombre de usuario de MAL:");
    if (!username) return;
    setIsSyncing(true);

    const clientID = import.meta.env.VITE_MAL_CLIENT_ID;
    // Usamos allorigins para saltar el CORS de MyAnimeList
    const malUrl = `https://api.myanimelist.net/v2/users/${username}/animelist?limit=100&fields=list_status,num_episodes,genres&status=watching`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(malUrl)}`;

    try {
      const res = await fetch(proxyUrl);
      const json = await res.json();
      // allorigins devuelve el resultado en json.contents como string
      const data = JSON.parse(json.contents);

      if (!data.data) throw new Error("No se encontraron datos. ¿Tu lista es pública?");

      const formatted = data.data.map(item => ({
        mal_id: item.node.id,
        title: item.node.title,
        image_url: item.node.main_picture.large,
        total_episodes: item.node.num_episodes || 0,
        status: item.list_status.status,
        episodes_watched: item.list_status.num_episodes_watched || 0,
        score: item.list_status.score || 0,
        genres: item.node.genres ? item.node.genres.map(g => g.name) : []
      }));

      const { error } = await supabase.from('anime_list').upsert(formatted, { onConflict: 'mal_id' });
      if (error) throw error;

      alert(`¡Sincronizado! ${formatted.length} títulos añadidos/actualizados.`);
      fetchMyList();
    } catch (e) {
      alert("Error al conectar con MAL API: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const panicButton = () => {
    const available = myList.filter(a => a.status === 'watching' || a.status === 'plan_to_watch');
    if (available.length === 0) return alert("Lista vacía.");
    const random = available[Math.floor(Math.random() * available.length)];
    setSelectedAnime(random);
  };

  const syncSeason = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('https://api.jikan.moe/v4/seasons/now');
      const data = await res.json();
      const formatted = data.data.map(a => ({
        mal_id: a.mal_id, title: a.title, image_url: a.images.jpg.large_image_url,
        genres: a.genres.map(g => g.name), episodes: a.episodes || 0
      }));
      await supabase.from('season_cache').upsert(formatted);
      fetchSeasonCache();
    } catch (e) { console.error(e); }
    setIsSyncing(false);
  };

  const updateProgress = async (id, updates) => {
    if (updates.episodes_watched !== undefined) {
      const max = selectedAnime.total_episodes || 9999; 
      updates.episodes_watched = Math.max(0, Math.min(updates.episodes_watched, max));
    }
    const { error } = await supabase.from('anime_list').update(updates).eq('id', id);
    if (!error) { fetchMyList(); setSelectedAnime(prev => ({ ...prev, ...updates })); }
  };

  const deleteAnime = async (id) => {
    if (window.confirm("¿Eliminar?")) {
      await supabase.from('anime_list').delete().eq('id', id);
      fetchMyList(); setSelectedAnime(null);
    }
  };

  // --- COMPUTED ---
  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach(a => a.genres?.forEach(g => map[g] = (map[g] || 0) + 1));
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 3);
  }, [myList]);

  const achievements = useMemo(() => {
    const total = myList.reduce((acc, curr) => acc + (curr.episodes_watched || 0), 0);
    const badges = [];
    if (total > 500) badges.push({ name: "Leyenda", icon: <Trophy className="text-yellow-500" /> });
    if (myList.filter(a => a.status === 'completed').length > 5) badges.push({ name: "Otaku", icon: <Tv className="text-green-400" /> });
    return badges;
  }, [myList]);

  const todayAirings = useMemo(() => {
    const watchingIds = myList.filter(a => a.status === 'watching').map(a => a.mal_id);
    return calendar.filter(c => watchingIds.includes(c.mal_id));
  }, [calendar, myList]);

  return (
    <div className="min-h-screen bg-netflix-black text-white font-sans selection:bg-netflix-red pb-20 no-scrollbar">
      
      {/* NAVBAR MEJORADA (ESTILO PREMIUM) */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-black/80 backdrop-blur-xl border-b border-white/5 px-8 md:px-16 py-5 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <h1 className="text-4xl font-black text-netflix-red tracking-tighter cursor-pointer italic hover:scale-105 transition" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            ANIMEFLIX
          </h1>
          
          <div className="hidden lg:flex items-center gap-6">
            <button onClick={panicButton} className="group flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] hover:text-netflix-red transition">
              <Dices size={18} className="group-hover:rotate-12 transition-transform"/> Random
            </button>
            <button onClick={importFromMAL} className="group flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-blue-400 hover:text-blue-300 transition">
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''}/> Sync MAL
            </button>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 text-gray-400 border-r border-white/10 pr-8">
             <button onClick={syncSeason} className="hover:text-white transition" title="Actualizar temporada"><DownloadCloud size={22}/></button>
          </div>

          <div className="relative group">
            <input 
              className="bg-white/5 border border-white/10 py-2.5 px-6 pr-12 rounded-full text-sm focus:outline-none focus:bg-white/10 focus:border-netflix-red w-64 md:w-96 transition-all" 
              placeholder="Buscar para añadir..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            <Search className="absolute right-5 top-3 text-gray-500" size={18} />
            
            {suggestions.length > 0 && (
              <div className="absolute top-full mt-4 w-full bg-netflix-darkGray/95 border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                {suggestions.map(s => (
                  <div key={s.mal_id} onClick={() => addToLibrary(s)} className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition">
                    <img src={s.images.jpg.small_image_url} className="w-10 h-14 object-cover rounded-md" />
                    <div>
                      <p className="text-[11px] font-black truncate uppercase tracking-tighter">{s.title}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Añadir</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* RESTO DEL CONTENIDO (IGUAL QUE ANTES PERO CON ESPACIADO CORREGIDO) */}
      <div className="pt-32 px-8 md:px-16 space-y-16">
        
        {/* NOTIFICACIÓN DE ESTRENO */}
        {todayAirings.length > 0 && (
          <div className="bg-gradient-to-r from-netflix-red/20 to-transparent border-l-4 border-netflix-red p-6 rounded-r-3xl animate-in slide-in-from-left duration-700">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-netflix-red mb-2">¡Novedades hoy!</p>
            <div className="flex gap-4 overflow-x-auto no-scrollbar">
              {todayAirings.map(a => <span key={a.mal_id} className="text-sm font-black bg-black/40 px-5 py-2 rounded-full border border-white/5 whitespace-nowrap italic uppercase">{a.title}</span>)}
            </div>
          </div>
        )}

        {/* DASHBOARD STATS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-sm">
            <p className="text-[11px] font-black text-netflix-red uppercase tracking-widest mb-4">ADN Otaku</p>
            <div className="flex flex-wrap gap-2">
              {dnaStats.map(([g, c]) => (
                <div key={g} className="bg-black/40 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter border border-white/5">{g}</div>
              ))}
              {dnaStats.length === 0 && <p className="text-xs text-gray-600 italic">Importa de MAL para ver tu ADN.</p>}
            </div>
          </div>
          <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-sm">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">Achievements</p>
            <div className="flex gap-4">
              {achievements.map(a => (
                <div key={a.name} className="bg-black/40 p-3 rounded-2xl flex flex-col items-center gap-1 min-w-[80px]">
                  {a.icon} <span className="text-[9px] font-black uppercase tracking-tighter">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-sm flex flex-col justify-center text-center">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Tiempo Total</p>
            <h4 className="text-5xl font-black italic tracking-tighter leading-none">
              {((myList.reduce((acc, curr) => acc + (curr.episodes_watched || 0), 0) * 23) / 1440).toFixed(1)} <span className="text-xl font-light">DÍAS</span>
            </h4>
          </div>
        </section>

        {/* MI LISTA (ESTILO GRID) */}
        <section>
          <div className="flex justify-between items-end mb-12">
            <h3 className="text-3xl font-black italic uppercase tracking-tighter">Tu Biblioteca</h3>
            <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl">
              {['all', 'watching', 'completed'].map(st => (
                <button key={st} onClick={() => setFilterStatus(st)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === st ? 'bg-white text-black shadow-lg' : 'text-gray-500'}`}>
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-10">
            {myList.filter(a => filterStatus === 'all' || a.status === filterStatus).map(item => (
              <div key={item.id} className="group cursor-pointer" onClick={() => setSelectedAnime(item)}>
                <div className="relative aspect-[2/3] rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 group-hover:scale-105">
                  <img src={item.image_url} className="w-full h-full object-cover group-hover:brightness-50 transition duration-700" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500">
                    <Play fill="white" size={48} />
                  </div>
                  <div className="absolute bottom-0 w-full h-2 bg-black/80">
                    <div className="h-full bg-netflix-red shadow-[0_0_20px_#E50914]" style={{ width: `${(item.episodes_watched / (item.total_episodes || 1)) * 100}%` }}></div>
                  </div>
                </div>
                <div className="mt-6 space-y-1">
                  <h4 className="font-black text-[13px] truncate uppercase tracking-tighter opacity-80 group-hover:opacity-100 transition">{item.title}</h4>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Ep {item.episodes_watched} / {item.total_episodes || '?'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* MODAL MAESTRO */}
      {selectedAnime && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 blur-[100px] transition-all duration-1000 scale-110"
            style={{ backgroundImage: `url(${selectedAnime.image_url})` }}
          ></div>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedAnime(null)}></div>
          
          <div className="bg-netflix-darkGray/90 w-full max-w-6xl rounded-[4rem] overflow-hidden shadow-2xl relative border border-white/10 flex flex-col md:flex-row max-h-[90vh] z-10 no-scrollbar animate-in zoom-in duration-300">
            <button onClick={() => setSelectedAnime(null)} className="absolute top-10 right-10 z-10 bg-black/50 p-4 rounded-full hover:bg-white hover:text-black transition shadow-2xl active:scale-90"><X size={24}/></button>
            
            <div className="w-full md:w-[450px] p-12 flex flex-col items-center overflow-y-auto no-scrollbar border-r border-white/5 bg-black/20">
              <img src={selectedAnime.image_url} className="w-full rounded-[3.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)] mb-12 transform hover:scale-105 transition duration-700" />
              
              <div className="w-full space-y-6">
                <button onClick={() => window.open(`https://www.crunchyroll.com/search?q=${selectedAnime.title}`, '_blank')} className="w-full bg-[#f47521] py-5 rounded-[2.5rem] font-black text-[12px] flex items-center justify-center gap-3 hover:scale-105 transition shadow-lg shadow-[#f47521]/20 uppercase tracking-widest">
                   <ExternalLink size={20}/> Crunchyroll
                </button>
                
                <div className="bg-black/40 p-8 rounded-[3rem] border border-white/5 space-y-6">
                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] text-center italic">Temas Musicales</p>
                  {themes.openings?.slice(0, 1).map((op, i) => (
                    <button key={i} onClick={() => window.open(`https://www.youtube.com/results?search_query=${selectedAnime.title} opening`, '_blank')} className="w-full bg-black/60 p-5 rounded-2xl text-[10px] font-bold flex items-center gap-4 hover:text-netflix-red transition-all border border-white/5">
                      <Music size={18} className="text-netflix-red"/> {op.split('"')[1] || "Ver Opening"}
                    </button>
                  ))}
                  <div className="bg-black/60 p-5 rounded-2xl flex items-center justify-between border border-white/5">
                    <span className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-3"><RotateCcw size={18}/> Rewatches</span>
                    <div className="flex items-center gap-5">
                      <button onClick={() => updateProgress(selectedAnime.id, { rewatch_count: (selectedAnime.rewatch_count || 0) + 1 })} className="font-black text-netflix-red text-3xl hover:scale-125 transition">+</button>
                      <span className="text-lg font-black italic">{selectedAnime.rewatch_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-12 md:p-20 overflow-y-auto no-scrollbar space-y-16">
              <header>
                <div className="flex items-center gap-4 mb-6">
                   <span className="bg-netflix-red text-[10px] font-black px-4 py-1.5 rounded-full uppercase italic tracking-widest">Original Animeflix</span>
                </div>
                <h2 className="text-7xl font-black italic uppercase leading-none mb-10 tracking-tighter">{selectedAnime.title}</h2>
                <div className="flex flex-wrap gap-3">
                  {selectedAnime.genres?.map(g => (
                    <span key={g} className="text-[11px] font-black uppercase bg-white/5 text-gray-400 px-5 py-2 rounded-full border border-white/10">{g}</span>
                  ))}
                </div>
              </header>

              <div className="bg-black/40 p-12 rounded-[4rem] border border-white/5 shadow-2xl">
                <div className="flex justify-between items-end mb-12">
                  <div>
                    <p className="text-[11px] font-black text-netflix-red uppercase italic mb-3 tracking-widest">Estado Actual</p>
                    <h3 className="text-7xl font-black italic tracking-tighter leading-none">
                      EP {selectedAnime.episodes_watched} 
                      <span className="text-gray-700 text-3xl font-light ml-4 italic"> 
                        / {selectedAnime.total_episodes === 0 ? 'ON AIR' : selectedAnime.total_episodes}
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 bg-black/60 px-6 py-4 rounded-3xl border border-white/10 shadow-inner transition hover:border-yellow-500/50">
                    <Star size={24} className="text-yellow-500 fill-yellow-500"/>
                    <input type="number" max="10" value={selectedAnime.score} onChange={(e) => updateProgress(selectedAnime.id, { score: parseInt(e.target.value) })} className="bg-transparent w-12 font-black text-3xl text-center outline-none" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <button onClick={() => updateProgress(selectedAnime.id, { episodes_watched: selectedAnime.episodes_watched + 1 })} className="bg-white text-black py-6 rounded-[2.5rem] font-black text-xs hover:bg-gray-200 hover:scale-105 transition-all shadow-xl uppercase tracking-widest">+1 Episodio</button>
                  <button onClick={() => updateProgress(selectedAnime.id, { episodes_watched: selectedAnime.episodes_watched + 12 })} className="bg-gray-800 text-white py-6 rounded-[2.5rem] font-black text-xs hover:bg-gray-700 hover:scale-105 transition-all shadow-xl uppercase tracking-widest">+1 Temporada</button>
                </div>
                
                <div className="relative mt-8 group">
                  <Hash className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-netflix-red transition" size={24}/>
                  <input type="number" placeholder="Ir a episodio exacto..." className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] py-6 text-center font-black text-xl outline-none focus:border-netflix-red transition-all shadow-inner" onKeyDown={(e) => { if (e.key === 'Enter') { updateProgress(selectedAnime.id, { episodes_watched: parseInt(e.target.value) }); e.target.value = ''; }}} />
                </div>
              </div>

              <div className="bg-black/40 p-12 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col">
                <p className="text-[11px] font-black text-gray-500 uppercase mb-8 flex items-center gap-4 tracking-[0.4em] italic"><Edit3 size={20}/> Diario Personal</p>
                <textarea className="w-full flex-1 bg-transparent border-none text-base font-medium focus:ring-0 resize-none no-scrollbar h-48 leading-relaxed" placeholder="Anota tus impresiones o teorías sobre este anime..." value={selectedAnime.notes || ''} onChange={(e) => updateProgress(selectedAnime.id, { notes: e.target.value })} />
              </div>
              
              <button onClick={() => deleteAnime(selectedAnime.id)} className="w-full text-[11px] font-black text-red-500/10 hover:text-red-500 transition-all uppercase tracking-[0.5em] py-16 italic">Eliminar del Catálogo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white/5 p-8 rounded-[3.5rem] border border-white/5 shadow-2xl backdrop-blur-sm flex flex-col justify-center transition hover:border-white/10 group">
      <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3 group-hover:text-netflix-red transition">{label}</p>
      <h4 className="text-6xl font-black text-white italic leading-none tracking-tighter">{value}</h4>
    </div>
  );
}

export default App;