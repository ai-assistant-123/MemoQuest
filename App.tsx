import React, { useState, useEffect } from 'react';
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
  waitForEvent?: string; // Optional: Wait for a specific game event before proceeding
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

  // Event coordination refs for Demo
  const demoEventResolveRef = React.useRef<(() => void) | null>(null);
  const demoExpectedEventRef = React.useRef<string | null>(null);

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
    // Cleanup event listeners
    if (demoEventResolveRef.current) {
        demoEventResolveRef.current(); // Unblock if pending
        demoEventResolveRef.current = null;
    }
    demoExpectedEventRef.current = null;
  };

  // 返回输入页回调 (保留当前文本以便修改)
  const handleBack = () => {
    setGameState(prev => ({ ...prev, started: false }));
    // 退出演示模式（如果是手动返回）
    if (isDemoRunning) {
      stopDemo();
    }
  };

  // 宣传视频脚本 (硬核科普风 + 原理呈现)
  const demoScript: DemoStep[] = [
    // --- 0-3秒：数据揭秘 (Hook) ---
    {
      text: "根据学习金字塔理论，单纯阅读的留存率仅为10%。这就是你“背了就忘”的根本原因。科学的记忆不是“输入”，而是“提取”。",
      targetId: "INTRO_SCENE", // Triggers IntroAnimation (Scientific Tech Theme)
      action: () => setGameState(prev => ({ ...prev, text: '' })), 
    },
    {
      text: "MemoQuest 将认知心理学三大定律转化为三级闯关练习。",
      targetId: "root",
    },
    {
      text: "一键粘贴要记忆的文本，让大脑立刻进入备战状态。",
      targetId: "btn-paste",
      action: () => setGameState(prev => ({ ...prev, text: EXAMPLE_TEXT })),
    },
    {
      text: "定律一：必要难度。",
      targetId: "btn-start-game",
      action: () => handleStart(EXAMPLE_TEXT),
    },
    {
      text: "Level 1：认知脚手架。间隔遮蔽降低负荷，利用完形填空效应激活海马体。",
      targetId: "display-level-indicator",
    },
    {
      text: "定律二：预测编码。",
      targetId: "btn-nav-next",
      action: () => {
         const el = document.getElementById('btn-nav-next');
         if (el) el.click();
      }
    },
    {
      text: "Level 2 仅留句首，强迫大脑进行主动预测，强化神经突触连接。",
      targetId: "display-level-indicator",
    },
    {
      text: "定律三：生成效应。",
      targetId: "btn-nav-next",
      action: () => {
         const el = document.getElementById('btn-nav-next');
         if (el) el.click();
      }
    },
    {
      text: "Level 3 全屏留白，输出倒逼输入，这是形成长期记忆的黄金路径。",
      targetId: "display-level-indicator",
    },

    {
      text: "遇到瓶颈？利用双重编码理论。语音与图像双通道输入，记忆更加稳固。",
      targetId: "tool-ai-clues",
    },
    {
      text: "人工智能模型实时将抽象概念转化为具象 Emoji，构建视觉锚点。",
      targetId: "tool-ai-clues",
      action: () => {
        const el = document.getElementById('tool-ai-clues');
        if (el) el.click();
      },
      waitForEvent: 'clues_generated' // Wait for AI generation to complete
    },
    {
      text: "看，占位字符变成了生动的 Emoji 图标。",
      targetId: "root",
    },
    {
      text: "哪里想不起来就点哪里。将枯燥的背诵转化为多巴胺驱动的探索游戏。",
      targetId: "demo-first-hidden-token",
      action: () => {
          // 模拟点击第一个隐藏组
          const el = document.getElementById('demo-first-hidden-token');
          if (el) el.click(); 
      }
    },

    // --- 多感官 (Split into 3 steps for precise timing) ---
    // Step 1: Narrate the concept
    {
      text: "听觉回路协同。高拟真 TTS 语音，实现“眼耳口脑”全方位沉浸。",
      targetId: "btn-tts-play",
    },
    // Step 2: Trigger Play and Wait for sound to actually start
    {
      text: "",
      targetId: "btn-tts-play",
      action: () => {
          const el = document.getElementById('btn-tts-play');
          if (el) el.click();
      },
      waitForEvent: 'game_tts_start',
    },
    {
      text: "",
      targetId: "btn-tts-play",
      delay: 5000
    },
    // Step 3: Trigger Stop
    {
      text: "",
      targetId: "btn-tts-play",
      action: () => {
          const el = document.getElementById('btn-tts-play');
          if (el) el.click();
      },
    },

    // --- 视觉工程学 (Visual Ergonomics) ---
    {
      text: "视觉工程学介入。界面不仅仅是容器，更是认知的延伸。",
      targetId: "btn-theme-light",
      action: () => {
        setIsSettingsOpen(true)
      },
    },
    {
      text: "一键切换夜间模式。阻断蓝光，为夜间深度记忆保驾护航。",
      targetId: "btn-theme-dark",
      action: () => setTheme('dark'),
    },
    {
      text: "日间模式高对比度唤醒大脑，动态适配你的生理节律。",
      targetId: "btn-theme-light",
      action: () => setTheme('light'),
    },
    {
      text: "",
      targetId: "btn-theme-light",
      action: () => setIsSettingsOpen(false),
    },

    // --- 总结 ---
    {
      text: "MemoQuest：拒绝伪勤奋，用科学武装大脑。现在就开始，体验“心流”级的高效记忆吧。",
      targetId: "root",
    },
    {
      text: "",
      targetId: "root",
      action: () => stopDemo(),
    }
  ];

  // 启动自动演示
  const startDemo = async () => {
    // 强制回到输入页，以便从头开始演示流程
    setGameState(prev => ({ ...prev, started: false }));
    // 必须在用户点击事件中初始化音频上下文 (针对 Google TTS)
    await TTSService.instance.init();
    
    // --- 预加载优化：提前加载前几步的语音 ---
    // Reduced from 3 to 2 to prevent 429
    const PRELOAD_COUNT = 2;
    for (let i = 0; i < Math.min(demoScript.length, PRELOAD_COUNT); i++) {
        const step = demoScript[i];
        if (step.text) {
             // 使用带前缀的 ID 避免与其他缓存冲突
             TTSService.instance.preload(step.text, modelSettings, `DEMO_${i}`);
        }
    }

    setIsDemoRunning(true);
    setDemoStepIndex(0);
  };

  // Game Event Handler for Demo synchronization
  const handleGameEvent = (event: string) => {
    if (isDemoRunning && demoExpectedEventRef.current === event && demoEventResolveRef.current) {
        demoEventResolveRef.current();
        demoEventResolveRef.current = null;
        demoExpectedEventRef.current = null;
    }
  };

  // 演示执行逻辑
  useEffect(() => {
    if (!isDemoRunning) {
        setDemoHighlightId(null);
        setDemoSubtitle('');
        setShowIntro(false);
        demoEventResolveRef.current = null;
        demoExpectedEventRef.current = null;
        return;
    }

    const step = demoScript[demoStepIndex];
    if (!step) {
        setIsDemoRunning(false);
        return;
    }

    let isCancelled = false;

    // --- 滚动预加载：始终保持后续 2 步的语音在缓存中 ---
    // Reduced lookahead from 3 to 2
    const PRELOAD_LOOKAHEAD = 2;
    for (let i = 1; i <= PRELOAD_LOOKAHEAD; i++) {
        const nextIndex = demoStepIndex + i;
        if (nextIndex < demoScript.length) {
            const nextStep = demoScript[nextIndex];
            if (nextStep && nextStep.text) {
                TTSService.instance.preload(nextStep.text, modelSettings, `DEMO_${nextIndex}`);
            }
        }
    }

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

    // 2. 准备事件等待 (Wait Logic)
    let eventPromise = Promise.resolve();
    if (step.waitForEvent) {
        demoExpectedEventRef.current = step.waitForEvent;
        eventPromise = new Promise<void>((resolve) => {
            demoEventResolveRef.current = resolve;
        });
    } else {
        demoExpectedEventRef.current = null;
        demoEventResolveRef.current = null;
    }

    // 3. 执行动作
    if (step.action) {
        step.action();
    }

    // 4. 语音播报 + 等待事件
    // 使用 uniqueId (DEMO_index) 确保命中预加载的缓存
    const ttsPromise = TTSService.instance.speak(
        step.text, 
        modelSettings, 
        1.2,
        `DEMO_${demoStepIndex}` 
    );
    
    Promise.all([ttsPromise, eventPromise]).then(() => {
        if (isCancelled || !isDemoRunning) return;
        
        const delay = step.delay || 800;
        
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
        // 如果正在等待事件，组件卸载或步骤切换时，强制解决 promise 防止内存泄漏
        if (demoEventResolveRef.current) {
             demoEventResolveRef.current();
             demoEventResolveRef.current = null;
        }
    };
  }, [isDemoRunning, demoStepIndex, modelSettings]);


  return (
    <div className="min-h-screen bg-paper dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 flex flex-col selection:bg-pink-500 selection:text-white relative">
      
        {/* 开场动画层 (Intro Scene) - 按需加载 */}
        {showIntro && <IntroAnimation isVisible={true} />}

        {/* 演示层 Overlay - 按需加载 */}
        {isDemoRunning && !showIntro && (
          <DemoOverlay 
            isActive={true} 
            targetId={demoHighlightId} 
            subtitle={demoSubtitle} 
            onExit={stopDemo}
          />
        )}

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
          /* GameStage 只有在 started 为 true 时才开始加载网络资源 */
          <GameStage 
            rawText={gameState.text} 
            onBack={handleBack}
            fontSizeLevel={fontSizeLevel}
            setFontSizeLevel={setFontSizeLevel}
            onOpenSettings={() => setIsSettingsOpen(true)}
            modelSettings={modelSettings}
            demoElementId={demoHighlightId}
            onStartDemo={startDemo}
            onGameEvent={handleGameEvent}
          />
        )}

        {/* 全局设置弹窗 - 按需加载 */}
        {isSettingsOpen && (
          <SettingsModal 
            isOpen={true}
            onClose={() => setIsSettingsOpen(false)}
            settings={modelSettings}
            onSettingsChange={setModelSettings}
            theme={theme}
            onThemeChange={setTheme}
          />
        )}
      
    </div>
  );
};

export default App;