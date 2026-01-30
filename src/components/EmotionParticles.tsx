import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface EmotionParticlesProps {
  emotion: string | null;
  isAnimating?: boolean;
}

const emotionParticleColors: Record<string, string> = {
  happy: 'bg-yellow-400',
  sad: 'bg-blue-400',
  angry: 'bg-red-400',
  fear: 'bg-purple-400',
  surprise: 'bg-pink-400',
  disgust: 'bg-green-400',
  neutral: 'bg-primary',
};

const EmotionParticles = ({ emotion, isAnimating }: EmotionParticlesProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!emotion) {
      setParticles([]);
      return;
    }

    // Generate new particles when emotion changes
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 8 + 4,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));

    setParticles(newParticles);
  }, [emotion]);

  if (!emotion || particles.length === 0) return null;

  const colorClass = emotionParticleColors[emotion.toLowerCase()] || emotionParticleColors.neutral;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={cn(
            "absolute rounded-full opacity-30 animate-pulse",
            colorClass,
            isAnimating && "animate-bounce"
          )}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            filter: 'blur(1px)',
          }}
        />
      ))}
    </div>
  );
};

export default EmotionParticles;
