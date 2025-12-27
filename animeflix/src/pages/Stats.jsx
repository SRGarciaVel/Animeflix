import React, { useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { ADNChart } from '../components/ADNChart';
import { Sparkles, Trophy, Clock, History, Gauge, TrendingDown, TrendingUp, Tv, Library, Download, Upload, ShieldCheck } from 'lucide-react';

export function Stats() {
  const { myList, history, exportBackup, importBackup } = useAnimeLibrary();

  // ... (mismos useMemo de antes para criticAnalysis, studioStats, dnaStats, totalTime)
  // [Asegúrate de copiar los useMemo del código anterior de Stats.jsx]
  const criticAnalysis = useMemo(() => {
    const ratedAnimes = myList.filter(a => a.score > 0 && a.mal_score > 0);
    if (ratedAnimes.length === 0) return null;
    const myAvg = ratedAnimes.reduce((acc, curr) => acc + curr.score, 0) / ratedAnimes.length;
    const malAvg = ratedAnimes.reduce((acc, curr) => acc + curr.mal_score, 0) / ratedAnimes.length;
    const diff = myAvg - malAvg;
    return { myAvg: myAvg.toFixed(2), malAvg: malAvg.toFixed(2), diff: diff.toFixed(2), isStrict: diff < 0 };
  }, [myList]);

  const studioStats = useMemo(() => {
    const map = {};
    myList.forEach(a => { if (a.studio && a.studio !== 'Desconocido') map[a.studio] = (map[a.studio] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [myList]);

  const dnaStats = useMemo(() => {
    const map = {};
    myList.forEach(a => a.genres?.forEach(g => { const name = typeof g === 'object' ? g.name : g; map[name] = (map[name] || 0) + 1; }));
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 6);
  }, [myList]);

  const totalTime = ((myList.reduce((acc, curr) => acc + (curr.episodes_watched || 0), 0) * 23) / 1440).toFixed(1);

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <div className="flex justify-between items-start">
        <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">Intelligence Analysis</h2>
        
        {/* PUNTO 2.3: CONTROLES DE BACKUP */}
        <div className="flex gap-4">
          <label className="cursor-pointer bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition flex items-center gap-3">
             <Upload size={18} className="text-blue-400"/>
             <span className="text-[10px] font-black uppercase tracking-widest">Importar JSON</span>
             <input type="file" accept=".json" onChange={importBackup} className="hidden" />
          </label>
          <button onClick={exportBackup} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition flex items-center gap-3">
             <Download size={18} className="text-green-400"/>
             <span className="text-[10px] font-black uppercase tracking-widest">Exportar Backup</span>
          </button>
        </div>
      </div>
      
      {/* RESTO DEL CONTENIDO DE STATS (Mismo grid que tenías) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ... (Aquí pegas el Radar de ADN y el Perfil de Crítico del código anterior) ... */}
        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col items-center backdrop-blur-sm relative group overflow-hidden">
          <p className="text-xs font-black text-netflix-red uppercase tracking-[0.3em] mb-4 flex items-center gap-2 italic"><Sparkles size={16}/> ADN Otaku</p>
          {dnaStats.length > 2 ? <ADNChart dnaStats={dnaStats} /> : <div className="h-[300px] flex items-center justify-center text-gray-600 italic text-xs text-center px-10">Añade más géneros para ver el radar.</div>}
        </div>

        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col justify-center overflow-hidden relative group backdrop-blur-sm">
           <div className="relative z-10">
              <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2 italic"><Gauge size={16} className="text-netflix-red"/> Perfil de Crítico</p>
              {criticAnalysis ? (
                <div className="space-y-8">
                  <div className="flex justify-between items-end px-4">
                    <div><h4 className="text-6xl font-black italic tracking-tighter">{criticAnalysis.myAvg}</h4><p className="text-[10px] font-bold text-netflix-red uppercase tracking-widest">Tu Promedio</p></div>
                    <div className="text-right"><h4 className="text-4xl font-bold opacity-30 italic">{criticAnalysis.malAvg}</h4><p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Promedio MAL</p></div>
                  </div>
                  <div className={`p-6 rounded-3xl flex items-center gap-4 mx-4 ${criticAnalysis.isStrict ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                    {criticAnalysis.isStrict ? <TrendingDown className="text-blue-500" /> : <TrendingUp className="text-green-500" />}
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">{criticAnalysis.isStrict ? 'Exigente' : 'Generoso'}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-1 italic">Diferencia: {Math.abs(criticAnalysis.diff)} pts</p>
                    </div>
                  </div>
                </div>
              ) : <p className="text-xs text-gray-600 italic py-10 text-center">Sin puntuaciones.</p>}
           </div>
           <Gauge className="absolute -right-8 -bottom-8 text-white/5 group-hover:scale-110 transition-transform duration-700" size={220}/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ... (Aquí pegas el Studio Domination y el Timeline del código anterior) ... */}
        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col backdrop-blur-sm relative group overflow-hidden">
          <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2 italic"><Library size={16} className="text-netflix-red"/> Studio Domination</p>
          <div className="space-y-6 relative z-10">
            {studioStats.map(([name, count], index) => (
              <div key={name} className="space-y-2">
                <div className="flex justify-between items-end text-xs font-black uppercase tracking-tighter">
                  <span className={index === 0 ? 'text-white' : 'text-gray-500'}>{index === 0 && '👑 '}{name}</span>
                  <span className="text-[10px] opacity-40">{count} Series</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${index === 0 ? 'bg-netflix-red shadow-[0_0_10px_#E50914]' : 'bg-white/20'}`} style={{ width: `${(count / studioStats[0][1]) * 100}%` }}></div></div>
              </div>
            ))}
          </div>
          <Library className="absolute -right-10 -bottom-10 text-white/5 group-hover:scale-110 transition-transform duration-700" size={200}/>
        </div>

        <div className="lg:col-span-2 bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col backdrop-blur-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3 italic"><History size={18}/> Actividad Reciente</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 overflow-y-auto no-scrollbar max-h-[400px] pr-2">
            {history.length > 0 ? history.map((entry) => (
              <div key={entry.id} className="relative pl-6 border-l border-white/10 py-1 group/item">
                <div className="absolute -left-1.5 top-2 w-3 h-3 bg-netflix-red rounded-full shadow-[0_0_10px_#E50914] group-hover/item:scale-125 transition-transform"></div>
                <p className="text-[11px] font-black text-white uppercase tracking-tighter leading-none mb-1 truncate">{entry.anime_title}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase italic">Visto episodio {entry.episode_number} <span className="ml-2 opacity-30">• {new Date(entry.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></p>
              </div>
            )) : <div className="text-center py-20 opacity-20 italic text-xs col-span-2">Sin actividad.</div>}
          </div>
        </div>
      </div>
      
      {/* Banner de seguridad final */}
      <div className="bg-blue-600/10 p-6 rounded-[2rem] border border-blue-600/20 flex items-center gap-4">
         <ShieldCheck className="text-blue-500" size={32}/>
         <div>
            <p className="text-xs font-black uppercase text-blue-500">Tus datos están protegidos localmente</p>
            <p className="text-[10px] text-gray-500 font-medium">Usa los botones superiores para crear copias de seguridad externas regularmente.</p>
         </div>
      </div>
    </div>
  );
}