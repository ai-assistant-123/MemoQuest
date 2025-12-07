import React from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 帮助弹窗组件
 * 展示三级记忆法的原理和使用说明
 */
export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-800 border-4 border-gray-600 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
        {/* 头部：标题与关闭按钮 */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50 rounded-t-lg shrink-0">
          <h3 className="text-xl text-cyan-400 font-bold game-font">记忆法原理指南</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-gray-700 p-1 rounded-full transition-all"
            aria-label="关闭"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto text-gray-300 space-y-6 font-mono leading-relaxed custom-scrollbar">
          <section>
            <h4 className="text-lg text-white font-bold mb-2 flex items-center gap-2">
              <span className="text-pink-500">#</span> 核心理念：输出倒逼输入
            </h4>
            <p className="text-sm">
              脑科学研究表明，<strong>“提取练习”(Retrieval Practice)</strong> 比单纯的重复阅读更有效。MemoQuest 通过渐进式减少文字线索，强迫大脑进行主动回忆，从而加深神经回路的连接。
            </p>
          </section>

          {/* 关卡说明卡片 */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors">
              <h5 className="text-indigo-400 font-bold mb-2 text-sm">Level 1: 间隔隐藏</h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                保留约50%的词汇。像脚手架一样，利用上下文线索帮助你建立初步的文本脉络。适合刚开始记忆时建立信心。
              </p>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors">
              <h5 className="text-indigo-400 font-bold mb-2 text-sm">Level 2: 句末隐藏</h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                仅保留每句话的开头。迫使你根据句首提示，预测并还原完整的句子结构。强化对句子逻辑的掌握。
              </p>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors">
              <h5 className="text-indigo-400 font-bold mb-2 text-sm">Level 3: 仅留段首</h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                难度最高。仅保留段落起始点。此时你已不再依赖视觉提示，而是依靠大脑中构建的思维导图进行完全输出。
              </p>
            </div>
          </div>

          <section>
            <h4 className="text-lg text-white font-bold mb-2 flex items-center gap-2">
              <span className="text-pink-500">#</span> 使用建议
            </h4>
            <ul className="list-disc list-inside text-sm space-y-2 text-gray-400 bg-gray-900/30 p-4 rounded-lg">
              <li>先通读原文 1-2 遍，理解大意。</li>
              <li>从 <strong>Level 1</strong> 开始，尝试朗读全文，卡住时点击下划线占位符查看提示。</li>
              <li>当 Level 1 比较顺畅时，切换到 <strong>Level 2</strong> 提升难度。</li>
              <li>最终挑战 <strong>Level 3</strong>，如果能流畅背诵，说明已牢固掌握。</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};