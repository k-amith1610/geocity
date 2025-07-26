'use client';

import { useEffect, useRef } from 'react';

export function useAutoCleanup(intervalMinutes: number = 5) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const runCleanup = async () => {
    try {
      const response = await fetch('/api/auto-cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.deletedCount > 0) {
          console.log(`Auto-cleanup: Deleted ${result.deletedCount} expired reports`);
        }
      }
    } catch (error) {
      console.error('Auto-cleanup failed:', error);
    }
  };

  useEffect(() => {
    // Run cleanup immediately
    runCleanup();

    // Set up periodic cleanup
    intervalRef.current = setInterval(runCleanup, intervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMinutes]);

  return { runCleanup };
} 