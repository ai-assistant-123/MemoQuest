import React from 'react';
import { X, MonitorPlay, Brain, Zap, GitBranch, Lightbulb } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo?: () => void;
}

/**
 * 帮助弹窗组件
 * 展示三级记忆法的原理和使用说明
 */
export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, onStartDemo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-600 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up transition-colors duration-300">
        {/* 头部：标题与关闭按钮 */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-lg shrink-0">
          <h3 className="text-xl text-cyan-600 dark:text-cyan-400 font-bold game-font flex items-center gap-2">
            <Brain size={24} />
            脑科学记忆开关
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full transition-all"
            aria-label="关闭"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto text-gray-700 dark:text-gray-300 space-y-6 font-mono leading-relaxed custom-scrollbar">
          <section>
            <h4 className="text-lg text-gray-900 dark:text-white font-bold mb-3 flex items-center gap-2">
               如何快速记住一大段文字？
            </h4>
            <p className="text-sm bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border-l-4 border-indigo-500">
              脑科学研究发现，死记硬背的留存率极低。针对快速背书，MemoQuest 激活了大脑的三个<strong>“记忆开关”</strong>，将被动输入转化为主动的认知游戏。
            </p>
          </section>

          {/* 关卡说明卡片 - 重构为三个开关 */}
          <div className="space-y-4">
            
            {/* 开关一 */}
            <div className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:border-cyan-400 dark:hover:border-cyan-500 transition-all group">
              <div className="shrink-0 mt-1">
                 <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold group-hover:scale-110 transition-transform">1</div>
              </div>
              <div>
                <h5 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  Level 1: 间隔开关 (Spacing)
                  <Zap size={14} className="text-yellow-500" />
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">认知脚手架：</span> 
                  通过“间隔隐藏”约50%的文字，利用完形填空效应（Cloze Effect）降低认知负荷。大脑会自动根据上下文填充空白，建立初步的记忆骨架。
                </p>
              </div>
            </div>

            {/* 开关二 */}
            <div className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-500 transition-all group">
              <div className="shrink-0 mt-1">
                 <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold group-hover:scale-110 transition-transform">2</div>
              </div>
              <div>
                <h5 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  Level 2: 预测开关 (Prediction)
                  <GitBranch size={14} className="text-pink-500" />
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-pink-600 dark:text-pink-400">主动预测编码：</span> 
                  仅保留句首词。这迫使大脑从被动阅读转向主动预测（Predictive Coding）。为了补全句子，神经突触必须进行更强烈的放电，从而加深逻辑链条的记忆。
                </p>
              </div>
            </div>

            {/* 开关三 */}
            <div className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all group">
               <div className="shrink-0 mt-1">
                 <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold group-hover:scale-110 transition-transform">3</div>
              </div>
              <div>
                <h5 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  Level 3: 生成开关 (Generation)
                  <Lightbulb size={14} className="text-emerald-500" />
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">生成效应：</span> 
                  仅保留段落开头。这属于高强度的“提取练习”。当你在极少线索下成功回忆出内容时，记忆的留存率将远超单纯的重复阅读（Learning Pyramid）。
                </p>
              </div>
            </div>

          </div>

          <section>
            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              使用建议 (Tips)
            </h4>
            <ul className="list-disc list-inside text-xs space-y-1 text-gray-600 dark:text-gray-400 ml-2">
              <li>遇到卡顿？点击 <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span> 占位符查看提示。</li>
              <li>使用 <span className="font-bold text-indigo-500">AI 线索</span> 将抽象文字转化为 Emoji 图像（双重编码理论）。</li>
              <li>开启 <span className="font-bold text-pink-500">TTS 朗读</span>，利用听觉回路辅助记忆。</li>
            </ul>
          </section>

          {onStartDemo && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onStartDemo}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 active:scale-[0.98] transition-all"
              >
                <MonitorPlay size={20} />
                观看自动演示
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};