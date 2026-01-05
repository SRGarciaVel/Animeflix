import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="h-[80vh] flex flex-col items-center justify-center text-center space-y-6">
      <h2 className="text-9xl font-black text-white/5 absolute z-0">404</h2>
      <div className="relative z-10 space-y-4">
        <h3 className="text-4xl font-black uppercase italic">¿Te has perdido?</h3>
        <p className="text-gray-500 max-w-sm mx-auto italic">Incluso los mejores exploradores terminan en un Isekai desconocido de vez en cuando.</p>
        <Link to="/" className="inline-block bg-netflix-red text-white px-8 py-3 rounded-full font-black uppercase text-xs shadow-2xl">Volver al Radar</Link>
      </div>
    </div>
  );
}