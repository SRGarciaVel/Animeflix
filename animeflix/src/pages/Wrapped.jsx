import React, { useState, useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { 
  Trophy, 
  Calendar, 
  Tv, 
  Star, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  X, 
  BrainCircuit // <-- Importado ahora sí
} from 'lucide-react';

export function Wrapped() {
  const { myList } = useAnimeLibrary();
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- LÓGICA DE DATOS DEL AÑO ---
  const wrappedData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    // Filtramos animes que fueron actualizados este año
    const yearItems = myList.filter(a => {
        const updateDate = new Date(a.updated_at);
        return updateDate.getFullYear() === currentYear && (a.episodes_watched > 0);
    });

    if (yearItems.length === 0) return null;

    // 1. Total Episodios
    const totalEps = yearItems.reduce((acc, curr) => acc + (curr.episodes_watched || 0), 0);
    
    // 2. Género Favorito
    const genres = {};
    yearItems.forEach(a => {
        if (Array.isArray(a.genres)) {
            a.genres.forEach(g => genres[g] = (genres[g] || 0) + 1);
        }
    });
    const topGenre = Object.entries(genres).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Aventura';

    // 3. Anime del Año (Mayor nota)
    const animeOfTheYear = [...yearItems]
      .sort((a, b) => (b.score || 0) - (a.score || 0))[0];

    // 4. Mes más activo
    const months = {};
    yearItems.forEach(a => {
      const month = new Date(a.updated_at).getMonth();
      months[month] = (months[month] || 0) + (a.episodes_watched || 0);
    });
    const sortedMonths = Object.entries(months).sort((a,b) => b[1] - a[1]);
    const mostActiveMonthIndex = sortedMonths.length > 0 ? sortedMonths[0][0] : 0;
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const activeMonth = monthNames[mostActiveMonthIndex];

    return { totalEps, topGenre, animeOfTheYear, activeMonth, count: yearItems.length };
  }, [myList]);

  if (!wrappedData) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-6">
        <div className="bg-white/5 p-10 rounded-full animate-pulse">
            <Sparkles size={64} className="text-netflix-red" />
        </div>
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Aún no hay suficiente historia</h2>
        <p className="text-gray-500 max-w-xs font-medium">Sigue registrando episodios en este 2025 para desbloquear tu resumen anual.</p>
        <button onClick={() => window.history.back()} className="text-xs font-black uppercase tracking-widest text-netflix-red underline">Volver al inicio</button>
      </div>
    );
  }

  const slides = [
    {
      title: "Tu 2025 en un vistazo",
      content: (
        <div className="text-center space-y-8">
          <h4 className="text-9xl font-black italic text-netflix-red drop-shadow-[0_0_30px_rgba(229,9,20,0.5)]">{wrappedData.count}</h4>
          <p className="text-2xl font-bold uppercase tracking-[0.2em] leading-tight">Animes que <br/> definieron tu año</p>
        </div>
      ),
      color: "from-netflix-red/40 to-black"
    },
    {
      title: "Récord de visionado",
      content: (
        <div className="text-center space-y-6">
          <Tv size={80} className="mx-auto text-blue-400 mb-4" />
          <h4 className="text-8xl font-black italic tracking-tighter">{wrappedData.totalEps}</h4>
          <p className="text-xl font-bold text-gray-300 uppercase tracking-widest">Episodios completados</p>
          <div className="bg-white/10 backdrop-blur-md py-3 px-8 rounded-2xl inline-block border border-white/10">
            <p className="text-xs font-black uppercase tracking-widest text-blue-300">
               ~ {((wrappedData.totalEps * 23) / 60).toFixed(0)} Horas de pura trama
            </p>
          </div>
        </div>
      ),
      color: "from-blue-900/40 to-black"
    },
    {
      title: "Tu ADN dominante",
      content: (
        <div className="text-center space-y-8">
          <div className="bg-purple-500/20 p-8 rounded-full inline-block border border-purple-500/30 animate-pulse">
            <BrainCircuit size={80} className="text-purple-400" />
          </div>
          <h4 className="text-6xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            {wrappedData.topGenre}
          </h4>
          <p className="text-lg font-bold text-gray-400 uppercase tracking-widest italic">Fue tu género predilecto</p>
        </div>
      ),
      color: "from-purple-900/40 to-black"
    },
    {
      title: "Tu mes de gloria",
      content: (
        <div className="text-center space-y-6">
          <div className="bg-green-500/20 p-8 rounded-[2rem] inline-block border border-green-500/30 rotate-3">
             <Calendar size={80} className="text-green-400" />
          </div>
          <h4 className="text-7xl font-black italic uppercase tracking-tighter text-green-400">{wrappedData.activeMonth}</h4>
          <p className="text-xl font-bold text-gray-300 uppercase tracking-widest">Donde no soltaste el control</p>
        </div>
      ),
      color: "from-green-900/40 to-black"
    },
    {
      title: "La Obra Maestra",
      content: (
        <div className="flex flex-col items-center space-y-8">
          <div className="relative group">
            <img 
                src={wrappedData.animeOfTheYear.image_url} 
                className="w-60 h-80 object-cover rounded-[2.5rem] shadow-[0_0_60px_rgba(229,9,20,0.6)] border-4 border-white/20 transform -rotate-2" 
                alt=""
            />
            <div className="absolute -top-6 -right-6 bg-yellow-500 p-4 rounded-full text-black shadow-2xl scale-110">
              <Star fill="black" size={28}/>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-netflix-red uppercase tracking-[0.5em] mb-2">Tu Anime del Año</p>
            <h4 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{wrappedData.animeOfTheYear.title}</h4>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/5 px-4 py-1 rounded-full border border-white/10">
                <span className="text-sm font-black text-yellow-500">{wrappedData.animeOfTheYear.score}/10</span>
                <span className="text-[10px] text-gray-500 uppercase font-bold italic">Tu puntuación</span>
            </div>
          </div>
        </div>
      ),
      color: "from-red-950 to-black"
    }
  ];

  const next = () => setCurrentSlide(prev => (prev + 1) % slides.length);
  const prev = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

  return (
    <div className={`fixed inset-0 z-[200] bg-gradient-to-b ${slides[currentSlide].color} flex flex-col items-center justify-center p-6 transition-all duration-1000`}>
      
      {/* Barras de progreso superiores */}
      <div className="absolute top-10 left-0 right-0 px-10 flex gap-2">
        {slides.map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-white transition-all duration-500 ${i <= currentSlide ? 'opacity-100' : 'opacity-0'}`}
              style={{ width: i < currentSlide ? '100%' : i === currentSlide ? '100%' : '0%' }}
            ></div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => window.history.back()} 
        className="absolute top-16 right-10 p-3 bg-black/20 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all z-50 backdrop-blur-md border border-white/5"
      >
        <X size={24}/>
      </button>

      <div className="max-w-2xl w-full space-y-12">
        <p className="text-center text-[11px] font-black uppercase tracking-[0.6em] text-white/30 italic">Animeflix Wrapped 2025</p>
        <h2 className="text-center text-sm font-black uppercase italic tracking-[0.3em] text-gray-400 mb-10">{slides[currentSlide].title}</h2>
        
        <div className="animate-in zoom-in fade-in slide-in-from-bottom-10 duration-700">
          {slides[currentSlide].content}
        </div>
      </div>

      {/* Áreas de clic laterales para navegar */}
      <div className="absolute inset-y-0 left-0 w-1/4 cursor-pointer z-10" onClick={prev}></div>
      <div className="absolute inset-y-0 right-0 w-1/4 cursor-pointer z-10" onClick={next}></div>

      <div className="absolute bottom-20 flex gap-8 z-30">
        <button onClick={prev} className="p-5 bg-white/5 backdrop-blur-xl rounded-full hover:bg-white/10 transition border border-white/10 group active:scale-90">
            <ChevronLeft className="group-hover:-translate-x-1 transition-transform"/>
        </button>
        <button onClick={next} className="p-5 bg-white/5 backdrop-blur-xl rounded-full hover:bg-white/10 transition border border-white/10 group active:scale-90">
            <ChevronRight className="group-hover:translate-x-1 transition-transform"/>
        </button>
      </div>
    </div>
  );
}