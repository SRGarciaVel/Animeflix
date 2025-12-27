import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

const CLIENT_ID = import.meta.env.VITE_MAL_CLIENT_ID;
const REDIRECT_URI = 'http://localhost:5173/mal-callback';

export function useMALAuth() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 1. Generar un Verificador de Código (PKCE) simple para MAL
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

    // MAL no requiere cifrar el verifier si es simple, pero requiere el parámetro
    const authUrl = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&code_challenge=${verifier}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    
    window.location.href = authUrl;
  };

  const logout = async () => {
    await supabase.from('mal_auth').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    toast.success("Sesión de MAL cerrada");
    window.location.reload();
  };

  return { login, logout, isAuthenticating };
}