import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import PQueue from 'p-queue';
import { toast } from 'sonner';

const queue = new PQueue({ concurrency: 1, interval: 1300, intervalCap: 1 });
const STATUS_MAP = { 1: 'watching', 2: 'completed', 3: 'on_hold', 4: 'dropped', 6: 'plan_to_watch' };
const MAL_STATUS_MAP = { 'watching': 'watching', 'completed': 'completed', 'on_hold': 'on_hold', 'dropped': 'dropped', 'plan_to_watch': 'plan_to_watch' };

export function useAnimeLibrary() {
  const queryClient = useQueryClient();

  // 1. Obtener lista personal
  const { data: myList = [], isLoading } = useQuery({
    queryKey: ['animeList'],
    queryFn: async () => {
      const { data } = await supabase.from('anime_list').select('*').order('updated_at', { ascending: false });
      return data || [];
    }
  });

  // 2. Obtener sesión de MAL
  const { data: malSession } = useQuery({
    queryKey: ['malSession'],
    queryFn: async () => {
      const { data } = await supabase.from('mal_auth').select('*').maybeSingle();
      return data;
    }
  });

  // 3. Obtener caché de temporada e historial
  const { data: seasonData = [] } = useQuery({ queryKey: ['seasonCache'], queryFn: async () => {
    const { data } = await supabase.from('season_cache').select('*');
    return data || [];
  }});

  const { data: history = [] } = useQuery({ queryKey: ['animeHistory'], queryFn: async () => {
    const { data } = await supabase.from('anime_history').select('*').order('created_at', { ascending: false }).limit(30);
    return data || [];
  }});

  // 4. Historial de Tiers
  const { data: tierHistory = [] } = useQuery({ queryKey: ['tierHistory'], queryFn: async () => {
    const { data } = await supabase.from('tier_history').select('*').order('created_at', { ascending: false }).limit(20);
    return data || [];
  }});

  const extractYTId = (trailer) => {
    if (!trailer) return null;
    if (trailer.youtube_id) return trailer.youtube_id;
    if (trailer.embed_url) {
      const match = trailer.embed_url.match(/\/embed\/([^?]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const upsertMutation = useMutation({
    mutationFn: async (animeData) => {
      const cleanData = {
        id: animeData.id,
        mal_id: Number(animeData.mal_id),
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
        youtube_id: animeData.youtube_id || null,
        aired_from: animeData.aired_from || null,
        broadcast: animeData.broadcast || null
      };

      const currentInList = myList.find(a => Number(a.mal_id) === Number(animeData.mal_id));
      
      if (currentInList && animeData.episodes_watched > currentInList.episodes_watched) {
        await supabase.from('anime_history').insert([{
          anime_id: currentInList.id,
          anime_title: animeData.title,
          episode_number: animeData.episodes_watched
        }]);
      }

      if (currentInList && animeData.tier && animeData.tier !== currentInList.tier) {
        await supabase.from('tier_history').insert([{
          anime_id: currentInList.id,
          anime_title: animeData.title,
          old_tier: currentInList.tier,
          new_tier: animeData.tier
        }]);
      }

      const { error } = await supabase.from('anime_list').upsert(cleanData, { onConflict: 'mal_id' });
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

  const repairMutation = useMutation({
    mutationFn: async () => {
      const broken = myList.filter(a => !a.genres || a.genres.length === 0 || !a.youtube_id || a.studio === 'Desconocido' || !a.broadcast);
      if (broken.length === 0) return;

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
            }).eq('id', anime.id);
          } catch (e) { console.error(e); }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['animeList']);
      toast.success("ADN y Metadatos actualizados");
    }
  });

  const exportBackup = () => {
    const dataStr = JSON.stringify({ myList, history, tierHistory }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `animeflix-backup-${new Date().toISOString().slice(0,10)}.json`);
    link.click();
    toast.success("Backup descargado");
  };

  const importBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (json.myList) {
          await supabase.from('anime_list').upsert(json.myList, { onConflict: 'mal_id' });
          queryClient.invalidateQueries(['animeList']);
          toast.success("Restaurado");
        }
      } catch (err) { toast.error("Error"); }
    };
    reader.readAsText(file);
  };

  const addToLibrary = async (animeOrId) => {
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

      let finalStatus = 'plan_to_watch';
      const titleKeywords = fullAnime.title.split(' ').slice(0, 2).join(' ').toLowerCase();
      const hasFinishedPrevious = myList.some(m => m.title.toLowerCase().includes(titleKeywords) && (m.status === 'completed' || m.status === 'on_hold'));
      if (hasFinishedPrevious) finalStatus = 'on_hold';

      upsertMutation.mutate({
        mal_id: fullAnime.mal_id,
        title: fullAnime.title,
        image_url: fullAnime.images?.jpg?.large_image_url || fullAnime.image_url,
        total_episodes: fullAnime.episodes || 0,
        status: finalStatus,
        episodes_watched: 0,
        score: 0,
        genres: fullAnime.genres ? fullAnime.genres.map(g => typeof g === 'object' ? g.name : g) : [],
        youtube_id: extractYTId(fullAnime.trailer),
        broadcast: fullAnime.broadcast
      });
      toast.success(`Añadido: ${fullAnime.title}`);
    } catch (e) { toast.error("Error"); }
  };

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
    };
    toast.promise(promise(), { loading: 'Sincronizando MAL...', success: 'Completado', error: 'Error' });
  };

  const syncSeason = async () => {
    const promise = async () => {
      const res = await fetch('https://api.jikan.moe/v4/seasons/now');
      const data = await res.json();
      const formatted = data.data.map(a => ({
        mal_id: a.mal_id, title: a.title, image_url: a.images.jpg.large_image_url, genres: a.genres.map(g => g.name), episodes: a.episodes || 0,
        broadcast: a.broadcast
      }));
      await supabase.from('season_cache').upsert(formatted);
      queryClient.invalidateQueries(['seasonCache']);
    };
    toast.promise(promise(), { loading: 'Descargando temporada...', success: 'Listo', error: 'Error' });
  };

  const updateSmartStatus = async (anime) => {
    const isLastEpisode = anime.total_episodes > 0 && anime.episodes_watched >= anime.total_episodes;
    if (isLastEpisode) {
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/relations`);
        const data = await res.json();
        return data.data?.some(rel => rel.relation === "Sequel") ? 'on_hold' : 'completed';
      } catch (e) { return 'completed'; }
    }
    return anime.episodes_watched > 0 ? 'watching' : anime.status;
  };

  const checkForNewEpisodes = async () => {
    const checkList = myList.filter(a => a.status === 'on_hold' || a.status === 'watching');
    if (checkList.length === 0) return;
    toast.info(`Buscando actualizaciones...`);
    for (const anime of checkList) {
      await queue.add(async () => {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}`);
          const { data } = await res.json();
          if (data.episodes > anime.total_episodes) {
            await supabase.from('anime_list').update({ total_episodes: data.episodes, updated_at: new Date().toISOString() }).eq('id', anime.id);
          }
        } catch (e) { console.error(e); }
      });
    }
    queryClient.invalidateQueries(['animeList']);
  };

  return { 
    myList, seasonData, history, tierHistory, isLoading, malSession, 
    addToLibrary, repairADN: repairMutation.mutate, isRepairing: repairMutation.isPending, 
    importFromMAL, syncSeason, updateSmartStatus, checkForNewEpisodes, exportBackup, importBackup,
    deleteAnime: (id) => supabase.from('anime_list').delete().eq('id', id).then(() => queryClient.invalidateQueries(['animeList'])),
    upsertAnime: upsertMutation.mutate,
    extractYTId
  };
}