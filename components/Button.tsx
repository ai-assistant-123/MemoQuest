import React from 'react';

// 按钮组件属性接口
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'; // 视觉风格变体
  size?: 'sm' | 'md' | 'lg' | 'icon'; // 尺寸变体，新增 icon 模式
}

/**
 * 通用按钮组件
 * 封装了 Tailwind CSS 样式，提供统一的 UI 风格
 */
export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}) => {
  // 基础样式：加粗、大写、点击下沉效果、圆角、聚焦环
  const baseStyle = "font-bold uppercase tracking-wider transition-all duration-100 transform active:translate-y-1 border-b-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";
  
  // 颜色变体配置
  const variants = {
    primary: "bg-indigo-600 border-indigo-900 text-white hover:bg-indigo-500 focus:ring-indigo-500",   // 主色：靛蓝
    secondary: "bg-gray-700 border-gray-900 text-gray-200 hover:bg-gray-600 focus:ring-gray-500",    // 次要：深灰
    danger: "bg-pink-600 border-pink-900 text-white hover:bg-pink-500 focus:ring-pink-500",           // 危险/强调：粉红
    success: "bg-emerald-600 border-emerald-900 text-white hover:bg-emerald-500 focus:ring-emerald-500", // 成功：翠绿
  };

  // 尺寸配置
  const sizes = {
    sm: "px-3 py-1 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-lg",
    icon: "p-2 w-10 h-10 flex items-center justify-center", // 图标按钮专用尺寸
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};