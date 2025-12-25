import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAnimeLibrary } from './hooks/useAnimeLibrary';
import { Navbar } from './components/Navbar';
import { CinemaModal } from './components/CinemaModal';
import { Home } from './pages/Home';
import { Stats } from './pages/Stats';

function App() {
  const { myList, isLoading, syncSeason } = useAnimeLibrary();
  const [selectedAnime, setSelectedAnime] = useState(null);

  const { data: calendar = [] } = useQuery({
    queryKey: ['calendar'],
    queryFn: async () => {
      const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]}`);
      const data = await res.json();
      return data.data || [];
    }
  });

  if (isLoading) return <div className="min-h-screen bg-netflix-black flex items-center justify-center text-netflix-red font-black text-4xl animate-pulse italic">ANIMEFLIX</div>;

  return (
    <div className="min-h-screen bg-netflix-black text-white font-sans selection:bg-netflix-red pb-20 no-scrollbar">
      <Navbar 
        onSearchSelect={(anime) => setSelectedAnime({...anime, image_url: anime.images.jpg.large_image_url})} 
        onRandomClick={() => setSelectedAnime(myList.filter(a => a.status !== 'completed')[Math.floor(Math.random()*myList.length)])}
        syncSeason={syncSeason}
      />

      <div className="pt-28 px-6 md:px-12">
        <Routes>
          <Route path="/" element={<Home setSelectedAnime={setSelectedAnime} calendar={calendar} />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </div>

      {selectedAnime && (
        <CinemaModal anime={selectedAnime} onClose={() => setSelectedAnime(null)} />
      )}
    </div>
  );
}

export default App;