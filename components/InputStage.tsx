import React, { useState, useEffect } from 'react';
import { HelpModal } from './HelpModal';
import { CircleHelp, Clipboard, Trash2, Settings, ChevronRight } from 'lucide-react';
import { FONT_SIZE_CLASSES } from '../types';

interface InputStageProps {
  onStart: (text: string) => void; // 回调：开始游戏
  onStartDemo: () => void;         // 回调：开始自动演示
  defaultText?: string;            // 保留的文本（从游戏页返回时）
  fontSizeLevel: number;           // 当前字号等级
  setFontSizeLevel: (level: number) => void; // 设置字号
  onOpenSettings: () => void;      // 打开设置回调
}

/**
 * 输入阶段组件
 * 负责接收用户输入的文本、调整设置并开始游戏
 */
export const InputStage: React.FC<InputStageProps> = ({ 
  onStart, 
  onStartDemo,
  defaultText = '', 
  fontSizeLevel,
  onOpenSettings
}) => {
  const [text, setText] = useState(defaultText);
  const [showHelp, setShowHelp] = useState(false);

  // 当外部传入的 defaultText 更新时（例如演示模式自动填充），同步更新本地 state
  useEffect(() => {
    setText(defaultText);
  }, [defaultText]);

  // 自动保存内容到本地存储
  useEffect(() => {
    localStorage.setItem('memoquest_content', text);
  }, [text]);

  // 处理粘贴逻辑：从剪贴板读取文本并追加
  const handlePaste = async () => {
    try {
      const textFromClipboard = await navigator.clipboard.readText();
      if (textFromClipboard) {
        setText(prev => prev + textFromClipboard);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      alert('无法自动读取剪贴板（可能是浏览器权限限制），请尝试点击输入框并使用 Ctrl+V (或 Cmd+V) 进行粘贴。');
    }
  };

  // 清空输入框逻辑：直接清空
  const handleClear = () => {
    setText('');
  };

  // 统一的工具栏按钮样式
  const toolBtnClass = "p-2 rounded-lg transition-all active:scale-95 flex items-center justify-center";
  const defaultToolBtnClass = `${toolBtnClass} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800`;

  return (
    <div className="flex flex-col w-full h-screen max-h-screen bg-paper dark:bg-gray-900 overflow-hidden transition-colors duration-300">
      
      {/* Header: Title + Start Button + Tools */}
      <div className="flex-shrink-0 flex justify-between items-center p-3 md:p-4 border-b border-gray-200 dark:border-gray-800 bg-paper/80 dark:bg-gray-900/80 backdrop-blur-md z-20 shadow-sm gap-2">
        
        {/* Left Side: Title & Start Button */}
        <div className="flex items-center gap-1 md:gap-3 flex-1 min-w-0">
          <h1 className="text-xs md:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-pink-600 dark:from-cyan-400 dark:to-pink-500 game-font tracking-wider truncate shrink-1 mr-2">
            MEMO QUEST
          </h1>

          <button 
            id="btn-start-game"
            type="button"
            onClick={() => text.trim() && onStart(text)} 
            disabled={!text.trim()}
            className={`${toolBtnClass} shrink-0 ${
              !text.trim() 
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="开始记忆"
          >
            <ChevronRight size={24} />
          </button>
        </div>
        
        {/* Right Side: Other Tools */}
        <div className="flex items-center gap-0.5 md:gap-2 flex-shrink-0">
           <button
              id="btn-paste"
              type="button"
              onClick={handlePaste}
              className={defaultToolBtnClass}
              title="粘贴"
            >
              <Clipboard size={20} />
            </button>

            <button
              id="btn-clear"
              type="button"
              onClick={handleClear}
              disabled={!text}
              className={`${defaultToolBtnClass} ${!text ? 'opacity-30 cursor-not-allowed' : 'hover:text-red-500 dark:hover:text-red-400'}`}
              title="清空"
            >
              <Trash2 size={20} />
            </button>
            
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1 hidden md:block"></div>

            <button 
              id="btn-settings"
              type="button"
              onClick={onOpenSettings}
              className={defaultToolBtnClass}
              title="设置"
            >
              <Settings size={20} />
            </button>
            
            <button 
              id="btn-help-input"
              type="button"
              onClick={() => setShowHelp(true)}
              className={defaultToolBtnClass}
              title="帮助"
            >
              <CircleHelp size={20} />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow p-3 md:p-6 overflow-hidden flex flex-col items-center">
         <div className="w-full max-w-none h-full flex flex-col bg-paper dark:bg-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors relative group">
            <textarea
              id="input-textarea"
              className={`w-full h-full p-4 md:p-8 bg-transparent resize-none outline-none border-none font-mono leading-loose placeholder-gray-400 dark:placeholder-gray-600 ${FONT_SIZE_CLASSES[fontSizeLevel]} text-gray-900 dark:text-gray-100`}
              placeholder="在此处粘贴您想要背诵的文章或段落..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
            />
            {/* Empty State Hint */}
            {!text && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 dark:opacity-5">
                 <Clipboard size={80} className="text-gray-500" />
              </div>
            )}
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