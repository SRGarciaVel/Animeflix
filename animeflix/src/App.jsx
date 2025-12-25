import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  Search,
  Plus,
  Play,
  Info,
  CheckCircle2,
  X,
  Star,
  Calendar as CalendarIcon,
  Trash2,
  Clock,
  Tv,
  Sparkles,
  Hash,
  Edit3,
  ExternalLink,
  RotateCcw,
  Filter,
  Dices,
  Music,
  Trophy,
  DownloadCloud,
  RefreshCw,
} from "lucide-react";

const DAYS_ES = {
  sunday: "Dom",
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
};
const DAYS_EN = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function App() {
  // --- ESTADOS ---
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [myList, setMyList] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [themes, setThemes] = useState({ openings: [], endings: [] });
  const [recommendations, setRecommendations] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [selectedDay, setSelectedDay] = useState(DAYS_EN[new Date().getDay()]);
  const [seasonData, setSeasonData] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // --- EFECTOS ---
  useEffect(() => {
    fetchMyList();
    fetchSeasonCache();
  }, []);
  useEffect(() => {
    fetchCalendar(selectedDay);
  }, [selectedDay]);

  useEffect(() => {
    if (selectedAnime) fetchExtraData(selectedAnime.mal_id);
    else setThemes({ openings: [], endings: [] });
  }, [selectedAnime]);

  // Autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length > 2) {
        const res = await fetch(
          `https://api.jikan.moe/v4/anime?q=${search}&limit=5`
        );
        const data = await res.json();
        setSuggestions(data.data || []);
      } else {
        setSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // --- FUNCIONES DE DATOS ---
  const fetchMyList = async () => {
    const { data } = await supabase
      .from("anime_list")
      .select("*")
      .order("updated_at", { ascending: false });
    setMyList(data || []);
  };

  const fetchExtraData = async (id) => {
    try {
      const recRes = await fetch(
        `https://api.jikan.moe/v4/anime/${id}/recommendations`
      );
      const recData = await recRes.json();
      setRecommendations(recData.data?.slice(0, 6) || []);

      const themeRes = await fetch(
        `https://api.jikan.moe/v4/anime/${id}/themes`
      );
      const themeData = await themeRes.json();
      setThemes(themeData.data || { openings: [], endings: [] });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCalendar = async (day) => {
    const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${day}`);
    const data = await res.json();
    setCalendar(data.data || []);
  };

  const fetchSeasonCache = async () => {
    const { data } = await supabase.from("season_cache").select("*").limit(20);
    setSeasonData(data || []);
  };

  // --- FUNCIONES ESPECIALES ---
  const panicButton = () => {
    const available = myList.filter(
      (a) => a.status === "watching" || a.status === "plan_to_watch"
    );
    if (available.length === 0)
      return alert("Añade animes a tu lista primero.");
    const random = available[Math.floor(Math.random() * available.length)];
    setSelectedAnime(random);
  };

  const syncSeason = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("https://api.jikan.moe/v4/seasons/now");
      const data = await res.json();
      const formatted = data.data.map((a) => ({
        mal_id: a.mal_id,
        title: a.title,
        image_url: a.images.jpg.large_image_url,
        genres: a.genres.map((g) => g.name),
        episodes: a.episodes || 0,
      }));
      await supabase.from("season_cache").upsert(formatted);
      fetchSeasonCache();
      alert("Temporada actualizada localmente.");
    } catch (e) {
      console.error(e);
    }
    setIsSyncing(false);
  };

  const importFromMAL = async () => {
    const username = prompt("Tu usuario de MyAnimeList (Ej: _-ackerman):");
    if (!username) return;
    setIsSyncing(true);
    try {
      // ENDPOINT CORREGIDO PARA JIKAN V4
      const res = await fetch(
        `https://api.jikan.moe/v4/users/${encodeURIComponent(
          username
        )}/animelist?status=watching`
      );
      if (!res.ok)
        throw new Error(
          "No se pudo conectar con MAL. Verifica que tu perfil sea público."
        );
      const data = await res.json();

      const formatted = data.data.map((item) => ({
        mal_id: item.anime.mal_id,
        title: item.anime.title,
        image_url: item.anime.images.jpg.large_image_url,
        total_episodes: item.anime.episodes || 0,
        status: "watching",
        episodes_watched: item.episodes_watched || 0,
        score: item.score || 0,
        genres: [],
      }));

      const { error } = await supabase
        .from("anime_list")
        .upsert(formatted, { onConflict: "mal_id" });
      if (error) throw error;
      fetchMyList();
      alert(`Sincronización exitosa: ${formatted.length} animes importados.`);
    } catch (e) {
      alert(e.message);
    }
    setIsSyncing(false);
  };

  const repairLibrary = async () => {
    setIsSyncing(true);
    const broken = myList.filter((a) => !a.genres || a.genres.length === 0);
    alert(`Analizando géneros de ${broken.length} animes...`);
    for (const anime of broken) {
      try {
        const res = await fetch(
          `https://api.jikan.moe/v4/anime/${anime.mal_id}`
        );
        const data = await res.json();
        const genres = data.data.genres.map((g) => g.name);
        await supabase.from("anime_list").update({ genres }).eq("id", anime.id);
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        console.error(e);
      }
    }
    fetchMyList();
    setIsSyncing(false);
    alert("ADN Otaku actualizado.");
  };

  const addToLibrary = async (anime) => {
    const entry = anime.entry || anime;
    if (myList.some((item) => item.mal_id === entry.mal_id)) return;
    const genres = anime.genres
      ? Array.isArray(anime.genres)
        ? typeof anime.genres[0] === "string"
          ? anime.genres
          : anime.genres.map((g) => g.name)
        : []
      : [];

    const { error } = await supabase.from("anime_list").insert([
      {
        mal_id: entry.mal_id,
        title: entry.title,
        image_url: entry.images.jpg.large_image_url,
        total_episodes: anime.episodes || 0,
        status: "watching",
        episodes_watched: 0,
        score: 0,
        genres: genres,
      },
    ]);
    if (!error) {
      fetchMyList();
      setSearch("");
      setSuggestions([]);
    }
  };

  const updateProgress = async (id, updates) => {
    if (updates.episodes_watched !== undefined) {
      const max = selectedAnime.total_episodes || 9999;
      updates.episodes_watched = Math.max(
        0,
        Math.min(updates.episodes_watched, max)
      );
      if (max > 0 && updates.episodes_watched === max)
        updates.status = "completed";
    }
    const { error } = await supabase
      .from("anime_list")
      .update(updates)
      .eq("id", id);
    if (!error) {
      fetchMyList();
      setSelectedAnime((prev) => ({ ...prev, ...updates }));
    }
  };

  const deleteAnime = async (id) => {
    if (window.confirm("¿Eliminar de la lista?")) {
      await supabase.from("anime_list").delete().eq("id", id);
      fetchMyList();
      setSelectedAnime(null);
    }
  };

  // --- COMPUTED STATS ---
  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach((a) =>
      a.genres?.forEach((g) => (map[g] = (map[g] || 0) + 1))
    );
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [myList]);

  const achievements = useMemo(() => {
    const total = myList.reduce(
      (acc, curr) => acc + (curr.episodes_watched || 0),
      0
    );
    const badges = [];
    if (total > 500)
      badges.push({
        name: "Leyenda",
        icon: <Trophy className="text-yellow-500" />,
      });
    else if (total > 100)
      badges.push({
        name: "Maratonista",
        icon: <Trophy className="text-blue-400" />,
      });
    if (myList.filter((a) => a.status === "completed").length > 5)
      badges.push({ name: "Otaku", icon: <Tv className="text-green-400" /> });
    return badges;
  }, [myList]);

  const todayAirings = useMemo(() => {
    const watchingIds = myList
      .filter((a) => a.status === "watching")
      .map((a) => a.mal_id);
    return calendar.filter((c) => watchingIds.includes(c.mal_id));
  }, [calendar, myList]);

  return (
    <div className="min-h-screen bg-netflix-black text-white font-sans selection:bg-netflix-red pb-20 no-scrollbar">
      {/* NAVBAR REDISEÑADO (MODERNO & FUNCIONAL) */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-gradient-to-b from-black/95 via-black/80 to-transparent backdrop-blur-md border-b border-white/5 px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <h1
            className="text-4xl font-black text-netflix-red tracking-tighter cursor-pointer italic hover:scale-105 transition"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            ANIMEFLIX
          </h1>

          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={panicButton}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition"
            >
              <Dices size={14} className="text-netflix-red" /> Random
            </button>
            <button
              onClick={importFromMAL}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-netflix-red/10 hover:bg-netflix-red/20 px-4 py-2 rounded-full border border-netflix-red/20 text-netflix-red transition"
            >
              <RefreshCw
                size={14}
                className={isSyncing ? "animate-spin" : ""}
              />{" "}
              Sync MAL
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Herramientas Rápidas */}
          <div className="flex items-center gap-2 mr-4 border-r border-white/10 pr-6">
            <button
              onClick={repairLibrary}
              className="p-2 text-gray-400 hover:text-white transition"
              title="Reparar ADN"
            >
              <RefreshCw
                size={20}
                className={isSyncing ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={syncSeason}
              className="p-2 text-gray-400 hover:text-white transition"
              title="Bajar Temporada"
            >
              <DownloadCloud size={20} />
            </button>
          </div>

          {/* Buscador */}
          <div className="relative group">
            <input
              className="bg-black/60 border border-white/10 py-2 px-6 pr-12 rounded-full text-sm focus:outline-none focus:border-netflix-red w-64 md:w-80 transition-all shadow-inner"
              placeholder="Títulos, géneros..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search
              className="absolute right-5 top-2.5 text-gray-500"
              size={18}
            />

            {suggestions.length > 0 && (
              <div className="absolute top-full mt-3 w-full bg-netflix-darkGray/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                {suggestions.map((s) => (
                  <div
                    key={s.mal_id}
                    onClick={() => addToLibrary(s)}
                    className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition"
                  >
                    <img
                      src={s.images.jpg.small_image_url}
                      className="w-10 h-14 object-cover rounded-lg shadow-lg"
                    />
                    <div>
                      <p className="text-xs font-black truncate uppercase tracking-tighter">
                        {s.title}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Añadir a mi lista
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="pt-28 px-6 md:px-12 space-y-12">
        {/* NOTIFICACIONES DE HOY */}
        {todayAirings.length > 0 && (
          <div className="bg-netflix-red/10 border border-netflix-red/30 p-5 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top duration-700">
            <div className="bg-netflix-red p-3 rounded-full animate-pulse shadow-lg shadow-netflix-red/20">
              <Play fill="white" size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-netflix-red mb-1 italic">
                Estreno de hoy
              </p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {todayAirings.map((a) => (
                  <span
                    key={a.mal_id}
                    className="text-xs font-black bg-black/60 px-4 py-1.5 rounded-full whitespace-nowrap border border-white/5 uppercase italic"
                  >
                    {a.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD DE STATS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-netflix-darkGray/40 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-sm">
            <p className="text-[10px] font-black text-netflix-red uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles size={14} /> ADN Otaku
            </p>
            <div className="flex flex-wrap gap-2">
              {dnaStats.length > 0 ? (
                dnaStats.map(([g, c]) => (
                  <div
                    key={g}
                    className="bg-black/40 px-4 py-2 rounded-xl border border-white/5"
                  >
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      {g}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-[10px] italic text-gray-600">
                  Analiza tu lista para ver tu ADN.
                </span>
              )}
            </div>
          </div>
          <div className="bg-netflix-darkGray/40 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Trophy size={14} /> Logros
            </p>
            <div className="flex gap-4">
              {achievements.map((a) => (
                <div
                  key={a.name}
                  className="flex flex-col items-center gap-1 bg-black/40 p-3 rounded-2xl min-w-[90px] border border-white/5 transition hover:scale-105"
                >
                  {a.icon}{" "}
                  <span className="text-[9px] font-black uppercase tracking-tighter mt-1">
                    {a.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <StatCard
            label="Tiempo de visión"
            value={
              (
                (myList.reduce(
                  (acc, curr) => acc + (curr.episodes_watched || 0),
                  0
                ) *
                  23) /
                1440
              ).toFixed(1) + " Días"
            }
          />
        </section>

        {/* DESCUBRIMIENTOS TEMPORADA */}
        {seasonData.length > 0 && (
          <section className="animate-in fade-in duration-1000">
            <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-3 tracking-tighter">
              <Sparkles className="text-yellow-500" size={22} /> Discovery{" "}
              <span className="text-gray-600 text-xs font-normal uppercase tracking-widest">
                Temporada Actual
              </span>
            </h3>
            <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6 px-2">
              {seasonData.map((a) => (
                <div
                  key={a.mal_id}
                  onClick={() => addToLibrary(a)}
                  className="min-w-[170px] group cursor-pointer transition-all hover:scale-105"
                >
                  <div className="relative aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-netflix-darkGray">
                    <img
                      src={a.image_url}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-5">
                      <Plus
                        className="text-white opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"
                        size={28}
                      />
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] font-black truncate uppercase opacity-60 tracking-tighter">
                    {a.title}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* LISTA PERSONAL (ESTILO GRID MODERNO) */}
        <section>
          <div className="flex justify-between items-end mb-10">
            <h3 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-4">
              <div className="w-2.5 h-10 bg-netflix-red"></div> Tu Colección
            </h3>
            <div className="flex gap-2 bg-netflix-darkGray p-1.5 rounded-2xl border border-white/5 shadow-xl">
              {["all", "watching", "completed"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filterStatus === st
                      ? "bg-white text-black shadow-lg scale-105"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-12">
            {myList
              .filter(
                (a) => filterStatus === "all" || a.status === filterStatus
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedAnime(item)}
                >
                  <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 group-hover:scale-105 group-hover:shadow-netflix-red/20 group-hover:shadow-2xl">
                    <img
                      src={item.image_url}
                      className="w-full h-full object-cover group-hover:brightness-50 transition duration-700"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500">
                      <Play
                        fill="white"
                        size={48}
                        className="drop-shadow-2xl"
                      />
                    </div>
                    <div className="absolute bottom-0 w-full h-2 bg-black/80">
                      <div
                        className="h-full bg-netflix-red shadow-[0_0_20px_#E50914]"
                        style={{
                          width: `${
                            (item.episodes_watched /
                              (item.total_episodes || 1)) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-1 text-center md:text-left">
                    <h4 className="font-black text-[12px] truncate uppercase tracking-tighter opacity-80 group-hover:opacity-100 transition">
                      {item.title}
                    </h4>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">
                      Ep {item.episodes_watched} / {item.total_episodes || "?"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>

      {/* MODAL MAESTRO (INTEGRADO & DISEÑADO) */}
      {selectedAnime && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 blur-[100px] transition-all duration-1000 scale-110"
            style={{ backgroundImage: `url(${selectedAnime.image_url})` }}
          ></div>
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedAnime(null)}
          ></div>

          <div className="bg-netflix-darkGray/90 w-full max-w-6xl rounded-[4rem] overflow-hidden shadow-2xl relative border border-white/10 flex flex-col md:flex-row max-h-[90vh] z-10 no-scrollbar animate-in zoom-in duration-300">
            <button
              onClick={() => setSelectedAnime(null)}
              className="absolute top-10 right-10 z-10 bg-black/50 p-4 rounded-full hover:bg-white hover:text-black transition shadow-2xl active:scale-90"
            >
              <X size={24} />
            </button>

            {/* PANEL IZQUIERDO: Estética & Soundtracks */}
            <div className="w-full md:w-[400px] p-12 flex flex-col items-center overflow-y-auto no-scrollbar border-r border-white/5 bg-black/30">
              <img
                src={selectedAnime.image_url}
                className="w-full rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] mb-10 transform hover:scale-105 transition duration-700"
              />

              <div className="w-full space-y-6">
                <button
                  onClick={() =>
                    window.open(
                      `https://www.crunchyroll.com/search?q=${selectedAnime.title}`,
                      "_blank"
                    )
                  }
                  className="w-full bg-[#f47521] py-5 rounded-[2rem] font-black text-[11px] flex items-center justify-center gap-3 hover:scale-105 transition shadow-lg shadow-[#f47521]/20 uppercase tracking-widest"
                >
                  <ExternalLink size={20} /> Crunchyroll
                </button>

                <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5 space-y-5">
                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] text-center italic">
                    Soundtracks
                  </p>
                  {themes.openings?.slice(0, 1).map((op, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        window.open(
                          `https://www.youtube.com/results?search_query=${selectedAnime.title} opening`,
                          "_blank"
                        )
                      }
                      className="w-full bg-black/60 p-4 rounded-2xl text-[10px] font-bold flex items-center gap-3 hover:text-netflix-red transition-all border border-white/5 group"
                    >
                      <Music
                        size={16}
                        className="text-netflix-red group-hover:scale-110 transition"
                      />{" "}
                      {op.split('"')[1] || "Ver Opening"}
                    </button>
                  ))}
                  <div className="bg-black/60 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                    <span className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-2">
                      <RotateCcw size={16} /> Rewatches
                    </span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() =>
                          updateProgress(selectedAnime.id, {
                            rewatch_count:
                              (selectedAnime.rewatch_count || 0) + 1,
                          })
                        }
                        className="font-black text-netflix-red text-2xl hover:scale-125 transition"
                      >
                        +
                      </button>
                      <span className="text-base font-black italic">
                        {selectedAnime.rewatch_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL DERECHO: Progreso & Notas */}
            <div className="flex-1 p-12 md:p-20 overflow-y-auto no-scrollbar space-y-16">
              <header>
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-netflix-red text-[10px] font-black px-3 py-1 rounded-full uppercase italic">
                    Original Animeflix
                  </span>
                </div>
                <h2 className="text-6xl font-black italic uppercase leading-none mb-8 tracking-tighter">
                  {selectedAnime.title}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {selectedAnime.genres?.map((g) => (
                    <span
                      key={g}
                      className="text-[10px] font-black uppercase bg-white/5 text-gray-400 px-4 py-1.5 rounded-full border border-white/10"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </header>

              <div className="bg-black/40 p-12 rounded-[3.5rem] border border-white/5 shadow-2xl">
                <div className="flex justify-between items-end mb-10">
                  <div>
                    <p className="text-[11px] font-black text-netflix-red uppercase italic mb-2 tracking-widest">
                      Estado de visión
                    </p>
                    <h3 className="text-6xl font-black italic tracking-tighter">
                      EP {selectedAnime.episodes_watched}
                      <span className="text-gray-700 text-3xl font-light ml-2">
                        /{" "}
                        {selectedAnime.total_episodes === 0
                          ? "EMISIÓN"
                          : selectedAnime.total_episodes}
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 bg-black/60 px-5 py-3 rounded-2xl border border-white/10 shadow-inner">
                    <Star
                      size={20}
                      className="text-yellow-500 fill-yellow-500"
                    />
                    <input
                      type="number"
                      max="10"
                      value={selectedAnime.score}
                      onChange={(e) =>
                        updateProgress(selectedAnime.id, {
                          score: parseInt(e.target.value),
                        })
                      }
                      className="bg-transparent w-10 font-black text-2xl text-center outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <button
                    onClick={() =>
                      updateProgress(selectedAnime.id, {
                        episodes_watched: selectedAnime.episodes_watched + 1,
                      })
                    }
                    className="bg-white text-black py-5 rounded-[2rem] font-black text-xs hover:bg-gray-200 hover:scale-105 transition-all shadow-xl"
                  >
                    +1 Episodio
                  </button>
                  <button
                    onClick={() =>
                      updateProgress(selectedAnime.id, {
                        episodes_watched: selectedAnime.episodes_watched + 12,
                      })
                    }
                    className="bg-gray-800 text-white py-5 rounded-[2rem] font-black text-xs hover:bg-gray-700 hover:scale-105 transition-all shadow-xl"
                  >
                    +1 Temporada
                  </button>
                </div>

                <div className="relative mt-6">
                  <Hash
                    className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600"
                    size={20}
                  />
                  <input
                    type="number"
                    placeholder="Ir a capítulo exacto..."
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 text-center font-black text-lg outline-none focus:border-netflix-red transition-all shadow-inner"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateProgress(selectedAnime.id, {
                          episodes_watched: parseInt(e.target.value),
                        });
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                <p className="text-[11px] font-black text-gray-500 uppercase mb-6 flex items-center gap-3 tracking-[0.3em]">
                  <Edit3 size={18} /> Notas Privadas
                </p>
                <textarea
                  className="w-full bg-transparent border-none text-sm font-medium focus:ring-0 resize-none no-scrollbar h-40 leading-relaxed"
                  placeholder="Escribe tus teorías o pensamientos sobre la serie aquí..."
                  value={selectedAnime.notes || ""}
                  onChange={(e) =>
                    updateProgress(selectedAnime.id, { notes: e.target.value })
                  }
                />
              </div>

              <button
                onClick={() => deleteAnime(selectedAnime.id)}
                className="w-full text-[11px] font-black text-red-500/20 hover:text-red-500 transition-all uppercase tracking-[0.4em] py-14 italic"
              >
                Remover Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-netflix-darkGray/40 p-8 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-sm flex flex-col justify-center transition hover:border-white/10">
      <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">
        {label}
      </p>
      <h4 className="text-5xl font-black text-white italic leading-none tracking-tighter">
        {value}
      </h4>
    </div>
  );
}

export default App;
