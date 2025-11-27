import React, { useState, useEffect, useCallback } from 'react';
import { GameLevel, Token } from '../types';
import { processText } from '../services/textProcessor';
import { Button } from './Button';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface GameStageProps {
  rawText: string;
  onBack: () => void;
}

export const GameStage: React.FC<GameStageProps> = ({ rawText, onBack }) => {
  const [level, setLevel] = useState<GameLevel>(GameLevel.LEVEL_1);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [showOriginal, setShowOriginal] = useState(false);

  // 当 level 或 rawText 变化时，初始化或重新生成 tokens
  useEffect(() => {
    setTokens(processText(rawText, level));
  }, [rawText, level]);

  // 切换单个 token 的显示/隐藏状态
  const toggleTokenReveal = (index: number) => {
    setTokens(prev => {
      const newTokens = [...prev];
      if (newTokens[index].isHidden) {
        newTokens[index].isRevealed = !newTokens[index].isRevealed;
      }
      return newTokens;
    });
  };

  const handleLevelChange = (newLevel: GameLevel) => {
    setLevel(newLevel);
    // 注意：useEffect 会处理 tokens 的重新生成
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 flex flex-col h-screen max-h-screen">
      {/* 头部 / 控制栏 */}
      <div className="bg-gray-800 border-b-4 border-gray-900 p-4 mb-4 rounded-xl shadow-lg flex-shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors" title="返回">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl font-bold text-cyan-400 game-font hidden sm:block">探险模式</h2>
          </div>

          {/* 难度等级选择器 */}
          <div className="flex bg-gray-900 p-1 rounded-lg">
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleLevelChange(lvl)}
                className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${
                  level === lvl
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                第 {lvl} 级
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center gap-2"
            >
              {showOriginal ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline">{showOriginal ? '隐藏原文' : '查看原文'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 游戏主区域 */}
      <div className="flex-grow overflow-hidden relative bg-gray-900 rounded-xl border-4 border-gray-700 shadow-inner flex flex-col">
        
        {/* 文本区域 */}
        <div className="flex-grow overflow-y-auto p-6 md:p-8">
            {showOriginal ? (
                 <div className="whitespace-pre-wrap text-xl md:text-2xl leading-relaxed text-emerald-400 font-mono opacity-90">
                    {rawText}
                 </div>
            ) : (
                <div className="flex flex-wrap items-end content-start gap-y-2">
                    {tokens.map((token, idx) => (
                    <TokenView 
                        key={token.id} 
                        token={token} 
                        onClick={() => toggleTokenReveal(idx)} 
                    />
                    ))}
                </div>
            )}
        </div>

        {/* 底部状态提示 */}
        <div className="bg-gray-800 p-2 text-center text-xs text-gray-500 font-mono border-t border-gray-700">
           {showOriginal ? '阅读模式：请通读原文' : '点击方块显示文字 • 朗读尝试还原'}
        </div>
      </div>
    </div>
  );
};

// 单个字符组件
const TokenView: React.FC<{ token: Token; onClick: () => void }> = React.memo(({ token, onClick }) => {
  if (token.isNewline) {
    return <div className="w-full h-4 basis-full"></div>;
  }

  // 可见状态 (标点，或逻辑保留，或用户已揭示)
  const isVisible = !token.isHidden || token.isRevealed;

  return (
    <span
      onClick={token.isHidden ? onClick : undefined}
      className={`
        inline-flex justify-center items-center select-none
        text-xl md:text-2xl font-mono mx-[1px]
        transition-all duration-200 cursor-default
        ${token.isHidden ? 'cursor-pointer hover:scale-110 active:scale-95' : ''}
      `}
      style={{
        minWidth: '1ch',
      }}
    >
      {isVisible ? (
        <span className={`
            ${token.isRevealed ? 'text-yellow-400 animate-pulse' : 'text-gray-200'}
            ${token.isPunctuation ? 'text-pink-400' : ''}
        `}>
          {token.char}
        </span>
      ) : (
        <span className="w-full h-full text-indigo-500 hover:text-indigo-400 font-black">
          X
        </span>
      )}
    </span>
  );
});