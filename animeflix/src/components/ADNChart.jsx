import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export function ADNChart({ dnaStats }) {
  // Formatear datos para Recharts
  const data = dnaStats.map(([genre, count]) => ({
    subject: genre,
    A: count,
    fullMark: Math.max(...dnaStats.map(s => s[1])) + 2,
  }));

  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#ffffff11" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} 
          />
          <Radar
            name="Géneros"
            dataKey="A"
            stroke="#E50914"
            fill="#E50914"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}