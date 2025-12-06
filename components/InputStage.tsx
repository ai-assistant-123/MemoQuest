import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { HelpModal } from './HelpModal';
import { FontSizeControl } from './FontSizeControl';
import { CircleHelp, Play, ClipboardPaste, Trash2, Settings, MonitorPlay } from 'lucide-react';
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
  setFontSizeLevel,
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
      {/* Header: Title Left, Buttons Right - Compact */}
      <div className="w-full flex justify-between items-center mb-1 px-1 shrink-0">
        {/* 标题 - 缩小字号 */}
        <h1 className="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 game-font tracking-wider">
          MEMO QUEST
        </h1>

        {/* 右上角按钮组 - 紧凑排列 */}
        <div className="flex items-center gap-1">
          <button 
            id="btn-settings"
            type="button"
            onClick={onOpenSettings}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800"
            title="设置"
          >
            <Settings size={18} />
          </button>
          <button 
            type="button"
            onClick={() => setShowHelp(true)}
            className="text-gray-400 hover:text-cyan-400 transition-colors p-1.5 rounded-lg hover:bg-gray-800"
            title="查看原理"
          >
            <CircleHelp size={18} />
          </button>
        </div>
      </div>
      
      {/* 文本输入区域容器 - 移动端 flex-grow 撑满空间 */}
      <div className="w-full bg-gray-800 rounded-lg border-2 border-gray-700 p-0.5 shadow-xl mb-2 flex-grow flex flex-col md:flex-grow-0 md:h-auto">
        <div className="bg-gray-900 rounded-md p-3 flex flex-col h-full">
          {/* 工具栏：工具按钮组 + 字号控制 */}
          <div className="flex justify-end items-center mb-2 gap-2 shrink-0">
            {/* 粘贴按钮 */}
            <button
              id="btn-paste"
              type="button"
              onClick={handlePaste}
              className="flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-md w-7 h-7 transition-colors"
              title="将剪贴板内容粘贴到末尾"
            >
              <ClipboardPaste size={14} />
            </button>

            {/* 清除按钮 (直接清空) */}
            <button
              id="btn-clear"
              type="button"
              onClick={handleClear}
              disabled={!text}
              className={`flex items-center justify-center border rounded-md w-7 h-7 transition-all duration-200 ${
                !text 
                  ? 'border-gray-700 text-gray-600 bg-gray-800 cursor-not-allowed opacity-50' 
                  : 'border-gray-600 text-gray-400 hover:text-red-400 bg-gray-800 hover:bg-gray-700'
              }`}
              title="清空内容"
            >
              <Trash2 size={14} />
            </button>
            
            {/* 分隔线 */}
            <div className="w-px h-3 bg-gray-700 mx-1"></div>
            
            <FontSizeControl 
              level={fontSizeLevel} 
              onChange={setFontSizeLevel} 
              max={FONT_SIZE_CLASSES.length - 1}
              className="scale-90 origin-right"
            />
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
      <div className="flex gap-4 flex-wrap justify-center items-center w-full shrink-0">
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