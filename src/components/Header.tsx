'use client';

import { Flag, User } from 'lucide-react';

interface HeaderProps {
  onReportIssue?: () => void;
  onUserProfile?: () => void;
}

export default function Header({ onReportIssue, onUserProfile }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200/30">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        {/* Logo Section */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm sm:text-lg">G</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-black to-gray-800 bg-clip-text text-transparent">
            GEOCITY
          </h1>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button 
            onClick={onReportIssue}
            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-md sm:rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md cursor-pointer text-xs sm:text-sm font-medium"
          >
            <Flag className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Report an Issue</span>
            <span className="sm:hidden">Report</span>
          </button>
          
          <button 
            onClick={onUserProfile}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 border border-[var(--color-border)] cursor-pointer"
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-text-primary)]" />
          </button>
        </div>
      </div>
    </header>
  );
} 