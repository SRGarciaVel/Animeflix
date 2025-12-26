import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import PQueue from 'p-queue';
import { toast } from 'sonner';

const queue = new PQueue({ concurrency: 1, interval: 1300, intervalCap: 1 });
const STATUS_MAP = { 1: 'watching', 2: 'completed', 3: 'on_hold', 4: 'dropped', 6: 'plan_to_watch' };

export function useAnimeLibrary() {
  const queryClient = useQueryClient();

  // 1. Obtener mi lista personal
  const { data: myList = [], isLoading } = useQuery({
    queryKey: ['animeList'],
    queryFn: async () => {
      const { data } = await supabase.from('anime_list').select('*').order('updated_at', { ascending: false });
      return data || [];
    }
  });

  // 2. Obtener caché de temporada
  const { data: seasonData = [] } = useQuery({
    queryKey: ['seasonCache'],
    queryFn: async () => {
      const { data } = await supabase.from('season_cache').select('*');
      return data || [];
    }
  });

  // Mutación para Guardar/Actualizar (Limpiando datos para Supabase)
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
        notes: animeData.notes || '',
        rewatch_count: animeData.rewatch_count || 0,
        tier: animeData.tier || 'Unranked'
      };

      const { error } = await supabase.from('anime_list').upsert(cleanData, { onConflict: 'mal_id' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(['animeList'])
  });

  // --- NUEVA FUNCIÓN: AÑADIR A LA BIBLIOTECA CON LÓGICA INTELIGENTE ---
  const addToLibrary = async (anime) => {
    // El objeto puede venir de Jikan (Search) o de SeasonCache
    const entry = anime.entry || anime;
    
    // 1. Evitar duplicados
    if (myList.some(item => item.mal_id === entry.mal_id)) {
      return toast.error("Este anime ya está en tu lista");
    }

    // 2. LÓGICA DE SECUELAS: Detectar si es parte de una franquicia que ya viste
    let finalStatus = 'plan_to_watch';
    
    // Tomamos las primeras dos palabras para buscar coincidencias (ej: "Jujutsu Kaisen")
    const titleKeywords = entry.title.split(' ').slice(0, 2).join(' ').toLowerCase();
    
    const hasFinishedPrevious = myList.some(m => 
      m.title.toLowerCase().includes(titleKeywords) && 
      (m.status === 'completed' || m.status === 'on_hold')
    );

    if (hasFinishedPrevious) {
      finalStatus = 'on_hold';
      toast.info(`¡Franquicia detectada! Agregado a 'En Espera' por tu progreso anterior.`);
    }

    // 3. Normalizar géneros (siempre como array de strings)
    const genres = anime.genres ? 
      (Array.isArray(anime.genres) ? 
        anime.genres.map(g => typeof g === 'object' ? g.name : g) : 
        []) : 
      [];

    // 4. Preparar imagen HD
    const imageUrl = entry.images?.jpg?.large_image_url || entry.image_url;

    // 5. Ejecutar la inserción
    upsertMutation.mutate({
      mal_id: entry.mal_id,
      title: entry.title,
      image_url: imageUrl,
      total_episodes: anime.episodes || 0,
      status: finalStatus,
      episodes_watched: 0,
      score: 0,
      genres: genres
    });
  };

  // Mutación para Borrar
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('anime_list').delete().eq('id', id);
      if (error) throw error;
      toast.success("Eliminado del catálogo");
    },
    onSuccess: () => queryClient.invalidateQueries(['animeList'])
  });

  // Funciones de conveniencia
  const importFromMAL = async () => {
    const username = prompt("Usuario de MAL:", "_-ackerman");
    if (!username) return;
    
    const promise = async () => {
      let allData = [];
      let offset = 0;
      while (true) {
        const malUrl = `https://myanimelist.net/animelist/${username}/load.json?offset=${offset}&status=7`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(malUrl)}`;
        const res = await fetch(proxyUrl);
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

    toast.promise(promise(), {
      loading: 'Sincronizando con MyAnimeList...',
      success: (len) => `Sincronizados ${len} animes con éxito`,
      error: 'Error al conectar con MAL'
    });
  };

  const repairADN = async () => {
    const broken = myList.filter(a => !a.genres || a.genres.length === 0);
    if (broken.length === 0) return toast.info("Tu ADN ya está actualizado");

    toast.info(`Reparando ADN de ${broken.length} series...`);
    for (const anime of broken) {
      await queue.add(async () => {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}`);
          const data = await res.json();
          const genres = data.data.genres.map(g => g.name);
          await supabase.from('anime_list').update({ genres }).eq('id', anime.id);
        } catch (e) { console.error(e); }
      });
    }
    queryClient.invalidateQueries(['animeList']);
    toast.success("ADN Otaku actualizado");
  };

  const syncSeason = async () => {
    const promise = async () => {
      const res = await fetch('https://api.jikan.moe/v4/seasons/now');
      const data = await res.json();
      const formatted = data.data.map(a => ({
        mal_id: a.mal_id, title: a.title, image_url: a.images.jpg.large_image_url,
        genres: a.genres.map(g => g.name), episodes: a.episodes || 0
      }));
      await supabase.from('season_cache').upsert(formatted);
      queryClient.invalidateQueries(['seasonCache']);
    };
    toast.promise(promise(), {
      loading: 'Descargando temporada actual...',
      success: 'Catálogo de temporada listo',
      error: 'Error de Jikan API'
    });
  };

const updateSmartStatus = async (anime) => {
  const isLastEpisode = anime.total_episodes > 0 && anime.episodes_watched >= anime.total_episodes;

  if (isLastEpisode) {
    try {
      toast.info("Comprobando si hay secuelas...");
      const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/relations`);
      const data = await res.json();
      
      // Buscamos si existe alguna relación que sea "Sequel"
      const hasSequel = data.data?.some(rel => rel.relation === "Sequel");

      const finalStatus = hasSequel ? 'on_hold' : 'completed';
      const message = hasSequel 
        ? "¡Secuela encontrada! Movido a 'En Espera'" 
        : "Historia finalizada. Movido a 'Completados'";
      
      toast.success(message);
      return finalStatus;
    } catch (e) {
      return 'completed'; // Fallback por si falla la API
    }
  }
  
  // Si no es el último episodio pero ya vio al menos uno
  if (anime.episodes_watched > 0) return 'watching';
  
  return anime.status;
};

  return { 
    myList, 
    seasonData, 
    isLoading, 
    addToLibrary, // <-- Exportamos la nueva función
    deleteAnime: deleteMutation.mutate, 
    importFromMAL, 
    repairADN, 
    syncSeason,
    updateSmartStatus, 
    upsertAnime: upsertMutation.mutate
  };
}