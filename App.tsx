import React, { useState, useEffect, useRef } from 'react';
import { InputStage } from './components/InputStage';
import { GameStage } from './components/GameStage';
import { SettingsModal } from './components/SettingsModal';
import { DemoOverlay } from './components/DemoOverlay';
import { IntroAnimation } from './components/IntroAnimation';
import { DEFAULT_MODEL_SETTINGS, ModelSettings, Theme } from './types';
import { TTSService } from './services/ttsService';

const EXAMPLE_TEXT = `桃花源记
东晋·陶渊明

晋太元中，武陵人捕鱼为业。缘溪行，忘路之远近。忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。渔人甚异之。复前行，欲穷其林。

林尽水源，便得一山，山有小口，仿佛若有光。便舍船，从口入。初极狭，才通人。复行数十步，豁然开朗。土地平旷，屋舍俨然，有良田美池桑竹之属。阡陌交通，鸡犬相闻。其中往来种作，男女衣着，悉如外人。黄发垂髫，并怡然自乐。

见渔人，乃大惊，问所从来，具答之。便要还家，设酒杀鸡作食。村中闻有此人，咸来问讯。自云先世避秦时乱，率妻子邑人来此绝境，不复出焉，遂与外人间隔。问今是何世，乃不知有汉，无论魏晋。此人一一为具言所闻，皆叹惋。余人各复延至其家，皆出酒食。停数日，辞去。此中人语云：“不足为外人道也。”

既出，得其船，便扶向路，处处志之。及郡下，诣太守，说如此。太守即遣人随其往，寻向所志，遂迷，不复得路。

南阳刘子骥，高尚士也，闻之，欣然规往。未果，寻病终，后遂无问津者。`;

interface DemoStep {
  text: string;
  targetId: string | null; // Special ID "INTRO_SCENE" triggers the opening animation
  action?: () => void;
  delay?: number; // Optional delay in ms after speech finishes
}

