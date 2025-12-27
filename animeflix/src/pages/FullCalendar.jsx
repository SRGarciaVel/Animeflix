import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, Plus, CheckCircle2 } from 'lucide-react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';

const DAYS_EN = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAYS_ES = { 
  monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", 
  thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo" 
};

// --- LÓGICA DINÁMICA DE TEMPORADAS ---
const getCurrentSeason = () => {
  const now = new Date();
  const month = now.getMonth(); // 0 = Enero, 11 = Diciembre
  const year = now.getFullYear();
  
  let season = "";
  if (month >= 0 && month <= 2) season = "Invierno";
  else if (month >= 3 && month <= 5) season = "Primavera";
  else if (month >= 6 && month <= 8) season = "Verano";
  else season = "Otoño";

  return { name: season, year: year };
};

export function FullCalendar() {
  const { myList, addToLibrary } = useAnimeLibrary();
  const currentSeason = getCurrentSeason();

  const { data: fullWeek = {}, isLoading } = useQuery({
    queryKey: ['fullWeekSchedule'],
    queryFn: async () => {
      const schedule = {};
      for (const day of DAYS_EN) {
        // Usamos el endpoint de schedules de Jikan
        const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${day}`);
        const data = await res.json();
        schedule[day] = data.data || [];
        // Delay para evitar el Rate Limit de Jikan (429)
        await new Promise(r => setTimeout(r, 400));
      }
      return schedule;
    }
  });

  if (isLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-netflix-red"></div>
      <p className="animate-pulse font-black uppercase tracking-[0.3em] text-gray-500 text-xs">Sincronizando reloj de Japón...</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <header className="flex items-center gap-4">
        <div className="bg-netflix-red p-3 rounded-2xl shadow-xl shadow-netflix-red/20">
           <CalendarIcon size={32} className="text-white"/>
        </div>
        <div>
           <h2 className="text-5xl font-black italic uppercase tracking-tighter">Broadcast Center</h2>
           {/* TÍTULO DINÁMICO AQUÍ */}
           <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mt-1 italic">
             Temporada de {currentSeason.name} {currentSeason.year}
           </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {DAYS_EN.map(day => (
          <div key={day} className="space-y-4">
            <div className="relative group">
               <h4 className="text-center p-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 text-netflix-red group-hover:bg-netflix-red group-hover:text-white transition-all duration-500">
                {DAYS_ES[day]}
               </h4>
            </div>
            
            <div className="space-y-2">
              {fullWeek[day]?.map(anime => {
                const inList = myList.some(m => m.mal_id === anime.mal_id);
                return (
                  <div 
                    key={anime.mal_id} 
                    onClick={() => !inList && addToLibrary(anime)}
                    className={`group p-4 rounded-2xl border transition-all duration-500 cursor-pointer relative overflow-hidden ${
                      inList 
                      ? 'bg-netflix-red/10 border-netflix-red/30' 
                      : 'bg-white/5 border-white/5 hover:border-white/20 hover:scale-[1.02]'
                    }`}
                  >
                    <p className="text-[10px] font-bold line-clamp-2 uppercase leading-tight group-hover:text-netflix-red transition-colors">
                      {anime.title}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock size={10}/>
                        <span className="text-[8px] font-black italic">{anime.broadcast?.time || "??:??"} JST</span>
                      </div>
                      {inList ? (
                        <div className="bg-netflix-red/20 p-1 rounded-full">
                           <CheckCircle2 size={12} className="text-netflix-red"/>
                        </div>
                      ) : (
                        <Plus size={12} className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity"/>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {(!fullWeek[day] || fullWeek[day].length === 0) && (
                <p className="text-center py-10 text-[8px] font-black uppercase text-gray-700 tracking-widest">Sin estrenos</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer className="bg-white/5 p-6 rounded-[2rem] border border-white/5 text-center">
         <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic">
           * Los horarios corresponden a la emisión original en Japón (JST).
         </p>
      </footer>
    </div>
  );
}