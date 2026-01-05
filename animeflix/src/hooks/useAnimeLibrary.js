import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import PQueue from 'p-queue';
import { toast } from 'sonner';

const queue = new PQueue({ concurrency: 1, interval: 1300, intervalCap: 1 });
const STATUS_MAP = { 1: 'watching', 2: 'completed', 3: 'on_hold', 4: 'dropped', 6: 'plan_to_watch' };
const MAL_STATUS_MAP = { 'watching': 'watching', 'completed': 'completed', 'on_hold': 'on_hold', 'dropped': 'dropped', 'plan_to_watch': 'plan_to_watch' };

export function useAnimeLibrary() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Obtener lista personal (Filtrada por RLS)
  const { data: myList = [], isLoading } = useQuery({
    queryKey: ['animeList'],
    queryFn: async () => {
      const { data, error } = await supabase.from('anime_list').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
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

  // 3. Obtener Historiales
  const { data: history = [] } = useQuery({ queryKey: ['animeHistory'], queryFn: async () => {
    const { data } = await supabase.from('anime_history').select('*').order('created_at', { ascending: false }).limit(30);
    return data || [];
  }});

  const { data: tierHistory = [] } = useQuery({ queryKey: ['tierHistory'], queryFn: async () => {
    const { data } = await supabase.from('tier_history').select('*').order('created_at', { ascending: false }).limit(20);
    return data || [];
  }});

  const { data: seasonData = [] } = useQuery({ queryKey: ['seasonCache'], queryFn: async () => {
    const { data } = await supabase.from('season_cache').select('*'); return data || [];
  }});

  // UTILIDAD: Extraer ID de Youtube
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
      if (!user) throw new Error("Inicia sesión primero");

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
        mal_score: animeData.mal_score || 0,
        studio: animeData.studio || 'Desconocido',
        notes: animeData.notes || '',
        rewatch_count: animeData.rewatch_count || 0,
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
        });
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
        const username = prompt("Usuario MAL:");
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
    toast.promise(promise(), { loading: 'Sincronizando...', success: (len) => `${len} animes sincronizados`, error: 'Error' });
    setIsSyncing(false);
  };

  const repairADN = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const broken = myList.filter(a => !a.genres.length || !a.broadcast || !a.youtube_id);
      for (const anime of broken) {
        await queue.add(async () => {
          try {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/full`);
            const { data } = await res.json();
            await supabase.from('anime_list').update({ 
              genres: data.genres.map(g => g.name), mal_score: data.score, studio: data.studios[0]?.name || 'Desconocido',
              youtube_id: extractYTId(data.trailer), broadcast: data.broadcast, aired_from: data.aired.from
            }).eq('mal_id', anime.mal_id).eq('user_id', user.id);
          } catch (e) {}
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['animeList'])
  });

  return { 
    myList, seasonData, history, tierHistory, isLoading, malSession, isSyncing,
    importFromMAL, repairADN: repairADN.mutate, isRepairing: repairADN.isPending,
    upsertAnime: upsertMutation.mutate, extractYTId,
    addToLibrary: async (a) => upsertMutation.mutate(a),
    updateSmartStatus: async (a) => {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${a.mal_id}/relations`);
        const data = await res.json();
        return data.data?.some(rel => rel.relation === "Sequel") ? 'on_hold' : 'completed';
    },
    deleteAnime: (id) => supabase.from('anime_list').delete().eq('id', id).then(() => queryClient.invalidateQueries(['animeList']))
  };
}