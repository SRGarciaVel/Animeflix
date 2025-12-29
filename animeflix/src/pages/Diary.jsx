import React, { useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, ChevronRight, Bookmark } from 'lucide-react';

export function Diary() {
  const { history, myList } = useAnimeLibrary();

  // Agrupar historial por fechas (Hoy, Ayer, Fecha específica)
  const groupedHistory = useMemo(() => {
    const groups = {};
    history.forEach(entry => {
      const date = new Date(entry.created_at).toLocaleDateString('es-ES', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return Object.entries(groups);
  }, [history]);

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-700">
      <header className="mb-12 space-y-2">
        <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">
          Viewing <span className="text-netflix-red underline decoration-4">Diary</span>
        </h2>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] italic">
          Tu viaje cronológico a través del anime
        </p>
      </header>

      {groupedHistory.length > 0 ? (
        <div className="space-y-16">
          {groupedHistory.map(([date, entries], groupIdx) => (
            <div key={date} className="relative">
              {/* Etiqueta de Fecha */}
              <div className="sticky top-24 z-20 mb-8">
                <span className="bg-netflix-red text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl italic">
                  {date}
                </span>
              </div>

              {/* Línea vertical del Timeline */}
              <div className="absolute left-[23px] top-10 bottom-0 w-px bg-gradient-to-b from-netflix-red/50 to-transparent"></div>

              <div className="space-y-8 ml-4">
                {entries.map((entry, idx) => {
                  const anime = myList.find(a => a.id === entry.anime_id);
                  return (
                    <motion.div 
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-6 group"
                    >
                      {/* Punto de la línea */}
                      <div className="relative z-10 w-3 h-3 rounded-full bg-netflix-black border-2 border-netflix-red group-hover:scale-150 transition-transform shadow-[0_0_10px_#E50914]"></div>
                      
                      {/* Card del Evento */}
                      <div className="flex-1 bg-white/5 border border-white/5 p-4 rounded-[2rem] hover:bg-white/10 transition-all flex items-center gap-6 shadow-2xl backdrop-blur-sm">
                        <div className="w-16 h-20 rounded-xl overflow-hidden shadow-lg flex-shrink-0 border border-white/10">
                          <img src={anime?.image_url} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-netflix-red mb-1">
                             <Clock size={12}/>
                             <span className="text-[10px] font-black uppercase tracking-tighter">
                               {new Date(entry.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                          </div>
                          <h4 className="text-sm font-black text-white uppercase truncate tracking-tighter italic">
                            {entry.anime_title}
                          </h4>
                          <p className="text-[11px] text-gray-500 font-bold uppercase mt-1">
                            Viste el episodio <span className="text-white bg-white/10 px-2 py-0.5 rounded-lg ml-1">{entry.episode_number}</span>
                          </p>
                        </div>
                        <ChevronRight className="text-gray-700 group-hover:text-netflix-red transition-colors mr-4" size={20}/>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
          <Bookmark size={48} className="mb-4" />
          <p className="font-black uppercase tracking-widest text-xs italic">El diario está esperando tu primera sesión</p>
        </div>
      )}
    </div>
  );
}