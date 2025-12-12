import React, { useState } from 'react';
import { Button } from './Button';
import { AppState } from '../types';
import Logo from '../logo (250 x 100 px).svg';

interface HeaderProps {
  onNavigate: (state: AppState) => void;
  onLogin: () => void;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, onLogin, onBack }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full z-50 px-6 py-4 border-b border-white/5 backdrop-blur-md sticky top-0 bg-gray-900/90">
      <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
         <div className="flex items-center gap-4">
             {onBack && (
                <button 
                  onClick={onBack} 
                  className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  aria-label="Go Back"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
             )}
             <div
                className="flex items-center space-x-3 cursor-pointer"
                onClick={() => onNavigate(AppState.LANDING)}
             >
                <img
                  src={Logo}
                  alt="Buuzzer.io logo"
                  className="h-20 w-auto"
                />
             </div>
         </div>
         
         <nav className="hidden md:flex space-x-8 text-sm font-medium text-gray-300">
            <button onClick={() => onNavigate(AppState.FEATURES)} className="hover:text-white transition-colors">Features</button>
            <button onClick={() => onNavigate(AppState.HOW_IT_WORKS)} className="hover:text-white transition-colors">How it Works</button>
            <button onClick={() => onNavigate(AppState.CONTACT)} className="hover:text-white transition-colors">Contact</button>
         </nav>

         <div className="hidden md:block">
            <Button onClick={onLogin} variant="secondary" className="px-4 py-2 text-sm bg-white text-gray-900 border-transparent hover:bg-white/90">
              Log In
            </Button>
         </div>

         {/* Mobile Menu Button */}
         <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-300 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
         </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-gray-900 border-b border-gray-800 p-4 flex flex-col space-y-4 shadow-2xl">
            <button onClick={() => { onNavigate(AppState.FEATURES); setMobileMenuOpen(false); }} className="text-left text-gray-300 hover:text-white py-2">Features</button>
            <button onClick={() => { onNavigate(AppState.HOW_IT_WORKS); setMobileMenuOpen(false); }} className="text-left text-gray-300 hover:text-white py-2">How it Works</button>
            <button onClick={() => { onNavigate(AppState.CONTACT); setMobileMenuOpen(false); }} className="text-left text-gray-300 hover:text-white py-2">Contact</button>
            <Button
              onClick={onLogin}
              variant="secondary"
              className="px-4 py-2 text-sm bg-white text-black border border-gray-300 hover:bg-gray-100"
            >
              Log In
            </Button>

        </div>
      )}
    </header>
  );
};
