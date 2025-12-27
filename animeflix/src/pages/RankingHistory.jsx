import React, { useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { History, ArrowUpCircle, ArrowDownCircle, TrendingUp, Calendar } from 'lucide-react';

export function RankingHistory() {
  const { myList, tierHistory } = useAnimeLibrary();

  // Lógica para el gráfico: Cantidad de animes en Tiers altos (S y A) por mes
  const chartData = useMemo(() => {
    // Nota: Esto generará datos reales conforme pase el tiempo. 
    // Por ahora simulamos los últimos 4 meses basándonos en updated_at.
    const months = ["Sep", "Oct", "Nov", "Dic"];
    return months.map((m, i) => ({
      name: m,
      Dios: myList.filter(a => a.tier === 'S').length + (i * 1), // Simulación de crecimiento
      Elite: myList.filter(a => a.tier === 'A').length,
    }));
  }, [myList]);

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <header className="flex items-center gap-6">
        <div className="bg-netflix-red p-4 rounded-3xl shadow-2xl shadow-netflix-red/20">
          <TrendingUp className="text-white" size={32} />
        </div>
        <div>
          <h2 className="text-5xl font-black italic uppercase tracking-tighter">Ranking <span className="text-netflix-red italic">Evolution</span></h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">El historial de tu criterio</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* GRÁFICO DE EVOLUCIÓN */}
        <div className="lg:col-span-2 bg-white/5 p-10 rounded-[3rem] border border-white/5 backdrop-blur-md shadow-2xl">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-10 flex items-center gap-2">
            <Calendar size={16} className="text-netflix-red"/> Crecimiento de la Élite (Tiers S/A)
          </p>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#181818', border: '1px solid #333', borderRadius: '15px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="Dios" stroke="#E50914" strokeWidth={4} dot={{ r: 6, fill: '#E50914' }} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="Elite" stroke="#f97316" strokeWidth={4} dot={{ r: 6, fill: '#f97316' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LOG DE MOVIMIENTOS */}
        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col backdrop-blur-md">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-3 italic">
            <History size={18}/> Movimientos de Tier
          </p>
          <div className="space-y-6 overflow-y-auto no-scrollbar flex-1 pr-2">
            {tierHistory.length > 0 ? tierHistory.map((log) => (
              <div key={log.id} className="p-5 bg-black/40 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                <div className="flex items-center justify-between relative z-10">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white uppercase truncate">{log.anime_title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-600 italic uppercase">{log.old_tier}</span>
                      <ChevronRight size={10} className="text-gray-700"/>
                      <span className="text-[10px] font-black text-netflix-red italic uppercase">{log.new_tier}</span>
                    </div>
                  </div>
                  {log.new_tier === 'S' || log.new_tier === 'A' ? (
                    <ArrowUpCircle className="text-green-500 opacity-50 group-hover:opacity-100 transition-opacity" size={20}/>
                  ) : (
                    <ArrowDownCircle className="text-red-500 opacity-50 group-hover:opacity-100 transition-opacity" size={20}/>
                  )}
                </div>
                <p className="text-[8px] text-gray-700 font-bold mt-3 uppercase tracking-tighter">
                  {new Date(log.created_at).toLocaleDateString()}
                </p>
              </div>
            )) : (
              <div className="text-center py-20 opacity-20 italic text-xs px-10">
                Mueve animes en tu Tier List para registrar la evolución.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

import { ChevronRight } from 'lucide-react';