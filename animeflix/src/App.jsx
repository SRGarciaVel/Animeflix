import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAnimeLibrary } from './hooks/useAnimeLibrary';
import { Navbar } from './components/Navbar';
import { CinemaModal } from './components/CinemaModal';
import { CommandPalette } from './components/CommandPalette'; // <-- Nuevo
import { Home } from './pages/Home';
import { Stats } from './pages/Stats';
import { TierList } from './pages/TierList';
import { Wrapped } from './pages/Wrapped';

function App() {
  const { myList, isLoading, syncSeason } = useAnimeLibrary();
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // --- SHORTCUTS GLOBALES ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'k' && !isPaletteOpen) {
        // Evitar que se active si estás escribiendo en un input
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
    if (pending.length > 0) {
      setSelectedAnime(pending[Math.floor(Math.random() * pending.length)]);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-netflix-black flex items-center justify-center text-netflix-red font-black text-4xl animate-pulse italic">ANIMEFLIX</div>;

  return (
    <div className="min-h-screen bg-netflix-black text-white font-sans selection:bg-netflix-red pb-20 no-scrollbar">
      
      <Navbar 
        onSearchSelect={(anime) => setSelectedAnime({...anime, image_url: anime.images.jpg.large_image_url})} 
        onRandomClick={handleRandom}
        syncSeason={syncSeason}
      />

      <div className="pt-28 px-6 md:px-12">
        <Routes>
          <Route path="/" element={<Home setSelectedAnime={setSelectedAnime} calendar={calendar} />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/tier-list" element={<TierList />} />
          <Route path="/wrapped" element={<Wrapped />} />
        </Routes>
      </div>

      <CommandPalette 
        isOpen={isPaletteOpen} 
        onClose={() => setIsPaletteOpen(false)} 
        onRandom={handleRandom}
      />

      {selectedAnime && (
        <CinemaModal anime={selectedAnime} onClose={() => setSelectedAnime(null)} />
      )}
    </div>
  );
}

export default App;