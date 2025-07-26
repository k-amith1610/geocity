'use client';

import { useEffect, useRef } from 'react';
import { Report } from './useReportsRealtime';

export function useAutoExpiration(
  reports: Report[],
  onReportExpired?: (reportId: string) => void
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up interval to check for expired reports
    intervalRef.current = setInterval(() => {
      const now = new Date();
      
      reports.forEach(report => {
        if (!report.createdAt) return;
        
        const createdAt = report.createdAt.toDate();
        const expirationHours = report.expirationHours || 24;
        const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
        
        if (now >= expiresAt) {
          // Report has expired
          if (onReportExpired) {
            onReportExpired(report.id);
          }
        }
      });
    }, 60000); // Check every minute

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [reports, onReportExpired]);

  // Calculate time remaining for a specific report
  const getTimeRemaining = (report: Report): string => {
    if (!report.createdAt) return 'Unknown';
    
    const createdAt = report.createdAt.toDate();
    const expirationHours = report.expirationHours || 24;
    const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Expired';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Check if a report is expired
  const isExpired = (report: Report): boolean => {
    if (!report.createdAt) return false;
    
    const createdAt = report.createdAt.toDate();
    const expirationHours = report.expirationHours || 24;
    const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
    const now = new Date();
    
    return now >= expiresAt;
  };

  return {
    getTimeRemaining,
    isExpired
  };
} 