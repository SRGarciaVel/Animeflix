import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

export function MALCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasCalled = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const verifier = localStorage.getItem('mal_code_verifier');
    if (code && verifier && !hasCalled.current) {
      hasCalled.current = true;
      exchangeCodeForToken(code, verifier);
    }
  }, []);

  const exchangeCodeForToken = async (code, verifier) => {
    const clientID = import.meta.env.VITE_MAL_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_MAL_CLIENT_SECRET;
    
    const params = new URLSearchParams({
      client_id: clientID,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      code_verifier: verifier,
      redirect_uri: 'http://localhost:5173/mal-callback'
    });

    try {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent('https://myanimelist.net/v1/oauth2/token')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = await res.json();

      if (data.access_token) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No hay usuario logueado en la App");

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

        await supabase.from('mal_auth').upsert({
          user_id: user.id,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: expiresAt.toISOString()
        });

        toast.success("¡Cuenta de MyAnimeList vinculada!");
        navigate('/');
      }
    } catch (e) {
      toast.error("Error de vinculación: " + e.message);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-netflix-black flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-netflix-red mb-4" size={48}/>
      <p className="text-white font-black uppercase tracking-widest italic">Finalizando conexión con MAL...</p>
    </div>
  );
}