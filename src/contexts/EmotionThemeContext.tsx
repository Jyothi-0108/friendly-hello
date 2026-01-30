import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type EmotionTheme = 'happy' | 'sad' | 'angry' | 'fear' | 'surprise' | 'disgust' | 'neutral' | null;

interface EmotionThemeContextType {
  currentTheme: EmotionTheme;
  setTheme: (emotion: EmotionTheme) => void;
  isAnimating: boolean;
}

const EmotionThemeContext = createContext<EmotionThemeContextType | undefined>(undefined);

// Emotion to theme color mappings (HSL values)
export const emotionThemes: Record<string, { primary: string; accent: string; gradient: string }> = {
  happy: {
    primary: '45 95% 55%', // Warm yellow
    accent: '30 90% 55%', // Orange
    gradient: 'linear-gradient(135deg, hsl(45 95% 55%), hsl(30 90% 55%))',
  },
  sad: {
    primary: '220 70% 50%', // Deep blue
    accent: '250 60% 55%', // Purple-blue
    gradient: 'linear-gradient(135deg, hsl(220 70% 50%), hsl(250 60% 55%))',
  },
  angry: {
    primary: '0 80% 55%', // Red
    accent: '15 85% 50%', // Red-orange
    gradient: 'linear-gradient(135deg, hsl(0 80% 55%), hsl(15 85% 50%))',
  },
  fear: {
    primary: '270 70% 55%', // Purple
    accent: '290 65% 50%', // Magenta-purple
    gradient: 'linear-gradient(135deg, hsl(270 70% 55%), hsl(290 65% 50%))',
  },
  surprise: {
    primary: '330 80% 55%', // Pink
    accent: '350 75% 60%', // Rose
    gradient: 'linear-gradient(135deg, hsl(330 80% 55%), hsl(350 75% 60%))',
  },
  disgust: {
    primary: '150 60% 45%', // Green
    accent: '120 50% 40%', // Dark green
    gradient: 'linear-gradient(135deg, hsl(150 60% 45%), hsl(120 50% 40%))',
  },
  neutral: {
    primary: '280 85% 55%', // Default purple (from design system)
    accent: '320 80% 55%', // Accent pink
    gradient: 'linear-gradient(135deg, hsl(280 85% 55%), hsl(320 80% 55%))',
  },
};

export const EmotionThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<EmotionTheme>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const setTheme = (emotion: EmotionTheme) => {
    if (emotion === currentTheme) return;
    
    setIsAnimating(true);
    setCurrentTheme(emotion);
    
    // Animation duration
    setTimeout(() => setIsAnimating(false), 600);
  };

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const theme = currentTheme ? emotionThemes[currentTheme] : emotionThemes.neutral;
    
    root.style.setProperty('--emotion-primary', theme.primary);
    root.style.setProperty('--emotion-accent', theme.accent);
    root.style.setProperty('--emotion-gradient', theme.gradient);
  }, [currentTheme]);

  return (
    <EmotionThemeContext.Provider value={{ currentTheme, setTheme, isAnimating }}>
      {children}
    </EmotionThemeContext.Provider>
  );
};

export const useEmotionTheme = () => {
  const context = useContext(EmotionThemeContext);
  if (!context) {
    throw new Error('useEmotionTheme must be used within EmotionThemeProvider');
  }
  return context;
};
