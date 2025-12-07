import React, { useState, useEffect, useRef } from 'react';
import { InputStage } from './components/InputStage';
import { GameStage } from './components/GameStage';
import { SettingsModal } from './components/SettingsModal';
import { DemoOverlay } from './components/DemoOverlay';
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
  targetId: string | null;
  action?: () => void;
  // waitAfter?: number; // removed: relying on speech end
}

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
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(2);

  // 全局模型配置
  const [modelSettings, setModelSettings] = useState<ModelSettings>(DEFAULT_MODEL_SETTINGS);
  
  // 主题设置 (优先读取本地存储)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      // 默认使用深色
      return 'dark';
    }
    return 'dark';
  });

  // 设置弹窗开关
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- 自动演示状态 ---
  const [isDemoRunning, setIsDemoRunning] = useState(false);
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
    // 必须在用户点击事件中初始化音频上下文 (针对 Google TTS)
    await TTSService.instance.init();
    setIsDemoRunning(true);
    setDemoStepIndex(0);
  };

  // 演示脚本
  const demoScript: DemoStep[] = [
    {
      text: "欢迎来到 MemoQuest。首先介绍输入区的便捷工具。",
      targetId: null,
      action: () => setGameState(prev => ({ ...prev, text: '' })), // Clear initially just in case
    },
    {
      text: "这是粘贴按钮，可以一键将剪贴板中的长篇文章粘贴到输入框中。",
      targetId: "btn-paste",
    },
    {
      text: "这是清除按钮，用于一键清空当前输入的所有内容。",
      targetId: "btn-clear",
    },
    {
      text: "我们自动填入演示文本《桃花源记》，并点击'开始记忆'进入闯关。",
      targetId: "btn-start-game",
      action: () => setGameState(prev => ({ ...prev, text: EXAMPLE_TEXT })),
    },
    {
      text: "正在加载练习界面...",
      targetId: null,
      action: () => handleStart(EXAMPLE_TEXT),
    },
    {
      text: "练习开始！当前是第一级：间隔隐藏。你看，文中约一半的词汇被隐藏了。",
      targetId: "display-level-indicator",
    },
    {
      text: "遇到想不起来的词，点击这些下划线占位符，就能查看答案。",
      targetId: "demo-first-hidden-token",
      action: () => {
        const el = document.getElementById('demo-first-hidden-token');
        if (el) el.click();
      },
    },
    {
      text: "点击右侧箭头，切换到第二级：句末隐藏。每句话只保留开头。",
      targetId: "btn-nav-next",
      action: () => {
         const el = document.getElementById('btn-nav-next');
         if (el) el.click();
      }
    },
    {
      text: "再点击箭头进入第三级：仅留段首。除段落开头的词外全部隐藏，挑战终极记忆。",
      targetId: "btn-nav-next",
      action: () => {
         const el = document.getElementById('btn-nav-next');
         if (el) el.click();
      }
    },
    {
      text: "这是字号调节工具，可以灵活调整文字显示大小，支持7个等级，满足不同阅读习惯。",
      targetId: "tool-fontsize",
    },
    {
      text: "这是AI视觉线索按钮，可以将隐藏的文字转化为生动的Emoji图标，辅助记忆。",
      targetId: "tool-ai-clues",
    },
    {
      text: "点击朗读按钮，系统会通过高拟真的语音朗读原文，支持长文本智能分段。",
      targetId: "btn-tts-play",
    },
    {
      text: "这是朗读模式切换，开启循环播放后，会对当前段落进行反复朗读。",
      targetId: "btn-tts-loop",
    },
    {
      text: "这是倍速调节，支持0.5到2.0倍速，帮助你进行快速听力训练。",
      targetId: "select-tts-rate",
    },
    {
      text: "点击这里可以随时查看原文进行核对。",
      targetId: "tool-peek",
    },
    {
      text: "这是重置按钮，点击它将当前关卡的所有文字恢复为隐藏状态，重新开始练习。",
      targetId: "tool-reset",
    },
    {
      text: "这是设置按钮，可以在这里配置AI模型参数，切换主题，或配置语音。",
      targetId: "tool-settings",
    },
    {
      text: "这是帮助按钮，随时可以查看三级输出记忆法的详细原理说明。",
      targetId: "btn-help-main",
    },
    {
      text: "演示结束。如果想要返回，点击左侧箭头的“返回”功能即可返回上一级。",
      targetId: "btn-nav-prev",
      action: () => {
        // Finalize demo
        setTimeout(() => {
          stopDemo();
        }, 6000);
      }
    }
  ];

  // 演示执行逻辑
  useEffect(() => {
    if (!isDemoRunning) {
        setDemoHighlightId(null);
        setDemoSubtitle('');
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
    setDemoHighlightId(step.targetId);

    // 2. 执行动作
    if (step.action) {
        step.action();
    }

    // 3. 语音播报 (使用 TTSService)
    // 演示模式默认使用 1.1 倍速，但使用设置中的 Provider 和 Voice
    TTSService.instance.speak(step.text, modelSettings, 1.1).then(() => {
        if (isCancelled || !isDemoRunning) return;
        
        // 稍微停顿后进入下一步
        setTimeout(() => {
            if (!isCancelled && isDemoRunning) {
                setDemoStepIndex(prev => prev + 1);
            }
        }, 500);
    });

    // 清理
    return () => {
        isCancelled = true;
        // 注意：这里不要调用 stop()，否则会打断正在进行的 Promise 链导致语音截断
        // 只有在完全退出演示模式时 (stopDemo 被调用) 才由 stopDemo 主动调用 stop()
    };
  }, [isDemoRunning, demoStepIndex, modelSettings]);


  return (
    <div className="min-h-screen bg-paper dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 flex flex-col selection:bg-pink-500 selection:text-white">
      {/* 演示层 Overlay */}
      <DemoOverlay 
        isActive={isDemoRunning} 
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