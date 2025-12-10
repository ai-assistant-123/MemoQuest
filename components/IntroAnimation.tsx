import React from 'react';

interface IntroAnimationProps {
  isVisible: boolean;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden flex items-center justify-center pointer-events-none">
      <style>{`
        @keyframes cinematic-zoom {
          0% { 
            transform: scale(1.1); 
            filter: grayscale(0.8) sepia(0.2) blur(3px) brightness(0.6);
          }
          20% {
            transform: scale(1.15);
            filter: grayscale(0.2) sepia(0.4) blur(0px) brightness(0.9);
          }
          80% {
            transform: scale(1.4);
            filter: grayscale(0) sepia(0.2) contrast(1.2) brightness(1);
          }
          100% { 
            transform: scale(4); 
            filter: grayscale(1) sepia(0) contrast(1.5) brightness(2) blur(2px);
          }
        }
        
        @keyframes panic-flash {
          0%, 100% { opacity: 0; }
          10% { opacity: 0.3; }
          20% { opacity: 0; }
          50% { opacity: 0.5; background: radial-gradient(circle, transparent 30%, rgba(220, 38, 38, 0.6) 100%); }
          90% { opacity: 0.8; background: radial-gradient(circle, transparent 10%, rgba(220, 38, 38, 0.9) 100%); }
        }

        @keyframes glitch-skew {
          0% { transform: skew(0deg); }
          20% { transform: skew(-2deg); }
          40% { transform: skew(2deg); }
          60% { transform: skew(-1deg); }
          80% { transform: skew(1deg); }
          100% { transform: skew(0deg); }
        }

        .cinematic-bg {
          position: absolute;
          inset: -10%;
          width: 120%;
          height: 120%;
          background-image: url('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1920&q=80');
          background-size: cover;
          background-position: center;
          animation: cinematic-zoom 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          z-index: 1;
        }

        .panic-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          animation: panic-flash 4s ease-in-out forwards;
          mix-blend-mode: multiply;
        }

        .text-glitch {
          position: relative;
          z-index: 10;
          font-family: 'Arial Black', sans-serif;
          font-weight: 900;
          color: white;
          text-shadow: 2px 2px 0px #ff0000, -2px -2px 0px #0000ff;
          animation: glitch-skew 0.3s infinite;
        }
      `}</style>

      {/* Cinematic Background Image (Books/Notes) */}
      <div className="cinematic-bg"></div>

      {/* Red Flash Overlay for "Pain" sensation */}
      <div className="panic-overlay"></div>

      {/* Central Focus Text */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="text-4xl md:text-6xl text-glitch bg-black/70 px-6 py-2 backdrop-blur-sm transform rotate-[-2deg] border-2 border-red-500 mb-4">
           MEMORY FAILED
        </div>
         <div className="text-2xl md:text-3xl text-white font-bold bg-red-600 px-4 py-1 transform rotate-[1deg] shadow-lg">
           死记硬背 = 无效努力 ❌
        </div>
      </div>
    </div>
  );
};
