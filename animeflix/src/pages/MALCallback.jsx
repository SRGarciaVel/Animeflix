import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

export function MALCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasCalled = useRef(false); // Evita que React Strict Mode llame 2 veces a la API

  useEffect(() => {
    const code = searchParams.get('code');
    const verifier = localStorage.getItem('mal_code_verifier');

    if (code && verifier && !hasCalled.current) {
      hasCalled.current = true;
      exchangeCodeForToken(code, verifier);
    }
  }, [searchParams]);

  const exchangeCodeForToken = async (code, verifier) => {
    const clientID = import.meta.env.VITE_MAL_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_MAL_CLIENT_SECRET;
    
    // Construimos los parámetros exactos que pide MAL
    const params = new URLSearchParams();
    params.append('client_id', clientID);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('code_verifier', verifier);
    params.append('redirect_uri', 'http://localhost:5173/mal-callback');

    try {
      const tokenUrl = 'https://myanimelist.net/v1/oauth2/token';
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(tokenUrl)}`;

      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const data = await res.json();

      if (data.access_token) {
        // Calcular fecha de expiración
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

        // Guardar en Supabase
        const { error } = await supabase.from('mal_auth').upsert({
          id: '00000000-0000-0000-0000-000000000000', // Usamos un ID fijo para una sola sesión
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: expiresAt.toISOString()
        });

        if (error) throw error;

        toast.success("¡Cuenta de MyAnimeList vinculada con éxito!");
        navigate('/');
      } else {
        throw new Error(data.message || "Error al obtener el token");
      }
    } catch (e) {
      console.error("Auth Error:", e);
      toast.error("Error en la vinculación: " + e.message);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-netflix-black flex flex-col items-center justify-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-netflix-red"></div>
        <div className="absolute inset-0 flex items-center justify-center">
           <RefreshCw className="text-white opacity-20" size={24}/>
        </div>
      </div>
      <h2 className="mt-8 text-white font-black uppercase tracking-[0.3em] animate-pulse">Autenticando con MAL</h2>
      <p className="text-gray-500 text-[10px] mt-2 font-bold italic uppercase">Estableciendo conexión segura...</p>
    </div>
  );
}

// Icono faltante en la vista de carga
import { RefreshCw } from 'lucide-react';