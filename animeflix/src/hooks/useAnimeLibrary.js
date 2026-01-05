import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import PQueue from 'p-queue';
import { toast } from 'sonner';

// Configuración de cola para Jikan (evitar error 429 - 1 petición cada 1.3s)
const queue = new PQueue({ concurrency: 1, interval: 1300, intervalCap: 1 });

const STATUS_MAP = { 1: 'watching', 2: 'completed', 3: 'on_hold', 4: 'dropped', 6: 'plan_to_watch' };
const MAL_STATUS_MAP = { 'watching': 'watching', 'completed': 'completed', 'on_hold': 'on_hold', 'dropped': 'dropped', 'plan_to_watch': 'plan_to_watch' };

export function useAnimeLibrary() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [repairProgress, setRepairProgress] = useState(0); // 📊 Estado para la barra de la Navbar

  // 1. OBTENER LISTA PERSONAL (RLS filtra automáticamente por usuario)
  const { data: myList = [], isLoading } = useQuery({
    queryKey: ['animeList'],
    queryFn: async () => {
      const { data, error } = await supabase.from('anime_list').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // 2. OBTENER SESIÓN DE MAL (Token del usuario actual)
  const { data: malSession } = useQuery({
    queryKey: ['malSession'],
    queryFn: async () => {
      const { data } = await supabase.from('mal_auth').select('*').maybeSingle();
      return data;
    }
  });

  // 3. OBTENER HISTORIALES Y CACHÉ
  const { data: seasonData = [] } = useQuery({ queryKey: ['seasonCache'], queryFn: async () => {
    const { data } = await supabase.from('season_cache').select('*'); return data || [];
  }});

  const { data: history = [] } = useQuery({ queryKey: ['animeHistory'], queryFn: async () => {
    const { data } = await supabase.from('anime_history').select('*').order('created_at', { ascending: false }).limit(30);
    return data || [];
  }});

  const { data: tierHistory = [] } = useQuery({ queryKey: ['tierHistory'], queryFn: async () => {
    const { data } = await supabase.from('tier_history').select('*').order('created_at', { ascending: false }).limit(20);
    return data || [];
  }});

  // UTILIDAD: Extracción de ID de Youtube
  const extractYTId = (trailer) => {
    if (!trailer) return null;
    if (trailer.youtube_id) return trailer.youtube_id;
    if (trailer.embed_url) {
      const match = trailer.embed_url.match(/\/embed\/([^?]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  // 4. MUTACIÓN MAESTRA (LOCAL + MAL + HISTORIALES)
  const upsertMutation = useMutation({
    mutationFn: async (animeData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada");

      const cleanData = {
        id: animeData.id,
        mal_id: Number(animeData.mal_id),
        user_id: user.id,
        title: animeData.title,
        image_url: animeData.image_url,
        total_episodes: Number(animeData.total_episodes) || 0,
        status: animeData.status || 'plan_to_watch',
        episodes_watched: Number(animeData.episodes_watched) || 0,
        score: Number(animeData.score) || 0,
        genres: animeData.genres || [],
        mal_score: Number(animeData.mal_score) || 0,
        studio: animeData.studio || 'Desconocido',
        notes: animeData.notes || '',
        rewatch_count: Number(animeData.rewatch_count) || 0,
        tier: animeData.tier || 'Unranked',
        youtube_id: animeData.youtube_id || null,
        broadcast: animeData.broadcast || null,
        aired_from: animeData.aired_from || null
      };

      const currentInList = myList.find(a => Number(a.mal_id) === Number(animeData.mal_id));
      
      // Registro Historial Episodios
      if (currentInList && cleanData.episodes_watched > currentInList.episodes_watched) {
        await supabase.from('anime_history').insert([{
          anime_id: currentInList.id, anime_title: cleanData.title, episode_number: cleanData.episodes_watched, user_id: user.id
        }]);
      }

      // Registro Historial Tiers
      if (currentInList && cleanData.tier && cleanData.tier !== currentInList.tier) {
        await supabase.from('tier_history').insert([{
          anime_id: currentInList.id, anime_title: cleanData.title, old_tier: currentInList.tier, new_tier: cleanData.tier, user_id: user.id
        }]);
      }

      const { error } = await supabase.from('anime_list').upsert(cleanData, { onConflict: 'user_id,mal_id' });
      if (error) throw error;

      if (malSession) {
        const body = new URLSearchParams({
          status: MAL_STATUS_MAP[cleanData.status] || 'watching',
          num_watched_episodes: cleanData.episodes_watched,
          score: cleanData.score
        });
        fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.myanimelist.net/v2/anime/${cleanData.mal_id}/my_list_status`)}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${malSession.access_token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body
        }).catch(e => console.error("MAL Sync fail", e));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['animeList']);
      queryClient.invalidateQueries(['animeHistory']);
      queryClient.invalidateQueries(['tierHistory']);
    }
  });

  // 5. IMPORTAR DE MAL (MODO TOKEN O PÚBLICO)
  const importFromMAL = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Logueate en la app");
    setIsSyncing(true);

    const promise = async () => {
      let rawData = [];
      if (malSession?.access_token) {
        const malUrl = `https://api.myanimelist.net/v2/users/@me/animelist?fields=list_status,num_episodes,genres,studios,broadcast,status&limit=1000`;
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(malUrl)}`, {
          headers: { 'Authorization': `Bearer ${malSession.access_token}` }
        });
        const data = await res.json();
        rawData = data.data.map(item => ({
          mal_id: item.node.id, title: item.node.title, 
          image_url: item.node.main_picture?.large || item.node.main_picture?.medium,
          total_episodes: item.node.num_episodes || 0, status: item.list_status.status,
          episodes_watched: item.list_status.num_watched_episodes || 0, score: item.list_status.score || 0,
          genres: item.node.genres?.map(g => g.name) || [], studio: item.node.studios?.[0]?.name || 'Desconocido',
          broadcast: item.node.broadcast || null
        }));
      } else {
        const username = prompt("Usuario MAL público:", "_-ackerman");
        if (!username) throw new Error("Cancelado");
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://myanimelist.net/animelist/${username}/load.json?status=7`)}`);
        const json = await res.json();
        rawData = json.map(item => ({
          mal_id: item.anime_id, title: item.anime_title, 
          image_url: item.anime_image_path.replace(/\/r\/\d+x\d+/, '').replace(/\/v\/\d+x\d+/, '').split('?')[0],
          total_episodes: item.anime_num_episodes || 0, status: STATUS_MAP[item.status] || 'watching',
          episodes_watched: item.num_watched_episodes || 0, score: item.score || 0
        }));
      }
      const dataToSave = rawData.map(a => ({ ...a, user_id: user.id }));
      const { error } = await supabase.from('anime_list').upsert(dataToSave, { onConflict: 'user_id,mal_id' });
      if (error) throw error;
      queryClient.invalidateQueries(['animeList']);
      return dataToSave.length;
    };
    toast.promise(promise(), { loading: 'Sincronizando biblioteca...', success: (len) => `Sync completado: ${len} animes`, error: 'Error de red' });
    setIsSyncing(false);
  };

  // --- 🛠️ REPARAR ADN CON PROGRESO GRÁFICO (Punto pedido) ---
  const repairADN = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const broken = myList.filter(a => !a.genres.length || !a.broadcast || !a.youtube_id);
      
      if (broken.length === 0) {
        setRepairProgress(100);
        setTimeout(() => setRepairProgress(0), 1000);
        return;
      }

      setRepairProgress(1); // Inicia la barra visual
      let processed = 0;

      for (const anime of broken) {
        await queue.add(async () => {
          try {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/full`);
            const { data } = await res.json();
            
            await supabase.from('anime_list').update({ 
              genres: data.genres.map(g => g.name), 
              mal_score: data.score, 
              studio: data.studios[0]?.name || 'Desconocido',
              youtube_id: extractYTId(data.trailer), 
              broadcast: data.broadcast, 
              aired_from: data.aired.from
            }).eq('mal_id', anime.mal_id).eq('user_id', user.id);

            processed++;
            // Actualizamos el porcentaje real
            setRepairProgress(Math.round((processed / broken.length) * 100));
          } catch (e) { console.error("Error repairing item", e); }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['animeList']);
      // Escondemos la barra poco después de terminar para efecto visual suave
      setTimeout(() => setRepairProgress(0), 1500);
    }
  });

  // --- OTRAS FUNCIONALIDADES ---
  const addToLibrary = async (animeOrId) => {
    const { data: { user } } = await supabase.auth.getUser();
    let fullAnime;
    const isIdOnly = typeof animeOrId === 'number' || typeof animeOrId === 'string';
    const malId = isIdOnly ? animeOrId : (animeOrId.mal_id || animeOrId.entry?.mal_id);

    if (myList.some(item => Number(item.mal_id) === Number(malId))) return toast.error("Ya está en tu lista");

    try {
      if (isIdOnly || !animeOrId.images) {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
        const { data } = await res.json();
        fullAnime = data;
      } else { fullAnime = animeOrId.entry || animeOrId; }

      upsertMutation.mutate({
        ...fullAnime,
        mal_id: fullAnime.mal_id,
        title: fullAnime.title,
        image_url: fullAnime.images?.jpg?.large_image_url || fullAnime.image_url,
        total_episodes: fullAnime.episodes || 0,
        status: 'plan_to_watch',
        episodes_watched: 0,
        score: 0,
        genres: fullAnime.genres ? fullAnime.genres.map(g => typeof g === 'object' ? g.name : g) : [],
        youtube_id: extractYTId(fullAnime.trailer),
        broadcast: fullAnime.broadcast,
        aired_from: fullAnime.aired?.from || null,
        user_id: user.id
      });
    } catch (e) { console.error(e); }
  };

  const syncSeason = async () => {
    const promise = async () => {
      const res = await fetch('https://api.jikan.moe/v4/seasons/now');
      const data = await res.json();
      const formatted = data.data.map(a => ({
        mal_id: a.mal_id, title: a.title, image_url: a.images.jpg.large_image_url, genres: a.genres.map(g => g.name), episodes: a.episodes || 0, broadcast: a.broadcast
      }));
      await supabase.from('season_cache').upsert(formatted);
      queryClient.invalidateQueries(['seasonCache']);
    };
    toast.promise(promise(), { loading: 'Actualizando temporada...', success: 'Catálogo al día', error: 'Error API' });
  };

  const updateSmartStatus = async (anime) => {
    const isLast = anime.total_episodes > 0 && anime.episodes_watched >= anime.total_episodes;
    if (isLast) {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/relations`);
      const data = await res.json();
      return data.data?.some(rel => rel.relation === "Sequel") ? 'on_hold' : 'completed';
    }
    return anime.episodes_watched > 0 ? 'watching' : anime.status;
  };

  const checkForNewEpisodes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const checkList = myList.filter(a => a.status === 'on_hold' || a.status === 'watching');
    if (checkList.length === 0) return;
    toast.info("Buscando capítulos nuevos...");
    for (const anime of checkList) {
      await queue.add(async () => {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}`);
          const { data } = await res.json();
          if (data.episodes > anime.total_episodes) {
            await supabase.from('anime_list').update({ total_episodes: data.episodes, updated_at: new Date().toISOString() }).eq('id', anime.id).eq('user_id', user.id);
          }
        } catch (e) { console.error(e); }
      });
    }
    queryClient.invalidateQueries(['animeList']);
  };

  return { 
    myList, seasonData, history, tierHistory, isLoading, malSession, isSyncing, repairProgress,
    importFromMAL, repairADN: repairADN.mutate, isRepairing: repairADN.isPending,
    upsertAnime: upsertMutation.mutate, extractYTId, addToLibrary, syncSeason, updateSmartStatus, checkForNewEpisodes,
    exportBackup: () => {/* lógica export */}, importBackup: (e) => {/* lógica import */},
    deleteAnime: (id) => supabase.from('anime_list').delete().eq('id', id).then(() => queryClient.invalidateQueries(['animeList']))
  };
}