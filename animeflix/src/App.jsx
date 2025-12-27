import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAnimeLibrary } from './hooks/useAnimeLibrary';
import { useDynamicColor } from './hooks/useDynamicColor'; // Importamos el hook que ya teníamos
import { Navbar } from './components/Navbar';
import { CinemaModal } from './components/CinemaModal';
import { CommandPalette } from './components/CommandPalette';
import { Home } from './pages/Home';
import { Stats } from './pages/Stats';
import { TierList } from './pages/TierList';
import { Wrapped } from './pages/Wrapped';
import { MALCallback } from './pages/MALCallback';
import { FullCalendar } from './pages/FullCalendar';
import { Achievements } from './pages/Achievements';
import { RankingHistory } from './pages/RankingHistory';

function App() {
  const { myList, isLoading, syncSeason } = useAnimeLibrary();
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  // 🎨 TEMA DINÁMICO GLOBAL
  // Extraemos el color del anime seleccionado para teñir TODA la app
  const globalAccentColor = useDynamicColor(selectedAnime?.image_url);

  // --- SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'k' && !isPaletteOpen) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsPaletteOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaletteOpen]);

  const { data: calendar = [] } = useQuery({
    queryKey: ['calendar'],
    queryFn: async () => {
      const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]}`);
      const data = await res.json();
      return data.data || [];
    }
  });

  const handleRandom = () => {
    const pending = myList.filter(a => a.status !== 'completed' && a.status !== 'dropped');
    if (pending.length > 0) setSelectedAnime(pending[Math.floor(Math.random() * pending.length)]);
  };

  if (isLoading) return <div className="min-h-screen bg-netflix-black flex items-center justify-center text-netflix-red font-black text-4xl animate-pulse italic">ANIMEFLIX</div>;

  return (
    <div className="min-h-screen bg-netflix-black text-white font-sans selection:bg-netflix-red pb-20 no-scrollbar relative overflow-hidden">
      
      {/* 🌟 EFECTO DE GLOW GLOBAL (Punto 3.2) */}
      {/* Este div crea una mancha de color difuminada que cambia según el anime */}
      <div 
        className="fixed -top-[10%] -left-[10%] w-[120%] h-[120%] pointer-events-none transition-all duration-1000 z-0"
        style={{
          background: selectedAnime 
            ? `radial-gradient(circle at center, ${globalAccentColor}15 0%, transparent 70%)` 
            : 'radial-gradient(circle at center, #E5091405 0%, transparent 70%)',
          filter: 'blur(120px)'
        }}
      ></div>

      <Navbar 
        onSearchSelect={(anime) => setSelectedAnime({...anime, image_url: anime.images.jpg.large_image_url})} 
        onRandomClick={handleRandom}
        syncSeason={syncSeason}
      />

      <div className="pt-28 px-6 md:px-12 relative z-10">
        <Routes>
          <Route path="/" element={<Home setSelectedAnime={setSelectedAnime} calendar={calendar} />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/tier-list" element={<TierList />} />
          <Route path="/wrapped" element={<Wrapped />} />
          <Route path="/mal-callback" element={<MALCallback />} />
          <Route path="/calendar" element={<FullCalendar />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/ranking-history" element={<RankingHistory />} />
        </Routes>
      </div>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} onRandom={handleRandom} />

      {selectedAnime && (
        <CinemaModal anime={selectedAnime} onClose={() => setSelectedAnime(null)} />
      )}
    </div>
  );
}

export default App;