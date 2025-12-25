import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  Search, Plus, Play, Info, CheckCircle2, X, Star, 
  Calendar as CalendarIcon, Trash2, Clock, Tv, Sparkles, Hash, 
  Edit3, ExternalLink, RotateCcw, Filter, Dices, Music, Trophy, DownloadCloud, RefreshCw, BrainCircuit
} from 'lucide-react';

const DAYS_ES = { sunday: "Dom", monday: "Lun", tuesday: "Mar", wednesday: "Mié", thursday: "Jue", friday: "Vie", saturday: "Sáb" };
const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Mapeo de estados de MAL a nuestro sistema en Español
const STATUS_MAP = { 1: 'watching', 2: 'completed', 3: 'on_hold', 4: 'dropped', 6: 'plan_to_watch' };
const STATUS_LABELS = {
  all: 'Todos',
  watching: 'Viendo',
  completed: 'Completados',
  on_hold: 'En espera',
  dropped: 'Abandonados',
  plan_to_watch: 'Por ver'
};

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

  // Buscador Predictivo
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
    const { data } = await supabase.from('season_cache').select('*');
    setSeasonData(data || []);
  };

  const getHDImage = (url) => {
    if (!url) return '';
    return url.replace(/\/r\/\d+x\d+/, '').replace(/\/v\/\d+x\d+/, '').split('?')[0];
  };

  // --- FUNCIONES ESPECIALES ---
  const importFromMAL = async () => {
    const username = prompt("Usuario de MyAnimeList:", "_-ackerman");
    if (!username) return;
    setIsSyncing(true);
    let allData = [];
    let offset = 0;
    try {
      while (true) {
        const malUrl = `https://myanimelist.net/animelist/${username}/load.json?offset=${offset}&status=7`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(malUrl)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < 300) break;
        offset += 300;
      }

      const formatted = allData.map(item => ({
        mal_id: item.anime_id,
        title: item.anime_title,
        image_url: getHDImage(item.anime_image_path),
        total_episodes: item.anime_num_episodes || 0,
        status: STATUS_MAP[item.status] || 'watching',
        episodes_watched: item.num_watched_episodes || 0,
        score: item.score || 0,
        genres: [] 
      }));

      await supabase.from('anime_list').upsert(formatted, { onConflict: 'mal_id' });
      fetchMyList();
      alert(`Sincronización completa: ${formatted.length} animes importados.`);
    } catch (e) { alert("Error: " + e.message); }
    finally { setIsSyncing(false); }
  };

  const repairLibrary = async () => {
    setIsSyncing(true);
    const broken = myList.filter(a => !a.genres || a.genres.length === 0);
    alert(`Analizando géneros de ${broken.length} series para tu ADN...`);
    for (const anime of broken) {
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}`);
        const data = await res.json();
        await supabase.from('anime_list').update({ genres: data.data.genres.map(g => g.name) }).eq('id', anime.id);
        await new Promise(r => setTimeout(r, 1300)); 
      } catch (e) { console.error(e); }
    }
    fetchMyList();
    setIsSyncing(false);
    alert("ADN Actualizado.");
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
      alert("Catálogo de temporada actualizado.");
    } catch (e) { console.error(e); }
    setIsSyncing(false);
  };

  const updateProgress = async (id, updates) => {
    if (updates.episodes_watched !== undefined) {
      const max = selectedAnime.total_episodes || 9999; 
      updates.episodes_watched = Math.max(0, Math.min(updates.episodes_watched, max));
      if (max > 0 && updates.episodes_watched === max) updates.status = 'completed';
    }
    const { error } = await supabase.from('anime_list').update(updates).eq('id', id);
    if (!error) { fetchMyList(); setSelectedAnime(prev => ({ ...prev, ...updates })); }
  };

  const deleteAnime = async (id) => {
    if (window.confirm("¿Remover de tu lista?")) {
      await supabase.from('anime_list').delete().eq('id', id);
      fetchMyList(); setSelectedAnime(null);
    }
  };

  const addToLibrary = async (anime) => {
    const entry = anime.entry || anime;
    if (myList.some(item => item.mal_id === entry.mal_id)) return;
    const genres = anime.genres ? (Array.isArray(anime.genres) ? (typeof anime.genres[0] === 'string' ? anime.genres : anime.genres.map(g => g.name)) : []) : [];
    const { error } = await supabase.from('anime_list').insert([{
      mal_id: entry.mal_id, title: entry.title, image_url: entry.images.jpg.large_image_url,
      total_episodes: anime.episodes || 0, status: 'watching', episodes_watched: 0, 
      score: 0, genres: genres
    }]);
    if (!error) { fetchMyList(); setSearch(''); setSuggestions([]); }
  };

  // --- IA & STATS ---
  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach(a => a.genres?.forEach(g => map[g] = (map[g] || 0) + 1));
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 3);
  }, [myList]);

  // LÓGICA DE RECOMENDACIÓN IA
  const aiRecommendations = useMemo(() => {
    if (dnaStats.length === 0 || seasonData.length === 0) return [];
    const topGenres = dnaStats.map(s => s[0]);
    return seasonData
      .filter(a => !myList.some(m => m.mal_id === a.mal_id)) // Que no esté en mi lista
      .filter(a => a.genres?.some(g => topGenres.includes(g))) // Que coincida con mi ADN
      .slice(0, 6);
  }, [dnaStats, seasonData, myList]);

  const achievements = useMemo(() => {
    const total = myList.reduce((acc, curr) => acc + (curr.episodes_watched || 0), 0);
    const badges = [];
    if (total > 500) badges.push({ name: "Leyenda", icon: <Trophy size={16} className="text-yellow-500" /> });
    if (myList.filter(a => a.status === 'completed').length > 10) badges.push({ name: "Maestro", icon: <Tv size={16} className="text-green-400" /> });
    return badges;
  }, [myList]);

  const todayAirings = useMemo(() => {
    const watchingIds = myList.filter(a => a.status === 'watching').map(a => a.mal_id);
    return calendar.filter(c => watchingIds.includes(c.mal_id));
  }, [calendar, myList]);

  return (
    <div className="min-h-screen bg-netflix-black text-white font-sans selection:bg-netflix-red pb-20 no-scrollbar">
      
      {/* NAVBAR REFINADA */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-white/5 px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-3xl font-black text-netflix-red tracking-tighter cursor-pointer italic" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>ANIMEFLIX</h1>
          <div className="hidden lg:flex items-center gap-4">
            <button onClick={() => setSelectedAnime(myList[Math.floor(Math.random()*myList.length)])} className="text-[10px] font-bold uppercase tracking-widest hover:text-netflix-red transition flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full"><Dices size={14}/> Random</button>
            <button onClick={importFromMAL} className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-white transition flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/> Sync MAL</button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-white/10 pr-6 mr-2">
             <button onClick={repairLibrary} className="text-gray-400 hover:text-netflix-red transition" title="Reparar ADN"><RefreshCw size={20}/></button>
             <button onClick={syncSeason} className="text-gray-400 hover:text-white transition" title="Actualizar Temporada"><DownloadCloud size={20}/></button>
          </div>
          <div className="relative">
            <input className="bg-white/5 border border-white/10 py-2 px-6 pr-12 rounded-full text-xs focus:outline-none focus:border-netflix-red w-48 md:w-80" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Search className="absolute right-5 top-2.5 text-gray-500" size={16} />
            {suggestions.length > 0 && (
              <div className="absolute top-full mt-3 w-full bg-netflix-darkGray border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl z-50">
                {suggestions.map(s => (
                  <div key={s.mal_id} onClick={() => addToLibrary(s)} className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5">
                    <img src={s.images.jpg.small_image_url} className="w-10 h-14 object-cover rounded-lg" />
                    <p className="text-[10px] font-bold truncate uppercase">{s.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="pt-24 px-6 md:px-12 space-y-12">
        
        {/* NOTIFICACIONES */}
        {todayAirings.length > 0 && (
          <div className="bg-netflix-red/10 border-l-4 border-netflix-red p-4 rounded-r-2xl flex items-center gap-4 animate-in slide-in-from-top">
            <div className="bg-netflix-red p-2 rounded-full animate-pulse"><Play fill="white" size={14}/></div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[9px] font-black uppercase tracking-widest text-netflix-red">¡Hoy sale episodio!</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {todayAirings.map(a => <span key={a.mal_id} className="text-[10px] font-bold bg-black/40 px-3 py-1 rounded-full whitespace-nowrap border border-white/5 italic">{a.title}</span>)}
              </div>
            </div>
          </div>
        )}

        {/* STATS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 shadow-xl">
            <p className="text-[10px] font-black text-netflix-red uppercase mb-4 flex items-center gap-2"><Sparkles size={14}/> ADN Otaku</p>
            <div className="flex flex-wrap gap-2">
              {dnaStats.map(([g, c]) => (
                <div key={g} className="bg-black/40 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border border-white/5">{g}</div>
              ))}
              {dnaStats.length === 0 && <p className="text-[10px] italic opacity-40 italic">Usa "Sync MAL" y "Reparar" arriba.</p>}
            </div>
          </div>
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 shadow-xl">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center gap-2"><Trophy size={14}/> Logros</p>
            <div className="flex gap-3">
              {achievements.map(a => (
                <div key={a.name} className="flex flex-col items-center gap-1 bg-black/40 p-3 rounded-2xl min-w-[70px] border border-white/5">
                  {a.icon} <span className="text-[8px] font-black uppercase">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
          <StatCard label="Días Consumidos" value={((myList.reduce((acc, curr) => acc + (curr.episodes_watched || 0), 0) * 23) / 1440).toFixed(1)} />
        </section>

        {/* IA RECOMENDACIONES (BASADO EN ADN) */}
        {aiRecommendations.length > 0 && (
          <section className="animate-in fade-in duration-1000">
            <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-3"><BrainCircuit className="text-netflix-red" size={24}/> Recomendado para ti (IA)</h3>
            <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6">
              {aiRecommendations.map(a => (
                <div key={a.mal_id} onClick={() => addToLibrary(a)} className="min-w-[170px] group cursor-pointer">
                  <div className="relative aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-netflix-darkGray">
                    <img src={a.image_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black flex items-end p-4"><Plus className="opacity-0 group-hover:opacity-100 transition" /></div>
                  </div>
                  <p className="mt-2 text-[10px] font-black truncate uppercase opacity-50">{a.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* BIBLIOTECA CON TODOS LOS FILTROS */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            <h3 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4"><div className="w-2 h-10 bg-netflix-red"></div> Tu Biblioteca</h3>
            <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-2xl border border-white/5 shadow-xl">
              {Object.keys(STATUS_LABELS).map(st => (
                <button key={st} onClick={() => setFilterStatus(st)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === st ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-500 hover:text-white'}`}>
                  {STATUS_LABELS[st]}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {myList.filter(a => filterStatus === 'all' || a.status === filterStatus).map(item => (
              <div key={item.id} className="group cursor-pointer" onClick={() => setSelectedAnime(item)}>
                <div className="relative aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 group-hover:scale-105">
                  <img src={item.image_url} className="w-full h-full object-cover group-hover:brightness-50 transition duration-1000" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500"><Play fill="white" size={40}/></div>
                  <div className="absolute bottom-0 w-full h-1.5 bg-black/80">
                    <div className="h-full bg-netflix-red shadow-[0_0_20px_#E50914]" style={{ width: `${(item.episodes_watched / (item.total_episodes || 1)) * 100}%` }}></div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h4 className="font-bold text-[11px] truncate uppercase tracking-tighter opacity-80 group-hover:opacity-100 transition">{item.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* MODAL MAESTRO REFINADO */}
      {selectedAnime && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-[80px] scale-110" style={{ backgroundImage: `url(${selectedAnime.image_url})` }}></div>
          <div className="absolute inset-0 bg-black/80" onClick={() => setSelectedAnime(null)}></div>
          
          <div className="bg-netflix-darkGray w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-white/10 flex flex-col md:flex-row max-h-[92vh] z-10 no-scrollbar">
            <button onClick={() => setSelectedAnime(null)} className="absolute top-8 right-8 z-10 bg-black/50 p-3 rounded-full hover:bg-white hover:text-black transition"><X size={20}/></button>
            
            <div className="w-full md:w-[350px] p-10 flex flex-col items-center overflow-y-auto no-scrollbar border-r border-white/5 bg-black/20">
              <img src={selectedAnime.image_url} className="w-56 rounded-3xl shadow-2xl mb-8 transform hover:scale-105 transition duration-700" />
              <div className="w-full space-y-4">
                <button onClick={() => window.open(`https://www.crunchyroll.com/search?q=${selectedAnime.title}`, '_blank')} className="w-full bg-[#f47521] py-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-3 hover:scale-105 transition shadow-lg uppercase tracking-widest">
                   <ExternalLink size={18}/> Crunchyroll
                </button>
                <div className="bg-black/40 p-6 rounded-3xl border border-white/5 space-y-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase text-center italic">Soundtracks</p>
                  {themes.openings?.slice(0, 1).map((op, i) => (
                    <button key={i} onClick={() => window.open(`https://www.youtube.com/results?search_query=${selectedAnime.title} opening`, '_blank')} className="w-full bg-black/60 p-4 rounded-xl text-[9px] font-bold flex items-center gap-3 hover:text-netflix-red transition border border-white/5">
                      <Music size={16} className="text-netflix-red"/> Ver Opening
                    </button>
                  ))}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-[9px] font-black uppercase text-gray-400">Rewatches</span>
                    <div className="flex items-center gap-4">
                      <button onClick={() => updateProgress(selectedAnime.id, { rewatch_count: (selectedAnime.rewatch_count || 0) + 1 })} className="font-black text-netflix-red text-2xl">+</button>
                      <span className="text-sm font-black italic">{selectedAnime.rewatch_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-12 md:p-16 overflow-y-auto no-scrollbar space-y-12">
              <header>
                <h2 className="text-5xl font-black italic uppercase leading-none mb-8 tracking-tighter drop-shadow-xl">{selectedAnime.title}</h2>
                <div className="flex flex-wrap gap-2">
                  {selectedAnime.genres?.map(g => (
                    <span key={g} className="text-[10px] font-black uppercase bg-netflix-red/10 text-netflix-red px-3 py-1 rounded-full border border-netflix-red/20">{g}</span>
                  ))}
                </div>
              </header>

              <div className="bg-black/40 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex justify-between items-end mb-10">
                  <div>
                    <p className="text-[10px] font-black text-netflix-red uppercase italic mb-2 tracking-widest">Tu Progreso</p>
                    <h3 className="text-6xl font-black italic tracking-tighter">
                      EP {selectedAnime.episodes_watched} 
                      <span className="text-gray-700 text-2xl font-light ml-3 italic"> 
                        / {selectedAnime.total_episodes === 0 ? 'EMISIÓN' : selectedAnime.total_episodes}
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 bg-black/60 px-5 py-3 rounded-2xl border border-white/10 shadow-inner group hover:border-yellow-500/50 transition">
                    <Star size={24} className="text-yellow-500 fill-yellow-500 group-hover:scale-110 transition"/>
                    <input type="number" max="10" value={selectedAnime.score} onChange={(e) => updateProgress(selectedAnime.id, { score: parseInt(e.target.value) })} className="bg-transparent w-10 font-black text-2xl text-center outline-none" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => updateProgress(selectedAnime.id, { episodes_watched: selectedAnime.episodes_watched + 1 })} className="bg-white text-black py-4 rounded-2xl font-black text-xs hover:bg-gray-200 transition shadow-lg">+1 EPISODIO</button>
                  <button onClick={() => updateProgress(selectedAnime.id, { episodes_watched: selectedAnime.episodes_watched + 12 })} className="bg-gray-800 text-white py-4 rounded-2xl font-black text-xs hover:bg-gray-700 transition shadow-lg">+1 TEMPORADA</button>
                </div>
                
                <div className="relative mt-6 group">
                  <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-netflix-red transition" size={20}/>
                  <input type="number" placeholder="Capítulo exacto..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 text-center font-black text-xl outline-none focus:border-netflix-red transition shadow-inner" onKeyDown={(e) => { if (e.key === 'Enter') { updateProgress(selectedAnime.id, { episodes_watched: parseInt(e.target.value) }); e.target.value = ''; }}} />
                </div>
              </div>

              <div className="bg-black/40 p-10 rounded-3xl border border-white/5 flex flex-col h-48">
                <p className="text-[11px] font-black text-gray-500 uppercase mb-4 flex items-center gap-3 tracking-[0.4em] italic"><Edit3 size={18}/> Notas Privadas</p>
                <textarea className="w-full flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 resize-none no-scrollbar italic leading-relaxed" placeholder="Escribe tus impresiones..." value={selectedAnime.notes || ''} onChange={(e) => updateProgress(selectedAnime.id, { notes: e.target.value })} />
              </div>
              
              <button onClick={() => deleteAnime(selectedAnime.id)} className="w-full text-[10px] font-black text-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest py-10 italic">Remover del catálogo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-xl backdrop-blur-md flex flex-col justify-center transition hover:border-white/10 group text-center">
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 group-hover:text-netflix-red transition italic">{label}</p>
      <h4 className="text-5xl font-black text-white italic leading-none tracking-tighter">{value}</h4>
    </div>
  );
}

export default App;