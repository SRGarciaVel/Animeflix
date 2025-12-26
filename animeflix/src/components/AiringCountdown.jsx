import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function AiringCountdown({ broadcast, status }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!broadcast || status !== 'currently_airing') return;

    const calculateTime = () => {
      // Jikan entrega algo como "Saturdays at 23:00 (JST)"
      // Simplificamos la lógica para mostrar el día de emisión
      const days = {
        'Mondays': 1, 'Tuesdays': 2, 'Wednesdays': 3, 'Thursdays': 4,
        'Fridays': 5, 'Saturdays': 6, 'Sundays': 0
      };

      const dayStr = broadcast.split(' at ')[0];
      const targetDay = days[dayStr];
      
      if (targetDay === undefined) return 'Horario pendiente';

      const now = new Date();
      const nextAiring = new Date();
      nextAiring.setDate(now.getDate() + (targetDay + 7 - now.getDay()) % 7);
      
      // Ajuste básico: Si es hoy pero ya pasó la hora, saltar a la próxima semana
      setTimeLeft(`Emisión: Todos los ${dayStr.replace('s', '')}`);
    };

    calculateTime();
  }, [broadcast, status]);

  if (status !== 'currently_airing') return null;

  return (
    <div className="flex items-center gap-2 text-netflix-red animate-pulse">
      <Clock size={14} />
      <span className="text-[10px] font-black uppercase tracking-widest">{timeLeft || 'En emisión'}</span>
    </div>
  );
}