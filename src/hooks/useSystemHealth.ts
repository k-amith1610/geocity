import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/fireBaseConfig';

interface SystemHealth {
  isHealthy: boolean;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  lastCheck: Date | null;
  metrics: {
    totalReports: number;
    reportsWithCoordinates: number;
    reportsWithoutCoordinates: number;
    emergencyReports: number;
    expiredReports: number;
    recentReports: number;
  };
}

export function useSystemHealth() {
  const [health, setHealth] = useState<SystemHealth>({
    isHealthy: true,
    status: 'excellent',
    issues: [],
    recommendations: [],
    lastCheck: null,
    metrics: {
      totalReports: 0,
      reportsWithCoordinates: 0,
      reportsWithoutCoordinates: 0,
      emergencyReports: 0,
      expiredReports: 0,
      recentReports: 0
    }
  });

  const checkSystemHealth = useCallback(async () => {
    try {
      console.log('🏥 Checking system health...');
      
      const reportsRef = collection(db, 'raised-issue');
      const snapshot = await getDocs(reportsRef);
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      let totalReports = 0;
      let reportsWithCoordinates = 0;
      let reportsWithoutCoordinates = 0;
      let emergencyReports = 0;
      let expiredReports = 0;
      let recentReports = 0;
      const issues: string[] = [];
      const recommendations: string[] = [];

      snapshot.docs.forEach((docSnapshot) => {
        totalReports++;
        const reportData = docSnapshot.data();
        const createdAt = reportData.createdAt?.toDate();
        
        // Check coordinates
        if (reportData.coordinates && reportData.coordinates.lat && reportData.coordinates.lng) {
          reportsWithCoordinates++;
        } else {
          reportsWithoutCoordinates++;
        }

        // Check emergency reports
        if (reportData.isEmergency) {
          emergencyReports++;
        }

        // Check expired reports
        if (createdAt) {
          const expirationHours = reportData.expirationHours || 24;
          const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
          if (expiresAt < now) {
            expiredReports++;
          }
        }

        // Check recent reports
        if (createdAt && createdAt > oneHourAgo) {
          recentReports++;
        }
      });

      // Analyze health status
      const coordinatePercentage = totalReports > 0 ? (reportsWithCoordinates / totalReports) * 100 : 100;
      const expiredPercentage = totalReports > 0 ? (expiredReports / totalReports) * 100 : 0;

      // Determine status and issues
      let status: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
      let isHealthy = true;

      if (coordinatePercentage < 50) {
        status = 'critical';
        isHealthy = false;
        issues.push('Low coordinate coverage - many reports missing location data');
        recommendations.push('Enable automatic coordinate migration');
      } else if (coordinatePercentage < 80) {
        status = 'warning';
        issues.push('Some reports missing coordinates');
        recommendations.push('Run coordinate migration for better map coverage');
      }

      if (expiredPercentage > 30) {
        if (status === 'excellent') status = 'warning';
        issues.push('High number of expired reports');
        recommendations.push('Enable automatic cleanup of expired reports');
      }

      if (emergencyReports > 0 && coordinatePercentage < 90) {
        if (status === 'excellent') status = 'warning';
        issues.push('Emergency reports may be missing coordinates');
        recommendations.push('Prioritize coordinate migration for emergency reports');
      }

      if (recentReports === 0 && totalReports > 0) {
        if (status === 'excellent') status = 'warning';
        issues.push('No recent activity detected');
        recommendations.push('Monitor system for new reports');
      }

      const finalHealth: SystemHealth = {
        isHealthy,
        status,
        issues,
        recommendations,
        lastCheck: now,
        metrics: {
          totalReports,
          reportsWithCoordinates,
          reportsWithoutCoordinates,
          emergencyReports,
          expiredReports,
          recentReports
        }
      };

      setHealth(finalHealth);

      console.log(`🏥 System health: ${status.toUpperCase()}`);
      console.log(`📊 Metrics: ${totalReports} total, ${reportsWithCoordinates} with coordinates, ${emergencyReports} emergency`);
      
      if (issues.length > 0) {
        console.log(`⚠️ Issues: ${issues.join(', ')}`);
      }

    } catch (error) {
      console.error('❌ Error checking system health:', error);
      setHealth(prev => ({
        ...prev,
        isHealthy: false,
        status: 'critical',
        issues: [...prev.issues, 'Failed to check system health'],
        lastCheck: new Date()
      }));
    }
  }, []);

  // Auto-check health periodically
  useEffect(() => {
    const autoCheckHealth = async () => {
      await checkSystemHealth();
    };

    // Check on mount
    autoCheckHealth();

    // Set up periodic checks (every 15 minutes)
    const interval = setInterval(autoCheckHealth, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkSystemHealth]);

  // Provide intelligent recommendations
  const getRecommendations = useCallback(() => {
    const recs = [...health.recommendations];
    
    if (health.metrics.reportsWithoutCoordinates > 0) {
      recs.push('Coordinate migration is running automatically');
    }
    
    if (health.metrics.expiredReports > 0) {
      recs.push('Automatic cleanup is handling expired reports');
    }
    
    if (health.metrics.emergencyReports > 0) {
      recs.push('Emergency reports are being prioritized');
    }
    
    return recs;
  }, [health]);

  return {
    health,
    checkSystemHealth,
    getRecommendations
  };
} 