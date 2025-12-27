import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import PQueue from 'p-queue';
import { toast } from 'sonner';

// Configuración de cola para Jikan (evitar error 429)
const queue = new PQueue({ concurrency: 1, interval: 1300, intervalCap: 1 });

const STATUS_MAP = { 1: 'watching', 2: 'completed', 3: 'on_hold', 4: 'dropped', 6: 'plan_to_watch' };
const MAL_STATUS_MAP = { 'watching': 'watching', 'completed': 'completed', 'on_hold': 'on_hold', 'dropped': 'dropped', 'plan_to_watch': 'plan_to_watch' };

export function useAnimeLibrary() {
  const queryClient = useQueryClient();

  // 1. OBTENER LISTA PERSONAL
  const { data: myList = [], isLoading } = useQuery({
    queryKey: ['animeList'],
    queryFn: async () => {
      const { data } = await supabase.from('anime_list').select('*').order('updated_at', { ascending: false });
      return data || [];
    }
  });

  // 2. OBTENER SESIÓN DE MAL (TOKEN)
  const { data: malSession } = useQuery({
    queryKey: ['malSession'],
    queryFn: async () => {
      const { data } = await supabase.from('mal_auth').select('*').maybeSingle();
      return data;
    }
  });

  // 3. OBTENER CACHÉ DE TEMPORADA
  const { data: seasonData = [] } = useQuery({
    queryKey: ['seasonCache'],
    queryFn: async () => {
      const { data } = await supabase.from('season_cache').select('*');
      return data || [];
    }
  });

  // 4. OBTENER HISTORIAL DE EPISODIOS (TIMELINE)
  const { data: history = [] } = useQuery({
    queryKey: ['animeHistory'],
    queryFn: async () => {
      const { data } = await supabase.from('anime_history').select('*').order('created_at', { ascending: false }).limit(30);
      return data || [];
    }
  });

  // 5. OBTENER HISTORIAL DE RANKING (TIER HISTORY - PUNTO 4.3)
  const { data: tierHistory = [] } = useQuery({
    queryKey: ['tierHistory'],
    queryFn: async () => {
      const { data } = await supabase.from('tier_history').select('*').order('created_at', { ascending: false }).limit(20);
      return data || [];
    }
  });

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

  // 6. MUTACIÓN MAESTRA (LOCAL + MAL + HISTORIALES)
  const upsertMutation = useMutation({
    mutationFn: async (animeData) => {
      const cleanData = {
        id: animeData.id,
        mal_id: animeData.mal_id,
        title: animeData.title,
        image_url: animeData.image_url,
        total_episodes: animeData.total_episodes || 0,
        status: animeData.status || 'plan_to_watch',
        episodes_watched: animeData.episodes_watched || 0,
        score: animeData.score || 0,
        genres: animeData.genres || [],
        mal_score: animeData.mal_score || 0,
        studio: animeData.studio || 'Desconocido',
        notes: animeData.notes || '',
        rewatch_count: animeData.rewatch_count || 0,
        tier: animeData.tier || 'Unranked',
        youtube_id: animeData.youtube_id || null
      };

      const currentInList = myList.find(a => a.mal_id === animeData.mal_id);
      
      // A. Lógica de Historial de Episodios
      if (currentInList && animeData.episodes_watched > currentInList.episodes_watched) {
        await supabase.from('anime_history').insert([{
          anime_id: currentInList.id,
          anime_title: animeData.title,
          episode_number: animeData.episodes_watched
        }]);
      }

      // B. Lógica de Historial de Tiers (NUEVO)
      if (currentInList && animeData.tier && animeData.tier !== currentInList.tier) {
        await supabase.from('tier_history').insert([{
          anime_id: currentInList.id,
          anime_title: animeData.title,
          old_tier: currentInList.tier,
          new_tier: animeData.tier
        }]);
      }

      // C. Guardar en Supabase
      const { error } = await supabase.from('anime_list').upsert(cleanData, { onConflict: 'mal_id' });
      if (error) throw error;

      // D. Sincronizar con MyAnimeList Remoto
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

  // 7. AÑADIR A BIBLIOTECA
  const addToLibrary = async (anime) => {
    const entry = anime.entry || anime;
    if (myList.some(item => item.mal_id === entry.mal_id)) return toast.error("Ya está en tu lista");
    
    let finalStatus = 'plan_to_watch';
    const titleKeywords = entry.title.split(' ').slice(0, 2).join(' ').toLowerCase();
    const hasFinishedPrevious = myList.some(m => 
      m.title.toLowerCase().includes(titleKeywords) && (m.status === 'completed' || m.status === 'on_hold')
    );
    if (hasFinishedPrevious) finalStatus = 'on_hold';

    const genres = anime.genres ? (Array.isArray(anime.genres) ? anime.genres.map(g => typeof g === 'object' ? g.name : g) : []) : [];
    
    upsertMutation.mutate({
      mal_id: entry.mal_id, title: entry.title, image_url: entry.images?.jpg?.large_image_url || entry.image_url,
      total_episodes: anime.episodes || 0, status: finalStatus, episodes_watched: 0, score: 0, genres
    });
  };

  // 8. REPARAR METADATOS Y TRAILERS
  const repairADN = async () => {
    const broken = myList.filter(a => !a.genres || a.genres.length === 0 || !a.youtube_id || a.studio === 'Desconocido');
    if (broken.length === 0) return toast.info("Metadatos actualizados");

    toast.info(`Reparando datos profundos y trailers...`);
    for (const anime of broken) {
      await queue.add(async () => {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/full`);
          const { data } = await res.json();
          await supabase.from('anime_list').update({ 
            genres: data.genres.map(g => g.name),
            mal_score: data.score,
            studio: data.studios[0]?.name || 'Desconocido',
            youtube_id: extractYTId(data.trailer)
          }).eq('id', anime.id);
        } catch (e) { console.error(e); }
      });
    }
    queryClient.invalidateQueries(['animeList']);
    toast.success("Análisis y trailers actualizados");
  };

  // 9. IMPORTAR DE MAL
  const importFromMAL = async () => {
    const username = prompt("Usuario MAL:", "_-ackerman");
    if (!username) return;
    const promise = async () => {
      let allData = [];
      let offset = 0;
      while (true) {
        const malUrl = `https://myanimelist.net/animelist/${username}/load.json?offset=${offset}&status=7`;
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(malUrl)}`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < 300) break;
        offset += 300;
      }
      const formatted = allData.map(item => ({
        mal_id: item.anime_id,
        title: item.anime_title,
        image_url: item.anime_image_path.replace(/\/r\/\d+x\d+/, '').replace(/\/v\/\d+x\d+/, '').split('?')[0],
        total_episodes: item.anime_num_episodes || 0,
        status: STATUS_MAP[item.status] || 'watching',
        episodes_watched: item.num_watched_episodes || 0,
        score: item.score || 0,
        genres: []
      }));
      await supabase.from('anime_list').upsert(formatted, { onConflict: 'mal_id' });
      queryClient.invalidateQueries(['animeList']);
      return formatted.length;
    };
    toast.promise(promise(), { loading: 'Sincronizando...', success: (len) => `Sync exitoso: ${len} animes`, error: 'Error' });
  };

  // 10. SINCRONIZAR TEMPORADA
  const syncSeason = async () => {
    const res = await fetch('https://api.jikan.moe/v4/seasons/now');
    const data = await res.json();
    const formatted = data.data.map(a => ({
      mal_id: a.mal_id, title: a.title, image_url: a.images.jpg.large_image_url, genres: a.genres.map(g => g.name), episodes: a.episodes || 0
    }));
    await supabase.from('season_cache').upsert(formatted);
    queryClient.invalidateQueries(['seasonCache']);
    toast.success("Catálogo de temporada actualizado");
  };

  // 11. DETECTOR DE SECUELAS
  const updateSmartStatus = async (anime) => {
    const isLastEpisode = anime.total_episodes > 0 && anime.episodes_watched >= anime.total_episodes;
    if (isLastEpisode) {
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/relations`);
        const data = await res.json();
        const hasSequel = data.data?.some(rel => rel.relation === "Sequel");
        return hasSequel ? 'on_hold' : 'completed';
      } catch (e) { return 'completed'; }
    }
    return anime.episodes_watched > 0 ? 'watching' : anime.status;
  };

  return { 
    myList, seasonData, history, tierHistory, isLoading, malSession, 
    addToLibrary, repairADN, importFromMAL, syncSeason, updateSmartStatus,
    deleteAnime: (id) => supabase.from('anime_list').delete().eq('id', id).then(() => queryClient.invalidateQueries(['animeList'])),
    upsertAnime: upsertMutation.mutate,
    extractYTId
  };
}