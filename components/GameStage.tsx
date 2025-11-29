import React, { useState, useEffect } from 'react';
import { GameLevel, Token, FONT_SIZE_CLASSES, RevealState } from '../types';
import { processText } from '../services/textProcessor';
import { Button } from './Button';
import { HelpModal } from './HelpModal';
import { FontSizeControl } from './FontSizeControl';
import { ArrowLeft, Eye, EyeOff, CircleHelp, Sparkles, Loader2, Wand2, RotateCcw } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface GameStageProps {
  rawText: string;
  onBack: () => void;
  fontSizeLevel: number;
  setFontSizeLevel: (level: number) => void;
}

/**
 * 游戏主舞台组件
 * 核心功能：展示处理后的文本，处理用户交互，管理记忆状态
 */
export const GameStage: React.FC<GameStageProps> = ({ 
  rawText, 
  onBack,
  fontSizeLevel,
  setFontSizeLevel
}) => {
  // 游戏状态管理
  const [level, setLevel] = useState<GameLevel>(GameLevel.LEVEL_1);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [showOriginal, setShowOriginal] = useState(false); // 全局查看原文开关
  const [showHelp, setShowHelp] = useState(false);
  const [isResetting, setIsResetting] = useState(false); // 控制重置动画状态
  
  // 视觉线索 (Visual Clues) 状态
  // Map<TokenId, Emoji String> - 存储组首 Token ID 对应的 Emoji
  const [clues, setClues] = useState<Record<string, string>>({});
  const [isGeneratingClues, setIsGeneratingClues] = useState(false);
  const [cluesGenerated, setCluesGenerated] = useState(false);

  // 初始化或当难度/文本改变时，重新计算 Tokens
  useEffect(() => {
    setTokens(processText(rawText, level));
    setClues({}); // 切换关卡时重置线索，因为分组可能改变
    setCluesGenerated(false);
  }, [rawText, level]);

  // --- 交互核心逻辑：循环切换状态 ---
  // 状态流转: HIDDEN_X (占位) -> HIDDEN_ICON (图标，如有) -> REVEALED (明文) -> HIDDEN_X
  const cycleGroupState = (indices: number[]) => {
    if (indices.length === 0) return;
    const firstIdx = indices[0];
    const firstToken = tokens[firstIdx];
    
    // 安全检查
    if (!firstToken || !firstToken.isHidden) return;

    const currentState = firstToken.revealState;
    const groupKey = firstToken.id;
    const hasClue = !!clues[groupKey]; // 检查当前组是否有对应的 Emoji 线索

    let nextState: RevealState;

    if (currentState === RevealState.HIDDEN_X) {
      // 阶段 1 -> 2: 如果有线索显示图标，否则直接显示文字
      nextState = hasClue ? RevealState.HIDDEN_ICON : RevealState.REVEALED;
    } else if (currentState === RevealState.HIDDEN_ICON) {
      // 阶段 2 -> 3: 图标 -> 文字
      nextState = RevealState.REVEALED;
    } else { // REVEALED
      // 阶段 3 -> 1: 文字 -> 重新隐藏
      nextState = RevealState.HIDDEN_X;
    }

    // 更新状态
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

  const handleLevelChange = (newLevel: GameLevel) => {
    setLevel(newLevel);
  };

  // 重置功能：将所有 Token 恢复为 HIDDEN_X 状态
  const resetLevel = () => {
    setIsResetting(true); // 触发动画
    setTokens(prev => prev.map(token => ({
      ...token,
      revealState: RevealState.HIDDEN_X
    })));
    // 动画结束后复位状态
    setTimeout(() => setIsResetting(false), 300);
  };

  /**
   * AI 功能：调用 Gemini API 生成视觉线索
   * 将隐藏的文本块转换为 Emoji
   */
  const generateVisualClues = async () => {
    if (isGeneratingClues) return;
    setIsGeneratingClues(true);

    try {
      // 1. 提取当前所有被隐藏的文本组
      const hiddenGroups: { id: string; text: string }[] = [];
      let i = 0;
      while (i < tokens.length) {
        const t = tokens[i];
        if (t.isHidden && !t.isNewline && !t.isPunctuation) {
          const startId = t.id;
          let text = t.char;
          let j = i + 1;
          // 贪婪匹配：连接连续的隐藏 Token 作为一个组
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
        return;
      }

      // 2. 准备 Prompt
      const wordsToConvert = hiddenGroups.map(g => g.text);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        You are a visual memory assistant. 
        Convert the following list of Chinese words/phrases into a SINGLE, representative Emoji for each.
        The Emoji should best represent the meaning of the word to help with memory recall.
        
        Input Words: ${JSON.stringify(wordsToConvert)}
        
        Return ONLY a JSON object where the keys are the indices (0, 1, 2...) and values are the Emojis.
        Example: { "0": "🍎", "1": "🏃" }
      `;

      // 3. 调用 Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

      // 4. 解析结果
      const jsonText = response.text;
      let emojiList: string[] = [];
      
      try {
        const parsed = JSON.parse(jsonText);
        // 兼容不同的 JSON 结构返回
        if (Array.isArray(parsed)) {
          emojiList = parsed;
        } else if (parsed.items && Array.isArray(parsed.items)) {
          emojiList = parsed.items;
        } else {
          emojiList = wordsToConvert.map((_, idx) => parsed[String(idx)] || "❓");
        }
      } catch (e) {
        console.error("JSON Parse error", e);
        emojiList = wordsToConvert.map(() => "💭"); // 解析失败回退图标
      }

      // 5. 更新 Clues 状态
      const newClues: Record<string, string> = {};
      hiddenGroups.forEach((group, idx) => {
        if (emojiList[idx]) {
          newClues[group.id] = emojiList[idx];
        }
      });

      setClues(prev => ({ ...prev, ...newClues }));
      setCluesGenerated(true);

    } catch (error) {
      console.error("AI Generation Error", error);
      alert("生成线索失败，请稍后重试。");
    } finally {
      setIsGeneratingClues(false);
    }
  };

  const fontSizeClass = FONT_SIZE_CLASSES[fontSizeLevel] || 'text-xl';

  // --- 渲染逻辑 ---
  const renderContent = () => {
    // 全局查看原文模式
    if (showOriginal) {
      return (
        <div className={`whitespace-pre-wrap leading-relaxed text-emerald-400 font-mono opacity-90 transition-all ${fontSizeClass}`}>
          {rawText}
        </div>
      );
    }

    const views = [];
    let i = 0;

    // 遍历 Token 数组
    while (i < tokens.length) {
      const token = tokens[i];

      // 情况 1: 换行符
      if (token.isNewline) {
        views.push(<div key={`nl-${i}`} className="w-full h-4 basis-full"></div>);
        i++;
        continue;
      }

      // 情况 2: 静态可见 Token (标点或无需隐藏的词)
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

      // 情况 3: 隐藏组 (Hidden Group)
      // 需要将连续的隐藏 Token 聚合为一个交互单元
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

      const groupState = token.revealState; // 使用组首 Token 的状态
      const groupId = token.id;
      const clueEmoji = clues[groupId];

      // 渲染这一组隐藏内容
      views.push(
        <HiddenGroupView 
          key={`group-${groupId}`}
          tokens={groupTokens}
          revealState={groupState}
          emoji={clueEmoji}
          fontSizeClass={fontSizeClass}
          onClick={() => cycleGroupState(groupIndices)}
        />
      );

      // 指针跳过已处理的组
      i = j;
    }

    return (
      <div className="flex flex-wrap items-end content-start gap-y-2">
        {views}
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 flex flex-col h-screen max-h-screen">
      {/* 头部控制栏 */}
      <div className="bg-gray-800 border-b-4 border-gray-900 p-4 mb-4 rounded-xl shadow-lg flex-shrink-0 z-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* 左侧：返回与移动端帮助 */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors" title="返回首页">
                <ArrowLeft size={24} />
              </button>
            </div>
            
            <button 
              onClick={() => setShowHelp(true)} 
              className="md:hidden text-gray-400 hover:text-cyan-400 transition-colors"
              title="帮助"
            >
              <CircleHelp size={24} />
            </button>
          </div>

          {/* 中间：难度切换 */}
          <div className="flex bg-gray-900 p-1 rounded-lg">
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleLevelChange(lvl)}
                title={`切换到第 ${lvl} 级`}
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

          {/* 右侧：工具按钮 */}
          <div className="flex gap-2 items-center">
            <FontSizeControl 
              level={fontSizeLevel} 
              onChange={setFontSizeLevel}
              max={FONT_SIZE_CLASSES.length - 1}
            />

            <div className="h-6 w-px bg-gray-700 mx-1"></div>

            {/* AI 线索生成按钮 */}
            <Button 
              variant="primary" 
              size="icon"
              onClick={generateVisualClues}
              disabled={isGeneratingClues || showOriginal}
              className={`${cluesGenerated ? 'bg-emerald-600 border-emerald-800 hover:bg-emerald-500' : 'bg-purple-600 border-purple-800 hover:bg-purple-500'}`}
              title={cluesGenerated ? '重新生成视觉线索' : 'AI 生成视觉线索 (将文字转为图标)'}
            >
              {isGeneratingClues ? (
                <Loader2 size={20} className="animate-spin" />
              ) : cluesGenerated ? (
                 <Wand2 size={20} />
              ) : (
                <Sparkles size={20} />
              )}
            </Button>

            {/* 查看原文按钮 */}
            <Button 
              variant="secondary" 
              size="icon"
              onClick={() => setShowOriginal(!showOriginal)}
              title={showOriginal ? '隐藏原文' : '查看原文'}
            >
              {showOriginal ? <EyeOff size={20} /> : <Eye size={20} />}
            </Button>

            {/* 重置按钮 */}
            <Button
              variant="secondary"
              size="icon"
              onClick={resetLevel}
              title="重置当前状态"
            >
              <RotateCcw size={20} />
            </Button>
            
            <button 
              onClick={() => setShowHelp(true)} 
              className="hidden md:block text-gray-500 hover:text-cyan-400 transition-colors p-2"
              title="帮助"
            >
              <CircleHelp size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* 游戏内容区域 */}
      <div className="flex-grow overflow-hidden relative bg-gray-900 rounded-xl border-4 border-gray-700 shadow-inner flex flex-col">
        {/* 滚动区域，应用 reset 动画 */}
        <div className={`flex-grow overflow-y-auto p-6 md:p-8 custom-scrollbar ${isResetting ? 'animate-reset' : ''}`}>
            {renderContent()}
        </div>

        {/* 底部状态栏 */}
        <div className="bg-gray-800 p-2 text-center text-xs text-gray-500 font-mono border-t border-gray-700 flex justify-between px-4 items-center">
           <span>
             {cluesGenerated ? '✨ 占位符 -> 图标 -> 文字' : '点击占位符显示文字'}
           </span>
           <span className="hidden sm:inline text-gray-600">Level {level}</span>
        </div>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};

// --- 子组件定义 ---

// 1. TokenView: 显示可见的字符
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
        ${isInteractable ? 'cursor-pointer hover:bg-gray-800 hover:text-yellow-300' : 'cursor-default'}
      `}
      title={isInteractable ? "点击切换显示状态" : undefined}
      style={{ minWidth: '1ch' }}
    >
      <span className={`
          ${isGroupRevealed ? 'text-yellow-400' : 'text-gray-200'}
          ${token.isPunctuation ? 'text-pink-400' : ''}
      `}>
        {token.char}
      </span>
    </span>
  );
});

// 2. HiddenGroupView: 统一处理隐藏组的渲染 (X占位符 / Emoji / 文字)
const HiddenGroupView: React.FC<{
  tokens: Token[];
  revealState: RevealState;
  emoji?: string;
  fontSizeClass: string;
  onClick: () => void;
}> = React.memo(({ tokens, revealState, emoji, fontSizeClass, onClick }) => {
  
  // 状态: REVEALED -> 渲染为明文 (重用 TokenView)
  if (revealState === RevealState.REVEALED) {
    return (
      <>
        {tokens.map(token => (
          <TokenView 
            key={token.id}
            token={token}
            fontSizeClass={fontSizeClass}
            onClick={onClick}
            isGroupRevealed={true}
          />
        ))}
      </>
    );
  }

  // 状态: HIDDEN_ICON -> 渲染为 Emoji (如有)
  if (revealState === RevealState.HIDDEN_ICON && emoji) {
    return (
      <span
        onClick={onClick}
        className={`
          inline-flex justify-center items-center select-none
          font-mono mx-1 rounded-md
          transition-all duration-200 cursor-pointer
          bg-gray-800 border border-gray-700 hover:border-indigo-500 hover:bg-gray-700
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

  // 状态: HIDDEN_X (默认)
  // 严格遵守：有多少个隐藏字符，就渲染多少个 'X'，保证长度提示
  return (
    <>
      {tokens.map((token) => (
        <span
          key={token.id}
          onClick={onClick}
          className={`
            inline-flex justify-center items-center select-none
            font-mono mx-[1px] rounded-sm
            text-indigo-500/60 hover:text-indigo-400 bg-gray-800/30 hover:bg-gray-800/60
            transition-colors duration-200 cursor-pointer
            ${fontSizeClass}
          `}
          style={{ minWidth: '1ch' }}
          title="点击切换显示状态"
        >
          X
        </span>
      ))}
    </>
  );
});