import React, { useState, useEffect, useRef } from 'react';
import { InputStage } from './components/InputStage';
import { GameStage } from './components/GameStage';
import { SettingsModal } from './components/SettingsModal';
import { DemoOverlay } from './components/DemoOverlay';
import { DEFAULT_MODEL_SETTINGS, ModelSettings } from './types';

const EXAMPLE_TEXT = `可行性分析
可行性是指在企业当前的条件下,是否有必要建设新系统,以及建设新系统的工作是否具备必要的条件。也就是说,可行性包括必要性和可能性。
软件系统的可行性分析包括经济可行性、技术可行性、法律可行性和用户使用可行性,分别从项目建设的经效益、技术方案、制度因素和用户使用等四个方面对系统建设的必要性和可能性进行评估。
经济可行性主要评估项目的建设成本、运行成本和项目建成后可能的经济收益。`;

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

  // 设置弹窗开关
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- 自动演示状态 ---
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStepIndex, setDemoStepIndex] = useState(0);
  const [demoSubtitle, setDemoSubtitle] = useState('');
  const [demoHighlightId, setDemoHighlightId] = useState<string | null>(null);

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
    // 退出演示模式（如果是手动返回）
    if (isDemoRunning) {
      setIsDemoRunning(false);
      window.speechSynthesis.cancel();
    }
  };

  // 启动自动演示
  const startDemo = () => {
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
      text: "我们自动填入演示文本《可行性分析》，并点击'开始记忆'进入闯关。",
      targetId: "btn-start-game",
      action: () => setGameState(prev => ({ ...prev, text: EXAMPLE_TEXT })),
    },
    {
      text: "正在加载游戏界面...",
      targetId: null,
      action: () => handleStart(EXAMPLE_TEXT),
    },
    {
      text: "游戏开始！当前是第一级：间隔隐藏。你看，文中约一半的词汇被隐藏了。",
      targetId: "btn-level-1",
    },
    {
      text: "遇到想不起来的词，点击这些 'X' 占位符，就能查看答案。",
      targetId: "demo-first-hidden-token",
      action: () => {
        const el = document.getElementById('demo-first-hidden-token');
        if (el) el.click();
      },
    },
    {
      text: "熟悉后切换到第二级：句末隐藏。每句话只保留开头，迫使你回忆整句。",
      targetId: "btn-level-2",
      action: () => {
         const el = document.getElementById('btn-level-2');
         if (el) el.click();
      }
    },
    {
      text: "最后是第三级：仅留段首。除段落开头的词外全部隐藏，挑战终极记忆。",
      targetId: "btn-level-3",
      action: () => {
         const el = document.getElementById('btn-level-3');
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
      text: "这是重置按钮，点击它将当前关卡的所有文字恢复为隐藏状态，重新开始测试。",
      targetId: "tool-reset",
    },
    {
      text: "这是设置按钮，可以在这里配置AI模型参数，切换Google Gemini或自定义模型。",
      targetId: "tool-settings",
    },
    {
      text: "这是帮助按钮，随时可以查看三级输出记忆法的详细原理说明。",
      targetId: "btn-help-main",
    },
    {
      text: "演示结束。现在，轮到你来挑战了！",
      targetId: null,
      action: () => {
        // Finalize demo
        setTimeout(() => setIsDemoRunning(false), 3000);
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

    // 1. 设置UI状态
    setDemoSubtitle(step.text);
    setDemoHighlightId(step.targetId);

    // 2. 执行动作 (部分动作可能导致重渲染，需要延时确保 DOM 存在)
    // 对于页面切换动作，我们先说话，说完再切换下一步，或者动作立即执行，高亮延时寻找
    // 简单起见：动作在 Step 开始时立即执行
    if (step.action) {
        step.action();
    }

    // 3. 语音播报
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(step.text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;

    utterance.onend = () => {
        if (isDemoRunning) {
           // 稍微停顿后进入下一步
           setTimeout(() => {
               setDemoStepIndex(prev => prev + 1);
           }, 500);
        }
    };

    // 错误处理：如果 TTS 失败，自动跳过
    utterance.onerror = (e) => {
        console.warn("TTS Error, skipping step", e);
        if (isDemoRunning) {
             setTimeout(() => {
               setDemoStepIndex(prev => prev + 1);
           }, 2000);
        }
    };

    window.speechSynthesis.speak(utterance);

    // 清理
    return () => {
        // 不在这里 cancel，因为 step 切换会触发清理，导致语音截断
        // 只有组件卸载或 demo 停止时才 cancel
    };
  }, [isDemoRunning, demoStepIndex]);


  return (
    <div className="min-h-screen bg-gray-900 text-white selection:bg-pink-500 selection:text-white flex flex-col">
      {/* 演示层 Overlay */}
      <DemoOverlay 
        isActive={isDemoRunning} 
        targetId={demoHighlightId} 
        subtitle={demoSubtitle} 
      />

      {/* 根据 started 状态切换视图 */}
      {!gameState.started ? (
        <div className="flex-grow flex items-center justify-center">
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
        />
      )}

      {/* 全局设置弹窗 */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={modelSettings}
        onSettingsChange={setModelSettings}
      />
    </div>
  );
};

export default App;