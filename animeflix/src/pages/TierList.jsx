import React, { useState, useMemo } from 'react';
import { useAnimeLibrary } from '../hooks/useAnimeLibrary';
import { 
  DndContext, 
  closestCenter, 
  MouseSensor, 
  TouchSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trophy } from 'lucide-react';

const TIERS = [
  { id: 'S', name: 'DIOS (S)', color: 'bg-red-600' },
  { id: 'A', name: 'Excelente (A)', color: 'bg-orange-500' },
  { id: 'B', name: 'Bueno (B)', color: 'bg-yellow-500' },
  { id: 'C', name: 'Normal (C)', color: 'bg-green-500' },
  { id: 'D', name: 'Meh (D)', color: 'bg-blue-500' },
  { id: 'Unranked', name: 'Sin Clasificar', color: 'bg-gray-800' }
];

// --- COMPONENTE: FILA SOLTABLE (DROPPABLE) ---
function TierRow({ tier, children, animeIds }) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id });

  return (
    <div 
      ref={setNodeRef}
      className={`flex min-h-[160px] bg-white/5 rounded-[2rem] overflow-hidden border transition-all duration-300 ${
        isOver ? 'border-white/40 bg-white/10 scale-[1.01] shadow-2xl' : 'border-white/5'
      }`}
    >
      <div className={`${tier.color} w-32 flex flex-col items-center justify-center text-center p-4 border-r border-black/20 shadow-xl z-10`}>
        <span className="text-3xl font-black text-black leading-none">{tier.id}</span>
        <span className="text-[9px] font-black text-black/60 uppercase mt-2 tracking-tighter">{tier.name}</span>
      </div>

      <div className="flex-1 flex items-center gap-4 p-6 overflow-x-auto no-scrollbar relative">
        <SortableContext items={animeIds} strategy={horizontalListSortingStrategy}>
          {children}
        </SortableContext>
        
        {children.length === 0 && !isOver && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white/5 uppercase tracking-[0.5em]">
            Arrastra aquí
          </div>
        )}
      </div>
    </div>
  );
}

// --- COMPONENTE: ITEM ARRASTRABLE (SORTABLE) ---
function SortableAnime({ anime, isOverlay = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: anime.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.3 : 1,
    zIndex: isOverlay ? 100 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={`relative w-28 h-40 flex-shrink-0 cursor-grab active:cursor-grabbing transition-transform ${isOverlay ? 'scale-110 shadow-2xl rotate-3' : 'hover:scale-105'}`}
    >
      <img 
        src={anime.image_url} 
        className="w-full h-full object-cover rounded-2xl shadow-xl border border-white/10 group-hover:border-white/30" 
        alt="" 
      />
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent rounded-b-2xl">
         <p className="text-[8px] font-black text-white truncate uppercase tracking-tighter">{anime.title}</p>
      </div>
    </div>
  );
}

export function TierList() {
  const { myList, upsertAnime } = useAnimeLibrary();
  const [activeAnime, setActiveAnime] = useState(null); // Para el DragOverlay

  // Solo animes con progreso
  const rankableAnimes = useMemo(() => 
    myList.filter(a => a.status !== 'plan_to_watch' && a.status !== 'dropped'), 
  [myList]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragStart = (event) => {
    const anime = rankableAnimes.find(a => a.id === event.active.id);
    setActiveAnime(anime);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveAnime(null);

    if (!over) return;

    const animeId = active.id;
    const overId = over.id; // Puede ser el ID de un Tier o el ID de otro Anime

    const anime = rankableAnimes.find(a => a.id === animeId);
    if (!anime) return;

    // Lógica inteligente: ¿Sobre qué estamos soltando?
    let newTier = anime.tier;

    // 1. Si soltamos sobre una fila (ID del Tier)
    if (TIERS.some(t => t.id === overId)) {
      newTier = overId;
    } 
    // 2. Si soltamos sobre otro anime, obtenemos el Tier de ese anime
    else {
      const targetAnime = rankableAnimes.find(a => a.id === overId);
      if (targetAnime) newTier = targetAnime.tier;
    }

    if (anime.tier !== newTier) {
      upsertAnime({ ...anime, tier: newTier });
    }
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-700">
      <header className="flex items-center gap-6">
        <div className="bg-netflix-red p-4 rounded-[1.5rem] shadow-2xl shadow-netflix-red/20 rotate-3">
          <Trophy className="text-white" size={32} />
        </div>
        <div>
          <h2 className="text-5xl font-black italic uppercase tracking-tighter">Tier List</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.4em] mt-1 italic">Tu ranking personal de leyendas</p>
        </div>
      </header>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {TIERS.map(tier => {
            const tierAnimes = rankableAnimes.filter(a => a.tier === tier.id);
            return (
              <TierRow 
                key={tier.id} 
                tier={tier} 
                animeIds={tierAnimes.map(a => a.id)}
              >
                {tierAnimes.map(anime => (
                  <SortableAnime key={anime.id} anime={anime} />
                ))}
              </TierRow>
            );
          })}
        </div>

        {/* CAPA SUPERIOR PARA EL ARRASTRE (FIX AL PÓSTER ESCONDIDO) */}
        <DragOverlay zIndex={1000}>
          {activeAnime ? (
            <SortableAnime anime={activeAnime} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
        <div className="bg-netflix-red/20 p-4 rounded-full text-netflix-red animate-pulse">
           <Trophy size={24}/>
        </div>
        <div className="text-center md:text-left">
           <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-1 italic">Sistema de Clasificación</p>
           <p className="text-sm text-gray-500 leading-relaxed font-medium">
             Solo aparecen animes que has empezado a ver o completado. Las series en 'Por ver' no se pueden clasificar hasta que veas el primer episodio.
           </p>
        </div>
      </div>
    </div>
  );
}