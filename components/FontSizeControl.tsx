import React from 'react';
import { Minus, Plus, Type } from 'lucide-react';

interface FontSizeControlProps {
  level: number; // 当前等级
  onChange: (level: number) => void; // 变更回调
  min?: number;
  max?: number;
  className?: string;
}

/**
 * 字号调节组件
 * 允许用户增加或减少全局文本显示的尺寸
 */
export const FontSizeControl: React.FC<FontSizeControlProps> = ({
  level,
  onChange,
  min = 0,
  max = 6,
  className = ''
}) => {
  return (
    <div className={`flex items-center bg-white dark:bg-gray-900 rounded-lg p-1 gap-1 border border-gray-300 dark:border-gray-700 ${className}`}>
      {/* 减小字号按钮 */}
      <button
        onClick={() => onChange(Math.max(min, level - 1))}
        disabled={level <= min}
        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        title="减小字号"
      >
        <Minus size={14} />
      </button>
      
      {/* 当前图标指示 */}
      <div className="px-1 flex items-center justify-center min-w-[2rem] text-gray-600 dark:text-gray-400" title={`当前字号等级: ${level}`}>
        <Type size={level <= 1 ? 14 : level >= 4 ? 20 : 16} />
      </div>

      {/* 增大字号按钮 */}
      <button
        onClick={() => onChange(Math.min(max, level + 1))}
        disabled={level >= max}
        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        title="增大字号"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};