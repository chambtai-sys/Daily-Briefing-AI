import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clean background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2; // Scale down slightly

        // Dynamic color
        const r = barHeight + 25 * (i / bufferLength);
        const g = 250 * (i / bufferLength);
        const b = 50;

        ctx.fillStyle = `rgb(${Math.min(255, r + 50)}, ${Math.max(100, g)}, ${255})`;
        ctx.fillStyle = isPlaying ? '#4f46e5' : '#cbd5e1'; // Indigo-600 vs Slate-300
        
        // Rounded caps aesthetic
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, 4);
        ctx.fill();

        x += barWidth + 1;
      }
    };

    if (isPlaying) {
      draw();
    } else {
      // Draw a flat line or last frame static
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, canvas.height - 2, canvas.width, 2);
      if(requestRef.current) cancelAnimationFrame(requestRef.current);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={60} 
      className="w-full h-[60px] rounded-lg"
    />
  );
};