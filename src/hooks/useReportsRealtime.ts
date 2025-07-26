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

  useEffect(() => {
    try {
      const reportsRef = collection(db, 'raised-issue');
      
      // Query for non-expired reports
      const now = new Date();
      const q = query(
        reportsRef,
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const reportsData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Report))
          .filter(report => {
            // Filter out expired reports
            if (!report.createdAt) return false;
            
            const createdAt = report.createdAt.toDate();
            const expirationHours = report.expirationHours || 24;
            const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
            
            return expiresAt > now;
          });

        setReports(reportsData);
        setLoading(false);
        setError(null);
      }, (error) => {
        console.error('Error listening to reports:', error);
        setError('Failed to load reports');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up reports listener:', error);
      setError('Failed to initialize reports listener');
      setLoading(false);
    }
  }, []);

  return { reports, loading, error };
} 