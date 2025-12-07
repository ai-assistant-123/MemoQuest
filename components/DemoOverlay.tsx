import React, { useEffect, useState } from 'react';
import { Power } from 'lucide-react';

interface DemoOverlayProps {
  isActive: boolean;
  targetId: string | null;
  subtitle: string;
  onExit: () => void;
}

export const DemoOverlay: React.FC<DemoOverlayProps> = ({ isActive, targetId, subtitle, onExit }) => {
  const [boxStyle, setBoxStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    if (!isActive || !targetId) {
      setBoxStyle(null);
      return;
    }

    const updatePosition = () => {
      const el = document.getElementById(targetId);
      if (el) {
        // Ensure element is in view
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        const rect = el.getBoundingClientRect();
        // Add some padding
        const padding = 6;
        setBoxStyle({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      } else {
         // Element might not be rendered yet
         setBoxStyle(null);
      }
    };

    // Poll frequently to handle animations/mounting/resizing
    // Using a short interval ensures the box follows the element if layout shifts
    const intervalId = setInterval(updatePosition, 50);
    updatePosition();

    return () => clearInterval(intervalId);
  }, [isActive, targetId]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto cursor-default">
      {/* Backdrop - blocks clicks but stays transparent/dimmed */}
      <div className="absolute inset-0 bg-transparent" />

      {/* Exit Button - Power Icon Only at Bottom Right */}
      <button 
        onClick={onExit}
        className="absolute bottom-6 right-6 md:bottom-10 md:right-10 z-[110] flex items-center justify-center bg-red-600/90 hover:bg-red-500 text-white w-14 h-14 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] backdrop-blur-sm transition-all hover:scale-110 active:scale-95 border-2 border-red-400/50 hover:border-red-300"
        title="退出演示"
      >
        <Power size={28} strokeWidth={3} />
      </button>

      {/* Highlighter Box */}
      {boxStyle && (
        <div 
          className="absolute border-4 border-yellow-400 rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse transition-all duration-100 ease-out pointer-events-none"
          style={boxStyle}
        />
      )}

      {/* Subtitle Bar - Video Style */}
      {subtitle && (
        <div className="absolute bottom-16 md:bottom-20 left-0 right-0 flex justify-center pointer-events-none px-6 z-[120]">
          <div 
            key={subtitle} // Trigger animation on change
            className="bg-black/70 backdrop-blur-[2px] text-white/95 text-lg md:text-2xl font-medium px-8 py-4 rounded-xl shadow-xl max-w-4xl text-center animate-fade-in tracking-wide leading-relaxed"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
          >
             {subtitle}
          </div>
        </div>
      )}
    </div>
  );
};