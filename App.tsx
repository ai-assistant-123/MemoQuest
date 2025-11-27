import React, { useState } from 'react';
import { InputStage } from './components/InputStage';
import { GameStage } from './components/GameStage';
import { GameLevel } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<{
    started: boolean;
    text: string;
  }>({
    started: false,
    text: '',
  });

  const handleStart = (text: string) => {
    setGameState({
      started: true,
      text: text,
    });
  };

  const handleBack = () => {
    setGameState(prev => ({ ...prev, started: false }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white selection:bg-pink-500 selection:text-white flex flex-col">
      {!gameState.started ? (
        <div className="flex-grow flex items-center justify-center">
            <InputStage onStart={handleStart} defaultText={gameState.text} />
        </div>
      ) : (
        <GameStage rawText={gameState.text} onBack={handleBack} />
      )}
    </div>
  );
};

export default App;