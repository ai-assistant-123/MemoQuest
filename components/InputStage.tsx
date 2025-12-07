import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { HelpModal } from './HelpModal';
import { CircleHelp, Play, ClipboardPaste, Trash2, Settings, MonitorPlay } from 'lucide-react';
import { FONT_SIZE_CLASSES } from '../types';

interface InputStageProps {
  onStart: (text: string) => void; // 回调：开始游戏
  onStartDemo: () => void;         // 回调：开始自动演示
  defaultText?: string;            // 保留的文本（从游戏页返回时）
  fontSizeLevel: number;           // 当前字号等级 (Passed from parent but unused in UI per request)
  setFontSizeLevel: (level: number) => void; // 设置字号 (Passed from parent but unused in UI per request)
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

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-2 md:p-4 animate-fade-in relative h-full md:h-auto">
      {/* Header: Title Only */}
      <div className="w-full flex justify-center md:justify-start items-center mb-4 px-1 shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 game-font tracking-wider">
          MEMO QUEST
        </h1>
      </div>
      
      {/* 文本输入区域容器 - 移动端 flex-grow 撑满空间 */}
      <div className="w-full bg-gray-800 rounded-lg border-2 border-gray-700 p-0.5 shadow-xl mb-6 flex-grow flex flex-col md:flex-grow-0 md:h-auto">
        <div className="bg-gray-900 rounded-md p-3 flex flex-col h-full">
          {/* 工具栏：所有工具按钮在同一行 */}
          <div className="flex justify-end items-center mb-2 gap-2 shrink-0">
            
            {/* 文本操作组 */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
               <button
                id="btn-paste"
                type="button"
                onClick={handlePaste}
                className="flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-md w-8 h-8 transition-colors"
                title="将剪贴板内容粘贴到末尾"
              >
                <ClipboardPaste size={16} />
              </button>

              <button
                id="btn-clear"
                type="button"
                onClick={handleClear}
                disabled={!text}
                className={`flex items-center justify-center rounded-md w-8 h-8 transition-all duration-200 ${
                  !text 
                    ? 'text-gray-600 cursor-not-allowed' 
                    : 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                }`}
                title="清空内容"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-gray-700 mx-1"></div>

            {/* 系统操作组 */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
              <button 
                id="btn-settings"
                type="button"
                onClick={onOpenSettings}
                className="flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-md w-8 h-8 transition-colors"
                title="设置"
              >
                <Settings size={16} />
              </button>
              <button 
                type="button"
                onClick={() => setShowHelp(true)}
                className="flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-gray-700 rounded-md w-8 h-8 transition-colors"
                title="查看原理"
              >
                <CircleHelp size={16} />
              </button>
            </div>
          </div>

          {/* 文本域 - 移动端 flex-grow, 桌面端固定高度, 增加移动端 min-h 防止塌陷 */}
          <textarea
            id="input-textarea"
            className={`w-full flex-grow min-h-[40vh] md:min-h-0 md:h-80 bg-gray-900 text-gray-100 p-2 rounded border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none font-mono leading-relaxed placeholder-gray-600 transition-all ${FONT_SIZE_CLASSES[fontSizeLevel]}`}
            placeholder="在此处粘贴您想要背诵的文章或段落..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>

      {/* 底部操作按钮 - shrink-0 防止被压缩 */}
      <div className="flex gap-4 flex-wrap justify-center items-center w-full shrink-0 mb-4 md:mb-0">
        <Button 
          id="btn-auto-demo"
          type="button"
          onClick={onStartDemo} 
          variant="secondary"
          size="md"
          className="flex items-center gap-2 min-w-[140px] justify-center transition-transform hover:-translate-y-0.5 text-sm"
          title="开启自动演示模式"
        >
          <MonitorPlay size={16} />
          自动演示
        </Button>
        
        <Button 
          id="btn-start-game"
          type="button"
          onClick={() => text.trim() && onStart(text)} 
          disabled={!text.trim()}
          variant="success"
          size="md"
          className={`flex items-center gap-2 min-w-[140px] justify-center transition-transform hover:-translate-y-0.5 text-sm ${!text.trim() ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-emerald-900/20'}`}
        >
          <Play size={16} className="fill-current" />
          开始记忆
        </Button>
      </div>
      
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};