'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/fireBaseConfig';

export interface Report {
  id: string;
  photo: string;
  photoDetails: {
    name: string;
    size: number;
    type: string;
    lastModified: string;
    user_id: string;
  };
  location: string;
  description: string;
  isEmergency: boolean;
  emergencyType?: 'MEDICAL' | 'LAW_ENFORCEMENT' | 'FIRE_HAZARD' | 'ENVIRONMENTAL';
  deviceInfo: {
    publicIP: string;
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    timestamp: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
  };
  imageAnalysis?: {
    authenticity: 'REAL' | 'AI_GENERATED' | 'UNCERTAIN';
    description: string;
    humanReadableDescription: string;
    emergencyLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: 'SAFE' | 'WARNING' | 'DANGER';
    reasoning: string;
    confidence: number;
  };
  expirationHours?: number;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: string;
  priority: string;
  assignedTo: string | null;
  resolvedAt: Timestamp | null;
  resolutionNotes: string | null;
}

export function useReportsRealtime() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

  useEffect(() => {
    console.log('🔄 Setting up Firestore listener... (trigger:', refreshTrigger, ')');
    try {
      const reportsRef = collection(db, 'raised-issue');
      console.log('✅ Reports collection reference created');
      
      // Query for ALL reports first, then filter client-side
      const q = query(
        reportsRef,
        orderBy('createdAt', 'desc')
      );
      console.log('✅ Firestore query created');

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('📊 Firestore snapshot received:', snapshot.docs.length, 'total reports');
        setConnectionStatus('connected');
        
        // First, get ALL reports without filtering
        const allReportsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Report));
        
        console.log('📋 All reports data:', allReportsData.map(r => ({ 
          id: r.id, 
          location: r.location, 
          isEmergency: r.isEmergency,
          createdAt: r.createdAt?.toDate(),
          expirationHours: r.expirationHours
        })));
        
        // Now filter out expired reports
        const now = new Date();
        const activeReportsData = allReportsData.filter(report => {
          if (!report.createdAt) {
            console.log('⚠️ Report without createdAt:', report.id);
            return false;
          }
          
          const createdAt = report.createdAt.toDate();
          const expirationHours = report.expirationHours || 24;
          const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
          
          const isExpired = expiresAt <= now;
          if (isExpired) {
            console.log('🗑️ Filtering out expired report:', report.id, 'expires at:', expiresAt);
          }
          
          return !isExpired;
        });

        console.log('✅ Setting reports:', activeReportsData.length, 'active reports');
        console.log('📍 Active reports locations:', activeReportsData.map(r => r.location));
        
        setReports(activeReportsData);
        setLoading(false);
        setError(null);
      }, (error) => {
        console.error('❌ Error listening to reports:', error);
        setConnectionStatus('disconnected');
        setError('Failed to load reports');
        setLoading(false);
      });

      return () => {
        console.log('🔄 Unsubscribing from Firestore listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('❌ Error setting up reports listener:', error);
      setError('Failed to initialize reports listener');
      setLoading(false);
    }
  }, [refreshTrigger]);

  const refreshReports = () => {
    console.log('Manually refreshing reports...');
    setRefreshTrigger(prev => prev + 1);
  };

  // Force immediate refresh when called
  const forceRefresh = () => {
    console.log('Force refreshing reports...');
    setRefreshTrigger(prev => prev + 1);
  };

  return { reports, loading, error, refreshReports, forceRefresh, connectionStatus, setReports };
} 