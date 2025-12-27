import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, Plus, CheckCircle2 } from 'lucide-react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';

const DAYS_EN = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAYS_ES = { 
  monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", 
  thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo" 
};

export function FullCalendar() {
  const { myList, addToLibrary } = useAnimeLibrary();

  const { data: fullWeek = {}, isLoading } = useQuery({
    queryKey: ['fullWeekSchedule'],
    queryFn: async () => {
      const schedule = {};
      for (const day of DAYS_EN) {
        const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${day}`);
        const data = await res.json();
        schedule[day] = data.data || [];
        // Esperamos un poco para no saturar la API
        await new Promise(r => setTimeout(r, 400));
      }
      return schedule;
    }
  });

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black uppercase tracking-widest">Cargando Horarios de la Semana...</div>;

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <header className="flex items-center gap-4">
        <div className="bg-netflix-red p-3 rounded-2xl shadow-xl">
           <CalendarIcon size={32}/>
        </div>
        <div>
           <h2 className="text-5xl font-black italic uppercase tracking-tighter">Broadcast Center</h2>
           <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">Temporada de Invierno 2024</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {DAYS_EN.map(day => (
          <div key={day} className="space-y-4">
            <h4 className="text-center p-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 text-netflix-red">
              {DAYS_ES[day]}
            </h4>
            <div className="space-y-2">
              {fullWeek[day]?.map(anime => {
                const inList = myList.some(m => m.mal_id === anime.mal_id);
                return (
                  <div 
                    key={anime.mal_id} 
                    onClick={() => !inList && addToLibrary(anime)}
                    className={`group p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${inList ? 'bg-netflix-red/10 border-netflix-red/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                  >
                    <p className="text-[10px] font-bold line-clamp-2 uppercase leading-tight group-hover:text-netflix-red transition">
                      {anime.title}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[8px] font-bold opacity-30 italic">{anime.broadcast.time} JST</span>
                      {inList ? <CheckCircle2 size={12} className="text-netflix-red"/> : <Plus size={12} className="opacity-0 group-hover:opacity-100 transition"/>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}