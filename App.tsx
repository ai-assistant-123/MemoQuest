import React, { useState } from 'react';
import { InputStage } from './components/InputStage';
import { GameStage } from './components/GameStage';
import { FONT_SIZE_CLASSES } from './types';

const App: React.FC = () => {
  // 管理顶层应用状态
  const [gameState, setGameState] = useState<{
    started: boolean; // 是否已进入游戏模式
    text: string;     // 当前需要记忆的文本
  }>({
    started: false,
    text: '',
  });

  // 全局字号等级管理，默认等级 2 (text-lg)
  // 状态提升至 App 层级，以保证在切换界面时字号偏好不丢失
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(2);

  // 开始游戏回调
  const handleStart = (text: string) => {
    setGameState({
      started: true,
      text: text,
    });
  };

  // 返回输入页回调 (保留当前文本以便修改)
  const handleBack = () => {
    setGameState(prev => ({ ...prev, started: false }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white selection:bg-pink-500 selection:text-white flex flex-col">
      {/* 根据 started 状态切换视图 */}
      {!gameState.started ? (
        <div className="flex-grow flex items-center justify-center">
            <InputStage 
              onStart={handleStart} 
              defaultText={gameState.text}
              fontSizeLevel={fontSizeLevel}
              setFontSizeLevel={setFontSizeLevel}
            />
        </div>
      ) : (
        <GameStage 
          rawText={gameState.text} 
          onBack={handleBack}
          fontSizeLevel={fontSizeLevel}
          setFontSizeLevel={setFontSizeLevel}
        />
      )}
    </div>
  );
};

export default App;