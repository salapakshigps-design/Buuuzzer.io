import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'accent';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white focus:ring-blue-300 shadow-lg shadow-blue-900/60",
    secondary: "bg-white text-slate-900 hover:bg-slate-100 focus:ring-slate-300 border border-slate-300 shadow-md",
    danger: "bg-red-500 hover:bg-red-400 text-white focus:ring-red-300 shadow-lg shadow-red-900/60",
    success: "bg-emerald-500 hover:bg-emerald-400 text-white focus:ring-emerald-300 shadow-lg shadow-emerald-900/50",
    accent: "bg-purple-500 hover:bg-purple-400 text-white focus:ring-purple-300 shadow-lg shadow-purple-900/60"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};