const App: React.FC = () => {
  // 管理顶层应用状态
  const [gameState, setGameState] = useState<{
    started: boolean; // 是否已进入游戏模式
    text: string;     // 当前需要记忆的文本
  }>(() => {
    // 自动加载上次存储的内容
    const savedText = typeof window !== 'undefined' ? localStorage.getItem('memoquest_content') : '';
    return {
      started: false,
      text: savedText || '',
    };
  });

  // 全局字号等级管理，默认等级 2 (text-lg)
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(2);

  // 全局模型配置
  const [modelSettings, setModelSettings] = useState<ModelSettings>(DEFAULT_MODEL_SETTINGS);
  
  // 主题设置 (优先读取本地存储)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      // 默认使用浅色 (Day mode)
      return 'light';
    }
    return 'light';
  });

  // 设置弹窗开关
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- 自动演示状态 ---
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [showIntro, setShowIntro] = useState(false); // 控制开场动画显示
  const [demoStepIndex, setDemoStepIndex] = useState(0);
  const [demoSubtitle, setDemoSubtitle] = useState('');
  const [demoHighlightId, setDemoHighlightId] = useState<string | null>(null);

  // 初始化主题并持久化
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  // 开始游戏回调
  const handleStart = (text: string) => {
    setGameState({
      started: true,
      text: text,
    });
  };

  // 停止自动演示
  const stopDemo = () => {
    setIsDemoRunning(false);
    setShowIntro(false);
    TTSService.instance.stop();
    setDemoStepIndex(0);
  };

  // 返回输入页回调 (保留当前文本以便修改)
  const handleBack = () => {
    setGameState(prev => ({ ...prev, started: false }));
    // 退出演示模式（如果是手动返回）
    if (isDemoRunning) {
      stopDemo();
    }
  };

  // 启动自动演示
  const startDemo = async () => {
    // 强制回到输入页，以便从头开始演示流程
    setGameState(prev => ({ ...prev, started: false }));
    // 必须在用户点击事件中初始化音频上下文 (针对 Google TTS)
    await TTSService.instance.init();
    setIsDemoRunning(true);
    setDemoStepIndex(0);
  };

  // 宣传视频脚本 (Promotional Video Script)
  const demoScript: DemoStep[] = [
    {
      text: "还在用“死记硬背”法折磨自己？背了忘，忘了背，效率低到想哭？",
      targetId: "INTRO_SCENE", // Triggers IntroAnimation
      action: () => setGameState(prev => ({ ...prev, text: '' })), 
    },
    {
      text: "试试 MemoQuest。基于认知心理学的“提取练习”法。一键粘贴，把枯燥的文章瞬间变成记忆游戏！",
      targetId: "btn-paste",
      action: () => setGameState(prev => ({ ...prev, text: EXAMPLE_TEXT })),
    },
    {
      text: "开始练习...",
      targetId: "btn-start-game",
      action: () => handleStart(EXAMPLE_TEXT),
    },
    {
      text: "第一关：间隔隐藏。像完形填空一样，保留 50% 的线索。",
      targetId: "display-level-indicator",
    },
    {
      text: "想不起来了？点一下AI视觉线索按钮让 AI 变出 Emoji 提示你！Emoji生成后可在占位符 -> 图标 -> 文字间循环点击切换。使用此按钮需要在设置界面配置好AI模型参数",
      targetId: "tool-ai-clues",
      action: () => {
        const el = document.getElementById('tool-ai-clues');
        if (el) el.click();
      },
      delay: 25000
    },
    {
      text: "看，文字变成了生动的 Emoji 图标，辅助记忆！",
      targetId: "root", 
    },
    {
      text: "觉得简单？挑战进阶！第二关：只留句首。",
      targetId: "btn-nav-next",
      action: () => {
         const el = document.getElementById('btn-nav-next');
         if (el) el.click();
      }
    },
    {
      text: "第三关：只留段首！逼迫大脑主动回忆，这才是记忆的终极秘诀。",
      targetId: "btn-nav-next",
      action: () => {
         const el = document.getElementById('btn-nav-next');
         if (el) el.click();
      }
    },
    {
      text: "自带拟真语音朗读。",
      targetId: "btn-tts-play",
    },
    {
      text: "支持夜间模式护眼。",
      targetId: "btn-theme-dark",
      action: () => setIsSettingsOpen(true),
    },
    {
      text: "一键切换。",
      targetId: "btn-theme-dark",
      action: () => {
        const el = document.getElementById('btn-theme-dark');
        if (el) el.click();
      }
    },
    {
      text: "随时随地，想背就背。",
      targetId: "btn-settings-close",
      action: () => {
        const el = document.getElementById('btn-settings-close');
        if (el) el.click();
        
        // Show off font size change after closing settings
        setTimeout(() => {
             const plus = document.getElementById('btn-fontsize-increase');
             if(plus) { plus.click(); setTimeout(() => plus.click(), 300); }
        }, 500);
      }
    },
    {
      text: "别再死磕课本了。用输出倒逼输入，这才是学霸的打开方式。MemoQuest，现在就去试试！",
      targetId: "root",
      action: () => {
        setTimeout(() => {
          stopDemo();
        }, 7000);
      }
    }
  ];

  // 演示执行逻辑
  useEffect(() => {
    if (!isDemoRunning) {
        setDemoHighlightId(null);
        setDemoSubtitle('');
        setShowIntro(false);
        return;
    }

    const step = demoScript[demoStepIndex];
    if (!step) {
        setIsDemoRunning(false);
        return;
    }

    let isCancelled = false;

    // 1. 设置UI状态
    setDemoSubtitle(step.text);
    
    // Check for special scene ID
    if (step.targetId === 'INTRO_SCENE') {
      setShowIntro(true);
      setDemoHighlightId(null);
    } else {
      setShowIntro(false);
      setDemoHighlightId(step.targetId);
    }

    // 2. 执行动作
    if (step.action) {
        step.action();
    }

    // 3. 语音播报 (使用 TTSService)
    // 演示模式默认使用 1.2 倍速，节奏更快
    TTSService.instance.speak(step.text, modelSettings, 1.2).then(() => {
        if (isCancelled || !isDemoRunning) return;
        
        const delay = step.delay || 600;
        
        // 稍微停顿后进入下一步
        setTimeout(() => {
            if (!isCancelled && isDemoRunning) {
                setDemoStepIndex(prev => prev + 1);
            }
        }, delay);
    });

    // 清理
    return () => {
        isCancelled = true;
        // 注意：这里不要调用 stop()，否则会打断正在进行的 Promise 链导致语音截断
        // 只有在完全退出演示模式时 (stopDemo 被调用) 才由 stopDemo 主动调用 stop()
    };
  }, [isDemoRunning, demoStepIndex, modelSettings]);


  return (
    <div className="min-h-screen bg-paper dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 flex flex-col selection:bg-pink-500 selection:text-white relative">
      {/* 开场动画层 (Intro Scene) */}
      <IntroAnimation isVisible={showIntro} />

      {/* 演示层 Overlay */}
      <DemoOverlay 
        isActive={isDemoRunning && !showIntro} 
        targetId={demoHighlightId} 
        subtitle={demoSubtitle} 
        onExit={stopDemo}
      />

      {/* 根据 started 状态切换视图 */}
      {!gameState.started ? (
        <div className="flex-grow flex flex-col md:justify-center w-full">
            <InputStage 
              onStart={handleStart} 
              onStartDemo={startDemo}
              defaultText={gameState.text}
              fontSizeLevel={fontSizeLevel}
              setFontSizeLevel={setFontSizeLevel}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
        </div>
      ) : (
        <GameStage 
          rawText={gameState.text} 
          onBack={handleBack}
          fontSizeLevel={fontSizeLevel}
          setFontSizeLevel={setFontSizeLevel}
          onOpenSettings={() => setIsSettingsOpen(true)}
          modelSettings={modelSettings}
          demoElementId={demoHighlightId}
          onStartDemo={startDemo}
        />
      )}

      {/* 全局设置弹窗 */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={modelSettings}
        onSettingsChange={setModelSettings}
        theme={theme}
        onThemeChange={setTheme}
      />
    </div>
  );
};

export default App;