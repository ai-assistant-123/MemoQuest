import React from 'react';
import { Brain, Zap, Activity } from 'lucide-react';

interface IntroAnimationProps {
  isVisible: boolean;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden flex items-center justify-center pointer-events-none">
      <style>{`
        @keyframes bg-pulse {
          0% { filter: brightness(0.6) hue-rotate(0deg); }
          50% { filter: brightness(0.8) hue-rotate(15deg); }
          100% { filter: brightness(0.6) hue-rotate(0deg); }
        }
        
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes data-stream {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes float-tech {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
        }

        .tech-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          /* 科技感蓝色神经背景 */
          background: radial-gradient(circle at center, #1e293b 0%, #020617 100%);
          z-index: 1;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 2;
          mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
        }

        .scan-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 20%;
          background: linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.2), transparent);
          z-index: 3;
          animation: scan-line 3s linear infinite;
        }

        .content-box {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
      `}</style>

      {/* Background Layers */}
      <div className="tech-bg"></div>
      <div className="grid-overlay"></div>
      <div className="scan-bar"></div>

      {/* Central Content */}
      <div className="content-box">
         
         {/* Icon Group */}
         <div className="flex items-center justify-center mb-8 gap-4 animate-[data-stream_0.8s_ease-out_forwards]">
            <Activity size={40} className="text-cyan-500 animate-pulse" />
            <div className="relative">
                <Brain size={100} className="text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
                <Zap size={40} className="text-yellow-400 absolute -top-2 -right-2 animate-bounce" fill="currentColor" />
            </div>
            <Activity size={40} className="text-cyan-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
         </div>

        {/* Main Title */}
        <div className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 tracking-tighter mb-6 drop-shadow-2xl animate-[float-tech_3s_ease-in-out_infinite]" style={{ fontFamily: 'Arial Black, sans-serif' }}>
           记忆的<span className="text-white">科学真相</span>
        </div>
        
        {/* Data Card */}
        <div className="bg-gray-900/80 border border-cyan-500/50 rounded-xl px-8 py-6 backdrop-blur-md max-w-2xl animate-[data-stream_1s_ease-out_0.3s_forwards] shadow-[0_0_30px_rgba(6,182,212,0.2)]">
           <div className="flex justify-between items-end gap-12 mb-2 border-b border-gray-700 pb-2">
              <div className="text-gray-400 text-sm font-mono">被动阅读 (Passive)</div>
              <div className="text-gray-400 text-sm font-mono">主动提取 (Active)</div>
           </div>
           <div className="flex justify-between items-end gap-12 font-mono font-bold">
              <div className="text-3xl text-gray-500">10% <span className="text-xs">留存</span></div>
              <div className="text-5xl text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">90% <span className="text-sm">留存</span></div>
           </div>
           <div className="mt-4 text-cyan-200 text-sm font-mono">
              Source: NTL Institute (Learning Pyramid)
           </div>
        </div>

      </div>
    </div>
  );
};