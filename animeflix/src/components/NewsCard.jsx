import React from 'react';
import { ExternalLink, Calendar, User } from 'lucide-react';

export function NewsCard({ article }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-[2rem] overflow-hidden group hover:border-netflix-red/50 transition-all duration-500 flex flex-col shadow-2xl">
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={article.images?.jpg?.image_url || 'https://via.placeholder.com/300x200?text=Anime+News'} 
          className="w-full h-full object-cover group-hover:scale-110 transition duration-700 opacity-80 group-hover:opacity-100"
          alt=""
        />
        <div className="absolute top-4 left-4 bg-netflix-red text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic shadow-xl">
          News Update
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <h4 className="text-sm font-black uppercase italic leading-tight tracking-tighter text-white group-hover:text-netflix-red transition-colors line-clamp-3">
            {article.title}
          </h4>
          <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3 italic">
            {article.excerpt}
          </p>
        </div>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-bold text-gray-500 uppercase tracking-widest">
          <div className="flex items-center gap-4">
             <span className="flex items-center gap-1"><User size={10}/> {article.author_username}</span>
             <span className="flex items-center gap-1"><Calendar size={10}/> {new Date(article.date).toLocaleDateString()}</span>
          </div>
          <button 
            onClick={() => window.open(article.url, '_blank')}
            className="p-2 bg-white/5 rounded-full hover:bg-white hover:text-black transition-all shadow-xl"
          >
            <ExternalLink size={12}/>
          </button>
        </div>
      </div>
    </div>
  );
}