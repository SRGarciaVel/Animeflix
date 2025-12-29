import React, { useState, useEffect } from 'react';
import { Timer, CalendarDays } from 'lucide-react';

export function AiringCountdown({ anime }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [mode, setMode] = useState('next_ep');

  useEffect(() => {
    // Seguridad: Si no hay anime o status, abortamos
    if (!anime || !anime.status) return;

    const calculateTime = () => {
      const now = new Date();
      
      // CASO A: Anime que aún no se estrena (Próxima Temporada)
      // Buscamos la fecha de estreno guardada en 'aired_from'
      if (anime.status === 'plan_to_watch' || (anime.episodes_watched === 0 && anime.status === 'on_hold')) {
        if (!anime.aired_from) return null;
        const premiereDate = new Date(anime.aired_from);
        if (premiereDate > now) {
          setMode('premiere');
          return formatDiff(premiereDate - now);
        }
      }

      // CASO B: Anime en emisión (Watching)
      if (anime.broadcast?.day && anime.broadcast?.time) {
        const daysMap = { 'Sundays': 0, 'Mondays': 1, 'Tuesdays': 2, 'Wednesdays': 3, 'Thursdays': 4, 'Fridays': 5, 'Saturdays': 6 };
        let next = new Date();
        const targetDay = daysMap[anime.broadcast.day];
        if (targetDay === undefined) return null;

        const dayDiff = (targetDay + 7 - now.getUTCDay()) % 7;
        next.setUTCDate(now.getUTCDate() + dayDiff);
        
        const [h, m] = anime.broadcast.time.split(':');
        next.setUTCHours(parseInt(h) - 9, parseInt(m), 0, 0); // JST a UTC

        if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
        
        setMode('next_ep');
        return formatDiff(next - now);
      }

      return null;
    };

    const formatDiff = (diff) => {
      const d = Math.floor(diff / 864e5);
      const h = Math.floor((diff % 864e5) / 36e5);
      const m = Math.floor((diff % 36e5) / 6e4);
      return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
    };

    const timer = setInterval(() => setTimeLeft(calculateTime()), 60000);
    setTimeLeft(calculateTime());
    return () => clearInterval(timer);
  }, [anime]);

  if (!timeLeft) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-500 ${
      mode === 'premiere' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-netflix-red/10 border-netflix-red/30 text-netflix-red'
    }`}>
      {mode === 'premiere' ? <CalendarDays size={10}/> : <Timer size={10} />}
      <span className="text-[9px] font-black uppercase tracking-widest italic">
        {mode === 'premiere' ? 'Estreno: ' : 'EP en: '} {timeLeft}
      </span>
    </div>
  );
}