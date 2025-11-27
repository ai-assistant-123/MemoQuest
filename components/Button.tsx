import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseStyle = "font-bold uppercase tracking-wider transition-all duration-100 transform active:translate-y-1 border-b-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";
  
  const variants = {
    primary: "bg-indigo-600 border-indigo-900 text-white hover:bg-indigo-500 focus:ring-indigo-500",
    secondary: "bg-gray-700 border-gray-900 text-gray-200 hover:bg-gray-600 focus:ring-gray-500",
    danger: "bg-pink-600 border-pink-900 text-white hover:bg-pink-500 focus:ring-pink-500",
    success: "bg-emerald-600 border-emerald-900 text-white hover:bg-emerald-500 focus:ring-emerald-500",
  };

  const sizes = {
    sm: "px-3 py-1 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-lg",
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