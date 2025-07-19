'use client';

import { Flag, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface HeaderProps {
  onReportIssue?: () => void;
  onUserProfile?: () => void;
}

export default function Header({ onReportIssue, onUserProfile }: HeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleUserClick = () => {
    setShowUserMenu(!showUserMenu);
  };

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
          
          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={handleUserClick}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 border border-[var(--color-border)] cursor-pointer"
            >
              {isAuthenticated && user?.name ? (
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-text-primary)]" />
              )}
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-30">
                {isAuthenticated ? (
                  <>
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* User Stats */}
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-gray-500">Points Earned</p>
                          <p className="font-medium text-gray-900">{user?.pointsEarned || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Reports Raised</p>
                          <p className="font-medium text-gray-900">{user?.raisedIssues || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onUserProfile?.();
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        Profile Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  /* Login Option for non-authenticated users */
                  <div className="py-1">
                    <Link
                      href="/sign-in"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <User className="w-4 h-4 mr-3" />
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 