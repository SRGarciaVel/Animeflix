import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

const CLIENT_ID = import.meta.env.VITE_MAL_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/mal-callback`;

export function useMALAuth() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 1. Generar un Verificador de Código (PKCE) compatible
  const generateCodeVerifier = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < 128; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const login = () => {
    const verifier = generateCodeVerifier();
    localStorage.setItem('mal_code_verifier', verifier);

    // Usamos el método 'plain' para evitar configuraciones complejas de SHA256 en local
    const authUrl = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&code_challenge=${verifier}&code_challenge_method=plain&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    
    window.location.href = authUrl;
  };

  const logout = async () => {
    try {
      // Obtenemos el usuario actual para borrar SU token específicamente
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('mal_auth')
          .delete()
          .eq('user_id', user.id); // Borramos solo el token de este usuario
        
        if (error) throw error;
      }

      toast.success("Conexión con MyAnimeList cerrada");
      // Forzamos recarga para limpiar los estados de la app
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast.error("Error al cerrar sesión de MAL");
      console.error(e);
    }
  };

  return { login, logout, isAuthenticating };
}