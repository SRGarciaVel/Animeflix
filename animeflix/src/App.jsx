import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAnimeLibrary } from './hooks/useAnimeLibrary';
import { useDynamicColor } from './hooks/useDynamicColor';
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
import { Diary } from './pages/Diary';
import { News } from './pages/News';
import { Auth } from './pages/Auth';
import { NotFound } from './pages/NotFound';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const { myList, isLoading, syncSeason } = useAnimeLibrary();
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  const globalAccentColor = useDynamicColor(selectedAnime?.image_url);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
      const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${today}`);
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
      
      {/* 🌟 GLOW DINÁMICO */}
      <div 
        className="fixed -top-[10%] -left-[10%] w-[120%] h-[120%] pointer-events-none transition-all duration-1000 z-0 opacity-40"
        style={{
          background: selectedAnime 
            ? `radial-gradient(circle at center, ${globalAccentColor}33 0%, transparent 70%)` 
            : 'radial-gradient(circle at center, #E5091411 0%, transparent 70%)',
          filter: 'blur(100px)'
        }}
      ></div>

      <Navbar 
        onSearchSelect={(anime) => setSelectedAnime({...anime, image_url: anime.images.jpg.large_image_url})} 
        onRandomClick={handleRandom}
        syncSeason={syncSeason}
        user={session?.user}
      />

      <div className="pt-28 px-6 md:px-12 relative z-10">
        <Routes>
          <Route path="/" element={<Home setSelectedAnime={setSelectedAnime} calendar={calendar} user={session?.user} />} />
          <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" />} />
          
          {/* Rutas protegidas */}
          <Route path="/stats" element={session ? <Stats /> : <Navigate to="/auth" />} />
          <Route path="/tier-list" element={session ? <TierList /> : <Navigate to="/auth" />} />
          <Route path="/wrapped" element={session ? <Wrapped /> : <Navigate to="/auth" />} />
          <Route path="/mal-callback" element={session ? <MALCallback /> : <Navigate to="/auth" />} />
          <Route path="/calendar" element={<FullCalendar />} />
          <Route path="/achievements" element={session ? <Achievements /> : <Navigate to="/auth" />} />
          <Route path="/ranking-history" element={session ? <RankingHistory /> : <Navigate to="/auth" />} />
          <Route path="/diary" element={session ? <Diary /> : <Navigate to="/auth" />} />
          <Route path="/news" element={<News />} />
          <Route path="*" element={<NotFound />} />
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