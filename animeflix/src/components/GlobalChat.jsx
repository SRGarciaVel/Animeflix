import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { MessageSquare, X, Send, User, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalChat({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef(null);

  // 1. Cargar mensajes iniciales y suscribirse al tiempo real
  useEffect(() => {
    if (!isOpen) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);
      setMessages(data || []);
    };

    fetchMessages();

    // SUSCRIPCIÓN REALTIME
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isOpen]);

  // 2. Auto-scroll al final cuando llega un mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert([{
      user_id: user.id,
      username: user.user_metadata.display_name || 'Anon',
      content: newMessage
    }]);

    if (error) console.error(error);
    setNewMessage('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      {/* BOTÓN FLOTANTE */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-netflix-red text-white p-4 rounded-full shadow-[0_10px_40px_rgba(229,9,20,0.5)] hover:scale-110 active:scale-95 transition-all"
      >
        {isOpen ? <X size={24}/> : <MessageSquare size={24}/>}
      </button>

      {/* VENTANA DE CHAT */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="absolute bottom-20 right-0 w-[350px] h-[500px] bg-[#141414]/90 border border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl flex flex-col overflow-hidden"
          >
            {/* Header del Chat */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                 <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                 <h4 className="text-xs font-black uppercase tracking-widest italic text-white">General Chat</h4>
              </div>
              <Hash size={14} className="text-gray-600"/>
            </div>

            {/* Lista de Mensajes */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.user_id === user.id ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[7px] font-black uppercase tracking-tighter text-gray-500 mb-1 ml-2">
                    {msg.username}
                  </span>
                  <div className={`px-4 py-2 rounded-2xl text-[11px] font-medium max-w-[85%] ${
                    msg.user_id === user.id 
                    ? 'bg-netflix-red text-white rounded-tr-none' 
                    : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input de Texto */}
            <form onSubmit={sendMessage} className="p-4 bg-black/40 border-t border-white/5 flex gap-2">
              <input 
                autoFocus
                className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex-1 text-xs outline-none focus:border-netflix-red/50 transition-all text-white italic"
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button className="bg-white text-black p-2 rounded-xl hover:bg-netflix-red hover:text-white transition-colors">
                <Send size={16}/>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}