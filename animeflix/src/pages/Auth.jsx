import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { Mail, Lock, UserPlus, LogIn, Eye, EyeOff, User, Check, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Estados de los campos
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Lógica de seguridad de contraseña
  const passwordStats = useMemo(() => {
    return {
      length: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*]/.test(password),
      match: password === confirmPassword && password !== ''
    };
  }, [password, confirmPassword]);

  const strengthScore = Object.values(passwordStats).filter(v => v).length;

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (isSignUp) {
      if (strengthScore < 5) {
        toast.error("La contraseña no cumple con los requisitos de seguridad.");
        return;
      }
      if (username.length < 3) {
        toast.error("El nombre de usuario es muy corto.");
        return;
      }
    }

    setLoading(true);
    
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { display_name: username } // Guardamos el username en los metadatos
          }
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
    } else {
      if (isSignUp) toast.success("🎌 ¡Revisa tu correo! Te hemos enviado un pergamino de confirmación.");
      else toast.success("¡Bienvenido al centro de mando!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-6 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-netflix-red/5 blur-[150px] rounded-full pointer-events-none"></div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={isSignUp ? 'signup' : 'login'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-[#141414]/80 border border-white/10 p-10 md:p-14 rounded-[4rem] w-full max-w-lg backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative z-10"
        >
          <div className="text-center space-y-3 mb-10">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">
              {isSignUp ? 'New Legend' : 'Welcome Back'}
            </h2>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.5em] italic">
              {isSignUp ? 'Crea tu identidad única' : 'Identifícate para continuar'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-4 tracking-widest">Username</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                  <input 
                    type="text" placeholder="Nickname" required
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white focus:border-netflix-red outline-none transition-all placeholder:text-gray-700"
                    value={username} onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-500 ml-4 tracking-widest">Email</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <input 
                  type="email" placeholder="email@ejemplo.com" required
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white focus:border-netflix-red outline-none transition-all placeholder:text-gray-700"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-500 ml-4 tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} placeholder="••••••••" required
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-14 text-white focus:border-netflix-red outline-none transition-all"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-500 ml-4 tracking-widest">Confirm Password</label>
                  <input 
                    type={showPassword ? "text" : "password"} placeholder="Repite tu contraseña" required
                    className={`w-full bg-white/5 border rounded-2xl py-4 px-6 text-white outline-none transition-all ${passwordStats.match ? 'border-green-500/50' : 'border-white/5'}`}
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {/* MEDIDOR DE SEGURIDAD */}
                <div className="bg-black/40 p-5 rounded-3xl border border-white/5 space-y-3">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldCheck size={12}/> Seguridad de contraseña
                  </p>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div 
                        key={level} 
                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                          strengthScore >= level 
                            ? (strengthScore <= 2 ? 'bg-red-500' : strengthScore <= 4 ? 'bg-yellow-500' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]') 
                            : 'bg-white/5'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <Requirement met={passwordStats.length} label="8+ Caracteres" />
                    <Requirement met={passwordStats.hasUpper} label="Mayúscula" />
                    <Requirement met={passwordStats.hasNumber} label="Número" />
                    <Requirement met={passwordStats.hasSpecial} label="Símbolo" />
                    <Requirement met={passwordStats.match} label="Coinciden" />
                  </div>
                </div>
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-white text-black py-5 rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-netflix-red hover:text-white transition-all shadow-2xl flex items-center justify-center gap-3 mt-4 disabled:opacity-50 active:scale-95"
            >
              {loading ? <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <span>{isSignUp ? 'Crear mi cuenta' : 'Entrar al Radar'}</span>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-netflix-red transition-colors italic">
              {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿Nuevo recluta? Regístrate aquí'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Requirement({ met, label }) {
  return (
    <div className={`flex items-center gap-2 text-[8px] font-bold uppercase tracking-tighter ${met ? 'text-green-500' : 'text-gray-600'}`}>
      {met ? <Check size={10} /> : <X size={10} />}
      {label}
    </div>
  );
}