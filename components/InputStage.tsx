import React, { useState } from 'react';
import { Button } from './Button';
import { HelpModal } from './HelpModal';
import { FontSizeControl } from './FontSizeControl';
import { CircleHelp, BookOpen, Play } from 'lucide-react';
import { FONT_SIZE_CLASSES } from '../types';

interface InputStageProps {
  onStart: (text: string) => void; // 回调：开始游戏
  defaultText?: string;            // 保留的文本（从游戏页返回时）
  fontSizeLevel: number;           // 当前字号等级
  setFontSizeLevel: (level: number) => void; // 设置字号
}

/**
 * 输入阶段组件
 * 负责接收用户输入的文本、调整设置并开始游戏
 */
export const InputStage: React.FC<InputStageProps> = ({ 
  onStart, 
  defaultText = '', 
  fontSizeLevel,
  setFontSizeLevel
}) => {
  const [text, setText] = useState(defaultText);
  const [showHelp, setShowHelp] = useState(false);

  // 预置的示例文本，用于快速演示功能
  const loadExample = () => {
    const example = `可行性分析
可行性是指在企业当前的条件下,是否有必要建设新系统,以及建设新系统的工作是否具备必要的条件。也就是说,可行性包括必要性和可能性。
软件系统的可行性分析包括经济可行性、技术可行性、法律可行性和用户使用可行性,分别从项目建设的经效益、技术方案、制度因素和用户使用等四个方面对系统建设的必要性和可能性进行评估。
经济可行性主要评估项目的建设成本、运行成本和项目建成后可能的经济收益。
技术可行性研究的对象是信息系统需要实现的功能和性能,以及技术能力约束。
法律可行性需要从政策、法律、道德、制度等社会因素来论证信息系统建设的现实性。
用户使用可行性是从信息系统用户的角度来评估系统的可行性,包括企业的行政管理和工作制度、使用人员的素质和培训要求等,可以分为管理可行性(从企业管理上分析系统建设可行性)和运行可行性(分析和测定信息系统在确定环境中能够有效工作,并被用户方便使用的程度和能力)。
`;
    setText(example);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 animate-fade-in relative">
      {/* 右上角帮助按钮 */}
      <button 
        onClick={() => setShowHelp(true)}
        className="absolute top-6 right-6 text-gray-500 hover:text-cyan-400 transition-colors p-2"
        title="查看原理"
      >
        <CircleHelp size={28} />
      </button>

      {/* 标题 */}
      <h1 className="text-4xl md:text-5xl text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 game-font leading-relaxed py-2">
        MEMO QUEST
      </h1>
      
      {/* 文本输入区域容器 */}
      <div className="w-full bg-gray-800 rounded-xl border-4 border-gray-700 p-1 shadow-2xl mb-8">
        <div className="bg-gray-900 rounded-lg p-4 flex flex-col h-full">
          {/* 工具栏：标签 + 字号控制 */}
          <div className="flex justify-between items-center mb-2">
            <label className="text-cyan-400 text-sm font-bold uppercase tracking-widest">
              输入记忆内容
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-normal hidden sm:inline">支持任意文本粘贴</span>
              <FontSizeControl 
                level={fontSizeLevel} 
                onChange={setFontSizeLevel} 
                max={FONT_SIZE_CLASSES.length - 1}
              />
            </div>
          </div>
          {/* 文本域 */}
          <textarea
            className={`w-full h-64 bg-gray-800 text-gray-100 p-4 rounded-md border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none font-mono leading-relaxed placeholder-gray-600 transition-all ${FONT_SIZE_CLASSES[fontSizeLevel]}`}
            placeholder="在此处粘贴您想要背诵的文章或段落..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="flex gap-4 sm:gap-8 flex-wrap justify-center items-center w-full">
        <Button 
          onClick={loadExample} 
          variant="secondary"
          size="lg"
          className="flex items-center gap-3 min-w-[180px] justify-center transition-transform hover:-translate-y-0.5"
          title="加载示例文本体验"
        >
          <BookOpen size={20} />
          加载示例
        </Button>
        
        <Button 
          onClick={() => text.trim() && onStart(text)} 
          disabled={!text.trim()}
          variant="success"
          size="lg"
          className={`flex items-center gap-3 min-w-[180px] justify-center transition-transform hover:-translate-y-0.5 ${!text.trim() ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-emerald-900/20'}`}
        >
          <Play size={20} className="fill-current" />
          开始记忆
        </Button>
      </div>
      
      {/* 底部说明链接 */}
      <div className="mt-12 text-gray-500 text-xs max-w-lg text-center">
        <button 
          onClick={() => setShowHelp(true)}
          className="mb-3 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2 mx-auto border-b border-transparent hover:border-cyan-400 pb-0.5"
        >
          <CircleHelp size={14} />
          <span>了解“三级输出”记忆法原理</span>
        </button>
        <div className="flex justify-center gap-4 flex-wrap opacity-60">
          <span>第一级: 间隔隐藏</span>
          <span>•</span>
          <span>第二级: 句末隐藏</span>
          <span>•</span>
          <span>第三级: 仅留段首</span>
        </div>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};