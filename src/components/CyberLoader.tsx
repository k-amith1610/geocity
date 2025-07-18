'use client';

import { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline';

interface CyberLoaderProps {
  onComplete: () => void;
}

export default function CyberLoader({ onComplete }: CyberLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start progress animation
    const startTime = Date.now();
    const duration = 15000; // 15 seconds

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (elapsed < duration) {
        requestAnimationFrame(updateProgress);
      } else {
        // Complete loading after 10 seconds
        setIsLoading(false);
        setTimeout(() => {
          onComplete();
        }, 500); // Small delay for smooth transition
      }
    };

    requestAnimationFrame(updateProgress);
  }, [onComplete]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Spline Scene */}
      <div className="w-full h-full relative">
        <Spline
          scene="https://prod.spline.design/Xu1rD82xboQ2dASf/scene.splinecode"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {/* Loading Overlay */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-4">
        {/* Progress Bar */}
        <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-2">GEOCITY</h2>
          <p className="text-gray-200 text-sm">Loading your mapping experience...</p>
          <p className="text-[var(--color-accent)] text-lg font-bold mt-1">{Math.round(progress)}%</p>
        </div>
      </div>

      {/* Skip Button */}
      <button
        onClick={() => {
          setIsLoading(false);
          onComplete();
        }}
        className="absolute top-6 right-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 text-sm"
      >
        Skip
      </button>
    </div>
  );
} 