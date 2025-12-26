import { useState, useEffect } from 'react';
import { FastAverageColor } from 'fast-average-color';

export function useDynamicColor(imageUrl) {
  const [color, setColor] = useState('#E50914'); // Rojo Netflix por defecto

  useEffect(() => {
    if (!imageUrl) return;

    const fac = new FastAverageColor();
    // Usamos el proxy para evitar problemas de CORS al leer los píxeles de la imagen de MAL
    const proxiedImage = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;

    fac.getColorAsync(proxiedImage)
      .then(res => {
        // Si el color es muy oscuro o muy claro, podemos ajustarlo, 
        // pero por ahora tomaremos el dominante.
        setColor(res.hex);
      })
      .catch(() => setColor('#E50914'));
  }, [imageUrl]);

  return color;
}