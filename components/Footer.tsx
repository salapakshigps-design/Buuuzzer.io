import React from 'react';
import { AppState } from '../types';

interface FooterProps {
  onNavigate: (state: AppState) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full z-20 py-8 px-6 border-t border-gray-800 bg-gray-900/80 backdrop-blur-md mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-500 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Buuzzer.io. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <button onClick={() => onNavigate(AppState.PRIVACY)} className="hover:text-white transition-colors">Privacy Policy</button>
              <button onClick={() => onNavigate(AppState.TERMS)} className="hover:text-white transition-colors">Terms of Service</button>
              <button onClick={() => onNavigate(AppState.CONTACT)} className="hover:text-white transition-colors">Contact Support</button>
              <button onClick={() => onNavigate(AppState.ADMIN_LOGIN)} className="hover:text-white transition-colors opacity-50">Admin</button>
          </div>
      </div>
    </footer>
  );
};