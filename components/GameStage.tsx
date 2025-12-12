
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameLevel, Token, FONT_SIZE_CLASSES, RevealState, ModelSettings, ModelProvider, TTSProvider } from '../types';
import { processText } from '../services/textProcessor';
import { Button } from './Button';
import { HelpModal } from './HelpModal';
import { FontSizeControl } from './FontSizeControl';
import { Eye, EyeOff, CircleHelp, Sparkles, Loader2, RotateCcw, Settings, Volume2, Square, Repeat, ArrowRightToLine, ChevronLeft, ChevronRight, Menu, X, Gauge, Copy, Check, ZapOff } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { TTSService } from '../services/ttsService';
import { generateOfflineEmojis } from '../services/offlineEmojiService';

interface GameStageProps {
  rawText: string;
  onBack: () => void;
  fontSizeLevel: number;
  setFontSizeLevel: (level: number) => void;
  onOpenSettings: () => void;
  modelSettings: ModelSettings;
  demoElementId?: string | null;
  onStartDemo: () => void;
  onGameEvent?: (event: string) => void; // New prop for event communication
}

/**
 * 游戏主舞台组件
 * 核心功能：展示处理后的文本，处理用户交互，管理记忆状态
 */
export const GameStage: React.FC<GameStageProps> = ({ 
  rawText, 
  onBack,
  fontSizeLevel,
  setFontSizeLevel,
  onOpenSettings,
  modelSettings,
  demoElementId,
  onStartDemo,
  onGameEvent
}) => {
  // 游戏状态管理
  const [level, setLevel] = useState<GameLevel>(GameLevel.LEVEL_1);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [showOriginal, setShowOriginal] = useState(false); // 全局查看原文开关
  const [showHelp, setShowHelp] = useState(false);
  const [isResetting, setIsResetting] = useState(false); // 控制重置动画状态
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 移动端菜单开关
  const [copyFeedback, setCopyFeedback] = useState(false); // 拷贝成功反馈状态
  
  // 移动端检测
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 自动演示：移动端自动展开菜单
  useEffect(() => {
    if (!demoElementId) return;
    
    // 这些工具 ID 需要在移动端菜单中展示 (移除了 Font Size 和 Copy, 因为它们现在直接显示在 Header)
    const menuTools = [
       'tool-ai-clues',
       'btn-tts-play', 'btn-tts-loop', 'select-tts-rate',
       'tool-peek', 'tool-reset', 'tool-settings', 'btn-help-main'
    ];
    
    if (isMobile) {
      if (menuTools.includes(demoElementId)) {
        setIsMobileMenuOpen(true);
      } else {
        // 如果目标不在菜单中（例如是文本内容或新的导航按钮），则关闭菜单
        setIsMobileMenuOpen(false);
      }
    }
  }, [demoElementId, isMobile]);
  
  // 语音合成状态
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  
  // Refs for TTS management
  const speakingRef = useRef(false); 
  const playbackRateRef = useRef(1.0);
  const isLoopingRef = useRef(false);
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  
  // Scroll ref for desktop toolbar
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 视觉线索 (Visual Clues) 状态
  const [clues, setClues] = useState<Record<string, string>>({});
  const [isGeneratingClues, setIsGeneratingClues] = useState(false);
  const [usedOfflineMode, setUsedOfflineMode] = useState(false); // 标记是否使用了离线模式

  // 跟踪原始文本的变化，以便仅在内容更改时重置线索
  const prevRawTextRef = useRef(rawText);

  // 同步状态到 Ref 并实时更新 TTS 服务的语速
  useEffect(() => {
    playbackRateRef.current = playbackRate;
    if (isSpeaking) {
      TTSService.instance.setRate(playbackRate);
    }
  }, [playbackRate, isSpeaking]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  // 初始化或当难度/文本改变时，重新计算 Tokens
  useEffect(() => {
    setTokens(processText(rawText, level));
    
    // 仅当文本内容实际发生变化时才重置线索
    // 这样在切换难度等级时，已生成的 AI 线索（Emoji）可以保留
    if (rawText !== prevRawTextRef.current) {
      setClues({});
      setUsedOfflineMode(false);
      prevRawTextRef.current = rawText;
    }
  }, [rawText, level]);

  // 组件卸载时停止朗读
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = () => {
    speakingRef.current = false;
    TTSService.instance.stop();
    setIsSpeaking(false);
    setIsTtsLoading(false);
  };

  const handleCopy = async () => {
    let textToCopy = '';

    if (showOriginal) {
      textToCopy = rawText;
    } else {
      let i = 0;
      while (i < tokens.length) {
        const t = tokens[i];
        
        if (t.isNewline) {
          textToCopy += '\n';
          i++;
          continue;
        }
        
        if (!t.isHidden) {
          textToCopy += t.char;
          i++;
          continue;
        }

        // Hidden group start
        let j = i;
        const groupTokens: Token[] = [];
        while (
          j < tokens.length && 
          tokens[j].isHidden && 
          !tokens[j].isNewline && 
          !tokens[j].isPunctuation
        ) {
          groupTokens.push(tokens[j]);
          j++;
        }

        if (groupTokens.length > 0) {
          const first = groupTokens[0];
          const state = first.revealState;
          const emoji = clues[first.id];

          if (state === RevealState.REVEALED) {
             textToCopy += groupTokens.map(g => g.char).join('');
          } else if (state === RevealState.HIDDEN_ICON && emoji) {
             textToCopy += emoji;
          } else {
             textToCopy += groupTokens.map(() => '_').join('');
          }
        }
        
        i = j;
      }
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
      alert("复制失败，请重试");
    }
  };

  // 播放下一段的核心函数
  const playNext = useCallback(async () => {
    if (!speakingRef.current || chunkIndexRef.current >= chunksRef.current.length) {
       stopAllAudio();
       return;
    }

    const currentIndex = chunkIndexRef.current;
    const chunk = chunksRef.current[currentIndex];

    // --- Preload Mechanism ---
    const nextIndex = currentIndex + 1;
    if (nextIndex < chunksRef.current.length) {
       TTSService.instance.preload(chunksRef.current[nextIndex], modelSettings);
    } else if (isLoopingRef.current && chunksRef.current.length > 0) {
       TTSService.instance.preload(chunksRef.current[0], modelSettings);
    }

    setIsTtsLoading(true);

    try {
      await TTSService.instance.speak(chunk, modelSettings, playbackRateRef.current);
    } catch (e) {
      console.error("Play chunk failed", e);
    } finally {
      setIsTtsLoading(false);
    }

    if (speakingRef.current) {
      chunkIndexRef.current++;
      if (chunkIndexRef.current >= chunksRef.current.length) {
        if (isLoopingRef.current) {
          chunkIndexRef.current = 0;
          playNext();
        } else {
          stopAllAudio();
        }
      } else {
        playNext();
      }
    }
  }, [modelSettings]);


  const toggleSpeech = async () => {
    if (isSpeaking) {
      stopAllAudio();
    } else {
      const chunks = rawText.split(/([。！？；：!?;:\n]+)/).reduce((acc: string[], curr, i) => {
        if (i % 2 === 0) {
          if (curr.trim()) acc.push(curr);
        } else {
          if (acc.length > 0) acc[acc.length - 1] += curr;
        }
        return acc;
      }, []);

      if (chunks.length === 0 && rawText.trim()) chunks.push(rawText);

      chunksRef.current = chunks;
      chunkIndexRef.current = 0;
      speakingRef.current = true;
      setIsSpeaking(true);
      
      if (modelSettings.ttsProvider === TTSProvider.GOOGLE) {
          await TTSService.instance.init();
      }
      
      playNext();
    }
  };

  const handleRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (isSpeaking && modelSettings.ttsProvider === TTSProvider.BROWSER) {
        TTSService.instance.stop();
        setTimeout(() => {
            if (speakingRef.current) playNext();
        }, 50);
    }
  };

  const cycleGroupState = (indices: number[]) => {
    if (indices.length === 0) return;
    const firstIdx = indices[0];
    const firstToken = tokens[firstIdx];
    
    if (!firstToken || !firstToken.isHidden) return;

    const currentState = firstToken.revealState;
    const groupKey = firstToken.id;
    const hasClue = !!clues[groupKey]; 

    let nextState: RevealState;

    if (currentState === RevealState.HIDDEN) {
      nextState = hasClue ? RevealState.HIDDEN_ICON : RevealState.REVEALED;
    } else if (currentState === RevealState.HIDDEN_ICON) {
      nextState = RevealState.REVEALED;
    } else { 
      nextState = RevealState.HIDDEN;
    }

    setTokens(prev => {
      const newTokens = [...prev];
      indices.forEach(idx => {
        if (newTokens[idx]) {
          newTokens[idx].revealState = nextState;
        }
      });
      return newTokens;
    });
  };

  // --- Navigation Logic ---
  const handlePrev = useCallback(() => {
    if (level > GameLevel.LEVEL_1) {
      setLevel(prev => (prev - 1) as GameLevel);
    } else {
      onBack();
    }
  }, [level, onBack]);

  const handleNext = useCallback(() => {
    if (level < GameLevel.LEVEL_3) {
      setLevel(prev => (prev + 1) as GameLevel);
    }
  }, [level]);

  const resetLevel = () => {
    setIsResetting(true);
    setTokens(prev => prev.map(token => ({
      ...token,
      revealState: RevealState.HIDDEN
    })));
    setTimeout(() => setIsResetting(false), 300);
  };

  const generateVisualClues = async () => {
    if (isGeneratingClues) return;
    setIsGeneratingClues(true);
    setUsedOfflineMode(false);

    try {
      const hiddenGroups: { id: string; text: string }[] = [];
      let i = 0;
      while (i < tokens.length) {
        const t = tokens[i];
        if (t.isHidden && !t.isNewline && !t.isPunctuation) {
          const startId = t.id;
          let text = t.char;
          let j = i + 1;
          while (j < tokens.length && tokens[j].isHidden && !tokens[j].isNewline && !tokens[j].isPunctuation) {
            text += tokens[j].char;
            j++;
          }
          hiddenGroups.push({ id: startId, text });
          i = j;
        } else {
          i++;
        }
      }

      if (hiddenGroups.length === 0) {
        alert("当前没有隐藏的文字需要生成线索。");
        setIsGeneratingClues(false);
        onGameEvent?.('clues_generated');
        return;
      }

      const wordsToConvert = hiddenGroups.map(g => g.text);
      let emojiList: string[] = [];
      let offlineFallbackNeeded = false;

      // 尝试使用在线 API
      try {
        if (modelSettings.provider === ModelProvider.GOOGLE) {
          const apiKey = modelSettings.apiKey || process.env.API_KEY;
          if (!apiKey) throw new Error("Missing Google API Key");

          const ai = new GoogleGenAI({ apiKey });
          const prompt = `
            You are a visual memory assistant. 
            Convert the following list of Chinese words/phrases into a SINGLE, representative Emoji for each.
            Input Words: ${JSON.stringify(wordsToConvert)}
            Return ONLY a JSON object where the keys are the indices (0, 1, 2...) and values are the Emojis.
            Example: { "0": "🍎", "1": "🏃" }
          `;

          const response = await ai.models.generateContent({
            model: modelSettings.modelId,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  items: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                }
              }
            }
          });

          const jsonText = response.text;
          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed)) {
            emojiList = parsed;
          } else if (parsed.items && Array.isArray(parsed.items)) {
            emojiList = parsed.items;
          } else {
            emojiList = wordsToConvert.map((_, idx) => parsed[String(idx)] || "❓");
          }

        } else if (modelSettings.provider === ModelProvider.CUSTOM) {
          if (!modelSettings.baseUrl || !modelSettings.apiKey) {
             throw new Error("Missing Custom Provider config");
          }

          const prompt = `
            You are a visual memory assistant. 
            Convert the following list of Chinese words/phrases into a SINGLE, representative Emoji for each.
            Input Words: ${JSON.stringify(wordsToConvert)}
            Return a JSON object with a property "items" containing the array of emojis.
            Example JSON: { "items": ["🍎", "🏃"] }
          `;

          const response = await fetch(`${modelSettings.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${modelSettings.apiKey}`
            },
            body: JSON.stringify({
              model: modelSettings.modelId,
              messages: [
                { role: 'system', content: 'You are a helpful assistant that outputs JSON.' },
                { role: 'user', content: prompt }
              ],
              response_format: { type: "json_object" }
            })
          });

          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }

          const data = await response.json();
          let content = data.choices?.[0]?.message?.content;
          
          if (!content) throw new Error("API response is empty");
          
          // 简单清理和解析逻辑
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          const firstOpen = content.indexOf('{');
          const lastClose = content.lastIndexOf('}');
          if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
             content = content.substring(firstOpen, lastClose + 1);
          }

          const parsed = JSON.parse(content);
          if (parsed.items && Array.isArray(parsed.items)) {
            emojiList = parsed.items;
          } else {
            emojiList = Object.values(parsed);
          }
        } else {
          // No provider logic matched?
          offlineFallbackNeeded = true;
        }
      } catch (err) {
        console.warn("Online generation failed or not configured, switching to offline mode:", err);
        offlineFallbackNeeded = true;
      }

      // 如果在线失败或未配置，执行离线生成
      if (offlineFallbackNeeded) {
        emojiList = generateOfflineEmojis(wordsToConvert);
        setUsedOfflineMode(true);
      }

      const newClues: Record<string, string> = {};
      hiddenGroups.forEach((group, idx) => {
        if (emojiList[idx]) {
          newClues[group.id] = emojiList[idx];
        }
      });

      setClues(prev => ({ ...prev, ...newClues }));

      setTokens(prevTokens => {
        const nextTokens = [...prevTokens];
        let i = 0;
        while (i < nextTokens.length) {
            const t = nextTokens[i];
            if (t.isHidden && !t.isNewline && !t.isPunctuation) {
                const groupId = t.id;
                if (newClues[groupId]) {
                    let j = i;
                    while (j < nextTokens.length && nextTokens[j].isHidden && !nextTokens[j].isNewline && !nextTokens[j].isPunctuation) {
                        if (nextTokens[j].revealState === RevealState.HIDDEN) {
                            nextTokens[j] = { 
                                ...nextTokens[j], 
                                revealState: RevealState.HIDDEN_ICON 
                            };
                        }
                        j++;
                    }
                    i = j;
                } else {
                    let j = i + 1;
                    while (j < nextTokens.length && nextTokens[j].isHidden && !nextTokens[j].isNewline && !nextTokens[j].isPunctuation) {
                        j++;
                    }
                    i = j;
                }
            } else {
                i++;
            }
        }
        return nextTokens;
      });

    } catch (error: any) {
      console.error("Critical Error during clue generation", error);
      alert(`生成线索遇到严重错误: ${error.message}`);
    } finally {
      setIsGeneratingClues(false);
      // Notify parent about completion (for auto-demo)
      if (onGameEvent) {
          onGameEvent('clues_generated');
      }
    }
  };

  const fontSizeClass = FONT_SIZE_CLASSES[fontSizeLevel] || 'text-xl';

  // --- 渲染逻辑 ---
  const renderContent = () => {
    if (showOriginal) {
      return (
        <div id="game-content-original" className={`w-full max-w-none font-mono text-emerald-700 dark:text-emerald-300 transition-all duration-300 ${fontSizeClass}`}>
          {rawText.split('\n').map((line, idx) => {
            if (!line.trim()) {
              return <div key={idx} className="h-4" />; 
            }
            return (
              <p 
                key={idx} 
                className="mb-6 leading-loose tracking-wide text-justify break-words opacity-95"
              >
                {line}
              </p>
            );
          })}
        </div>
      );
    }

    const views = [];
    let i = 0;
    let firstHiddenGroupFound = false;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.isNewline) {
        views.push(<div key={`nl-${i}`} className="w-full h-4 basis-full"></div>);
        i++;
        continue;
      }

      if (!token.isHidden) {
        views.push(
          <TokenView 
            key={token.id} 
            token={token} 
            fontSizeClass={fontSizeClass}
          />
        );
        i++;
        continue;
      }

      const groupIndices: number[] = [];
      const groupTokens: Token[] = [];
      let j = i;
      
      while (
        j < tokens.length && 
        tokens[j].isHidden && 
        !tokens[j].isNewline && 
        !tokens[j].isPunctuation
      ) {
        groupIndices.push(j);
        groupTokens.push(tokens[j]);
        j++;
      }

      const groupState = token.revealState;
      const groupId = token.id;
      const clueEmoji = clues[groupId];
      
      const demoId = !firstHiddenGroupFound ? "demo-first-hidden-token" : undefined;
      if (!firstHiddenGroupFound) firstHiddenGroupFound = true;

      views.push(
        <HiddenGroupView 
          key={`group-${groupId}`}
          id={demoId}
          tokens={groupTokens}
          revealState={groupState}
          emoji={clueEmoji}
          fontSizeClass={fontSizeClass}
          onClick={() => cycleGroupState(groupIndices)}
        />
      );

      i = j;
    }

    return (
      <div className="flex flex-wrap items-end content-start gap-y-2">
        {views}
      </div>
    );
  };

  // Consistent Tool Button Style with InputStage
  const toolBtnClass = "p-2 rounded-lg transition-all active:scale-95 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800";
  const activeToolBtnClass = "p-2 rounded-lg transition-all active:scale-95 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400";

  return (
    <div className="w-full h-screen max-h-screen flex flex-col bg-paper dark:bg-gray-900 overflow-hidden transition-colors duration-300">
      
      {/* --- Mobile Header (Slim) --- */}
      <div className="md:hidden flex-shrink-0 bg-paper/90 backdrop-blur-md dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex justify-between items-center h-14 px-3 relative shadow-md transition-colors">
          {/* Navigation Group */}
          <div className="flex items-center gap-1">
              <button 
                id={isMobile ? "btn-nav-prev" : undefined}
                onClick={handlePrev} 
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95" 
                title={level === 1 ? "返回首页" : "上一级"}
              >
                  <ChevronLeft size={22} />
              </button>
              
              <div 
                id={isMobile ? "display-level-indicator" : undefined}
                className="flex items-center justify-center w-24 h-full"
              >
                  <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">LEVEL {level}</span>
              </div>

              <button 
                id={isMobile ? "btn-nav-next" : undefined}
                onClick={handleNext}
                disabled={level >= 3}
                className={`p-2 transition-colors active:scale-95 ${level >= 3 ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                title={level >= 3 ? "已是最高级" : "下一级"}
              >
                  <ChevronRight size={22} />
              </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
                id={isMobile ? "tool-copy" : undefined}
                onClick={handleCopy}
                className={`p-2 rounded-lg transition-colors active:scale-95 flex items-center justify-center ${copyFeedback ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                title="拷贝当前内容"
            >
                {copyFeedback ? <Check size={22} /> : <Copy size={22} />}
            </button>

            {/* Font Size Control */}
            <div id={isMobile ? "tool-fontsize" : undefined} className="flex items-center">
              <FontSizeControl 
                level={fontSizeLevel} 
                onChange={setFontSizeLevel}
                max={FONT_SIZE_CLASSES.length - 1}
                className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50"
              />
            </div>

            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${isMobileMenuOpen ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      <div 
        className={`md:hidden absolute top-14 left-0 right-0 bottom-0 bg-black/60 dark:bg-black/60 z-40 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div 
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-2xl transition-transform duration-300 ease-out max-h-[85vh] overflow-y-auto p-3 space-y-3 ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}
        >
             {/* ... Mobile Menu Content ... */}
             <div className="grid grid-cols-5 gap-2 h-16">
                <button
                    id={isMobile ? "tool-ai-clues" : undefined}
                    onClick={() => { generateVisualClues(); }}
                    disabled={isGeneratingClues || showOriginal}
                    className="flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-all bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                >
                     {isGeneratingClues ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                     <span className="text-[10px] font-bold scale-90 whitespace-nowrap">AI线索</span>
                </button>

                 <button
                    id={isMobile ? "btn-tts-play" : undefined}
                    onClick={toggleSpeech}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-all ${isSpeaking ? "bg-pink-600 border-pink-700 text-white" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}
                 >
                    {isTtsLoading ? <Loader2 size={16} className="animate-spin" /> : isSpeaking ? <Square size={14} className="fill-current" /> : <Volume2 size={16} />}
                    <span className="text-[10px] font-bold scale-90 whitespace-nowrap">{isSpeaking ? "停止" : "朗读"}</span>
                 </button>

                 <button
                    id={isMobile ? "btn-tts-loop" : undefined}
                    onClick={() => setIsLooping(!isLooping)}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-all ${isLooping ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}
                 >
                    {isLooping ? <Repeat size={16} /> : <ArrowRightToLine size={16} />}
                    <span className="text-[10px] font-bold scale-90 whitespace-nowrap">{isLooping ? "循环" : "单次"}</span>
                 </button>
                 
                 <div className="relative flex flex-col items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                     <Gauge size={16} className="mb-0.5" />
                     <span className="text-[10px] font-bold scale-90 whitespace-nowrap">{playbackRate}x</span>
                     <select
                        id={isMobile ? "select-tts-rate" : undefined}
                        value={playbackRate}
                        onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 z-10"
                     >
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r}>{r}x</option>)}
                     </select>
                 </div>

                 <button
                    id={isMobile ? "tool-peek" : undefined}
                    onClick={() => { setShowOriginal(!showOriginal); setIsMobileMenuOpen(false); }}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-all ${
                        showOriginal ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {showOriginal ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span className="text-[10px] font-bold scale-90 whitespace-nowrap">{showOriginal ? "隐藏" : "原文"}</span>
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <button
                    id={isMobile ? "tool-reset" : undefined}
                    onClick={() => { resetLevel(); setIsMobileMenuOpen(false); }}
                    className="col-span-1 flex flex-row items-center justify-center gap-2 p-2 h-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 transition-all"
                >
                    <RotateCcw size={16} />
                    <span className="text-xs font-bold whitespace-nowrap">重置</span>
                </button>

                <button
                    id={isMobile ? "tool-settings" : undefined}
                    onClick={() => { onOpenSettings(); setIsMobileMenuOpen(false); }}
                    className="col-span-1 flex flex-row items-center justify-center gap-2 p-2 h-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 transition-all"
                >
                    <Settings size={16} />
                    <span className="text-xs font-bold whitespace-nowrap">设置</span>
                </button>

                <button
                    id={isMobile ? "btn-help-main" : undefined}
                    onClick={() => { setShowHelp(true); setIsMobileMenuOpen(false); }}
                    className="col-span-1 flex flex-row items-center justify-center gap-2 p-2 h-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 transition-all"
                >
                    <CircleHelp size={16} />
                    <span className="text-xs font-bold whitespace-nowrap">帮助</span>
                </button>
            </div>
        </div>
      </div>

      {/* --- Desktop Header (Unified) --- */}
      <div className="hidden md:flex flex-shrink-0 justify-between items-center p-3 md:p-4 border-b border-gray-200 dark:border-gray-800 bg-paper/80 dark:bg-gray-900/80 backdrop-blur-md z-20 shadow-sm gap-2">
        {/* Left: Nav */}
        <div className="flex items-center gap-4 flex-shrink-0">
             <div className="flex items-center h-full gap-1">
                <button 
                  id={!isMobile ? "btn-nav-prev" : undefined}
                  onClick={handlePrev} 
                  className={toolBtnClass}
                  title={level === 1 ? "返回首页" : "上一级"}
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div id={!isMobile ? "display-level-indicator" : undefined} className="flex items-center justify-center px-2 min-w-[80px] cursor-default">
                  <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 tracking-wider uppercase">LEVEL {level}</span>
                </div>

                <button 
                  id={!isMobile ? "btn-nav-next" : undefined}
                  onClick={handleNext} 
                  disabled={level >= 3} 
                  className={level >= 3 ? "p-2 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-700 cursor-not-allowed" : toolBtnClass}
                  title={level >= 3 ? "已是最高级" : "下一级"}
                >
                  <ChevronRight size={20} />
                </button>
            </div>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-1 md:gap-2 justify-end flex-1 min-w-0">
             {/* Use scroll container logic in case screen is small, but styled flat */}
            <div 
                id="game-toolbar"
                ref={scrollContainerRef}
                className="flex gap-1 md:gap-2 items-center overflow-x-auto scrollbar-hide scroll-smooth justify-end w-full"
            >
                <div className="shrink-0">
                    <button 
                        id={!isMobile ? "tool-copy" : undefined}
                        onClick={handleCopy}
                        title={copyFeedback ? "已复制到剪贴板" : "拷贝当前内容"}
                        className={copyFeedback ? "p-2 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30" : toolBtnClass}
                    >
                        {copyFeedback ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                </div>

                <div className="shrink-0" id={!isMobile ? "tool-fontsize" : undefined}>
                   <FontSizeControl 
                       level={fontSizeLevel} 
                       onChange={setFontSizeLevel}
                       max={FONT_SIZE_CLASSES.length - 1}
                       className="border-none shadow-none bg-transparent"
                   />
                </div>

                <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 mx-1 shrink-0"></div>

                <div className="shrink-0">
                    <button 
                        id={!isMobile ? "tool-ai-clues" : undefined}
                        onClick={generateVisualClues}
                        disabled={isGeneratingClues || showOriginal}
                        className={toolBtnClass}
                        title="生成视觉线索 (在线/离线双模式)"
                    >
                        {isGeneratingClues ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : usedOfflineMode ? (
                          <ZapOff size={20} className="text-amber-500" />
                        ) : (
                          <Sparkles size={20} />
                        )}
                    </button>
                </div>
                
                {/* TTS Group - styled as a pill */}
                <div id="tool-tts-group" className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 shrink-0 border border-gray-200 dark:border-gray-700">
                  <button
                      id={!isMobile ? "btn-tts-play" : undefined}
                      onClick={toggleSpeech}
                      title={isSpeaking ? (isTtsLoading ? "正在加载... 点击停止" : "停止朗读") : `朗读 (${modelSettings.ttsProvider === TTSProvider.BROWSER ? '本地' : modelSettings.ttsProvider === TTSProvider.GOOGLE ? 'Gemini' : 'OpenAI'})`}
                      className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${isSpeaking ? "bg-pink-600 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                  >
                      {isTtsLoading ? <Loader2 size={16} className="animate-spin" /> : isSpeaking ? <Square size={16} className="fill-current" /> : <Volume2 size={18} />}
                  </button>
                  
                  <button
                      id={!isMobile ? "btn-tts-loop" : undefined}
                      onClick={() => setIsLooping(!isLooping)}
                      className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${isLooping ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                      title={isLooping ? "模式：循环播放" : "模式：单次播放"}
                  >
                      {isLooping ? <Repeat size={16} /> : <ArrowRightToLine size={16} />}
                  </button>

                  <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1"></div>

                  <select
                      id={!isMobile ? "select-tts-rate" : undefined}
                      value={playbackRate}
                      onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                      className="bg-transparent text-gray-600 dark:text-gray-300 text-xs py-0 pl-1 pr-0 rounded cursor-pointer border-none focus:ring-0 w-14 font-bold"
                      title="播放速度"
                  >
                      <option value="0.5">0.5x</option>
                      <option value="0.75">0.75x</option>
                      <option value="1">1.0x</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                      <option value="2">2.0x</option>
                  </select>
                </div>

                <div className="shrink-0">
                    <button 
                        id={!isMobile ? "tool-peek" : undefined}
                        onClick={() => setShowOriginal(!showOriginal)}
                        className={showOriginal ? activeToolBtnClass : toolBtnClass}
                        title={showOriginal ? '隐藏原文' : '查看原文'}
                    >
                        {showOriginal ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>

                <div className="shrink-0">
                    <button
                        id={!isMobile ? "tool-reset" : undefined}
                        onClick={resetLevel}
                        className={toolBtnClass}
                        title="重置当前状态"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
                
                <div className="shrink-0">
                    <button
                        id={!isMobile ? "tool-settings" : undefined}
                        onClick={onOpenSettings}
                        className={toolBtnClass}
                        title="设置"
                    >
                        <Settings size={20} />
                    </button>
                </div>

                <button 
                    id={!isMobile ? "btn-help-main" : undefined}
                    onClick={() => setShowHelp(true)} 
                    className={toolBtnClass}
                    title="帮助"
                >
                    <CircleHelp size={20} />
                </button>
            </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-grow p-3 md:p-6 overflow-hidden flex flex-col items-center">
        <div className="w-full max-w-none h-full flex flex-col bg-paper dark:bg-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden relative transition-colors">
            <div 
              onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)} 
              className={`flex-grow overflow-y-auto px-6 py-8 md:px-12 md:py-10 custom-scrollbar ${isResetting ? 'animate-reset' : ''}`}
            >
                {renderContent()}
                {/* Spacer for bottom safe area on mobile */}
                <div className="h-8 md:hidden"></div>
            </div>

            <div className="hidden md:flex bg-paper/80 dark:bg-gray-900/50 backdrop-blur-sm p-2 text-center text-xs text-gray-500 font-mono border-t border-gray-200 dark:border-gray-800 justify-between px-4 items-center shrink-0 z-10 transition-colors">
               <span>
                 {Object.keys(clues).length > 0 ? '✨ 占位符 -> 图标 -> 文字' : '点击占位符显示文字'}
               </span>
               <span className="hidden sm:inline text-gray-400 dark:text-gray-600 flex items-center gap-2">
                 <span>Level {level}</span>
                 <span>•</span>
                 <span>Clues: {usedOfflineMode ? 'Offline (Local)' : modelSettings.provider === ModelProvider.GOOGLE ? 'Gemini' : 'OpenAI'}</span>
                 <span>•</span>
                 <span>TTS: {modelSettings.ttsProvider}</span>
               </span>
            </div>
        </div>
      </div>

      <HelpModal 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
        onStartDemo={() => {
            setShowHelp(false);
            onStartDemo();
        }}
      />
    </div>
  );
};

// --- 子组件定义 ---

const TokenView: React.FC<{ 
  token: Token; 
  fontSizeClass: string; 
  onClick?: () => void;
  isGroupRevealed?: boolean;
}> = React.memo(({ token, fontSizeClass, onClick, isGroupRevealed }) => {
  const isInteractable = !!onClick;

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex justify-center items-center select-none
        font-mono mx-[1px] rounded-sm
        transition-all duration-200
        ${fontSizeClass}
        ${isInteractable ? 'cursor-pointer hover:bg-amber-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-yellow-300' : 'cursor-default'}
      `}
      title={isInteractable ? "点击切换显示状态" : undefined}
      style={{ minWidth: '1ch' }}
    >
      <span className={`
          ${isGroupRevealed ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-200'}
          ${token.isPunctuation ? 'text-pink-600 dark:text-pink-400' : ''}
      `}>
        {token.char}
      </span>
    </span>
  );
});

const HiddenGroupView: React.FC<{
  id?: string;
  tokens: Token[];
  revealState: RevealState;
  emoji?: string;
  fontSizeClass: string;
  onClick: () => void;
}> = React.memo(({ id, tokens, revealState, emoji, fontSizeClass, onClick }) => {
  
  if (revealState === RevealState.REVEALED) {
    return (
      <span id={id} className="inline-flex flex-wrap">
        {tokens.map(token => (
          <TokenView 
            key={token.id}
            token={token}
            fontSizeClass={fontSizeClass}
            onClick={onClick}
            isGroupRevealed={true}
          />
        ))}
      </span>
    );
  }

  if (revealState === RevealState.HIDDEN_ICON && emoji) {
    return (
      <span
        id={id}
        onClick={onClick}
        className={`
          inline-flex justify-center items-center select-none
          font-mono mx-1 rounded-md
          transition-all duration-200 cursor-pointer
          bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700
          active:scale-95 shadow-sm
          ${fontSizeClass}
        `}
        style={{ 
          minWidth: '2.5ch', 
          height: '1.5em',
          verticalAlign: 'text-bottom'
        }}
        title="点击切换显示状态"
      >
        <span className="scale-125 filter drop-shadow-lg">{emoji}</span>
      </span>
    );
  }

  return (
    <span id={id} className="inline-flex flex-wrap" onClick={onClick}>
      {tokens.map((token) => (
        <span
          key={token.id}
          className={`
            inline-flex justify-center items-center select-none
            font-mono mx-[1px] rounded-sm
            text-indigo-600/40 dark:text-indigo-500/60 hover:text-indigo-500 dark:hover:text-indigo-400 
            bg-black/5 dark:bg-gray-800/30 hover:bg-black/10 dark:hover:bg-gray-800/60
            transition-colors duration-200 cursor-pointer
            ${fontSizeClass}
          `}
          style={{ minWidth: '1ch' }}
          title="点击切换显示状态"
        >
          _
        </span>
      ))}
    </span>
  );
});
